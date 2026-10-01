// UI smoke test: opens the game in headless Chromium with a fake tmi.js,
// plays through it by "typing" chat commands, and checks the layout rules.
//
// Usage (from the project folder):
//   npm run test:ui                    all versions (currently just showcase)
//   node tests/ui.js showcase          one version
//
// Checks: no JS page errors, every drake type registers and its sprite renders,
// a full fight finishes, !стата / !титул / !шанси answer, HP bars never move
// vertically, the info feed never overflows its column, buff/debuff chips read "name · what's left" and aren't cut off. The White Dragon is streamer-only: it's refused while no
// streamer is set and for every other viewer (!дрейк / !drake / !рерол), and works for the streamer set in Test Settings.
// Fights with the dragon (one natural, one with vampire rolls forced) must never log a heal above the healer's max HP.
// A separate run loads an old save (viewers' White Drakes) and checks the migration to Green is correct and idempotent.
// Screenshots go to tests/screenshots/. Game timers run on a fake clock, so fights take seconds.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const STEP_MS = 500;              // fake-clock step between layout samples during a fight
const FIGHT_LIMIT_MS = 5 * 60000; // 30s countdown + 30 turns x 4.5s fits easily

// Per-version setup: [username, color word, element type] for each drake type, and the duels to run.
const VERSIONS = {
    showcase: {
        file: 'showcase/index.html',
        // 6 viewer elements + the White Dragon, which only the streamer (set in Test Settings) can pick
        drakes: [['ruby', 'червоний', 'red'], ['sapphire', 'синій', 'blue'], ['onyx', 'чорний', 'black'], ['topaz', 'золотий', 'gold'],
                 ['amethyst', 'фіолетовий', 'purple'], ['jade', 'зелений', 'green'], ['teststreamer', 'білий', 'white']],
        // First pair fights ranked via !черга; the rest are friendly duels so every sprite gets drawn
        duels: [['onyx', 'topaz'], ['amethyst', 'jade'], ['teststreamer', 'ruby']],
        dragon: { streamer: 'teststreamer', type: 'white', titleId: 999, storageKey: 'drake_arena_showcase_streamer' },
        hasInfoFeed: true,
        hasOdds: true,
    },
};

// Showcase saves from before the Green Drake existed: 'white' was an ordinary viewer element. Keys are Twitch usernames.
// Expected after migrateOldSaves (streamer = teststreamer): the streamer's dragon stays 'white', every other 'white' → 'green'
// with XP kept, title 999 only on the dragon, everything else untouched.
const OLD_SHOWCASE_SAVE = {
    teststreamer: { name: 'teststreamer', color: '#9fe3ff', drakeObj: { name: { uk: 'Білий Дракон 🐉', en: 'White Dragon 🐉' }, type: 'white' }, xp: 1000000, level: 20, title: { id: 999 } },
    snowfan:   { name: 'snowfan', color: '#8ab4f8', drakeObj: { name: { uk: 'Білий Дрейк ⬜', en: 'White Drake ⬜' }, type: 'white' }, xp: 5000, level: 8, title: { id: 1 } },
    oldwhite:  { name: 'oldwhite', color: '#8ab4f8', drakeObj: { name: 'Білий Дрейк ⬜', type: 'white' }, xp: 300, level: 2, title: { id: 2 } },
    redfan:    { name: 'redfan', color: '#8ab4f8', drakeObj: { name: { uk: 'Червоний Дрейк 🟥', en: 'Red Drake 🟥' }, type: 'red' }, xp: 1200, level: 4, title: { id: 3 } },
    goldfan:   { name: 'goldfan', color: '#8ab4f8', drakeObj: { name: { uk: 'Золотий Дрейк 🟨', en: 'Gold Drake 🟨' }, type: 'gold' }, xp: 40, level: 1, title: { id: 5 } },
    // Test-panel fighter that was set up as the dragon: not the streamer, so it becomes Green and loses title 999
    'QA-Tester-Omega': { name: 'QA-Tester-Omega', color: '#00ff7f', drakeObj: { name: { uk: 'Білий Дракон 🐉', en: 'White Dragon 🐉' }, type: 'white' }, xp: 1000000, level: 20, title: { id: 999 } },
};
const MIGRATION_EXPECT = { teststreamer: 'white', snowfan: 'green', oldwhite: 'green', redfan: 'red', goldfan: 'gold', 'QA-Tester-Omega': 'green' };

// Stands in for tmi.js: keeps the page's message handler and lets the test "type" into chat
const FAKE_TMI = `
window.tmi = { Client: class {
    constructor(opts) { this.opts = opts || {}; this.handlers = {}; window.__tmiClient = this; }
    connect() { return Promise.resolve(); }
    on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return this; }
} };
window.__chat = (user, message, extra) => {
    const c = window.__tmiClient;
    if (!c) throw new Error('page never created a tmi.Client');
    let ch = (c.opts.channels || ['test'])[0];
    if (!ch.startsWith('#')) ch = '#' + ch;
    const ctx = Object.assign({ username: user, 'display-name': user, color: '#8ab4f8' }, extra || {});
    (c.handlers.message || []).forEach(fn => fn(ch, ctx, message, false));
};`;

// Runs in the page: positions of both HP bars
function measureBars() {
    return ['bar-p1', 'bar-p2'].map(id => {
        const bar = document.getElementById(id);
        return { id, top: bar.getBoundingClientRect().top, containerTop: bar.parentElement.getBoundingClientRect().top };
    });
}

// Runs in the page: ways the info feed spills out of its column, as [kind, detail] (empty = fine)
function infoFeedProblems() {
    const out = [];
    const feed = document.getElementById('info-feed');
    const col = feed.closest('.leaderboard-container');
    const f = feed.getBoundingClientRect(), c = col.getBoundingClientRect();
    if (feed.scrollHeight > feed.clientHeight + 1) out.push(['cards clipped at the bottom', `content ${feed.scrollHeight}px tall, only ${feed.clientHeight}px fit`]);
    if (feed.scrollWidth > feed.clientWidth + 1) out.push(['content too wide', `content ${feed.scrollWidth}px wide, only ${feed.clientWidth}px fit`]);
    if (f.bottom > c.bottom + 0.5) out.push(['feed below its column', `feed bottom ${f.bottom.toFixed(1)}, column bottom ${c.bottom.toFixed(1)}`]);
    if (f.right > c.right + 0.5) out.push(['feed past its column', `feed right ${f.right.toFixed(1)}, column right ${c.right.toFixed(1)}`]);
    if (c.bottom > window.innerHeight + 0.5) out.push(['column below the screen', `column bottom ${c.bottom.toFixed(1)} > ${window.innerHeight}`]);
    [...feed.children].forEach(card => {
        const r = card.getBoundingClientRect();
        if (r.right > f.right + 0.5 || r.left < f.left - 0.5) out.push(['card sticks out sideways', `"${card.innerText.slice(0, 40)}..."`]);
    });
    return out;
}

// Runs in the page: text of every buff/debuff chip on both cards, and whether its ellipsis cut it off
function effectChips() {
    return [...document.querySelectorAll('#status-p1 .status-item, #status-p2 .status-item')].map(c => [c.innerText.trim(), c.scrollWidth > c.clientWidth + 1]);
}

// Runs in the page: the Element Power meter rows — where they sit relative to their neighbours and the sprite, their
// text, whether it's cut off, and the meter value (from the fight state)
function powerMeters() {
    return ['p1', 'p2'].map(p => {
        const row = document.getElementById(`power-${p}`), r = row.getBoundingClientRect();
        const info = document.getElementById(`info-${p}`).getBoundingClientRect(), stats = document.getElementById(`stats-sub-${p}`).getBoundingClientRect();
        const sprite = row.parentElement.querySelector('.sprite-wrap').getBoundingClientRect();
        const content = [...row.children].reduce((m, c) => Math.max(m, c.getBoundingClientRect().right), r.left);
        const name = document.getElementById(`name-${p}`).innerText.replace('@', '').trim();
        const st = isBattleRunning && typeof battleFx !== 'undefined' && battleFx && battleFx[name];   // between fights the cards are idle
        return { p, text: row.innerText.replace(/\s+/g, ' ').trim(), pips: row.querySelectorAll('.pm-pip').length, on: row.querySelectorAll('.pm-pip.on').length,
                 meter: st ? st.meter : null, overlapsInfo: r.top < info.bottom - 0.5, overlapsStats: r.bottom > stats.top + 0.5,
                 overlapsSprite: content > sprite.left + 0.5 && r.bottom > sprite.top && r.top < sprite.bottom, cut: row.scrollWidth > row.clientWidth + 1 };
    });
}

// Runs in the page: how many pixels each fighter-card sprite actually drew
function spriteState() {
    return ['p1', 'p2'].map(p => {
        const cv = document.getElementById(`sprite-${p}`);
        const r = cv.getBoundingClientRect();
        const data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let painted = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted++;
        return { p, name: document.getElementById(`name-${p}`).innerText.replace('@', '').trim().toLowerCase(),
                 painted, w: r.width, h: r.height, visible: getComputedStyle(cv).visibility !== 'hidden' && getComputedStyle(cv).display !== 'none' };
    });
}

async function testVersion(browser, key) {
    const cfg = VERSIONS[key];
    const failures = [];
    const skipped = [];
    const fail = msg => { failures.push(msg); console.log(`    ✗ ${msg}`); };
    const pass = msg => console.log(`    ✓ ${msg}`);
    const typeOf = Object.fromEntries(cfg.drakes.map(([u, , t]) => [u, t]));

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });
    await page.route(/tmi(\.min)?\.js/, r => r.fulfill({ contentType: 'application/javascript', body: FAKE_TMI }));
    await page.clock.install({ time: new Date('2026-01-01T12:00:00') });
    await page.goto('file:///' + path.join(ROOT, cfg.file).replace(/\\/g, '/'));
    // The overlay is transparent for OBS; paint a dark backdrop so screenshots are readable (layout unchanged)
    await page.addStyleTag({ content: 'html { background: #1e1f26; }' });

    // Info cards fade in with a 0.35s CSS animation (real time, not the fake clock), so let it finish first
    const shot = async name => { await page.waitForTimeout(450); await page.screenshot({ path: path.join(SHOTS, `${key}-${name}.png`) }); };
    const chat = (user, msg, extra) => page.evaluate(([u, m, e]) => window.__chat(u, m, e), [user, msg, extra]);
    const logText = () => page.locator('#battle-log').innerText();
    const infoCount = () => page.locator('#info-feed .info-card').count();
    // Feed problems are collected per kind and reported once at the end (first time seen + how often)
    const feedIssues = new Map();
    const checkFeed = async when => {
        if (!cfg.hasInfoFeed) return;
        for (const [kind, detail] of await page.evaluate(infoFeedProblems)) {
            const seen = feedIssues.get(kind);
            if (seen) seen.count++;
            else feedIssues.set(kind, { when, detail, count: 1 });
        }
    };
    // A command "answered" if the info feed (or the battle log, for a version without one) got new text
    const expectReply = async (label, send) => {
        const before = cfg.hasInfoFeed ? await page.locator('#info-feed').innerHTML() : await logText();
        await send();
        await page.clock.runFor(400);
        const after = cfg.hasInfoFeed ? await page.locator('#info-feed').innerHTML() : await logText();
        if (after === before) fail(`${label}: no reply appeared`);
        else pass(`${label} answered`);
    };

    console.log(`\n=== ${key} (${cfg.file}) ===`);

    // 0. The White Dragon with no streamer set: nobody can take it
    const dragonCfg = cfg.dragon;
    if (dragonCfg) {
        await expectReply('!дрейк білий with no streamer set is refused', () => chat(dragonCfg.streamer, '!дрейк білий'));
        if ((await page.evaluate('getDragonDB()'))[dragonCfg.streamer]) fail(`@${dragonCfg.streamer} got a save while STREAMER_USER was empty`);
        else pass('with STREAMER_USER empty nobody gets the White Dragon');
        // Set the streamer the way a user would: ⚙️ Test Settings → Streamer field (saved on change), then close the panel
        await page.click('button[data-i18n="btn_settings"]');
        await page.fill('#debug-streamer', '@' + dragonCfg.streamer.toUpperCase());   // "@" and case are ignored
        await page.press('#debug-streamer', 'Tab');
        await page.click('button[data-i18n="btn_settings"]');
        const stored = await page.evaluate(k => [localStorage.getItem(k), STREAMER_USER], dragonCfg.storageKey);
        if (stored[0] !== dragonCfg.streamer || stored[1] !== dragonCfg.streamer) fail(`Test Settings should save the streamer as "${dragonCfg.streamer}", got ${JSON.stringify(stored)}`);
        else pass(`Test Settings saved streamer "${stored[0]}"`);
        if (!await page.locator(`#sim-chips [data-user="${dragonCfg.streamer}"]`).count()) fail('chat simulator has no streamer chip after setting the streamer');
        else pass('chat simulator shows a streamer chip');
    }

    const barBaseline = await page.evaluate(measureBars);
    const barMoves = new Set();
    const spritesSeen = {};
    const chipsSeen = new Map();   // buff/debuff chip text → cut off by its ellipsis?
    const meterIssues = new Set(), meterTexts = new Set();
    let meterFullSeen = 0;
    const chipLangs = new Map(), meterLangs = {}, meterFullLangs = {};   // which page language each chip / meter state was seen in

    // Plays one fight from start to finish, sampling the layout every STEP_MS of game time
    const runFight = async (label, start, midShot) => {
        await start();
        await page.clock.runFor(STEP_MS);
        if (!await page.evaluate('isBattleRunning')) { fail(`${label}: fight did not start`); return; }
        let elapsed = 0, shotTaken = !midShot;
        while (elapsed < FIGHT_LIMIT_MS) {
            const bars = await page.evaluate(measureBars);
            bars.forEach((b, i) => {
                const base = barBaseline[i];
                const dy = Math.max(Math.abs(b.top - base.top), Math.abs(b.containerTop - base.containerTop));
                if (dy > 0.5) barMoves.add(`${label}: #${b.id} moved ${dy.toFixed(1)}px (top ${base.top.toFixed(1)} → ${b.top.toFixed(1)}) at ${(elapsed / 1000).toFixed(1)}s`);
            });
            const lang = await page.evaluate('currentLang');
            for (const [text, cut] of await page.evaluate(effectChips)) {
                chipsSeen.set(text, chipsSeen.get(text) || cut);
                chipLangs.set(text, lang);
            }
            for (const m of await page.evaluate(powerMeters)) {
                if (m.overlapsInfo || m.overlapsStats || m.overlapsSprite) meterIssues.add(`${label}: #power-${m.p} overlaps ${[m.overlapsInfo && 'the info line', m.overlapsStats && 'the stats box', m.overlapsSprite && 'the sprite'].filter(Boolean).join(' and ')}`);
                if (m.cut) meterIssues.add(`${label}: #power-${m.p} text cut off ("${m.text}")`);
                if (m.meter === null || m.pips === 0) continue;   // White Dragon (no meter) or no fight state yet
                meterTexts.add(m.text);
                meterLangs[lang] = (meterLangs[lang] || 0) + 1;
                if (m.meter === 5) meterFullLangs[lang] = (meterFullLangs[lang] || 0) + 1;
                const short = lang === 'uk' ? 'СИЛА' : 'POWER', ready = lang === 'uk' ? '✦ ГОТОВО' : '✦ READY';
                if (m.pips !== 5 || m.on !== m.meter || !m.text.startsWith(short)) meterIssues.add(`${label}: #power-${m.p} shows ${m.on}/${m.pips} pips "${m.text}" for meter ${m.meter}`);
                if (m.meter === 5) { meterFullSeen++; if (!m.text.includes(ready)) meterIssues.add(`${label}: full meter without "${ready}": "${m.text}"`); }
                else if (m.text.includes(ready)) meterIssues.add(`${label}: "${ready}" shown at meter ${m.meter}`);
            }
            for (const s of await page.evaluate(spriteState)) {
                const t = typeOf[s.name];
                if (t && s.painted > 20 && s.w > 0 && s.h > 0 && s.visible) spritesSeen[t] = true;
            }
            await checkFeed(`${label}, ${(elapsed / 1000).toFixed(1)}s`);
            if (!shotTaken && elapsed >= 55000) { await shot(midShot); shotTaken = true; }   // ~5 turns in
            if (!await page.evaluate('isBattleRunning')) break;
            await page.clock.runFor(STEP_MS);
            elapsed += STEP_MS;
        }
        const log = await logText();
        if (await page.evaluate('isBattleRunning')) fail(`${label}: fight still running after ${FIGHT_LIMIT_MS / 1000}s of game time`);
        else if (/Критична помилка симуляції|Critical simulation error/.test(log)) fail(`${label}: fight crashed — ${log.match(/(Критична помилка симуляції|Critical simulation error)[^\n]*/)[0]}`);
        else pass(`${label} finished after ${(elapsed / 1000).toFixed(1)}s of game time`);
    };

    // 1. Register every drake type
    for (const [user, color] of cfg.drakes) {
        await expectReply(`!дрейк ${color} (@${user})`, () => chat(user, `!дрейк ${color}`));
    }
    const db = await page.evaluate('getDragonDB()');
    for (const [user, , type] of cfg.drakes) {
        const got = db[user] && db[user].drakeObj && db[user].drakeObj.type;
        if (got !== type) fail(`@${user} should have a ${type} drake, save has ${got || 'nothing'}`);
    }
    if (dragonCfg) {
        const me = db[dragonCfg.streamer];
        if (!me || !me.title || me.title.id !== dragonCfg.titleId) fail(`@${dragonCfg.streamer}'s dragon should have title ${dragonCfg.titleId}, has ${me && me.title && me.title.id}`);
        else pass(`@${dragonCfg.streamer}'s White Dragon has title ${dragonCfg.titleId}`);
        // Other viewers can't take the streamer's dragon, in either language or by reroll
        for (const cmd of ['!дрейк білий', '!drake white']) {
            await expectReply(`${cmd} by a viewer is refused`, () => chat('sneaky', cmd));
            if ((await page.evaluate('getDragonDB()')).sneaky) fail(`@sneaky got a save after ${cmd}: the dragon should be streamer-only`);
            else pass(`@sneaky could not take the White Dragon with ${cmd}`);
        }
        await expectReply('!рерол білий by a viewer is refused', () => chat('ruby', '!рерол білий', { 'custom-reward-id': 'ui-test-reward' }));
        const rubyType = (await page.evaluate('getDragonDB()')).ruby.drakeObj.type;
        if (rubyType !== 'red') fail(`@ruby rerolled into ${rubyType}: viewers must not reroll into the dragon`);
        else pass('@ruby could not reroll into the White Dragon');
    }
    await checkFeed('after registering');
    await shot('01-registered');

    // 2. !стата, !титул (as a channel-point reward), !шанси
    await expectReply('!стата', () => chat('ruby', '!стата'));
    await checkFeed('after !стата');
    await shot('02-stata');
    const titleBefore = JSON.stringify((await page.evaluate('getDragonDB()')).sapphire.title);
    await expectReply('!титул', () => chat('sapphire', '!титул', { 'custom-reward-id': 'ui-test-reward' }));
    const titleAfter = (await page.evaluate('getDragonDB()')).sapphire.title;
    if (!titleAfter) fail('!титул: @sapphire still has no title');
    else pass(`!титул rolled "${titleAfter.name.uk || titleAfter.name}"${JSON.stringify(titleAfter) === titleBefore ? ' (same as before — fine, rolls can repeat)' : ''}`);
    await checkFeed('after !титул');
    await shot('03-titul');
    if (cfg.hasOdds) {
        await expectReply('!шанси', () => chat('onyx', '!шанси'));
        await checkFeed('after !шанси');
        await shot('04-shansy');
    } else skipped.push('!шанси (command does not exist in the showcase)');
    if (!cfg.hasInfoFeed) skipped.push('info feed overflow (showcase has no info feed; replies go to the battle log)');

    // 3. A full ranked fight through the queue, then duels so every drake type is drawn
    const [[a], [b]] = cfg.drakes;
    await runFight(`ranked fight @${a} vs @${b}`, async () => { await chat(a, '!черга'); await chat(b, '!черга'); }, '05-mid-fight');
    await shot('06-fight-over');
    for (const [challenger, target] of cfg.duels) {
        await page.clock.runFor(6000);   // let the post-fight queue check pass
        // Switch the page language before each duel, so the card checks (chips, meter row) run in both languages:
        // the Ukrainian text is longer in places
        await page.click('#lang-toggle-btn');
        await runFight(`duel @${challenger} vs @${target} (${await page.evaluate('currentLang')})`, async () => {
            await chat(challenger, `!бій @${target}`);
            await chat(target, '!прийняти');
        });
    }
    // 3b. Heals logged in a fight with the streamer's dragon must be what was actually restored (≤ that fighter's max HP)
    if (dragonCfg) {
        const dragonDuelCfg = cfg.duels.find(d => d.includes(dragonCfg.streamer));
        const pair = [dragonCfg.streamer, dragonDuelCfg ? dragonDuelCfg.find(u => u !== dragonCfg.streamer) : cfg.drakes[0][0]];
        const maxHp = Object.fromEntries(await page.evaluate(names => names.map(n => {
            const d = getDragonDB()[n];
            return [n.toLowerCase(), getMaxHP(calculateLevelAndProgress(d.xp).level, d.drakeObj.type, d.title)];
        }), pair));
        // The log keeps only the last 35 lines, so collect every line as it is added
        const startLogCapture = () => page.evaluate(() => {
            window.__logLines = [];
            if (window.__logObs) window.__logObs.disconnect();
            window.__logObs = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => window.__logLines.push(n.textContent))));
            window.__logObs.observe(document.getElementById('battle-log'), { childList: true });
        });
        const HEAL_RES = [/🩸 \+(-?\d+) HP/, /🧛 \+(-?\d+) HP/, /(?:Регенерація|Regeneration) \(\+(-?\d+) HP\)/, /(?:відновлює|restores) (-?\d+) HP/];
        const checkHeals = async label => {
            const lines = await page.evaluate(() => window.__logLines);
            let heals = 0, vampHits = 0;
            const bad = [];
            for (const line of lines) {
                const who = (line.match(/@([\w-]+)/) || [])[1];
                if (/(Вамп|Vamp) \//.test(line) && who && who.toLowerCase() === dragonCfg.streamer) vampHits++;
                for (const re of HEAL_RES) {
                    const m = line.match(re);
                    if (!m) continue;
                    heals++;
                    const amount = Number(m[1]), max = maxHp[(who || '').toLowerCase()];
                    if (max === undefined) bad.push(`heal of ${amount} by unknown fighter: "${line.trim().slice(0, 120)}"`);
                    else if (amount > max) bad.push(`@${who} healed +${amount} HP but max HP is ${max}: "${line.trim().slice(0, 120)}"`);
                    else if (amount <= 0) bad.push(`@${who} logged a +${amount} HP heal (should be skipped): "${line.trim().slice(0, 120)}"`);
                }
            }
            if (!lines.length) fail(`${label}: captured no battle-log lines`);
            else if (bad.length) bad.slice(0, 5).forEach(b => fail(`${label}: ${b}`));
            else pass(`${label}: ${heals} logged heal(s) all within max HP (${lines.length} log lines, ${vampHits} dragon vampire hit(s))`);
            return vampHits;
        };
        const dragonDuel = async label => {
            await page.clock.runFor(3 * 60000 + 6000);   // past the 3-minute per-player fight cooldown
            await startLogCapture();
            await runFight(label, async () => {
                await chat(pair[0], `!бій @${pair[1]}`);
                await chat(pair[1], '!прийняти');
            });
            return checkHeals(label);
        };
        await dragonDuel(`heal log: duel @${pair[0]} vs @${pair[1]}`);
        // A natural fight rarely has a dragon vampire hit (10% roll, and the dragon one-shots), so force one:
        // every roll lands in [0.9, 1), which picks the vampire attack type for both fighters
        await page.evaluate(() => {
            window.__realRandom = Math.random;
            let s = 12345;
            Math.random = () => { s = (s * 16807) % 2147483647; return 0.9 + 0.0999 * (s / 2147483647); };
        });
        const forcedVamp = await dragonDuel(`heal log: duel @${pair[0]} vs @${pair[1]} (vampire rolls forced)`);
        await page.evaluate(() => { Math.random = window.__realRandom; });
        if (!forcedVamp) fail('forced-vampire duel: the dragon never made a vampire attack, so the heal cap was not exercised');
    }

    // 3c. Worst case on a real card, in both languages: the longest buff and debuff chips, and a full meter with Ice
    // Mirror's hits left (the longest the meter row gets). Nothing may be cut off or overlap.
    for (const lang of ['uk', 'en']) {
        const worst = await page.evaluate(lang => {
            currentLang = lang;
            const len = id => effectChipText({ id, left: EFFECTS[id].count }, lang).length;
            const longest = ids => [...ids].filter(id => EFFECTS[id].lasts !== 'instant').sort((a, b) => len(b) - len(a)).slice(0, EFFECT_CAST.maxPerKind);
            const fx = { buff: longest(BUFF_IDS).map(id => ({ id, left: EFFECTS[id].count, power: 1 })),
                         debuff: longest(DEBUFF_IDS).map(id => ({ id, left: EFFECTS[id].count, power: 1 })),
                         meter: METER.max, halfDone: true, mirror: CLASS_ULTIMATES.mirror.nums.hits };
            const db = getDragonDB();
            db.__worst = { name: '__worst', color: '#fff', drakeObj: DRAKE_TYPES.find(d => d.type === 'blue'), title: TITLES_DB.find(t => t.name.uk.length > 25) || TITLES_DB[0], xp: 0 };
            updateFighterCard('p1', db.__worst, fx);
            updateStatusUI('__worst', 1, 'blue', db.__worst.title, fx);
            const chips = [...document.querySelectorAll('#status-p1 .status-item')].map(c => ({ text: c.innerText, cut: c.scrollWidth > c.clientWidth + 1 }));
            const row = document.getElementById('power-p1');
            return { chips, meter: row.innerText.replace(/\s+/g, ' ').trim(), meterCut: row.scrollWidth > row.clientWidth + 1 };
        }, lang);
        const meterIssue = (await page.evaluate(powerMeters))[0];
        const bad = worst.chips.filter(c => c.cut).map(c => c.text);
        if (worst.chips.length !== 4 || bad.length || worst.meterCut || meterIssue.overlapsInfo || meterIssue.overlapsStats || meterIssue.overlapsSprite)
            fail(`[${lang}] worst-case card text: ${bad.length ? `chips cut off: ${bad.join(' | ')}` : ''} ${worst.meterCut ? `meter row cut off: "${worst.meter}"` : ''} ${worst.chips.length !== 4 ? `${worst.chips.length} chips shown` : ''}`);
        else pass(`[${lang}] worst-case card text fits: ${worst.chips.map(c => `"${c.text}"`).join(', ')}; meter "${worst.meter}"`);
    }
    await page.evaluate(lang => { currentLang = lang; }, await page.evaluate('document.documentElement.lang || currentLang'));

    await shot('07-all-fights-done');
    await checkFeed('after all fights');

    // 4. Verdicts
    // Chips say what's left in words, e.g. "💢 Лють · ще 2 атаки" / "💢 Rage · 2 attacks left", and fit on the card
    const CHIP_RE = { uk: /^\S+ .+ · ще \d+ (атака|атаки|атак|удар|удари|ударів|хід|ходи|ходів)$/, en: /^\S+ .+ · \d+ (attack|hit|turn)s? left$/ };
    const badChips = [...chipsSeen.keys()].filter(t => !CHIP_RE[chipLangs.get(t)].test(t));
    // Both languages must actually have been on screen, for chips and for the meter row (including a full one)
    for (const l of ['uk', 'en']) {
        const chips = [...chipLangs.values()].filter(x => x === l).length;
        if (!chips) fail(`no buff/debuff chip was seen with the page in ${l}`);
        if (!meterLangs[l]) fail(`no Element Power meter row was seen with the page in ${l}`);
        else if (!meterFullLangs[l]) fail(`no full meter ("✦ ...") was seen with the page in ${l}`);
        else pass(`[${l}] ${chips} different chips and ${meterLangs[l]} meter-row samples (${meterFullLangs[l]} full) checked in this language`);
    }
    const cutChips = [...chipsSeen].filter(([, cut]) => cut).map(([t]) => t);
    if (!chipsSeen.size) fail('no buff/debuff chip appeared on a fighter card in any fight');
    else if (badChips.length) fail(`buff/debuff chips not in the "name · what's left" form: ${badChips.slice(0, 5).join(' | ')}`);
    else pass(`${chipsSeen.size} different buff/debuff chips, all "name · what's left" (e.g. "${[...chipsSeen.keys()][0]}")`);
    if (cutChips.length) fail(`buff/debuff chips cut off on the card: ${cutChips.slice(0, 5).join(' | ')}`);
    // Element Power meter row: inside its gap (no overlap with the info line, stats box or sprite), 5 pips matching the
    // meter, the label in the page language, "✦ READY" only when full, never cut off
    if (meterIssues.size) [...meterIssues].slice(0, 6).forEach(fail);
    else if (!meterTexts.size) fail('no Element Power meter row was seen during the fights');
    else pass(`Element Power meter rows: ${meterTexts.size} different states, pips match the meter, full meter shown ${meterFullSeen} time(s) with READY, never overlapping or cut off`);
    if (barMoves.size) [...barMoves].slice(0, 10).forEach(fail);
    else pass('HP bars stayed at the same vertical position the whole time');
    const missing = cfg.drakes.map(([, , t]) => t).filter(t => !spritesSeen[t]);
    if (missing.length) fail(`sprites never rendered for: ${missing.join(', ')}`);
    else pass(`sprites rendered for all ${cfg.drakes.length} types`);
    if (cfg.hasInfoFeed) {
        if (feedIssues.size) feedIssues.forEach((v, kind) => fail(`info feed: ${kind} — first ${v.when} (${v.detail}), seen in ${v.count} check(s)`));
        else pass('info feed never overflowed its column');
    }
    if (pageErrors.length) [...new Set(pageErrors)].forEach(e => fail(`JS error: ${e}`));
    else pass('no JS errors');
    skipped.forEach(s => console.log(`    – skipped: ${s}`));

    await context.close();
    return failures;
}

// Loads the page on top of OLD_SHOWCASE_SAVE and checks the White → Green swap. Then proves the migration is idempotent
// twice over: re-running migrateOldSaves() in the same page, and loading a fresh page seeded with the migrated save.
// Every load is seeded explicitly by its own init script, so nothing depends on browser storage surviving a reload
// (Chromium commits DOM storage asynchronously; relying on that made this check flaky on CI).
async function testMigration(browser, key) {
    const failures = [];
    const fail = msg => { failures.push(msg); console.log(`    ✗ ${msg}`); };
    const pass = msg => console.log(`    ✓ ${msg}`);
    const cfg = VERSIONS[key];
    const DB_KEY = 'drake_arena_showcase_db';
    console.log(`
=== ${key}: old-save migration ===`);

    const context = await browser.newContext();
    const pageErrors = [];
    // Opens the game in a new page whose localStorage holds exactly `save` (plus the streamer) before any game script runs
    const openWithSave = async save => {
        const page = await context.newPage();
        page.on('pageerror', e => pageErrors.push(e.message));
        await page.route(/tmi(\.min)?\.js/, r => r.fulfill({ contentType: 'application/javascript', body: FAKE_TMI }));
        await page.addInitScript(([dbKey, raw, streamerKey, streamer]) => {
            localStorage.setItem(dbKey, raw);
            localStorage.setItem(streamerKey, streamer);
        }, [DB_KEY, save, cfg.dragon.storageKey, cfg.dragon.streamer]);
        await page.goto('file:///' + path.join(ROOT, cfg.file).replace(/\\/g, '/'));
        return page;
    };
    // Which users differ between two raw saves, for a readable failure message
    const changedUsers = (a, b) => {
        const x = JSON.parse(a), y = JSON.parse(b);
        return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(u => JSON.stringify(x[u]) !== JSON.stringify(y[u]))
            .map(u => `@${u} ${JSON.stringify(x[u] && { type: x[u].drakeObj.type, title: x[u].title && x[u].title.id })} → ${JSON.stringify(y[u] && { type: y[u].drakeObj.type, title: y[u].title && y[u].title.id })}`).join('; ');
    };

    const page = await openWithSave(JSON.stringify(OLD_SHOWCASE_SAVE));
    const raw1 = await page.evaluate(k => localStorage.getItem(k), DB_KEY);
    const db = JSON.parse(raw1);
    const drakeNames = await page.evaluate(() => Object.fromEntries(DRAKE_TYPES.map(d => [d.type, d.name])));

    for (const [user, type] of Object.entries(MIGRATION_EXPECT)) {
        const d = db[user];
        const got = d && d.drakeObj && d.drakeObj.type;
        if (got !== type) fail(`@${user}: expected ${type}, save has ${got || 'nothing'}`);
        else if (JSON.stringify(d.drakeObj.name) !== JSON.stringify(drakeNames[type])) fail(`@${user}: type ${type} but name is ${JSON.stringify(d.drakeObj.name)}`);
        else if (d.xp !== OLD_SHOWCASE_SAVE[user].xp) fail(`@${user}: xp changed ${OLD_SHOWCASE_SAVE[user].xp} → ${d.xp}`);
        else pass(`@${user}: ${OLD_SHOWCASE_SAVE[user].drakeObj.type} → ${type} (${d.drakeObj.name.en}), xp kept`);
    }
    const titleOf = u => db[u] && db[u].title && db[u].title.id;
    if (titleOf('QA-Tester-Omega') === cfg.dragon.titleId) fail('@QA-Tester-Omega is no longer the dragon but kept title 999');
    else pass(`@QA-Tester-Omega (not the streamer) lost title 999 → ${db['QA-Tester-Omega'].title.name.en}`);
    const st = db[cfg.dragon.streamer] && db[cfg.dragon.streamer].title;
    if (titleOf(cfg.dragon.streamer) !== cfg.dragon.titleId || !st.name) fail(`streamer should keep a full title 999, got ${JSON.stringify(st)}`);
    else pass(`streamer keeps title 999 (${st.name.en})`);

    // Same page: run the migration again (as happens when the streamer setting changes)
    const rawRerun = await page.evaluate(k => { migrateOldSaves(); return localStorage.getItem(k); }, DB_KEY);
    if (rawRerun !== raw1) fail(`running migrateOldSaves() again changed the save: ${changedUsers(raw1, rawRerun)}`);
    else pass('re-running migrateOldSaves() left the save byte-for-byte identical');

    // Fresh page loaded on top of the migrated save: the on-load migration must leave it alone
    const page2 = await openWithSave(raw1);
    const raw2 = await page2.evaluate(k => localStorage.getItem(k), DB_KEY);
    if (raw2 !== raw1) fail(`loading the migrated save changed it again (migration is not idempotent): ${changedUsers(raw1, raw2)}`);
    else pass('loading the migrated save left it byte-for-byte identical (idempotent)');

    if (pageErrors.length) [...new Set(pageErrors)].forEach(e => fail(`JS error: ${e}`));
    else pass('no JS errors');
    await context.close();
    return failures;
}

(async () => {
    const only = process.argv[2];
    if (only && !VERSIONS[only]) { console.error(`Unknown version "${only}". Use: ${Object.keys(VERSIONS).join(' | ')}`); process.exit(1); }
    fs.mkdirSync(SHOTS, { recursive: true });
    const browser = await chromium.launch();
    let total = 0;
    try {
        for (const key of only ? [only] : Object.keys(VERSIONS)) {
            total += (await testVersion(browser, key)).length;
            if (VERSIONS[key].dragon) total += (await testMigration(browser, key)).length;
        }
    } finally {
        await browser.close();
    }
    console.log(total ? `\n${total} check(s) failed. Screenshots: tests/screenshots/` : '\nAll UI checks passed. Screenshots: tests/screenshots/');
    process.exit(total ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
