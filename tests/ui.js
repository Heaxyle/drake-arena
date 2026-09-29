// UI smoke test: opens the game in headless Chromium with a fake tmi.js,
// plays through it by "typing" chat commands, and checks the layout rules.
//
// Usage (from the project folder):
//   npm run test:ui                    all versions (currently just showcase)
//   node tests/ui.js showcase          one version
//
// Checks: no JS page errors, every drake type registers and its sprite renders,
// a full fight finishes, !стата / !титул / !шанси answer, HP bars never move
// vertically, the info feed never overflows its column.
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
        drakes: [['ruby', 'червоний', 'red'], ['sapphire', 'синій', 'blue'], ['onyx', 'чорний', 'black'], ['topaz', 'золотий', 'gold'],
                 ['amethyst', 'фіолетовий', 'purple'], ['pearl', 'білий', 'white']],
        // First pair fights ranked via !черга; the rest are friendly duels so every sprite gets drawn
        duels: [['onyx', 'topaz'], ['amethyst', 'pearl']],
        hasInfoFeed: true,
        hasOdds: true,
    },
};

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

    const barBaseline = await page.evaluate(measureBars);
    const barMoves = new Set();
    const spritesSeen = {};

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

    console.log(`\n=== ${key} (${cfg.file}) ===`);

    // 1. Register every drake type
    for (const [user, color] of cfg.drakes) {
        await expectReply(`!дрейк ${color} (@${user})`, () => chat(user, `!дрейк ${color}`));
    }
    const db = await page.evaluate('getDragonDB()');
    for (const [user, , type] of cfg.drakes) {
        const got = db[user] && db[user].drakeObj && db[user].drakeObj.type;
        if (got !== type) fail(`@${user} should have a ${type} drake, save has ${got || 'nothing'}`);
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
        await runFight(`duel @${challenger} vs @${target}`, async () => {
            await chat(challenger, `!бій @${target}`);
            await chat(target, '!прийняти');
        });
    }
    await shot('07-all-fights-done');
    await checkFeed('after all fights');

    // 4. Verdicts
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

(async () => {
    const only = process.argv[2];
    if (only && !VERSIONS[only]) { console.error(`Unknown version "${only}". Use: ${Object.keys(VERSIONS).join(' | ')}`); process.exit(1); }
    fs.mkdirSync(SHOTS, { recursive: true });
    const browser = await chromium.launch();
    let total = 0;
    try {
        for (const key of only ? [only] : Object.keys(VERSIONS)) total += (await testVersion(browser, key)).length;
    } finally {
        await browser.close();
    }
    console.log(total ? `\n${total} check(s) failed. Screenshots: tests/screenshots/` : '\nAll UI checks passed. Screenshots: tests/screenshots/');
    process.exit(total ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
