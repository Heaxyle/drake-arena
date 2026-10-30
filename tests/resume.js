// Reload test: the arena survives a page reload (OBS restarts the browser source when its scene is hidden and shown, or
// on "Refresh cache"). Seeded fights on the game clock (Playwright's fake clock); 7 players join the ranked queue, so 2
// fight and 5 wait. Each case reloads once and checks what the new page picked up:
//   1  In the betting window: the 5 still queued in order, the same pair in a fresh 2:00 betting window, the
//      «🔄 Арену перезапущено» line in the ЧАТ panel, nothing counted; the fight then plays once
//   2  Mid-fight (turn 3): the same, the half-fought fight counted for nothing; the new one counts once
//   3  On the result screen: the fight was counted and is over: not played again, XP and the record as they were; the
//      next pair comes off the queue (3 left)
//   4  Betting window off, mid-fight, with an accepted duel waiting: the fight starts again at once, then the duel, then
//      the queue
//   5  A save older than 10 minutes (the clock moved on 11 minutes with the page closed) is dropped: empty queue, idle
//      arena, the key gone; one 9 minutes old is still picked up
//   6  The streamer's White Drake mid-fight, its scales hit: the match starts again with the scales and effects as a new
//      fight has them (the scales full at their starting size, the card showing it; no debuffs, any buff fresh). Then as
//      the White Dragon across a reload: still the Dragon, and !дракон brings back the White Drake with the same XP
// Every case: one page load event per load in the play log saying what came back, exactly one logged fight per fight
// fought to its end, no page errors.
// Usage: npm run test:resume   (or node tests/resume.js; RESUME_ONLY=1,3 runs only those cases)
const path = require('path');
const { chromium } = require('playwright');
const { pageInit } = require('./page_hooks');
const { offTwitch } = require('./no_twitch');
const { storageSettled } = require('./storage_sync');

const ROOT = path.join(__dirname, '..');
// RESUME_FILE=<another index.html> runs it against that page (main's fails it: the bug this covers)
const PAGE = 'file:///' + (process.env.RESUME_FILE ? path.resolve(process.env.RESUME_FILE) : path.join(ROOT, 'showcase/index.html')).replace(/\\/g, '/');
const SEED = Number(process.env.UI_SEED || 3);
const ONLY = (process.env.RESUME_ONLY || '').split(',').filter(Boolean);
const run = n => !ONLY.length || ONLY.includes(String(n));
const KEY = 'drake_arena_showcase_arena';
const PLAYERS = ['ania', 'borys', 'vira', 'hlib', 'dana', 'yurko', 'olia'];
const COLORS = ['червоний', 'синій', 'чорний', 'золотий', 'фіолетовий', 'зелений', 'червоний'];

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);

async function open(browser, { betting = true } = {}) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
    await offTwitch(page);
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));
    await page.addInitScript(pageInit, SEED);
    await page.goto(`${PAGE}?lang=uk`);
    await page.evaluate(on => localStorage.setItem('drake_arena_showcase_betting', on ? '1' : '0'), betting);
    for (let i = 0; i < PLAYERS.length; i++) await chat(page, PLAYERS[i], `!дрейк ${COLORS[i]}`);
    return { page, context, errors };
}
const chat = (page, user, msg, extra) => page.evaluate(([u, m, e]) => window.__chat(u, m, e), [user, msg, extra]);
async function until(page, cond, arg = null, step = 500, max = 3600000) {
    for (let t = 0; t <= max; t += step) { if (await page.evaluate(cond, arg)) return; await page.clock.runFor(step); }
    throw new Error('timed out waiting for ' + cond.toString().slice(0, 100));
}
// The arena as it stands: the queue, the waiting duel, the cards, the state, every player's XP and record
const view = page => page.evaluate(() => {
    const db = getDragonDB(), st = JSON.parse(localStorage.getItem('drake_arena_showcase_stats')) || {};
    return {
        queue: [...matchmakingQueue], duel: waitingDuel && [waitingDuel.challenger, waitingDuel.accepter], kind: arenaState.kind,
        betting: !!arenaState.betting, total: arenaState.total, left: arenaState.ends ? arenaState.ends - Date.now() : null, turn: arenaState.turn,
        cards: ['p1', 'p2'].map(p => document.getElementById(`name-${p}`).textContent.replace('@', '')).sort(),
        xp: Object.fromEntries(Object.entries(db).map(([n, d]) => [n, d.xp])),
        record: Object.fromEntries(Object.entries(st).map(([n, s]) => [n, `${s.wins}-${s.losses}`])),
        info: [...document.querySelectorAll('#info-feed .info-card')].map(c => c.textContent),
        saved: localStorage.getItem('drake_arena_showcase_arena'),
    };
});
const playLog = async page => JSON.parse(await page.evaluate(() => exportPlayLog({ names: true }))).events;
const pairOf = e => e.players.map(p => p.name).sort().join('-');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// The reload: the game's own saves (and the play log) in the browser first, as OBS would have them
async function reload(page) {
    await storageSettled(page, { idb: { name: 'drake_arena_showcase_playlog', stores: ['events'] } });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
}
// Seven join the queue: the first two (all level 1: the front and the next) go onto the arena, five wait
async function fillQueue(page) {
    for (const n of PLAYERS) await chat(page, n, '!черга');
    return { pair: PLAYERS.slice(0, 2).sort(), waiting: PLAYERS.slice(2) };
}
const restartLine = v => v.info.some(t => /^🔄 Арену перезапущено: бій @\S+ — @\S+ починається знову\.$/.test(t.trim()));

async function main() {
    const browser = await chromium.launch();
    try {
        // 1–2: a reload during the betting window, and one mid-fight
        for (const c of [{ n: 1, label: 'in the betting window', at: () => arenaState.kind === 'countdown' && arenaState.betting && Date.now() - window.__t0 > 30000 },
                         { n: 2, label: 'mid-fight (turn 3)', at: () => arenaState.kind === 'fight' && arenaState.turn >= 3 }]) {
            if (!run(c.n)) continue;
            console.log(`\n[${c.n}. a reload ${c.label}, 5 in the queue]`);
            const { page, context, errors } = await open(browser);
            const { pair, waiting } = await fillQueue(page);
            await page.evaluate(() => { window.__t0 = Date.now(); });
            await until(page, c.at);
            const before = await view(page);
            check(same(before.cards, pair) && same(before.queue, waiting), `before: @${pair.join(' — @')} on the arena, 5 waiting`, JSON.stringify(before));
            await reload(page);
            await page.clock.runFor(500);
            const after = await view(page);
            check(same(after.queue, waiting), `after the reload the queue is back, in order: ${after.queue.join(', ')}`, JSON.stringify(after.queue));
            check(after.kind === 'countdown' && after.betting && after.total === 120000 && after.left > 118000 && same(after.cards, pair),
                `the same pair in a fresh betting window (${Math.round(after.left / 1000)} s left)`, JSON.stringify({ kind: after.kind, betting: after.betting, left: after.left, cards: after.cards }));
            check(restartLine(after), 'the ЧАТ panel says the match restarted', JSON.stringify(after.info));
            check(same(after.xp, before.xp) && same(after.record, before.record), 'nothing counted by the interrupted match (XP and records as before)', JSON.stringify({ before: before.xp, after: after.xp }));
            const loads = (await playLog(page)).filter(e => e.type === 'load');
            const ld = loads[1];
            check(loads.length === 2 && !loads[0].restored && ld && ld.restored && same(ld.queue, waiting) && ld.match && same([...ld.match.pair].sort(), pair)
                && ld.match.kind === 'ranked' && ld.match.stage === (c.n === 1 ? 'betting' : 'fight') && ld.match.replayed && ld.duel === null,
                `the play log has both page loads, the second with what came back (the queue, the ranked match at "${ld && ld.match && ld.match.stage}", replayed)`, JSON.stringify(loads));
            await until(page, () => arenaState.kind === 'result', null, 1000);
            const done = await view(page), fights = (await playLog(page)).filter(e => e.type === 'fight');
            const f = fights[0], got = f && Object.fromEntries(f.players.map(p => [p.name, p.got ? p.got.xp : 0]));
            check(fights.length === 1 && pairOf(f) === pair.join('-') && pair.every(n => done.xp[n] - before.xp[n] === got[n])
                && Object.values(done.record).reduce((s, r) => s + r.split('-').reduce((a, b) => a + +b, 0), 0) === (f.winner ? 2 : 0),
                `the fight then plays once and counts once (${f && f.winner ? '@' + f.winner + ' wins' : 'a draw'}, one logged fight)`, JSON.stringify({ fights: fights.length, got, xp: done.xp, record: done.record }));
            check(!errors.length, 'no page errors', errors.join(' | '));
            await context.close();
        }

        // 3: a reload on the result screen: that match is over
        if (run(3)) {
            console.log('\n[3. a reload on the result screen, 5 in the queue]');
            const { page, context, errors } = await open(browser);
            const { pair, waiting } = await fillQueue(page);
            await until(page, () => arenaState.kind === 'result', null, 1000);
            const before = await view(page);
            await reload(page);
            await page.clock.runFor(500);
            const after = await view(page);
            // The next ranked pair: the front of the queue and the next (all level 1); 3 left
            const next = waiting.slice(0, 2).sort();
            check(after.kind === 'countdown' && after.betting && same(after.cards, next) && same(after.queue, waiting.slice(2)),
                `not played again: the next pair (@${next.join(' — @')}) comes off the queue, 3 left in order`, JSON.stringify({ kind: after.kind, cards: after.cards, queue: after.queue }));
            check(same(after.xp, before.xp) && same(after.record, before.record) && !restartLine(after), 'XP and records as the result screen left them, no restart line', JSON.stringify({ before: before.record, after: after.record }));
            await until(page, () => arenaState.kind === 'result', null, 1000);
            const log = await playLog(page), fights = log.filter(e => e.type === 'fight'), ld = log.filter(e => e.type === 'load')[1];
            check(fights.length === 2 && pairOf(fights[0]) === pair.join('-') && pairOf(fights[1]) === next.join('-'),
                'two logged fights: the first pair once, then the next pair', JSON.stringify(fights.map(pairOf)));
            check(ld && ld.restored && ld.match && ld.match.stage === 'result' && !ld.match.replayed && same(ld.queue, waiting),
                'the page load says the match was on its result screen and not replayed', JSON.stringify(ld));
            check(!errors.length, 'no page errors', errors.join(' | '));
            await context.close();
        }

        // 4: betting window off, mid-fight, with a duel accepted and waiting
        if (run(4)) {
            console.log('\n[4. betting window off: a reload mid-fight with a duel waiting]');
            const { page, context, errors } = await open(browser, { betting: false });
            await chat(page, 'olia', '!черга');
            await chat(page, 'yurko', '!черга');
            for (const n of PLAYERS.slice(0, 5)) await chat(page, n, '!черга');   // the 5 waiting
            await until(page, () => arenaState.kind === 'fight' && arenaState.turn >= 3);
            await chat(page, 'ania', '!бій @borys');
            await chat(page, 'borys', '!прийняти');
            const before = await view(page);
            const waiting = ['vira', 'hlib', 'dana'];
            check(same(before.duel, ['ania', 'borys']) && same(before.queue, waiting), 'before: @olia — @yurko fighting, @ania\'s duel with @borys waiting, 3 in the queue', JSON.stringify(before));
            await reload(page);
            await page.clock.runFor(500);
            const after = await view(page);
            check(['countdown', 'fight'].includes(after.kind) && !after.betting && same(after.cards, ['olia', 'yurko']) && same(after.duel, ['ania', 'borys']) && same(after.queue, waiting) && restartLine(after),
                'after the reload the fight starts again at once (no betting window), the duel still waits, the queue in order', JSON.stringify(after));
            await until(page, () => arenaState.kind === 'result', null, 1000);
            await page.evaluate(() => endResultHold());
            const duel = await view(page);
            check(same(duel.cards, ['ania', 'borys']) && duel.duel === null && same(duel.queue, waiting), 'then the duel, the queue still waiting', JSON.stringify(duel));
            await until(page, () => arenaState.kind === 'result', null, 1000);
            await page.evaluate(() => endResultHold());
            const q = await view(page);
            check(same(q.cards, ['hlib', 'vira']) && same(q.queue, ['dana']), 'then the queue carries on', JSON.stringify(q));
            const fights = (await playLog(page)).filter(e => e.type === 'fight');
            check(fights.length === 2 && fights[0].kind === 'ranked' && fights[1].kind === 'duel', 'two logged fights so far (the ranked one once, the duel)', JSON.stringify(fights.map(f => f.kind + ':' + pairOf(f))));
            check(!errors.length, 'no page errors', errors.join(' | '));
            await context.close();
        }

        // 5: a save older than 10 minutes is dropped; 9 minutes is still fine
        if (run(5)) {
            console.log('\n[5. an old save]');
            for (const mins of [11, 9]) {
                const { page, context, errors } = await open(browser);
                const { pair, waiting } = await fillQueue(page);
                await page.clock.runFor(5000);
                await storageSettled(page, { idb: { name: 'drake_arena_showcase_playlog', stores: ['events'] } });
                // The source stays off this long: the game clock jumps on (no timers fire), then the page loads again
                await page.goto('about:blank');
                await page.clock.setSystemTime(await page.evaluate(() => Date.now()) + mins * 60000);
                await page.goto(`${PAGE}?lang=uk`);
                await page.clock.runFor(500);
                const after = await view(page), ld = (await playLog(page)).filter(e => e.type === 'load')[1];
                if (mins > 10) {
                    check(after.queue.length === 0 && after.duel === null && after.kind === 'idle' && after.saved === null,
                        `${mins} minutes old: ignored (empty queue, idle arena, the key "${KEY}" removed)`, JSON.stringify({ queue: after.queue, kind: after.kind, saved: after.saved }));
                    check(ld && ld.saved && !ld.restored && ld.ageMs >= 600000 && ld.match === null && ld.queue.length === 0,
                        `the page load logged as not restored (${ld && Math.round(ld.ageMs / 60000)} min old)`, JSON.stringify(ld));
                } else {
                    check(same(after.queue, waiting) && after.kind === 'countdown' && same(after.cards, pair) && ld && ld.restored,
                        `${mins} minutes old: picked up (the queue, the pair in a fresh betting window)`, JSON.stringify({ queue: after.queue, kind: after.kind, ld }));
                }
                check(!errors.length, 'no page errors', errors.join(' | '));
                await context.close();
            }
        }
        // 6: the streamer's White Drake: a reload mid-fight with its scales hit, then its other form across a reload
        if (run(6)) {
            console.log('\n[6. the streamer\'s White Drake: a reload mid-fight, and the Dragon across a reload]');
            const { page, context, errors } = await open(browser);
            await page.evaluate(() => setStreamerUser('stream_owner'));
            await chat(page, 'stream_owner', '!дрейк білий');
            await chat(page, 'stream_owner', '!черга');
            await chat(page, 'ania', '!черга');
            const fxOf = () => { const st = battleFx && battleFx.stream_owner, foe = battleFx && battleFx.ania;
                return st && foe ? { scales: { ...st.scales }, turn: arenaState.turn, buffs: [...st.buff, ...foe.buff].map(x => [x.id, x.left]), debuffs: [...st.debuff, ...foe.debuff].map(x => x.id) } : null; };
            await until(page, () => arenaState.kind === 'fight' && arenaState.turn >= 3 && !!battleFx && !!battleFx.stream_owner && battleFx.stream_owner.scales.now < battleFx.stream_owner.scales.max);
            const before = await page.evaluate(fxOf);
            await reload(page);
            await page.clock.runFor(500);
            const back = await view(page);
            check(back.kind === 'countdown' && back.betting && same(back.cards, ['ania', 'stream_owner']) && restartLine(back),
                `before: the scales at ${before.scales.now}/${before.scales.max} on turn ${before.turn}; after the reload the same match in a fresh betting window`, JSON.stringify({ before, back }));
            // The fight begins again: as a new fight has it, before its first hit
            await until(page, () => arenaState.kind === 'fight', null, 250);
            const fresh = await page.evaluate(fxOf);
            const counts = await page.evaluate(() => Object.fromEntries(EFFECT_IDS.map(id => [id, EFFECTS[id].count])));
            const want = await page.evaluate(() => { const d = getDragonDB().stream_owner, lvl = calculateLevelAndProgress(d.xp).level; return scalesOf(lvl, getMaxHP(lvl, d.drakeObj.type, d.title)); });
            const card = await page.evaluate(() => { const side = document.getElementById('name-p1').textContent.includes('stream_owner') ? 'p1' : 'p2';
                return { text: document.getElementById(`scale-text-${side}`).textContent, on: document.getElementById(`card-${side}`).classList.contains('has-scales') }; });
            check(fresh && fresh.turn <= 1 && fresh.scales.now === want && fresh.scales.max === want && card.on && card.text === String(want),
                `the fight starts again with the scales full at their starting size (${want}), the card showing «${card.text}»`, JSON.stringify({ fresh, want, card }));
            check(fresh && !fresh.debuffs.length && fresh.buffs.every(([id, left]) => left === counts[id]),
                `no effect carried over from before the reload (before: ${before.buffs.length + before.debuffs.length} up; now: ${fresh ? fresh.buffs.map(b => b[0]).join(', ') || 'none' : '?'}, fresh)`, JSON.stringify({ before, fresh }));
            await until(page, () => arenaState.kind === 'result', null, 1000);
            await page.evaluate(() => endResultHold());
            // The White Dragon across a reload: still the Dragon, the White Drake behind it with its XP
            const drakeXp = await page.evaluate(() => getDragonDB().stream_owner.xp);
            await chat(page, 'stream_owner', '!дракон');
            await reload(page);
            await page.clock.runFor(500);
            const asDragon = await page.evaluate(() => { const d = getDragonDB().stream_owner; return { type: d.drakeObj.type, kept: d.regular && d.regular.xp }; });
            await chat(page, 'stream_owner', '!дракон');
            const again = await page.evaluate(() => { const d = getDragonDB().stream_owner; return { type: d.drakeObj.type, xp: d.xp, title: d.title.id }; });
            check(asDragon.type === 'white' && asDragon.kept === drakeXp && again.type === 'steel' && again.xp === drakeXp && again.title === 998,
                `as the White Dragon across a reload: still the Dragon, and !дракон brings back the White Drake with its ${drakeXp} XP`, JSON.stringify({ drakeXp, asDragon, again }));
            check(!errors.length, 'no page errors', errors.join(' | '));
            await context.close();
        }
    } finally {
        await browser.close();
    }
    console.log(failures ? `\n${failures} check(s) failed.` : '\nAll reload checks passed.');
    process.exit(failures ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
