// UI smoke test: opens the game in headless Chromium with a fake tmi.js,
// plays through it by "typing" chat commands, and checks the layout rules.
//
// Usage (from the project folder):
//   npm run test:ui                    all versions (currently just showcase)
//   node tests/ui.js showcase          one version
//
// Checks: no JS page errors, every drake type registers and its sprite renders,
// a full fight finishes, !стата / !титул / !шанси answer, HP bars never move
// vertically, the info feed never overflows its column, buff/debuff chips read "name · what's left" and aren't cut off. The streamer's
// two forms are streamer-only: the White Drake (!дрейк білий) and the White Dragon (!дракон) are refused while no streamer is
// set and for every other viewer (!дрейк / !drake / !рерол / !дракон), and work for the streamer set in Test Settings, who
// fights as the White Drake, then switches to the Dragon and back with its XP kept: all 8 drake types are drawn.
// Fights with the dragon (one natural, one with vampire rolls forced) must never log a heal above the healer's max HP.
// A separate run loads an old save (viewers' White Drakes) and checks the migration to Green is correct and idempotent,
// and that the streamer's old Dragon save gets a White Drake at level 1 behind it.
// Another checks the streamer card in the side column draws the streamer's own drake: the White Drake (at an exact 2x,
// centred in the dragon's slot), the dragon after !дракон, then the White Drake again.
// Another loads a save whose drake has title 189 under its old Ukrainian name: the drake shows «Герб чи число» (English
// "Heads or Tails"), and still does after a reload.
// Screenshots go to tests/screenshots/. Game timers run on a fake clock, so fights take seconds.
// Fights are seeded: Math.random is replaced with a seeded generator before the page loads, so every run plays the same
// fights (UI_SEED=n picks another seed). The game clock is paused and only moved by the test, and visual checks wait
// for the arena's animations first (tests/settle.js). The run prints a fingerprint of the fight events (who fought, every
// HP change, how each fight ended) to compare runs; UI_FILE=path runs the same flow against another copy of the page
// (e.g. main's), which must print the same fingerprint if the fights are the same.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { pageInit } = require('./page_hooks');
const { overlayIconIssues } = require('./overlay_icons');
const { settleArena } = require('./settle');
const { offTwitch } = require('./no_twitch');   // a stand-in tmi.js: window.__chat types into chat, nothing reaches Twitch
const { storageSettled } = require('./storage_sync');

const ROOT = path.join(__dirname, '..');
// A run against another page (UI_FILE) keeps its screenshots apart, so it never replaces this page's review shots
const SHOTS = path.join(__dirname, 'screenshots', process.env.UI_FILE ? 'other-page' : '');
const STEP_MS = 500;              // fake-clock step between layout samples during a fight
const FIGHT_LIMIT_MS = 5 * 60000; // a 2-minute betting window + 30 turns x 4.5s fits
// The default seed is one where both languages show a full Element Power meter during the fights
const SEED = Number(process.env.UI_SEED || 3);


// Per-version setup: [username, color word, element type] for each drake type, and the duels to run.
const VERSIONS = {
    showcase: {
        file: 'showcase/index.html',
        // 6 viewer elements + the streamer's White Drake (!дрейк білий), which only the streamer (set in Test Settings) can
        // pick; the streamer's other form, the White Dragon, comes through !дракон before the heal-log duels (3b)
        drakes: [['ruby', 'червоний', 'red'], ['sapphire', 'синій', 'blue'], ['onyx', 'чорний', 'black'], ['topaz', 'золотий', 'gold'],
                 ['amethyst', 'фіолетовий', 'purple'], ['jade', 'зелений', 'green'], ['teststreamer', 'білий', 'steel']],
        // First pair fights ranked via !черга; the rest are friendly duels so every sprite gets drawn
        duels: [['onyx', 'topaz'], ['amethyst', 'jade'], ['teststreamer', 'ruby']],
        dragon: { streamer: 'teststreamer', type: 'white', titleId: 999, drakeType: 'steel', drakeTitleId: 998, storageKey: 'drake_arena_showcase_streamer' },
        hasInfoFeed: true,
        hasOdds: true,
    },
};

// Showcase saves from before the Green Drake existed: 'white' was an ordinary viewer element. Keys are Twitch usernames.
// Expected after migrateOldSaves (streamer = teststreamer): the streamer's dragon stays 'white' (level 20) with a White Drake
// at level 1 kept behind it for !дракон, every other 'white' → 'green' with XP kept, title 999 only on the dragon,
// everything else untouched.
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
    const col = feed.closest('.panel');
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
    return [...document.querySelectorAll('#status-p1 .status-item, #status-p2 .status-item')].map(c => [window.__vt(c), c.scrollWidth > c.clientWidth + 1]);   // the effect's icon as [id]
}

// Runs in the page: the Element Power meter rows — where they sit relative to their neighbours (the chips above, the HP
// row below) and the sprite, their
// text, whether it's cut off, and the meter value (from the fight state)
function powerMeters() {
    return ['p1', 'p2'].map(p => {
        const row = document.getElementById(`power-${p}`), r = row.getBoundingClientRect();
        const chips = document.getElementById(`status-${p}`).getBoundingClientRect(), hp = row.parentElement.querySelector('.fc-hp').getBoundingClientRect();
        const sprite = row.parentElement.querySelector('.sprite-wrap').getBoundingClientRect();
        // the row's content, from its leftmost to its rightmost child (the right card's row is reversed)
        const kids = [...row.children].map(c => c.getBoundingClientRect()), from = kids.length ? Math.min(...kids.map(c => c.left)) : r.left;
        const content = kids.length ? Math.max(...kids.map(c => c.right)) : r.left;
        const name = document.getElementById(`name-${p}`).innerText.replace('@', '').trim();
        const st = isBattleRunning && typeof battleFx !== 'undefined' && battleFx && battleFx[name];   // between fights the cards are idle
        const d = getDragonStrict(name), ult = d && d.drakeObj ? ultimateFor(d.drakeObj.type) : null;   // «ГОТОВО» shows this ultimate's icon
        return { p, ult, text: window.__vt(row), pips: row.querySelectorAll('.pm-pip').length, on: row.querySelectorAll('.pm-pip.on').length,
                 meter: st ? st.meter : null, overlapsChips: r.height > 0 && r.top < chips.bottom - 0.5, overlapsHp: r.height > 0 && r.bottom > hp.top + 0.5,
                 // the sprite is on the right of the left card and on the left of the right card: check both sides
                 overlapsSprite: Math.min(content, sprite.right) > Math.max(from, sprite.left) + 0.5 && r.bottom > sprite.top && r.top < sprite.bottom, cut: row.scrollWidth > row.clientWidth + 1,
                 // A hit in the air (turn step 1 → 2, 0.6 s): the cards deliberately show the state from before the hit
                 inAir: typeof fv !== 'undefined' && !!fv.hold };
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
    // Each user's drake type as the save has it when a fight starts (the streamer changes form during the run)
    let typeOf = {};

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });   // the icons' stills (prefers-reduced-motion), so the screenshots are the same on every run
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') pageErrors.push('console.error: ' + m.text()); });
    await offTwitch(page);
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));   // game time only moves when the test moves it
    await page.addInitScript(pageInit, SEED);
    const file = process.env.UI_FILE ? path.resolve(process.env.UI_FILE) : path.join(ROOT, cfg.file);
    await page.goto('file:///' + file.replace(/\\/g, '/'));
    console.log(`    (fights seeded with UI_SEED=${SEED}${process.env.UI_FILE ? `, page ${process.env.UI_FILE}` : ''})`);
    // The overlay is transparent for OBS; paint a dark backdrop so screenshots are readable (layout unchanged)
    await page.addStyleTag({ content: 'html { background: #1e1f26; }' });

    // Animations run on real time, not the fake clock: let every one in the arena finish first
    // Every screenshot is also an overlay check: no emoji on stream, every icon at a whole-number scale
    const iconIssues = new Set();
    const shot = async name => { await settleArena(page); (await overlayIconIssues(page)).forEach(i => iconIssues.add(`${name}: ${i}`)); await page.screenshot({ path: path.join(SHOTS, `${key}-${name}.png`) }); };
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
        typeOf = await page.evaluate(() => Object.fromEntries(Object.entries(getDragonDB()).map(([u, d]) => [u.toLowerCase(), d.drakeObj && d.drakeObj.type])));
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
                if (m.overlapsChips || m.overlapsHp || m.overlapsSprite) meterIssues.add(`${label}: #power-${m.p} overlaps ${[m.overlapsChips && 'the effect chips', m.overlapsHp && 'the HP row', m.overlapsSprite && 'the sprite'].filter(Boolean).join(' and ')}`);
                if (m.cut) meterIssues.add(`${label}: #power-${m.p} text cut off ("${m.text}")`);
                if (m.meter === null || m.pips === 0 || m.inAir) continue;   // White Dragon (no meter), no fight state yet, or a hit in the air
                meterTexts.add(m.text);
                meterLangs[lang] = (meterLangs[lang] || 0) + 1;
                if (m.meter === 5) meterFullLangs[lang] = (meterFullLangs[lang] || 0) + 1;
                const short = lang === 'uk' ? 'СИЛА' : 'POWER', ready = `[${m.ult}] ${lang === 'uk' ? 'ГОТОВО' : 'READY'}`;   // the drake's own ultimate icon, no ✦
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
        if (!me || !me.title || me.title.id !== dragonCfg.drakeTitleId) fail(`@${dragonCfg.streamer}'s White Drake should have title ${dragonCfg.drakeTitleId}, has ${me && me.title && me.title.id}`);
        else pass(`@${dragonCfg.streamer}'s White Drake has title ${dragonCfg.drakeTitleId}`);
        // Other viewers can't take either of the streamer's forms, in either language, by reroll or by !дракон
        for (const cmd of ['!дрейк білий', '!drake white', '!дракон', '!dragon']) {
            await expectReply(`${cmd} by a viewer is refused`, () => chat('sneaky', cmd));
            if ((await page.evaluate('getDragonDB()')).sneaky) fail(`@sneaky got a save after ${cmd}: the streamer's forms should be streamer-only`);
            else pass(`@sneaky could not take a streamer form with ${cmd}`);
        }
        await expectReply('!рерол білий by a viewer is refused', () => chat('ruby', '!рерол білий', { 'custom-reward-id': 'ui-test-reward' }));
        await expectReply('!дракон by a viewer with a drake is refused', () => chat('ruby', '!дракон'));
        const rubyType = (await page.evaluate('getDragonDB()')).ruby.drakeObj.type;
        if (rubyType !== 'red') fail(`@ruby became ${rubyType}: viewers must not reroll or switch into a streamer form`);
        else pass('@ruby could not reroll into the White Drake or switch to the White Dragon');
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
        // Past the result screen's hold, so the duel starts at once (5 s on a page without one, e.g. an older main via UI_FILE)
        await page.clock.runFor(await page.evaluate(() => typeof RESULT_HOLD_MS === 'number' ? RESULT_HOLD_MS : 5000) + 1000);
        // Switch the page language before each duel, so the card checks (chips, meter row) run in both languages:
        // the Ukrainian text is longer in places
        await page.click('#lang-toggle-btn');
        await runFight(`duel @${challenger} vs @${target} (${await page.evaluate('currentLang')})`, async () => {
            await chat(challenger, `!бій @${target}`);
            await chat(target, '!прийняти');
        });
    }
    // 3b. Heals logged in a fight with the streamer's dragon must be what was actually restored (≤ that fighter's max HP).
    // The streamer has fought as the White Drake so far: !дракон first, and back to the White Drake after
    let drakeBefore = null;
    if (dragonCfg) {
        drakeBefore = (await page.evaluate('getDragonDB()'))[dragonCfg.streamer];
        await expectReply(`!дракон (@${dragonCfg.streamer})`, () => chat(dragonCfg.streamer, '!дракон'));
        const asDragon = (await page.evaluate('getDragonDB()'))[dragonCfg.streamer];
        if (asDragon.drakeObj.type !== dragonCfg.type || asDragon.title.id !== dragonCfg.titleId || !asDragon.regular || asDragon.regular.xp !== drakeBefore.xp)
            fail(`!дракон should make @${dragonCfg.streamer} the White Dragon (title ${dragonCfg.titleId}) with the White Drake's ${drakeBefore.xp} XP kept, got ${JSON.stringify({ type: asDragon.drakeObj.type, title: asDragon.title.id, regular: asDragon.regular && asDragon.regular.xp })}`);
        else pass(`!дракон: @${dragonCfg.streamer} is the White Dragon (title ${dragonCfg.titleId}); the White Drake waits with its ${drakeBefore.xp} XP`);
    }
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
            await page.clock.runFor(3 * 60000 + 6000);   // a pause between fights (there is no rest now; kept so the fight-events fingerprint compares with main)
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
        // Back to the White Drake: the same XP and title as before (the Dragon gains nothing)
        await page.clock.runFor(await page.evaluate(() => RESULT_HOLD_MS) + 1000);
        await expectReply(`!дракон back (@${dragonCfg.streamer})`, () => chat(dragonCfg.streamer, '!дракон'));
        const back = (await page.evaluate('getDragonDB()'))[dragonCfg.streamer];
        if (back.drakeObj.type !== dragonCfg.drakeType || back.xp !== drakeBefore.xp || back.title.id !== dragonCfg.drakeTitleId || back.regular)
            fail(`!дракон again should bring back the White Drake with ${drakeBefore.xp} XP and title ${dragonCfg.drakeTitleId}, got ${JSON.stringify({ type: back.drakeObj.type, xp: back.xp, title: back.title.id, regular: !!back.regular })}`);
        else pass(`!дракон again: the White Drake is back with its ${back.xp} XP and title ${back.title.id}`);
    }

    await page.clock.runFor(1000);   // the last hit lands on screen (0.6 s after the fight's last turn)

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
            const chips = [...document.querySelectorAll('#status-p1 .status-item')].map(c => ({ text: window.__vt(c), cut: c.scrollWidth > c.clientWidth + 1 }));
            const row = document.getElementById('power-p1');
            return { chips, meter: window.__vt(row), meterCut: row.scrollWidth > row.clientWidth + 1 };
        }, lang);
        const meterIssue = (await page.evaluate(powerMeters))[0];
        const bad = worst.chips.filter(c => c.cut).map(c => c.text);
        if (worst.chips.length !== 4 || bad.length || worst.meterCut || meterIssue.overlapsChips || meterIssue.overlapsHp || meterIssue.overlapsSprite)
            fail(`[${lang}] worst-case card text: ${bad.length ? `chips cut off: ${bad.join(' | ')}` : ''} ${worst.meterCut ? `meter row cut off: "${worst.meter}"` : ''} ${worst.chips.length !== 4 ? `${worst.chips.length} chips shown` : ''}`);
        else pass(`[${lang}] worst-case card text fits: ${worst.chips.map(c => `"${c.text}"`).join(', ')}; meter "${worst.meter}"`);
    }
    await page.evaluate(lang => { currentLang = lang; }, await page.evaluate('document.documentElement.lang || currentLang'));

    await shot('07-all-fights-done');
    await checkFeed('after all fights');

    // 4. Verdicts
    // Chips say what's left in words, after the effect's icon, e.g. "[rage] Лють · ще 2 атаки" / "[rage] Rage · 2 attacks left", and fit on the card
    const CHIP_RE = { uk: /^\[\w+\] .+ · ще \d+ (атака|атаки|атак|удар|удари|ударів|хід|ходи|ходів)$/, en: /^\[\w+\] .+ · \d+ (attack|hit|turn)s? left$/ };
    const badChips = [...chipsSeen.keys()].filter(t => !CHIP_RE[chipLangs.get(t)].test(t));
    // Both languages must actually have been on screen, for chips and for the meter row (including a full one)
    for (const l of ['uk', 'en']) {
        const chips = [...chipLangs.values()].filter(x => x === l).length;
        if (!chips) fail(`no buff/debuff chip was seen with the page in ${l}`);
        if (!meterLangs[l]) fail(`no Element Power meter row was seen with the page in ${l}`);
        else if (!meterFullLangs[l]) fail(`no full meter ("[ultimate] ...") was seen with the page in ${l}`);
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
    const allTypes = await page.evaluate(() => DRAKE_TYPES.map(d => d.type));
    const missing = allTypes.filter(t => !spritesSeen[t]);
    if (allTypes.length !== 8) fail(`expected 8 drake types (6 viewer elements, the White Drake and the White Dragon), the game has ${allTypes.length}: ${allTypes.join(', ')}`);
    if (missing.length) fail(`sprites never rendered for: ${missing.join(', ')}`);
    else pass(`sprites rendered for all ${allTypes.length} types (${allTypes.join(', ')})`);
    if (cfg.hasInfoFeed) {
        if (feedIssues.size) feedIssues.forEach((v, kind) => fail(`info feed: ${kind} — first ${v.when} (${v.detail}), seen in ${v.count} check(s)`));
        else pass('info feed never overflowed its column');
    }
    if (iconIssues.size) [...iconIssues].slice(0, 8).forEach(i => fail(`overlay: ${i}`));
    else pass('every screenshot of the run: no emoji on the overlay, every icon at a whole-number scale of its drawing');
    if (pageErrors.length) [...new Set(pageErrors)].forEach(e => fail(`JS error: ${e}`));
    else pass('no JS errors');
    skipped.forEach(s => console.log(`    – skipped: ${s}`));
    // Same seed, same fights: this fingerprint of the fight events (not of how the log looks) must match between runs,
    // and between versions of the page that only change visuals
    const events = await page.evaluate(() => window.__fightEvents);
    const fingerprint = crypto.createHash('sha256').update(events.join('\n')).digest('hex').slice(0, 16);
    console.log(`    fight events fingerprint (UI_SEED=${SEED}): ${fingerprint} (${events.length} events)`);

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
        await offTwitch(page);
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
        else if (user === cfg.dragon.streamer ? await page.evaluate(x => calculateLevelAndProgress(x).level, d.xp) !== 20 : d.xp !== OLD_SHOWCASE_SAVE[user].xp)
            fail(`@${user}: xp changed ${OLD_SHOWCASE_SAVE[user].xp} → ${d.xp}${user === cfg.dragon.streamer ? ' (the Dragon must stay level 20)' : ''}`);
        else pass(`@${user}: ${OLD_SHOWCASE_SAVE[user].drakeObj.type} → ${type} (${d.drakeObj.name.en}), xp kept`);
    }
    const titleOf = u => db[u] && db[u].title && db[u].title.id;
    if (titleOf('QA-Tester-Omega') === cfg.dragon.titleId) fail('@QA-Tester-Omega is no longer the dragon but kept title 999');
    else pass(`@QA-Tester-Omega (not the streamer) lost title 999 → ${db['QA-Tester-Omega'].title.name.en}`);
    const st = db[cfg.dragon.streamer] && db[cfg.dragon.streamer].title;
    if (titleOf(cfg.dragon.streamer) !== cfg.dragon.titleId || !st.name) fail(`streamer should keep a full title 999, got ${JSON.stringify(st)}`);
    else pass(`streamer keeps title 999 (${st.name.en})`);
    const behind = db[cfg.dragon.streamer].regular;
    if (!behind || behind.drakeObj.type !== cfg.dragon.drakeType || behind.xp !== 0 || !behind.title || behind.title.id !== cfg.dragon.drakeTitleId)
        fail(`the streamer's Dragon should keep a White Drake at level 1 (0 XP, title ${cfg.dragon.drakeTitleId}) for !дракон, got ${JSON.stringify(behind)}`);
    else pass(`behind the streamer's Dragon: a White Drake at 0 XP (level 1) with title ${behind.title.id}, never level 20`);

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

// A drake saved with title 189 as it was stored before the rename (the whole title, with its old Ukrainian name): on load
// the save takes the title's new name, «Герб чи число»; !стата shows it; after a reload (once the game's own save has
// reached the browser) the save and !стата still have it; in English it stays "Heads or Tails". The save is injected
// before the page loads, only on the ?setup load.
async function testSavedTitle(browser, key) {
    const failures = [];
    const fail = msg => { failures.push(msg); console.log(`    ✗ ${msg}`); };
    const pass = msg => console.log(`    ✓ ${msg}`);
    const cfg = VERSIONS[key];
    const DB_KEY = 'drake_arena_showcase_db';
    console.log(`
=== ${key}: a saved title 189 after the rename ===`);
    // The old name and the banned stem, built in pieces: tests/banned_words.js keeps them out of every other file
    const OLD_UK = 'Орел чи р' + 'ешка', STEM = 'р' + 'ешк', NEW_UK = 'Герб чи число', EN = 'Heads or Tails';
    const save = { coinfan: { name: 'coinfan', color: '#8ab4f8', drakeObj: { name: { uk: 'Червоний Дрейк 🟥', en: 'Red Drake 🟥' }, type: 'red' }, xp: 1200, level: 4,
        title: { id: 189, rarity: 'meme', icon: '🪙', name: { uk: OLD_UK, en: EN }, bonus: { type: 'unique', mechanic: 'coin_flip', stats: { hp: 20 } } } } };

    const context = await browser.newContext();
    const pageErrors = [];
    const page = await context.newPage();
    page.on('pageerror', e => pageErrors.push(e.message));
    await offTwitch(page);
    await page.addInitScript(([k, raw]) => { if (/[?&]setup\b/.test(location.search)) { localStorage.clear(); localStorage.setItem(k, raw); } }, [DB_KEY, JSON.stringify(save)]);
    const url = 'file:///' + path.join(ROOT, cfg.file).replace(/\\/g, '/');
    const seen = async lang => {
        await page.evaluate(m => window.__chat('coinfan', m), lang === 'uk' ? '!стата' : '!stats');
        return page.evaluate(k => ({ saved: JSON.parse(localStorage.getItem(k)).coinfan.title.name,
            card: [...document.querySelectorAll('#info-feed .info-card')].pop().innerText }), DB_KEY);
    };

    await page.goto(url + '?lang=uk&setup');
    const first = await seen('uk');
    if (first.saved.uk !== NEW_UK || first.saved.en !== EN || !first.card.includes(NEW_UK) || first.card.toLowerCase().includes(STEM)) fail(`on load the save and !стата should have «${NEW_UK}», got ${JSON.stringify(first)}`);
    else pass(`on load: the save's title 189 is «${first.saved.uk}» ("${first.saved.en}"), and !стата shows it`);

    await storageSettled(page);
    await page.goto(url + '?lang=uk');
    const again = await seen('uk');
    if (again.saved.uk !== NEW_UK || !again.card.includes(NEW_UK) || again.card.toLowerCase().includes(STEM)) fail(`after a reload the save and !стата should still have «${NEW_UK}», got ${JSON.stringify(again)}`);
    else pass(`after a reload: still «${NEW_UK}» in the save and in !стата`);

    await page.goto(url + '?lang=en');
    const en = await seen('en');
    if (!en.card.includes(EN) || en.card.includes(NEW_UK)) fail(`in English !stats should show "${EN}", got ${JSON.stringify(en)}`);
    else pass(`in English: "${EN}"`);

    if (pageErrors.length) [...new Set(pageErrors)].forEach(e => fail(`JS error: ${e}`));
    else pass('no JS errors');
    await context.close();
    return failures;
}

// The streamer card draws the streamer's own drake, in a fresh page (so the main run's seeded fights are untouched):
// no drake yet → the greyed-out dragon placeholder; !дрейк білий → the White Drake at 2x (96×72) centred in the dragon's
// 120×84 slot, the label naming the White Drake; !дракон → the dragon at 2x (120×84), the text column where it was;
// !дракон again → the White Drake again. A reroll into a viewer colour, as chat sends it (a channel-point redemption),
// is refused and changes nothing. Both languages; the Ukrainian run saves screenshots of the side column with the White
// Drake and with the dragon.
async function testStreamerCard(browser, key) {
    const failures = [];
    const fail = msg => { failures.push(msg); console.log(`    ✗ ${msg}`); };
    const pass = msg => console.log(`    ✓ ${msg}`);
    const cfg = VERSIONS[key];
    const streamer = cfg.dragon.streamer;
    console.log(`\n=== ${key}: streamer card sprite ===`);

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });   // the icons' stills (prefers-reduced-motion), so the screenshots are the same on every run
    const pageErrors = [];
    for (const lang of ['uk', 'en']) {
        const page = await context.newPage();
        page.on('pageerror', e => pageErrors.push(e.message));
        await offTwitch(page);
        await page.addInitScript(pageInit, SEED);   // __vt: the card's icons read as [id]
        await page.addInitScript(([k, u]) => { localStorage.clear(); localStorage.setItem(k, u); }, [cfg.dragon.storageKey, streamer]);
        await page.goto('file:///' + path.join(ROOT, cfg.file).replace(/\\/g, '/') + '?lang=' + lang);
        await page.addStyleTag({ content: 'html { background: #1e1f26; }' });
        await page.evaluate(() => document.fonts.ready);
        const chat = (msg, extra) => page.evaluate(([u, m, e]) => window.__chat(u, m, e), [streamer, msg, extra]);
        // What the card shows: which sprite (compared with each type's own sprite), its box, the text column's left edge
        const card = () => page.evaluate(() => {
            const box = document.getElementById('streamer-card'), img = box.querySelector('.sc-sprite'), id = box.querySelector('.sc-id');
            const r = img.getBoundingClientRect(), b = box.getBoundingClientRect(), slotLeft = id.getBoundingClientRect().left - 16 - 120;
            const type = DRAKE_TYPES.map(d => d.type).find(t => drakeSpriteURL(t) === img.getAttribute('src')) || '?';
            const slotTop = b.top + (b.height - 84) / 2;   // the 120×84 slot, centred in the card's height
            return { type, w: Math.round(r.width), h: Math.round(r.height), dx: Math.round(r.left + r.width / 2 - (slotLeft + 60)), dy: Math.round(r.top + r.height / 2 - (slotTop + 42)),
                textLeft: Math.round(id.getBoundingClientRect().left), grey: /grayscale/.test(img.getAttribute('style') || ''), sub: window.__vt(box.querySelector('.sc-sub')),
                title: window.__vt(box.querySelector('.sc-title')), titleFrame: (box.querySelector('.sc-title img.px-icon') || { dataset: {} }).dataset.frame || null,
                titleGrey: !!box.querySelector('.sc-title img.px-icon.gray') };
        });
        const tag = `[${lang}]`;
        const drakeName = lang === 'uk' ? 'Білий Дрейк' : 'White Drake', dragonName = lang === 'uk' ? 'Білий Дракон' : 'White Dragon';
        const reward = { 'custom-reward-id': 'test-reward' };   // !рерол only counts as a channel-point redemption

        const none = await card();
        // «!дрейк білий» gives the White Drake, so the placeholder asks for a drake, not the dragon
        const noneSub = lang === 'uk' ? 'ще без дрейка: !дрейк білий' : 'no drake yet: !drake white';
        if (none.type !== 'white' || !none.grey || none.w !== 120 || none.h !== 84 || none.sub !== noneSub || !none.title.startsWith('[emDragon] ') || !none.titleGrey) fail(`${tag} with no drake yet the card should show the greyed-out dragon at 120×84, the Dragon's emblem greyed on the title line and "${noneSub}", got ${JSON.stringify(none)}`);
        else pass(`${tag} no drake yet: the greyed-out dragon placeholder ("${none.sub}"), its emblem greyed on the title line`);

        await chat(lang === 'uk' ? '!дрейк білий' : '!drake white');
        const drake = await card();
        if (drake.type !== 'steel' || drake.grey || drake.w !== 96 || drake.h !== 72 || !drake.sub.startsWith(`[emSteel] ${drakeName}`) || !drake.title.startsWith('[whiteSteel] ') || drake.titleFrame !== 'divine') fail(`${tag} after !дрейк білий the card should show the White Drake at 96×72, its emblem by its name and «Біла сталь»'s badge in the divine frame, got ${JSON.stringify(drake)}`);
        else pass(`${tag} the White Drake: its sprite at 96×72, "${drake.sub}" (its emblem), the title line "${drake.title}" (the sword in the divine frame)`);
        if (drake.dx !== 0 || drake.dy !== 0) fail(`${tag} the White Drake should be centred in the 120×84 slot (centre offset 0,0), got ${drake.dx},${drake.dy}`);
        else pass(`${tag} the White Drake is centred in the dragon's 120×84 slot`);
        if (lang === 'uk') await page.locator('#side').screenshot({ path: path.join(SHOTS, `${key}-streamer-card-white-drake.png`) });

        await chat(lang === 'uk' ? '!рерол червоний' : '!reroll red', reward);
        const refused = await card();
        if (refused.type !== 'steel' || refused.sub !== drake.sub) fail(`${tag} the streamer's reroll into a viewer colour should change nothing, got ${JSON.stringify(refused)}`);
        else pass(`${tag} the streamer's reroll into red is refused: still the White Drake`);

        await chat(lang === 'uk' ? '!дракон' : '!dragon');
        const dragon = await card();
        if (dragon.type !== 'white' || dragon.dx || dragon.dy || dragon.grey || dragon.w !== 120 || dragon.h !== 84 || !dragon.sub.startsWith(`[emDragon] ${dragonName}`) || !dragon.title.startsWith('[sovereign] ') || dragon.titleFrame !== 'divine') fail(`${tag} after !дракон the card should show the dragon at 120×84, its emblem by its name and the Sovereign's badge, got ${JSON.stringify(dragon)}`);
        else pass(`${tag} the White Dragon: dragon sprite at 120×84, "${dragon.sub}" (its emblem), the title line "${dragon.title}"`);
        if (dragon.textLeft !== drake.textLeft) fail(`${tag} the text column should stay where it was (at ${drake.textLeft}), got ${dragon.textLeft}`);
        else pass(`${tag} the text column didn't move`);
        if (lang === 'uk') await page.locator('#side').screenshot({ path: path.join(SHOTS, `${key}-streamer-card-dragon.png`) });

        await chat(lang === 'uk' ? '!дракон' : '!dragon');
        const back = await card();
        if (back.type !== 'steel' || back.w !== 96 || back.h !== 72 || back.dx || back.dy || back.textLeft !== drake.textLeft || !back.sub.startsWith(`[emSteel] ${drakeName}`)) fail(`${tag} after !дракон again the card should show the White Drake at 96×72 again, got ${JSON.stringify(back)}`);
        else pass(`${tag} !дракон again: the White Drake at 96×72 again`);
        await page.close();
    }
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
            if (VERSIONS[key].dragon) total += (await testStreamerCard(browser, key)).length;
            total += (await testSavedTitle(browser, key)).length;
        }
    } finally {
        await browser.close();
    }
    console.log(total ? `\n${total} check(s) failed. Screenshots: tests/screenshots/` : '\nAll UI checks passed. Screenshots: tests/screenshots/');
    process.exit(total ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
