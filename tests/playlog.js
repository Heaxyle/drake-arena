// Play log test: the game records how people play (IndexedDB, silently) and exportPlayLog() hands it over as one JSON.
//   1  A run through chat (seeded fights, the fake clock): three new drakes, a title roll for channel points, !черга
//      (twice from one player), a ranked fight with the betting window on, a duel with it off, an element change at
//      level 5. The log holds exactly those events, in order, and each says what the game did: both fighters' level,
//      XP, element and title before the fight; the winner, KO / time-out / draw and the turns as the arena showed them;
//      the XP each got as the saves changed, with the underdog and Gold parts; the betting window's opening and the
//      fight's start in order. Nothing of it shows on the page
//  1b  The endings the seeded fights don't reach, through finishBattle: a time-out (both standing) and a draw
//   2  The export: valid JSON with the log and the saves (drakes and stats); player names replaced by ids p001… everywhere
//      (no name left in the text; a player only in the saves too), the same ids in a second export and after a reload;
//      { names: true } keeps the names. clearPlayLog() empties the log and the ids and leaves the saves
//   3  A failing IndexedDB (open throws; or every write throws): the fights finish exactly as without the log (same
//      fight events), no page errors, and the export still works, reporting the failed writes
// Usage: node tests/playlog.js
const path = require('path');
const { chromium } = require('playwright');
const { pageInit } = require('./page_hooks');
const { offTwitch } = require('./no_twitch');
const { storageSettled } = require('./storage_sync');

const ROOT = path.join(__dirname, '..');
const PAGE = 'file:///' + path.join(ROOT, 'showcase/index.html').replace(/\\/g, '/');
const SEED = Number(process.env.UI_SEED || 3);
const NAMES = ['alice', 'bobgold', 'carol', 'zed'];

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);

// breakIdb: null, 'open' (indexedDB.open throws) or 'write' (every add throws)
async function open(browser, breakIdb = null) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const requests = [];
    page.on('request', r => { if (!/^(file|data|blob):/.test(r.url())) requests.push(r.url()); });
    await offTwitch(page);
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));
    await page.addInitScript(pageInit, SEED);
    if (breakIdb === 'open') await page.addInitScript(() => { indexedDB.open = () => { throw new Error('IndexedDB is off'); }; });
    if (breakIdb === 'write') await page.addInitScript(() => { IDBObjectStore.prototype.add = () => { throw new Error('disk full'); }; });
    await page.goto(PAGE);
    return { page, context, errors, requests };
}

const chat = (page, user, msg, extra) => page.evaluate(([u, m, e]) => window.__chat(u, m, e), [user, msg, extra]);
const reward = { 'custom-reward-id': 'test-reward' };
const saves = page => page.evaluate(() => getDragonDB());

// Runs the game clock until the fight on the arena is over and its result screen shows
async function playOut(page) {
    for (let i = 0; i < 400 && !await page.evaluate(() => arenaState.kind === 'result'); i++) await page.clock.runFor(1000);
    return page.evaluate(() => ({ kind: arenaState.kind, winner: arenaState.winner ? arenaState.winner.name : null, turns: arenaState.turns, ko: arenaState.ko }));
}
const endHold = page => page.evaluate(() => endResultHold());
const exportLog = (page, opts) => page.evaluate(o => exportPlayLog(o), opts);
// The log as the game stored it (names kept)
const events = async page => JSON.parse(await exportLog(page, { names: true })).events;

// What the player looks like before a fight, as the log should have it
const fighterNow = (db, name) => {
    const d = db[name];
    return { name, xp: d.xp, element: d.drakeObj.type, title: d.title.id, rarity: d.title.rarity };
};

async function run() {
    const browser = await chromium.launch();
    try {
        // 1. A run through chat
        console.log('\n[1. a run of drakes, a title roll, the queue, a ranked fight, a duel and an element change]');
        const a = await open(browser);
        const { page } = a;
        await chat(page, 'alice', '!дрейк червоний');
        await chat(page, 'bobgold', '!дрейк золотий');
        await chat(page, 'carol', '!дрейк зелений');
        const titleBefore = (await saves(page)).alice.title;
        await chat(page, 'alice', '!титул', reward);
        const titleAfter = (await saves(page)).alice.title;

        await page.evaluate(() => localStorage.setItem('drake_arena_showcase_betting', '1'));
        await page.evaluate(() => { const db = getDragonDB(); db.alice.xp = 150; saveDragonDB(db); });   // level 2 against level 1: on the seed, @bobgold (Gold) wins as the underdog
        const preRanked = await saves(page);
        const lvl = { alice: 2, bobgold: 1 };
        await chat(page, 'alice', '!черга');
        await chat(page, 'alice', '!черга');
        await page.clock.runFor(3000);
        await chat(page, 'bobgold', '!черга');
        const ranked = await playOut(page);
        const postRanked = await saves(page);
        await endHold(page);

        await page.evaluate(() => localStorage.setItem('drake_arena_showcase_betting', '0'));
        const preDuel = await saves(page);
        await chat(page, 'carol', '!бій @alice');
        await chat(page, 'alice', '!прийняти');
        const duel = await playOut(page);
        await endHold(page);

        await page.evaluate(() => { const db = getDragonDB(); db.bobgold.xp = 2000; saveDragonDB(db); });   // level 5 (lvls 1–4 take 100+263+466+697)
        const bobLevel = await page.evaluate(() => calculateLevelAndProgress(getDragonDB().bobgold.xp).level);
        await chat(page, 'bobgold', '!рерол синій', reward);

        const ev = await events(page);
        const types = ev.map(e => e.type).join(' ');
        check(types === 'drake drake drake title queue queue queue fight fight element', `the log holds the run's events in order: ${types}`, `expected drake×3 title queue×3 fight fight element`);
        const [d1, d2, d3, title, q1, q2, q3, f1, f2, el] = ev;
        check(d1 && d1.user === 'alice' && d1.element === 'red' && d2.user === 'bobgold' && d2.element === 'gold' && d3.element === 'green' && d1.levelLost === 0,
            'new drakes: who and which element (level lost 0)', JSON.stringify([d1, d2, d3]));
        check(title && title.user === 'alice' && title.from === titleBefore.id && title.to === titleAfter.id && title.toRarity === titleAfter.rarity && title.via === 'points',
            `the title roll: who, the old and the new title (${titleBefore.id} → ${titleAfter.id}), channel points`, JSON.stringify(title));
        check(q1 && q1.user === 'alice' && q1.joined && q1.position === 1 && q2.user === 'alice' && !q2.joined && q3.user === 'bobgold' && q3.joined && q3.position === 2
            && Date.parse(q3.t) - Date.parse(q1.t) === 3000,
            '!черга: who and when (3 s apart on the game clock), the repeat marked as not joined', JSON.stringify([q1, q2, q3]));

        // The ranked fight
        const byName = f => Object.fromEntries((f.players || []).map(p => [p.name, p]));
        const rp = byName(f1 || {});
        const fightersOk = ['alice', 'bobgold'].every(n => {
            const want = fighterNow(preRanked, n), got = rp[n];
            return got && got.xp === want.xp && got.element === want.element && got.title === want.title && got.rarity === want.rarity && got.level === lvl[n];
        });
        check(f1 && f1.kind === 'ranked' && fightersOk, 'the ranked fight: both players with level, XP, element and title from before it', JSON.stringify(f1 && f1.players));
        check(f1 && f1.winner === ranked.winner && f1.turns === ranked.turns && f1.result === (!ranked.winner ? 'draw' : ranked.ko ? 'ko' : 'timeout'),
            `its result as the arena showed it: winner @${ranked.winner}, ${f1 && f1.result}, ${ranked.turns} turns`, JSON.stringify({ log: f1 && { winner: f1.winner, result: f1.result, turns: f1.turns }, arena: ranked }));
        const other = n => n === 'alice' ? 'bobgold' : 'alice';
        const underdog = n => n === ranked.winner ? Math.min(40, 5 * Math.max(0, lvl[other(n)] - lvl[n])) : 0;
        const xpOk = ['alice', 'bobgold'].every(n => {
            const g = rp[n] && rp[n].got;
            const gained = postRanked[n].xp - preRanked[n].xp;
            return g && g.xp === gained && g.xp === g.base + g.underdog + g.gold && g.base === (n === ranked.winner ? 40 : 10)
                && g.underdog === underdog(n) && (n === 'bobgold' ? g.gold > 0 : g.gold === 0);
        });
        check(xpOk && underdog(ranked.winner) > 0, `the XP each got, as the saves changed, split into base, underdog and Gold (${['alice', 'bobgold'].map(n => `@${n} ${JSON.stringify(rp[n] && rp[n].got)}`).join(', ')})`,
            JSON.stringify({ alice: rp.alice && rp.alice.got, bob: rp.bobgold && rp.bobgold.got, gained: { alice: postRanked.alice.xp - preRanked.alice.xp, bobgold: postRanked.bobgold.xp - preRanked.bobgold.xp } }));
        const tOpen = f1 && Date.parse(f1.bettingOpened), tStart = f1 && Date.parse(f1.started), tEnd = f1 && Date.parse(f1.ended);
        check(f1 && tOpen === Date.parse(q3.t) && tStart - tOpen === 120000 - 4500 && tEnd > tStart && f1.t === f1.ended,
            `when the betting window opened (with @bobgold's !черга) and the fight started (${(tStart - tOpen) / 1000} s later), then its end`, JSON.stringify({ q3: q3 && q3.t, f1: f1 && { bettingOpened: f1.bettingOpened, started: f1.started, ended: f1.ended } }));

        // The duel
        const dp = byName(f2 || {});
        check(f2 && f2.kind === 'duel' && f2.bettingOpened === null && dp.carol && dp.alice && dp.alice.xp === preDuel.alice.xp && dp.carol.element === 'green'
            && f2.winner === duel.winner && f2.turns === duel.turns && dp.alice.got === null && dp.carol.got === null,
            `the duel: no betting window, no XP, winner @${duel.winner} in ${duel.turns} turns`, JSON.stringify(f2));

        // The element change
        check(el && el.user === 'bobgold' && el.from === 'gold' && el.element === 'blue' && el.levelBefore === bobLevel && el.levelLost === bobLevel - 1 && bobLevel === 5,
            `the element change: gold → blue, level ${bobLevel} lost down to 1`, JSON.stringify(el));
        const hidden = await page.evaluate(() => !/playlog|exportPlayLog|p001/i.test(document.body.innerText));
        check(hidden && !a.requests.length && !a.errors.length, 'nothing on the page, no network request, no page errors', JSON.stringify({ hidden, requests: a.requests, errors: a.errors }));

        // 2. The export
        console.log('\n[2. the export]');
        // zed is in the saves but not in the log (an older player): after the log's players, so p004
        await page.evaluate(() => { const db = getDragonDB(); db.zed = { ...db.carol, name: 'zed' }; saveDragonDB(db); });
        const text = await exportLog(page);
        let out = null;
        try { out = JSON.parse(text); } catch (e) { /* reported below */ }
        const leaked = NAMES.filter(n => text.toLowerCase().includes(n));
        const idsUsed = out ? [...new Set(text.match(/"p\d{3}"/g) || [])].sort() : [];
        check(out && out.events.length === ev.length && out.saves && Object.keys(out.saves.drakes).length === 4 && out.saves.stats && !leaked.length
            && idsUsed.join() === '"p001","p002","p003","p004"' && out.events[0].user === 'p001' && out.saves.drakes.p001 && out.saves.drakes.p001.name === 'p001'
            && out.saves.drakes.p004 && out.saves.drakes.p004.name === 'p004',
            `valid JSON (${text.length} characters): the log and the saves, players as p001–p004 (the log's in the order they first played, then the saves'), no name left`,
            JSON.stringify({ parsed: !!out, leaked, idsUsed, first: out && out.events[0] }));
        const statsOk = out && Object.keys(out.saves.stats).every(k => /^p\d{3}$/.test(k)) && Object.values(out.saves.stats).reduce((s, x) => s + x.wins + x.losses, 0) === 2;
        check(statsOk, 'the stats snapshot by id (one ranked win and one loss)', JSON.stringify(out && out.saves.stats));
        const again = JSON.parse(await exportLog(page));
        // The reload must read back what the game saved: its saves and the play log (events and ids) in the browser first
        await storageSettled(page, { idb: { name: 'drake_arena_showcase_playlog', stores: ['events', 'ids'] } });
        await page.reload();
        await chat(page, 'dave', '!дрейк чорний');
        const afterReload = JSON.parse(await exportLog(page));
        const strip = o => JSON.stringify({ ...o, exported: 0, events: o.events.slice(0, ev.length) });
        check(strip(again) === strip(out) && afterReload.events.length === ev.length + 1 && afterReload.events[ev.length].user === 'p005' && afterReload.saves.drakes.p004.name === 'p004'
            && strip({ ...afterReload, saves: out.saves }) === strip({ ...out, failedWrites: afterReload.failedWrites }),
            'the same ids in a second export and after a reload: zed keeps p004, and a new player in the log gets p005', JSON.stringify({ last: afterReload.events[ev.length] }));
        const named = JSON.parse(await exportLog(page, { names: true }));
        check(named.names === 'twitch' && named.events[0].user === 'alice' && named.saves.drakes.alice, '{ names: true } keeps the Twitch names', JSON.stringify(named.events[0]));

        // clearPlayLog(): the log and the ids go, the saves stay; the next player is p001 again
        const savesBefore = await saves(page);
        const removed = await page.evaluate(() => clearPlayLog());
        const cleared = JSON.parse(await exportLog(page, { names: true }));   // { names: true }: an export by id would hand out ids again
        await chat(page, 'erin', '!дрейк фіолетовий');
        const fresh = JSON.parse(await exportLog(page));
        const savesAfter = await saves(page);
        delete savesAfter.erin;
        check(removed === ev.length + 1 && cleared.events.length === 0 && JSON.stringify(savesAfter) === JSON.stringify(savesBefore)
            && fresh.events.length === 1 && fresh.events[0].user === 'p001' && fresh.saves.drakes.p001.name === 'p001' && Object.keys(fresh.saves.drakes).length === 6,
            `clearPlayLog() empties the log (${removed} events) and the ids, the saves untouched; the next new player is p001`,
            JSON.stringify({ removed, left: cleared.events.length, next: fresh.events[0], drakes: Object.keys(fresh.saves.drakes) }));
        await a.context.close();

        // The endings the seeded fights don't reach: the game's own finishBattle with both still standing (a time-out) and
        // on equal HP (a draw)
        console.log('\n[1b. a time-out and a draw]');
        const e = await open(browser);
        await chat(e.page, 'alice', '!дрейк червоний');
        await chat(e.page, 'carol', '!дрейк зелений');
        const ends = await e.page.evaluate(() => [[120, 80], [90, 90]].map(([h1, h2]) => {
            const a = getDragonStrict('alice'), c = getDragonStrict('carol');
            isBattleRunning = true;
            arenaState.turn = 30;
            playFightStart('alice', 'carol', true, {});
            finishBattle(a, c, h1, h2, true);
            endResultHold();
            return getDragonDB();
        }));
        const endEv = (await events(e.page)).filter(x => x.type === 'fight');
        const [to, dr] = endEv;
        check(endEv.length === 2 && to.result === 'timeout' && to.winner === 'alice' && to.turns === 30 && dr.result === 'draw' && dr.winner === null
            && dr.players.every(p => p.got && p.got.xp === 10 && p.got.base === 10 && p.got.xp === ends[1][p.name].xp - ends[0][p.name].xp),
            'a time-out (both standing after 30 turns: the one with more HP wins) and a draw (10 XP each)', JSON.stringify(endEv.map(x => ({ result: x.result, winner: x.winner, turns: x.turns, got: x.players.map(p => p.got) }))));
        check(!e.errors.length, 'no page errors', JSON.stringify(e.errors));
        await e.context.close();

        // 3. A failing IndexedDB
        const plain = await fightEvents(browser, null);
        for (const mode of ['open', 'write']) {
            console.log(`\n[3. IndexedDB failing: ${mode === 'open' ? 'indexedDB.open throws' : 'every write throws'}]`);
            const r = await fightEvents(browser, mode);
            check(r.result.kind === 'result' && JSON.stringify(r.events) === JSON.stringify(plain.events) && !r.errors.length,
                `the ranked fight finishes as with a working log (${r.events.length} fight events the same, winner @${r.result.winner}), no page errors`,
                JSON.stringify({ result: r.result, same: JSON.stringify(r.events) === JSON.stringify(plain.events), errors: r.errors }));
            check(r.exported && r.exported.events.length === 0 && r.exported.failedWrites >= 5 && Object.keys(r.exported.saves.drakes).length === 2
                && (mode === 'open' ? !!r.exported.logError : !r.exported.logError),
                `the export still works: no events, ${r.exported && r.exported.failedWrites} failed writes reported, the saves there`, JSON.stringify(r.exported && { ...r.exported, saves: undefined }));
        }
    } finally {
        await browser.close();
    }
    console.log(failures ? `\n${failures} play log check(s) failed.` : '\nAll play log checks passed.');
    process.exit(failures ? 1 : 0);
}

// Two drakes, a ranked fight; the fight events (page_hooks), the result, page errors and the export
async function fightEvents(browser, breakIdb) {
    const r = await open(browser, breakIdb);
    await chat(r.page, 'alice', '!дрейк червоний');
    await chat(r.page, 'bobgold', '!дрейк золотий');
    await chat(r.page, 'alice', '!черга');
    await chat(r.page, 'bobgold', '!черга');
    const result = await playOut(r.page);
    let exported = null;
    try { exported = JSON.parse(await exportLog(r.page)); } catch (e) { r.errors.push('export: ' + e.message); }
    const events = await r.page.evaluate(() => window.__fightEvents);
    await r.context.close();
    return { result, events, errors: r.errors, exported };
}

run().catch(e => { console.error(e); process.exit(1); });
