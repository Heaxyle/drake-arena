// The READMEs' screenshot, showcase/screenshot.png: the overlay in the middle of a ranked fight, always the same scene.
// Six drakes with titles and medals in the Top, the fight stepped to turn 7 (chips on the cards, notes in the log), two
// title rolls and a !stats card in the chat panel, in English at 1920×1080 with the demo controls showing. Seeded, on a
// fake clock, kept off Twitch and with every icon on its still, like the browser tests.
//
// Usage: npm run screenshot:readme   (TESTING.md says when)
//
// Not a test: it only leaves the image as it is, and exits non-zero, if the page logs an error or the fight never gets
// to the turn.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { pageInit } = require('./page_hooks');
const { offTwitch } = require('./no_twitch');
const { settleArena } = require('./settle');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'showcase/screenshot.png');
const PAGE = 'file:///' + path.join(ROOT, 'showcase/index.html').replace(/\\/g, '/') + '?lang=en';
const SEED = 11;
const TURN = 7;

// In the Top's order: name, element, name colour, title, wins, losses. The first three queue up: the first two fight.
const DRAKES = [
    ['kotyk_ua', 'red', '#ff7f50', 183, 9, 3],
    ['jade', 'green', '#69db7c', 98, 7, 4],
    ['sapphire', 'blue', '#4dabf7', 74, 6, 6],
    ['ruby', 'gold', '#ffd43b', 189, 4, 5],
    ['mira', 'purple', '#b197fc', 88, 3, 7],
    ['nightowl', 'black', '#c0c4d6', 1, 1, 2],
];

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await offTwitch(page);
    await page.addInitScript(pageInit, SEED);
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));
    await page.goto(PAGE);

    await page.evaluate(drakes => {
        const say = (name, color, message) => handleChatMessage('#test', { username: name, color }, message, false);
        drakes.forEach(([name, element, color]) => say(name, color, `!drake ${element}`));
        const db = getDragonDB();
        drakes.forEach(([name, , , title, wins, losses]) => {
            db[name].title = TITLES_DB.find(t => t.id === title);
            playerLeaderboardStats[name] = { wins, losses };
        });
        saveDragonDB(db);
        saveHonours({ ...getHonours(), holders: ['kotyk_ua', 'sapphire', 'ruby'], medals: { kotyk_ua: [1, 0, 1] } });
        renderLeaderboard();
        drakes.slice(0, 3).forEach(([name, , color]) => say(name, color, '!queue'));
        skipBettingWindow();
    }, DRAKES);

    // Step the fight to the turn, then let its hit land and the cards update
    const turn = () => page.evaluate(() => (arenaState.kind === 'fight' && arenaState.turn) || 0);
    for (let i = 0; i < 400 && await turn() < TURN; i++) await page.clock.runFor(500);
    const reached = await turn();
    await page.clock.runFor(2600);

    await page.evaluate(() => {
        handleChatMessage('#test', { username: 'ruby', color: '#ffd43b' }, '!stats', false);
        showTitleRoll('mira', '#b197fc', TITLES_DB.find(t => t.id === 96));
        showTitleRoll('nightowl', '#c0c4d6', TITLES_DB.find(t => t.id === 76));
    });
    await settleArena(page);
    const image = await page.screenshot();
    await browser.close();

    const problems = [...errors, ...(reached < TURN ? [`the fight never got to turn ${TURN}`] : [])];
    if (problems.length) {
        console.log(`✗ showcase/screenshot.png left as it is:\n  ${problems.join('\n  ')}`);
        process.exit(1);
    }
    fs.writeFileSync(OUT, image);
    console.log('✓ showcase/screenshot.png written');
})().catch(e => { console.error(e); process.exit(1); });
