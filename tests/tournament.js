// Tournament test: the whole tournament through the chat simulator, on the game clock (Playwright's fake clock), with
// seeded fights. Game results are set by the test (a hook on finishBattle), so every match goes the way the plan says.
//   1  Sign-up (both languages): only the streamer or a moderator opens it; the line on the arena «🏆 Турнір: реєстрація
//      · 5/8 · !учасник»; every refusal in the ЧАТ panel (no tournament, no drake, the White Dragon, already in, the
//      bracket full); leaving during sign-up and not after; !турнір старт with too few; the 8th player closes it
//   2  A full 8-player run (Ukrainian, betting window on): it waits for the ranked fight on screen, its result screen and
//      the duel waiting after it; the betting window with the bracket under its timer before game 1 of every match (the
//      3rd-place game and the final too); !старт skips it and its 5 s guard holds; games 2 and 3 after the 20 s result
//      screen and a 10 s «Гра 2» countdown; 2:0 and 2:1 matches, a drawn game replayed; the 3rd-place game right before
//      the final; the plate «🏆 Турнір · Чвертьфінал · Гра 2 · 1:0» at every stage; everyone at level 20 (cards and
//      HP) with saved levels untouched; no XP, no wins or losses, the Top unchanged; !черга joins the queue (in order)
//      and !бій gets a short reply meanwhile; the podium; then the queue and duels carry on, queue order kept. The two
//      highest levels in opposite halves (announced); every game in the play log with its stage and game number
//   3  A reload in the middle of a match: the tournament resumes at that match and replays the unfinished game. Then a
//      reload at every moment (sign-up, the betting window, mid-game, the result screen between games, game 2's
//      countdown, the 3rd-place game, the final, the podium, the Hall of Fame; with the effects on, the draw and a match intro): picked up at once, run to the end,
//      the queue after it.
//      The watchdog: a reload with the resume skipped; within 5 s it starts the next game itself (its console.error is
//      expected there and nowhere else)
//   4  Uneven sign-ups, the qualifier: 5 players (English, betting window on, all level 1): a main bracket of 4, the
//      first 3 straight in, the last 2 in one qualifier game (no betting window, the 10 s countdown, the bracket with its
//      «Qualifier» column), its winner in the semifinals, then a betting window for game 1 of every later match; the
//      English stage names. 13 players (Ukrainian): «13 учасників: 3 з найвищим рівнем — одразу в чвертьфінал, 10 грають
//      кваліфікацію за 5 місць» in the ЧАТ panel, the «Кваліфікація» column before the quarterfinals, 5 single games, then the quarterfinals with the 3
//      direct players and the 5 winners. 9 and 15 players (English), exactly 16 (no qualifier, «Round of 16»), the bracket
//      inside the countdown; !tournament stop during a game's countdown and during sign-up; in the middle of a
//      main-bracket game, game 3, the 3rd-place game and the final (each fought to its end, counting for nothing, as the
//      play log says, then the queue); refused on the podium
//   5  Rewards (Ukrainian): the podium's badges in the Top, on the arena cards (the champion's drake glowing gold) and
//      in !стата; free title spins used by !титул in chat, not by a channel-point redemption, refused with none left;
//      medals adding up over two tournaments; the Hall of Fame after the podium, on the idle arena after a reload and
//      as the !зала card; !турнір стоп refused during the Hall of Fame; a ladder wipe (every key with "db" or "stats" in
//      its name) leaves the rewards and an open sign-up alone
//   Screenshots (Ukrainian): tests/screenshots/tournament-signup.png, -bracket.png, -plate.png, -podium.png, -qualifier.png,
//   -hall-idle.png (the Hall of Fame on the idle arena), -hall-card.png (the !зала card), -champion.png (badges, glow)
//
// Usage: npm run test:tournament   (or node tests/tournament.js; TOUR_ONLY=2,3 runs only those sections)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { pageInit } = require('./page_hooks');
const { settleArena } = require('./settle');
const { offTwitch } = require('./no_twitch');   // a stand-in tmi.js: nothing reaches Twitch, no live chat gets in
const { storageSettled } = require('./storage_sync');   // before a reload: the game's own save has reached the browser

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
// TOUR_FILE=<another index.html> runs the test against that page instead (the effects-off timeline is compared that way)
const PAGE = 'file:///' + (process.env.TOUR_FILE ? path.resolve(process.env.TOUR_FILE) : path.join(ROOT, 'showcase/index.html')).replace(/\\/g, '/');
const SEED = Number(process.env.UI_SEED || 3);
const ONLY = (process.env.TOUR_ONLY || '').split(',').filter(Boolean);
const run = n => !ONLY.length || ONLY.includes(String(n));
const KEY = 'drake_arena_showcase_tournament', HONOURS = 'drake_arena_showcase_honours';

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);

// Sections 1–5 run with the tournament effects off (so their timings are the tournament's own); section 6 turns them on
async function open(browser, { lang = 'uk', betting = false, fx = false, sound = false } = {}) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
    await offTwitch(page);
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));
    await page.addInitScript(pageInit, SEED);
    // The settings, on the first load only: a one-time token in the URL (?setup), which the script takes out of the URL
    // once applied, so a reload keeps whatever the game saved since (not a sessionStorage flag: it can be lost)
    await page.addInitScript(([on, fx, sound]) => {
        const q = new URLSearchParams(location.search);
        if (!q.has('setup')) return;
        localStorage.setItem('drake_arena_showcase_betting', on ? '1' : '0');
        localStorage.setItem('drake_arena_showcase_tourfx', fx ? '1' : '0');
        localStorage.setItem('drake_arena_showcase_toursound', sound ? '1' : '0');
        q.delete('setup');
        history.replaceState(null, '', location.pathname + '?' + q);
    }, [betting, fx, sound]);

    await page.addInitScript(installHooks);
    await page.goto(`${PAGE}?lang=${lang}&setup`);
    await page.evaluate(() => document.fonts.ready);
    await settleArena(page);
    return { page, context, errors };
}

// In the page, before the game's script: a hook on finishBattle that sets tournament games' results from window.__plan
// (pair → list of winners, null for a draw), and a record of every tournament game and every startFight
function installHooks() {
    window.__plan = {}; window.__played = {}; window.__games = []; window.__starts = [];
    document.addEventListener('DOMContentLoaded', () => {
        const fin = window.finishBattle;
        window.finishBattle = function (p1, p2, h1, h2, ranked) {
            if (tourGame) {
                const k = [p1.name, p2.name].sort().join('-');
                window.__played[k] = (window.__played[k] || 0) + 1;
                const plan = window.__plan[k], w = plan ? plan[window.__played[k] - 1] : undefined;
                window.__games.push({ k, w, stage: tourGame.stage, game: tourGame.game, replay: tourGame.replay, t: Date.now(),
                    lv: [p1, p2].map(f => calculateLevelAndProgress(f.xp).level) });
                if (w !== undefined) { h1 = w === p1.name ? 50 : w ? 0 : 30; h2 = w === p2.name ? 50 : w ? 0 : 30; }
            }
            return fin.call(this, p1, p2, h1, h2, ranked);
        };
        const sf = window.startFight;
        window.startFight = function (a, ac, b, bc, ranked, opts = {}) {
            const out = sf.call(this, a, ac, b, bc, ranked, opts);
            window.__starts.push({ a, b, ranked, tour: opts.tour ? { stage: opts.tour.stage, game: opts.tour.game, replay: opts.tour.replay } : null, bets: !!opts.bets,
                t: Date.now(), kind: arenaState.kind, betting: !!arenaState.betting, total: arenaState.total, bracket: !!arenaState.bracket });
            return out;
        };
    });
}

const say = (page, user, msg, extra = {}) => page.evaluate(([u, m, e]) => handleChatMessage('#heaxyle', { username: u, color: '#ff7f50', ...e }, m, false), [user, msg, extra]);
const mod = (page, msg) => say(page, 'mod_anna', msg, { mod: true, badges: { moderator: '1' } });
const cmd = (lang, uk, en) => lang === 'uk' ? uk : en;
const COLORS = { uk: ['червоний', 'синій', 'чорний', 'золотий', 'фіолетовий', 'зелений'], en: ['red', 'blue', 'black', 'gold', 'purple', 'green'] };
async function register(page, lang, names, levels = {}) {
    for (const [i, n] of names.entries()) await say(page, n, `${cmd(lang, '!дрейк', '!drake')} ${COLORS[lang][i % 6]}`);
    await page.evaluate(lv => {
        const db = getDragonDB();
        Object.entries(lv).forEach(([n, l]) => { let x = 0; for (let k = 1; k < l; k++) x += getRequiredXP(k); db[n].xp = x; db[n].level = l; });
        saveDragonDB(db); renderLeaderboard();
    }, levels);
}
// What the arena and the chat panel show
const view = page => page.evaluate(() => {
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    return { line: txt(document.getElementById('queue-hint')), plate: txt(document.getElementById('status-plate')), type: txt(document.getElementById('fight-type')),
        kind: arenaState.kind, counting: document.getElementById('log-panel').classList.contains('counting'), timer: txt(document.getElementById('cd-time')),
        cdTitle: txt(document.querySelector('#log-countdown .cd-title')), bracket: !!document.querySelector('#log-countdown.with-bracket .tb'),
        chat: txt(document.querySelector('#info-feed .info-card:not(.howto)')), queue: [...document.querySelectorAll('#queue-list-ui .queue-badge:not(.queue-more)')].map(txt),
        tourney: tourney ? JSON.parse(JSON.stringify(tourney)) : null, running: isBattleRunning, hold: !!resultHold };
});
// Moves the game clock on in steps until cond(arg) is true in the page (or max ms pass); returns the time it took
async function until(page, cond, arg, { step = 1000, max = 4 * 3600000 } = {}) {
    for (let t = 0; t <= max; t += step) {
        if (await page.evaluate(cond, arg)) return t;
        await page.clock.runFor(step);
    }
    throw new Error('timed out waiting for ' + cond.toString().slice(0, 120));
}
const shot = async (page, name) => { await settleArena(page); await page.screenshot({ path: path.join(SHOTS, name) }); };
// After a reload, what the new page found: the saved tournament as it reads it now, what it loaded, the arena's state
const afterReload = page => page.evaluate(k => {
    const raw = localStorage.getItem(k);
    let saved = null;
    try { saved = raw && JSON.parse(raw); } catch (e) { saved = 'unparsable'; }
    return { raw: raw ? raw.length + ' chars' : raw, savedPhase: saved && saved.phase, loaded: tourney ? tourney.phase : null, kind: arenaState.kind,
        running: isBattleRunning, hold: !!resultHold, waiting: !!bettingWait, ready: document.readyState, lang: document.documentElement.lang, now: Date.now() };
}, KEY);
// The moments section 3 reloads at: at(state) says when (in the page), expect(after, before) what the arena shows 0.5 s later
const tourPlate = a => /^🏆 Турнір · /.test(a.plate);
const RELOAD_PHASES = [
    { label: 'during sign-up', signup: true, expect: a => a.tourney && a.tourney.phase === 'signup' && a.line === '🏆 Турнір: реєстрація · 2/4 · !учасник' },
    { label: 'during the betting window', betting: true, at: () => arenaState.kind === 'countdown' && arenaState.betting,
      expect: a => a.kind === 'countdown' && tourPlate(a) && /Гра 1/.test(a.plate) },
    { label: 'in the middle of a game', at: () => tourGame && tourGame.stage === 'sf' && arenaState.kind === 'fight' && arenaState.turn >= 2,
      expect: a => a.kind === 'countdown' && tourPlate(a) && /Гра 1/.test(a.plate) },
    { label: 'on the result screen between games', at: () => arenaState.kind === 'result' && tourney && tourney.phase === 'running' && window.__games.length === 1,
      expect: a => a.kind === 'countdown' && tourPlate(a) && /Гра 2 · (1:0|0:1)/.test(a.plate) },
    { label: "during game 2's 10 s countdown", at: () => arenaState.kind === 'countdown' && tourGame && tourGame.game === 2,
      expect: a => a.kind === 'countdown' && tourPlate(a) && /Гра 2/.test(a.plate) },
    { label: 'in the middle of the 3rd-place game', at: () => tourGame && tourGame.third && arenaState.kind === 'fight',
      expect: a => a.kind === 'countdown' && /Матч за 3-тє місце/.test(a.plate) },
    { label: 'in the middle of the final', at: () => tourGame && tourGame.stage === 'final' && arenaState.kind === 'fight',
      expect: a => a.kind === 'countdown' && /Фінал · Гра 1/.test(a.plate) },
    { label: 'on the podium', at: () => arenaState.kind === 'podium', podiumBefore: true,
      expect: a => a.kind === 'podium' },
    { label: 'during the Hall of Fame', at: () => arenaState.kind === 'hall', podiumBefore: true,
      expect: a => a.kind === 'hall' },
    // With the tournament effects on: the draw is already over in the save (it's only a show), so the first game starts;
    // an intro's game is replayed, intro and all
    { label: 'during the draw (effects on)', fx: true, at: () => arenaState.kind === 'draw',
      expect: a => a.kind === 'countdown' && tourPlate(a) && /Гра 1/.test(a.plate) },
    { label: 'during a match intro (effects on)', fx: true, at: () => !!document.querySelector('.ts-intro'),
      expect: a => a.kind === 'countdown' && tourPlate(a) && /Гра 1/.test(a.plate) },
];
const key = (a, b) => [a, b].sort().join('-');

(async () => {
    fs.mkdirSync(SHOTS, { recursive: true });
    const browser = await chromium.launch();

    // 1. Sign-up
    if (run(1)) for (const lang of ['uk', 'en']) {
        console.log(`\n[1. sign-up, ${lang}]`);
        const { page, context, errors } = await open(browser, { lang });
        const names = ['sofiia_k', 'bohdan', 'ira_77', 'maks', 'oleh_the_great', 'zoryana', 'taras', 'yana', 'late_viewer'];
        await register(page, lang, names);
        await page.evaluate(() => setStreamerUser('streamer_kit'));
        await say(page, 'streamer_kit', cmd(lang, '!дрейк білий', '!drake white'));
        await say(page, 'bohdan', cmd(lang, '!учасник', '!join'));
        const none = (await view(page)).chat;
        await say(page, 'bohdan', cmd(lang, '!турнір', '!tournament'));
        const viewerTried = await view(page);
        await mod(page, cmd(lang, '!турнір', '!tournament'));
        const opened = await view(page);
        check(/немає реєстрації|no tournament sign-up/.test(none) && !viewerTried.tourney && opened.tourney && opened.tourney.size === 8
            && opened.line === cmd(lang, '🏆 Турнір: реєстрація · 0/8 · !учасник', '🏆 Tournament: sign-up · 0/8 · !join'),
            `a viewer's ${cmd(lang, '!турнір', '!tournament')} does nothing; a moderator's opens sign-up for 8 (the default): "${opened.line}"`, JSON.stringify({ none, viewer: viewerTried.tourney, line: opened.line }));
        for (const n of names.slice(0, 5)) await say(page, n, cmd(lang, '!учасник', '!join'));
        const five = await view(page);
        if (lang === 'uk') await shot(page, 'tournament-signup.png');
        const replies = {};
        await say(page, 'ghost_no_drake', cmd(lang, '!учасник', '!join')); replies.noDrake = (await view(page)).chat;
        await say(page, 'streamer_kit', cmd(lang, '!учасник', '!join')); replies.dragon = (await view(page)).chat;
        await say(page, 'maks', cmd(lang, '!учасник', '!join')); replies.twice = (await view(page)).chat;
        await say(page, 'maks', cmd(lang, '!вийти', '!leave')); replies.left = (await view(page)).chat;
        const four = await view(page);
        await mod(page, cmd(lang, '!турнір старт', '!tournament start'));   // 4 is enough, but first: 3
        check(five.line.includes('5/8') && four.line.includes('4/8') && /виходить|leaves/.test(replies.left),
            `the line counts sign-ups (5/8, and 4/8 after a !${cmd(lang, 'вийти', 'leave')})`, JSON.stringify({ five: five.line, four: four.line }));
        check(/створіть дрейка|create a drake/.test(replies.noDrake) && /Білий Дракон|White Dragon/.test(replies.dragon) && /вже в турнірі|already in the tournament/.test(replies.twice),
            'refusals in the ЧАТ panel: no drake yet, the White Dragon, already in', JSON.stringify(replies));
        // Back to 5 by un-starting: the start above closed it with 4. Use a fresh sign-up for "too few" and "full"
        const startedWith4 = await view(page);
        await mod(page, cmd(lang, '!турнір стоп', '!tournament stop'));
        await page.clock.runFor(1000);
        await mod(page, cmd(lang, '!турнір 4', '!tournament 4'));
        for (const n of names.slice(0, 3)) await say(page, n, cmd(lang, '!учасник', '!join'));
        await mod(page, cmd(lang, '!турнір старт', '!tournament start'));
        const tooFew = await view(page);
        await say(page, 'maks', cmd(lang, '!учасник', '!join'));          // the 4th: full, closes by itself
        const full4 = await view(page);
        await say(page, 'late_viewer', cmd(lang, '!учасник', '!join')); replies.full = (await view(page)).chat;
        await say(page, 'bohdan', cmd(lang, '!вийти', '!leave')); replies.noLeave = (await view(page)).chat;
        check(startedWith4.tourney && startedWith4.tourney.phase !== 'signup' && /Замало|Not enough/.test(tooFew.chat) && tooFew.tourney.phase === 'signup'
            && full4.tourney.phase !== 'signup' && full4.line === cmd(lang, '🏆 Турнір триває · черга чекає', '🏆 Tournament on · the queue waits'),
            `${cmd(lang, '!турнір старт', '!tournament start')} closes sign-up with 4, not with 3 ("${tooFew.chat}"); the 4th of 4 closes it by itself; the line then says "${full4.line}"`,
            JSON.stringify({ started: startedWith4.tourney && startedWith4.tourney.phase, tooFew: tooFew.chat, full: full4.tourney.phase, line: full4.line }));
        check(/сітка вже заповнена|bracket is full/.test(replies.full) && /лише під час реєстрації|only leave during sign-up/.test(replies.noLeave),
            'refusals: the bracket full; leaving after sign-up closed', JSON.stringify(replies));
        check(!errors.length, 'no page errors', errors.join(' | '));
        await context.close();
    }

    // 2. A full 8-player run
    if (run(2)) {
        console.log('\n[2. a full 8-player run, uk, betting window on]');
        const { page, context, errors } = await open(browser, { lang: 'uk', betting: true });
        const players = ['sofiia_k', 'bohdan', 'ira_77', 'maks', 'oleh_the_great', 'zoryana', 'taras', 'yana'];
        const others = ['r_one', 'r_two', 'duel_a', 'duel_b', 'q_first', 'q_second', 'q_third'];
        const levels = { sofiia_k: 3, bohdan: 7, ira_77: 12, maks: 1, oleh_the_great: 16, zoryana: 5, taras: 9, yana: 2, q_first: 6, q_second: 6, q_third: 6 };
        await register(page, 'uk', [...players, ...others], levels);
        await page.evaluate(() => { playerLeaderboardStats.sofiia_k = { wins: 4, losses: 1 }; playerLeaderboardStats.taras = { wins: 2, losses: 3 }; renderLeaderboard(); });
        // A ranked fight on screen, and a duel accepted during it
        await say(page, 'r_one', '!черга'); await say(page, 'r_two', '!черга');
        await mod(page, '!старт');                                           // skip its betting window
        await page.clock.runFor(6000);
        await say(page, 'duel_a', '!бій @duel_b'); await say(page, 'duel_b', '!прийняти');
        await mod(page, '!турнір');
        for (const n of players) await say(page, n, '!учасник');           // the 8th closes sign-up
        const closed = await view(page);
        const snapshot = () => page.evaluate(ps => ({ db: ps.map(n => [n, getDragonDB()[n].xp, getDragonDB()[n].level]), stats: JSON.stringify(playerLeaderboardStats),
            top: [...document.querySelectorAll('#leaderboard-list .lb-row')].map(r => r.textContent.replace(/[🏆🥈🥉]/gu, '').replace(/\s+/g, ' ').trim()) }), players);   // order and records (badges come with the podium)
        check(closed.tourney.phase === 'ready' && closed.running && closed.kind === 'fight', 'the 8th player closes sign-up; the ranked fight on screen carries on',
            JSON.stringify({ phase: closed.tourney.phase, kind: closed.kind }));
        // The plan: QF1 2:0, QF2 2:1, QF3 a draw then 2:0, QF4 2:1; SF1 2:0, SF2 2:1; 3rd place; final 2:1
        const qf = closed.tourney.rounds[0].map(m => [m.a, m.b]);
        // Level shapes the bracket: the two highest (@oleh_the_great 16, @ira_77 12) in opposite halves
        const half = n => Math.floor(qf.findIndex(m => m.includes(n)) / 2);
        const seedsLine = '🏆 Найвищі рівні — @oleh_the_great і @ira_77: вони в різних половинах сітки й можуть зустрітися лише у фіналі або в матчі за 3-тє місце.';
        check(half('oleh_the_great') !== half('ira_77') && closed.chat === seedsLine,
            `the two highest levels in opposite halves of the bracket; the ЧАТ panel: «${closed.chat}»`, JSON.stringify({ qf, chat: closed.chat }));
        const plan = {
            [key(...qf[0])]: [qf[0][0], qf[0][0]], [key(...qf[1])]: [qf[1][0], qf[1][1], qf[1][0]],
            [key(...qf[2])]: [null, qf[2][0], qf[2][0]], [key(...qf[3])]: [qf[3][1], qf[3][0], qf[3][0]],
            [key(qf[0][0], qf[1][0])]: [qf[0][0], qf[0][0]], [key(qf[2][0], qf[3][0])]: [qf[3][0], qf[2][0], qf[2][0]],
            [key(qf[1][0], qf[3][0])]: [qf[1][0]], [key(qf[0][0], qf[2][0])]: [qf[2][0], qf[0][0], qf[0][0]],
        };
        await page.evaluate(p => { window.__plan = p; }, plan);
        // The ranked fight ends, then its result screen, then the waiting duel (and its result screen), then the tournament
        await until(page, () => window.__starts.some(s => s.tour));
        const order = await page.evaluate(() => window.__fights.map(f => `${[f.p1, f.p2].sort().join('-')}${f.ranked ? ' ranked' : ''}`));
        const firstStart = await page.evaluate(() => window.__starts.find(s => s.tour));
        const before = await snapshot();   // the ranked fight and the duel are over: from here only the tournament plays
        check(order[0] === 'r_one-r_two ranked' && order[1] === 'duel_a-duel_b' && order.length === 2 && firstStart.betting && firstStart.bracket,
            'the tournament waits for the arena: the ranked fight, its result screen, the duel waiting after it, its result screen; then QF1 game 1 opens with the betting window',
            JSON.stringify({ order, firstStart }));
        const bets = await view(page);
        check(bets.counting && bets.bracket && /^1:5\d$|^2:00$/.test(bets.timer) && bets.plate === '🏆 Турнір · Чвертьфінал · Гра 1 · 0:0' && bets.type === '⏳ Ставки відкрито',
            `the betting window: the bracket under the timer (${bets.timer}), the plate "${bets.plate}", "${bets.type}" on the left`, JSON.stringify(bets));
        const bracket = await page.evaluate(() => ({ cols: [...document.querySelectorAll('#log-countdown .tb-col')].map(c => c.querySelector('.tb-h').textContent),
            names: [...document.querySelectorAll('#log-countdown .tb-col:first-child .tb-n')].map(n => n.textContent), live: document.querySelectorAll('#log-countdown .tb-m.live').length,
            third: !!document.querySelector('#log-countdown .tb-h3'), cut: [...document.querySelectorAll('#log-countdown .tb-n, #log-countdown .tb-h, #cd-time')].filter(e => e.scrollWidth > e.clientWidth + 1).length,
            inside: (() => { const box = document.getElementById('log-panel').getBoundingClientRect(); return [...document.querySelectorAll('#log-countdown .tb-m, #cd-time')].every(e => { const r = e.getBoundingClientRect(); return r.top >= box.top && r.bottom <= box.bottom; }); })() }));
        check(bracket.cols.join() === 'Чвертьфінал,Півфінал,Фінал' && bracket.names.length === 8 && players.every(p => bracket.names.includes('@' + p)) && bracket.live === 1 && bracket.third && !bracket.cut && bracket.inside,
            'the bracket: quarterfinals, semifinals, the final and the 3rd-place game; all 8 names, the match up next lit, nothing cut off or outside the log area', JSON.stringify(bracket));
        await shot(page, 'tournament-bracket.png');
        // !черга and !бій during the tournament
        await say(page, 'q_first', '!черга'); await say(page, 'q_second', '!черга'); await say(page, 'q_third', '!черга');
        await say(page, 'q_first', '!бій @q_second'); const duelReply = (await view(page)).chat;
        const queued = await view(page);
        check(queued.queue.map(q => q.replace(/\s/g, '')).join() === '1@q_first,2@q_second,3@q_third' && /триває турнір: дуелі — після турніру/.test(duelReply),
            '!черга still joins the queue (1 @q_first, 2 @q_second, 3 @q_third); !бій gets "зараз триває турнір: дуелі — після турніру"', JSON.stringify({ queue: queued.queue, duelReply }));
        // !старт skips the betting window
        await mod(page, '!старт');
        await page.clock.runFor(4500 + 4500 * 3 + 700);
        const mid = await view(page);
        const cards = await page.evaluate(() => ['p1', 'p2'].map(p => { const n = document.getElementById(`name-${p}`).textContent.replace('@', ''); const d = getDragonStrict(n);
            return { n, info: document.getElementById(`info-${p}`).textContent, hp: document.getElementById(`hp-text-${p}`).textContent.split('/')[1], want: getMaxHP(20, d.drakeObj.type, d.title), saved: calculateLevelAndProgress(d.xp).level }; }));
        check(mid.kind === 'fight' && mid.plate === '🏆 Турнір · Чвертьфінал · Гра 1 · 0:0' && /^⚔️ Хід \d+ \/ 30$/.test(mid.type),
            `!старт skips the window; mid-fight the plate says "${mid.plate}" and the turn moves to the left ("${mid.type}")`, JSON.stringify(mid));
        check(cards.every(c => / · Рівень 20$/.test(c.info) && +c.hp === c.want) && cards.some(c => c.saved < 20),
            `both fight at level 20: ${cards.map(c => `@${c.n} (saved level ${c.saved}) ${c.info.split('·')[1].trim()}, max HP ${c.hp}`).join('; ')}`, JSON.stringify(cards));
        // Game 1 ends: the 20 s result screen, then the 10 s «Гра 2» countdown (no betting window), then the fight
        await until(page, () => window.__games.length >= 1, null, { step: 500 });
        const end1 = await page.evaluate(() => window.__games[0].t);
        await page.clock.runFor(20000 - 500 + 1500);
        const cd2 = await view(page);
        const s2 = await page.evaluate(() => window.__starts.filter(s => s.tour)[1]);
        check(s2 && s2.t - end1 === 20000 && !s2.betting && s2.total === 10000 && !s2.bracket && cd2.cdTitle === 'Чвертьфінал · Гра 2' && cd2.plate === '🏆 Турнір · Чвертьфінал · Гра 2 · 1:0',
            `game 2: 20 s after game 1 ends, a 10 s countdown "${cd2.cdTitle}" (no betting window, no bracket); the plate "${cd2.plate}"`, JSON.stringify({ s2, end1, cd2 }));
        await page.clock.runFor(10000 + 4500 * 4);
        await shot(page, 'tournament-plate.png');
        // A second !старт within 5 s of an accepted one is ignored: end a result screen, then try to skip the next betting window
        await until(page, () => window.__games.length >= 2 && !!resultHold, null, { step: 500 });
        await mod(page, '!старт');                                           // ends QF1's last result screen: QF2's betting window opens
        const qf2open = await view(page);
        await page.clock.runFor(2000);
        await say(page, 'mod_petro', '!старт', { mod: true });               // 2 s later: ignored
        const guarded = await view(page);
        check(qf2open.kind === 'countdown' && qf2open.bracket && guarded.kind === 'countdown' && guarded.bracket,
            "!старт ends the result screen; a second one 2 s later doesn't skip the next match's betting window (the 5 s guard)", JSON.stringify({ a: qf2open.kind, b: guarded.kind }));
        // Every later stage: the plate at the first turn of each
        const plates = {};
        let screenshotPodium = false;
        for (let i = 0; i < 2000; i++) {
            await page.clock.runFor(5000);
            const v = await view(page);
            if (v.kind === 'fight' && !plates[v.plate.replace(/ · \d+:\d+$/, '')]) plates[v.plate.replace(/ · \d+:\d+$/, '')] = v.plate;
            if (v.kind === 'podium') { screenshotPodium = true; break; }
        }
        const games = await page.evaluate(() => window.__games);
        const starts = await page.evaluate(() => window.__starts.filter(s => s.tour));
        const pairs = [...new Set(games.map(g => g.k))];
        const count = k => games.filter(g => g.k === k).length;
        check(pairs.join('|') === Object.keys(plan).join('|'), 'the order: QF1–QF4, SF1, SF2, the 3rd-place game, the final', pairs.join(' | '));
        check(count(key(...qf[0])) === 2 && count(key(...qf[1])) === 3 && count(key(...qf[2])) === 3 && count(key(...qf[3])) === 3 && count(key(qf[1][0], qf[3][0])) === 1 && count(key(qf[0][0], qf[2][0])) === 3,
            'first to 2: QF1 2:0 (2 games), QF2 and QF4 2:1 (3), QF3 a draw replayed then 2:0 (3); the 3rd-place game one game; the final 2:1 (3)',
            JSON.stringify(pairs.map(k => [k, count(k)])));
        const replay = games.find(g => g.k === key(...qf[2]) && g.replay);
        check(replay && replay.game === 1, 'the drawn game is replayed as game 1 again ("Гра 1 (перегравання)")', JSON.stringify(games.filter(g => g.k === key(...qf[2]))));
        const firstOfMatch = starts.filter(s => s.tour.game === 1 && !s.tour.replay), rest = starts.filter(s => !(s.tour.game === 1 && !s.tour.replay));
        check(firstOfMatch.length === 8 && firstOfMatch.every(s => s.betting && s.bracket) && rest.every(s => !s.betting && s.total === 10000),
            `the betting window (with the bracket) before game 1 of all 8 matches, the 3rd-place game and the final included; the ${rest.length} other games (and the replay) get the 10 s countdown`,
            JSON.stringify(starts.map(s => [s.tour.stage, s.tour.game, s.betting, s.total])));
        check(games.every(g => g.lv[0] === 20 && g.lv[1] === 20), `all ${games.length} games at level 20`, JSON.stringify(games.map(g => g.lv)));
        const wantPlates = ['🏆 Турнір · Чвертьфінал · Гра 3', '🏆 Турнір · Півфінал · Гра 1', '🏆 Турнір · Півфінал · Гра 2', '🏆 Турнір · Матч за 3-тє місце', '🏆 Турнір · Фінал · Гра 1', '🏆 Турнір · Фінал · Гра 3'];
        check(wantPlates.every(p => Object.keys(plates).includes(p)), `the plate at every stage: ${Object.values(plates).slice(0, 12).join(' | ')}`, JSON.stringify(Object.keys(plates)));
        // The podium
        const podium = await view(page);
        const pd = await page.evaluate(() => [...document.querySelectorAll('#log-countdown .pd-col')].map(c => ({ name: c.querySelector('.pd-name').textContent, medal: c.querySelector('.pd-medal').textContent, sprite: !!c.querySelector('img.pd-sprite') })));
        const [gold, silver, bronze] = [qf[0][0], qf[2][0], qf[1][0]];
        check(screenshotPodium && pd.map(c => c.medal + c.name).join() === `🥈@${silver},🥇@${gold},🥉@${bronze}` && pd.every(c => c.sprite) && podium.type === '🏆 Турнір завершено' && podium.plate === `🥇 @${gold}`,
            `the podium: 🥇 @${gold}, 🥈 @${silver}, 🥉 @${bronze}, with sprites; "${podium.type}" · "${podium.plate}"`, JSON.stringify({ pd, type: podium.type, plate: podium.plate }));
        await shot(page, 'tournament-podium.png');
        const after = await snapshot();
        check(JSON.stringify(after.db) === JSON.stringify(before.db) && after.stats === before.stats && JSON.stringify(after.top) === JSON.stringify(before.top),
            'no XP and saved levels untouched for all 8; wins, losses and the Top exactly as before', JSON.stringify({ before, after }));
        // The play log: every tournament game with its stage and game number (a replay marked), the players' saved levels
        // (they fought at level 20), the winner, no XP
        const tourLog = JSON.parse(await page.evaluate(() => exportPlayLog({ names: true }))).events.filter(e => e.kind === 'tournament');
        const tourLogOk = tourLog.length === games.length && tourLog.every((e, i) => {
            const g = games[i];
            return e.stage === g.stage && e.game === g.game && e.replay === !!g.replay && e.fightLevel === 20 && e.counted === true && (starts[i].betting ? !!e.bettingOpened : e.bettingOpened === null)
                && [e.players[0].name, e.players[1].name].sort().join('-') === g.k && e.winner === (g.w || null) && e.result === (g.w ? 'ko' : 'draw')
                && e.players.every(p => p.level === levels[p.name] && p.got === null);
        });
        check(tourLogOk, `the play log: all ${tourLog.length} tournament games with their stage and game number (the replay marked), saved levels, the winner, no XP`,
            JSON.stringify(tourLog.map(e => [e.stage, e.game, e.replay, e.winner, e.result, e.players.map(p => p.level)])));
        // After the podium's 20 s and the Hall of Fame's 15 s: the queue (in its order) and duels carry on
        await until(page, () => !tourney, null, { step: 500 });
        const back = await view(page);
        const nextFight = await page.evaluate(() => window.__starts[window.__starts.length - 1]);
        await say(page, 'duel_a', '!бій @duel_b'); const challenged = await page.evaluate(() => pendingChallenges.duel_b);
        check(!back.tourney && back.line === 'стати в чергу: !черга' && nextFight.ranked && [nextFight.a, nextFight.b].join() === 'q_first,q_second'
            && back.queue.map(q => q.replace(/\s/g, '')).join() === '1@q_third' && challenged === 'duel_a' && !(await page.evaluate(k => localStorage.getItem(k), KEY)),
            'after the podium: the tournament is gone (its save too); the queue carries on in its order (@q_first against @q_second, @q_third next) and !бій works again',
            JSON.stringify({ line: back.line, nextFight, queue: back.queue, challenged }));
        // The run's timeline: when every fight started (game clock), with the tournament's stage and game. With the
        // effects off it must match the page without the show (TOUR_FILE=<that page> TOUR_ONLY=2 prints its own)
        const timeline = await page.evaluate(() => window.__starts.map(s => [s.t, s.a, s.b, s.tour && s.tour.stage, s.tour && s.tour.game]));
        console.log(`  · timeline (effects off): ${require('crypto').createHash('sha256').update(JSON.stringify(timeline)).digest('hex').slice(0, 16)} (${timeline.length} fights)`);
        check(!errors.length, 'no page errors', errors.join(' | '));
        await context.close();
    }

    // 3. A reload in the middle of a match
    if (run(3)) {
        console.log('\n[3. a reload mid-match, uk]');
        const { page, context, errors } = await open(browser, { lang: 'uk' });
        const players = ['ania', 'borys', 'vira', 'hlib'];
        await register(page, 'uk', players, { ania: 4, borys: 8 });
        await mod(page, '!турнір 4');
        for (const n of players) await say(page, n, '!учасник');
        const sf = (await view(page)).tourney.rounds[0].map(m => [m.a, m.b]);
        const plan = { [key(...sf[0])]: [sf[0][0], sf[0][0]], [key(...sf[1])]: [sf[1][0], sf[1][0], sf[1][0]], [key(sf[0][1], sf[1][1])]: [sf[0][1]], [key(sf[0][0], sf[1][0])]: [sf[0][0], sf[0][0]] };
        await page.evaluate(p => { window.__plan = p; }, plan);
        // Into game 2 of the second semifinal (1:0), mid-fight
        await until(page, k => window.__games.filter(g => g.k === k).length === 1 && arenaState.kind === 'fight' && arenaState.turn >= 3, key(...sf[1]), { step: 1500 });
        const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
        const keyOk = !/db|stats/i.test(KEY);
        await storageSettled(page);
        await page.reload();
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(p => { window.__plan = p; window.__played = {}; }, { [key(...sf[1])]: [sf[1][0], sf[1][0]], [key(sf[0][1], sf[1][1])]: [sf[0][1]], [key(sf[0][0], sf[1][0])]: [sf[0][0], sf[0][0]] });
        await page.clock.runFor(1000);
        const resumed = await view(page), diag = await afterReload(page);
        check(keyOk && saved.phase === 'running' && saved.rounds[0][0].winner === sf[0][0] && resumed.tourney && resumed.tourney.rounds[0][0].winner === sf[0][0]
            && resumed.kind === 'countdown' && /^🏆 Турнір · Півфінал · Гра 2 · (1:0|0:1)$/.test(resumed.plate) && resumed.cdTitle === 'Півфінал · Гра 2',
            `after a reload: the saved tournament (key "${KEY}", no "db" or "stats" in it) resumes at the second semifinal, game 2 replayed: "${resumed.plate}"`,
            JSON.stringify({ phase: saved.phase, resumed: { kind: resumed.kind, plate: resumed.plate, cd: resumed.cdTitle }, diag, errors }));
        await until(page, () => arenaState.kind === 'podium', null, { step: 5000 });
        const pd = await page.evaluate(() => [...document.querySelectorAll('#log-countdown .pd-name')].map(e => e.textContent));
        const games = await page.evaluate(() => window.__games.map(g => g.k + ':' + g.game));
        check(games[0] === key(...sf[1]) + ':2' && pd.join() === [sf[1][0], sf[0][0], sf[0][1]].map(n => '@' + n).join(),
            'the replayed game counts (the semifinal ends 2:0), and the tournament runs on to its podium', JSON.stringify({ games, pd }));
        check(!errors.length, 'no page errors', errors.join(' | '));
        await context.close();

        // A reload at every moment of a tournament (an OBS source can reload at any time), each on the game clock so it's
        // the same on any machine: the arena picks the tournament up at once (nothing waits for fonts, Twitch or real
        // time), it runs to its podium and ends, and then the queue, paused all along, carries on
        for (const phase of RELOAD_PHASES) {
            const r = await open(browser, { lang: 'uk', betting: !!phase.betting, fx: !!phase.fx });
            const four = ['ania', 'borys', 'vira', 'hlib'];
            await register(r.page, 'uk', [...four, 'q1', 'q2']);
            await mod(r.page, '!турнір 4');
            for (const n of phase.signup ? four.slice(0, 2) : four) await say(r.page, n, '!учасник');
            if (!phase.signup) {
                const [[a, b], [c, d]] = (await view(r.page)).tourney.rounds[0].map(m => [m.a, m.b]);
                await r.page.evaluate(p => { window.__plan = p; }, { [key(a, b)]: [a, a], [key(c, d)]: [c, c], [key(b, d)]: [b], [key(a, c)]: [a, a] });
                await until(r.page, phase.at, null, { step: 250 });
            }
            const before = await r.page.evaluate(() => ({ kind: arenaState.kind, phase: tourney && tourney.phase, games: window.__games.length }));
            await storageSettled(r.page);
            await r.page.reload();
            await r.page.clock.runFor(500);
            const after = await view(r.page), diag = await afterReload(r.page);
            await say(r.page, 'q1', '!черга'); await say(r.page, 'q2', '!черга');
            if (phase.signup) for (const n of four.slice(2)) await say(r.page, n, '!учасник');
            let podium = false, ended = false, next = null;
            try {
                await until(r.page, () => { if (arenaState.kind === 'podium') window.__sawPodium = true; return !tourney; }, null, { step: 500, max: 3 * 3600000 });
                podium = await r.page.evaluate(() => !!window.__sawPodium || (getComputedStyle(document.body) && false));
                ended = true;
                await until(r.page, () => window.__fights.some(f => f.ranked && [f.p1, f.p2].sort().join() === 'q1,q2'), null, { step: 500, max: 120000 });
                next = await r.page.evaluate(() => window.__fights.find(f => f.ranked));
            } catch (e) { /* reported below */ }
            check(phase.expect(after, before) && ended && (podium || phase.podiumBefore) && next && !r.errors.length,
                `a reload ${phase.label}: «${after.plate || after.line}» at once (${after.kind}); the tournament runs on to its podium and ends, then the queue carries on (@q1 against @q2)`,
                JSON.stringify({ before, after: { kind: after.kind, plate: after.plate, line: after.line, phase: after.tourney && after.tourney.phase }, diag, ended, podium, next, errors: r.errors }));
            await r.context.close();
        }

        // The watchdog. A stall forced on purpose: a reload mid-game with the resume skipped (tourneyResume replaced by a
        // no-op just before the page starts up), so the tournament is saved as running but nothing restarts it. Within
        // 5 s the watchdog starts the next game itself, with one console.error, the one place that error is expected
        {
            const w = await open(browser, { lang: 'uk' });
            const four = ['ania', 'borys', 'vira', 'hlib'];
            await register(w.page, 'uk', [...four, 'q1', 'q2']);
            await w.page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
                if (new URLSearchParams(location.search).has('skipresume')) { window.tourneyResume = () => {}; window.__resumeSkipped = true; }
            }));
            await mod(w.page, '!турнір 4');
            for (const n of four) await say(w.page, n, '!учасник');
            await until(w.page, () => tourGame && arenaState.kind === 'fight' && arenaState.turn >= 2, null, { step: 250 });
            await storageSettled(w.page);
            await w.page.goto(`${PAGE}?lang=uk&skipresume`);   // the reload, with the flag in the URL (it can't get lost)
            const t0 = await w.page.evaluate(() => Date.now());
            await w.page.clock.runFor(1000);
            const stalled = await view(w.page), errorsAtStall = w.errors.length, skipped = await w.page.evaluate(() => !!window.__resumeSkipped);
            let took = Infinity;   // stays so if nothing restarts it within 20 s
            try { took = await until(w.page, () => arenaState.kind === 'countdown' && !!tourGame, null, { step: 250, max: 20000 }) + 1000; } catch (e) { /* reported below */ }
            const restarted = await view(w.page);
            const dog = w.errors.filter(e => /Tournament watchdog/.test(e)), others = w.errors.filter(e => !/Tournament watchdog/.test(e));
            check(skipped && stalled.kind === 'idle' && stalled.tourney && stalled.tourney.phase === 'running' && !errorsAtStall
                && took <= 5000 && restarted.kind === 'countdown' && tourPlate(restarted) && dog.length === 1 && !others.length,
                `the watchdog: after a reload with the resume skipped, the arena sits idle with the tournament running; ${took / 1000} s later the watchdog starts the game again («${restarted.plate}») and says so once with console.error`,
                JSON.stringify({ skipped, stalled: { kind: stalled.kind, phase: stalled.tourney && stalled.tourney.phase }, took, restarted: restarted.plate, dog, others, t0 }));
            await w.context.close();
        }
    }

    // 4. Uneven sign-ups: the qualifier (5 players in English with the betting window on, 13 in Ukrainian, 9 and 15),
    //    exactly 16, cancelling
    if (run(4)) {
        console.log('\n[4. qualifier: 5 players, English, betting window on]');
        const players = ['ava', 'ben', 'cleo', 'dan', 'eve', 'finn', 'gus', 'hal', 'ivy', 'jo', 'kai', 'lu', 'max', 'ned', 'oz', 'pia'];
        const cols = page => page.evaluate(() => [...document.querySelectorAll('#log-countdown .tb-col')].map(c => ({
            h: c.querySelector('.tb-h').textContent,
            ms: [...c.querySelectorAll('.tb-ms > .tb-m')].map(m => ({ live: m.classList.contains('live'), won: !!m.querySelector('.tb-p.won'),
                p: [...m.querySelectorAll('.tb-n')].map(n => n.classList.contains('tb-none') ? '…' : n.textContent),   // a place still to be won: «…»
                raw: [...m.querySelectorAll('.tb-n')].map(n => n.textContent) })) })));
        // Every bracket box inside the countdown area, and every name inside its box
        const fits = page => page.evaluate(() => {
            const box = document.getElementById('log-countdown').getBoundingClientRect();
            const inBox = el => { const r = el.getBoundingClientRect(); return r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5 && r.left >= box.left - 0.5 && r.right <= box.right + 0.5; };
            return [...document.querySelectorAll('#log-countdown .tb-m')].every(inBox) && [...document.querySelectorAll('#log-countdown .tb-n')].every(n => n.scrollWidth <= n.clientWidth + 1);
        });
        {
            const { page, context, errors } = await open(browser, { lang: 'en', betting: true });
            await register(page, 'en', players.slice(0, 5));
            await mod(page, '!tournament');
            for (const n of players.slice(0, 5)) await say(page, n, '!join');
            await mod(page, '!tournament start');
            await page.clock.runFor(1000);
            const v = await view(page), t = v.tourney;
            const r1 = t.rounds[0].flatMap(m => [m.a, m.b]).filter(Boolean).sort();
            check(t.bracket === 4 && t.rounds.length === 2 && r1.join() === 'ava,ben,cleo' && t.qual.length === 1 && [t.qual[0].a, t.qual[0].b].sort().join() === 'dan,eve',
                '5 players: a main bracket of 4; @ava, @ben and @cleo (the first three) straight into the semifinals; @dan and @eve (the last two) in the qualifier', JSON.stringify(t));
            check(v.chat === '🏆 5 players: 3 with the highest levels straight into the semifinals, 2 play a qualifier for 1 spot', `the ЧАТ panel: "${v.chat}"`, v.chat);
            const start = await page.evaluate(() => window.__starts[window.__starts.length - 1]);
            const c = await cols(page);
            check(start.tour.stage === 'qual' && !start.betting && start.total === 10000 && start.bracket && v.plate === '🏆 Tournament · Qualifier 1/1' && v.cdTitle === 'Qualifier 1/1'
                && c.map(x => x.h).join() === 'Qualifier,Semifinal,Final' && c[0].ms.length === 1 && c[0].ms[0].live && c[1].ms.flatMap(m => m.p).filter(p => p === '…').length === 1
                && c[1].ms.flatMap(m => m.raw).includes('qualifier 1'),
                `the qualifier game: no betting window, the 10 s countdown with the bracket, the qualifier its own first column (live), one semifinal place "…"; "${v.plate}"`,
                JSON.stringify({ start, plate: v.plate, cdTitle: v.cdTitle, c }));
            const plates = new Set();
            for (let i = 0; i < 2000; i++) {
                await page.clock.runFor(5000);
                const w = await view(page);
                if (w.kind === 'fight') plates.add(w.plate.replace(/ · \d+:\d+$/, '').replace(/ · Game \d+( \(replay\))?/, ''));
                if (w.kind === 'podium') break;
            }
            const done = (await view(page)).tourney;
            const starts = await page.evaluate(() => window.__starts.filter(s => s.tour));
            const qualWinner = done.qual[0].winner;
            check([...plates].join() === '🏆 Tournament · Qualifier 1/1,🏆 Tournament · Semifinal,🏆 Tournament · 3rd-place match,🏆 Tournament · Final'
                && done.rounds[0].flatMap(m => [m.a, m.b]).sort().join() === ['ava', 'ben', 'cleo', qualWinner].sort().join()
                && starts.filter(s => s.tour.stage === 'qual').every(s => !s.betting) && starts.filter(s => s.tour.stage !== 'qual' && s.tour.game === 1 && !s.tour.replay).every(s => s.betting),
                `English plates: ${[...plates].join(' | ')}; the qualifier's winner (@${qualWinner}) plays the semifinals; game 1 of every later match opens the betting window`,
                JSON.stringify({ plates: [...plates], starts }));
            check(!errors.length, 'no page errors', errors.join(' | '));
            await context.close();
        }
        console.log('\n[4. qualifier: 13 players, Ukrainian]');
        {
            const { page, context, errors } = await open(browser, { lang: 'uk' });
            const ps = players.slice(0, 13);
            await register(page, 'uk', ps);
            await mod(page, '!турнір 16');
            for (const n of ps) await say(page, n, '!учасник');
            await mod(page, '!турнір старт');
            await page.clock.runFor(1000);
            const v = await view(page), t = v.tourney;
            const c = await cols(page);
            check(t.bracket === 8 && c[1].ms.flatMap(m => m.p).filter(p => p !== '…').sort().join() === '@ava,@ben,@cleo' && t.qual.length === 5
                && t.qual.flatMap(m => [m.a, m.b]).sort().join() === ps.slice(3).join(),
                '13 players: a main bracket of 8; the first 3 straight into the quarterfinals, the other 10 in 5 qualifier games', JSON.stringify(t.qual));
            check(v.chat === '🏆 13 учасників: 3 з найвищим рівнем — одразу в чвертьфінал, 10 грають кваліфікацію за 5 місць', `the ЧАТ panel: «${v.chat}»`, v.chat);
            check(c.map(x => x.h).join() === 'Кваліфікація,Чвертьфінал,Півфінал,Фінал' && c[0].ms.length === 5 && c[0].ms[0].live && c[1].ms.flatMap(m => m.p).filter(p => p === '…').length === 5
                && v.plate === '🏆 Турнір · Кваліфікація 1/5' && await fits(page),
                `the bracket: «Кваліфікація» (5 games, the first live) before the quarterfinals (5 places «…»), all inside the countdown; «${v.plate}»`, JSON.stringify({ c, plate: v.plate }));
            await shot(page, 'tournament-qualifier.png');
            // Each qualifier game's first-named player wins: one game each, then the quarterfinals with all 8
            await page.evaluate(q => { q.forEach(m => { window.__plan[[m.a, m.b].sort().join('-')] = [m.a]; }); }, t.qual);
            await until(page, () => window.__starts.some(s => s.tour && s.tour.stage === 'qf'), null, { step: 2000 });
            await page.clock.runFor(1000);
            const games = await page.evaluate(() => window.__games.map(g => [g.k, g.stage]));
            const c2 = await cols(page);
            const qfNames = c2[1].ms.flatMap(m => m.p).map(p => p.slice(1)).sort();
            check(games.length === 5 && games.every(g => g[1] === 'qual') && c2[0].ms.every(m => m.won) && c2[1].ms[0].live
                && qfNames.join() === ['ava', 'ben', 'cleo', ...t.qual.map(m => m.a)].sort().join(),
                `5 qualifier games, one each; then the quarterfinals with the 3 direct players and the 5 winners: ${qfNames.map(n => '@' + n).join(' ')}`, JSON.stringify({ games, c2 }));
            await mod(page, '!турнір стоп');
            check(!errors.length, 'no page errors', errors.join(' | '));
            await context.close();
        }
        console.log('\n[4. 9, 15 and 16 players, English; cancel]');
        {
            const { page, context, errors } = await open(browser, { lang: 'en' });
            await register(page, 'en', [...players, 'q1', 'q2']);
            // 9 players: one qualifier game for the last place; !tournament stop during its countdown
            await mod(page, '!tournament 16');
            for (const n of players.slice(0, 9)) await say(page, n, '!join');
            await mod(page, '!tournament start');
            const news9 = (await view(page)).chat;
            await say(page, 'q1', '!queue'); await say(page, 'q2', '!queue');
            await page.clock.runFor(1000);
            const v9 = { ...await view(page), chat: news9 };
            check(v9.tourney.bracket === 8 && v9.tourney.qual.length === 1 && [v9.tourney.qual[0].a, v9.tourney.qual[0].b].sort().join() === 'hal,ivy'
                && v9.chat === '🏆 9 players: 7 with the highest levels straight into the quarterfinals, 2 play a qualifier for 1 spot'
                && v9.plate === '🏆 Tournament · Qualifier 1/1' && v9.counting && v9.queue.length === 2,
                `9 players: @hal and @ivy (the last two) play for the last place; "${v9.chat}"; "${v9.plate}"; the queue waits (2 in it)`, JSON.stringify({ qual: v9.tourney.qual, chat: v9.chat, plate: v9.plate, queue: v9.queue }));
            await mod(page, '!tournament stop');
            const stopped = await view(page);
            await page.clock.runFor(1000);
            const fight = await page.evaluate(() => window.__fights[window.__fights.length - 1]);
            check(!stopped.tourney && /cancelled/.test(stopped.chat) && stopped.line === 'join the queue: !queue' && fight.ranked && [fight.p1, fight.p2].sort().join() === 'q1,q2' && !(await page.evaluate(k => localStorage.getItem(k), KEY)),
                '!tournament stop during the countdown: the countdown goes, the line goes, the save goes, and the queue starts at once (@q1 against @q2)', JSON.stringify({ chat: stopped.chat, line: stopped.line, fight }));
            await until(page, () => !isBattleRunning && !resultHold, null, { step: 2000 });
            // 15 players: 7 qualifier games, the biggest qualifier column; all of it fits
            await mod(page, '!tournament 16');
            for (const n of players.slice(0, 15)) await say(page, n, '!join');
            await mod(page, '!tournament start');
            await page.clock.runFor(1000);
            const v15 = await view(page), c15 = await cols(page);
            check(v15.tourney.bracket === 8 && v15.chat === '🏆 15 players: 1 with the highest levels straight into the quarterfinals, 14 play a qualifier for 7 spots'
                && c15[0].h === 'Qualifier' && c15[0].ms.length === 7 && c15[1].ms.flatMap(m => m.p).filter(p => p !== '…').join() === '@ava' && await fits(page),
                `15 players: only @ava straight in; 7 qualifier games in their column, all inside the countdown; "${v15.chat}"`, JSON.stringify({ chat: v15.chat, c15 }));
            // !tournament stop in the middle of a qualifier game: the game is fought to its end, counting for nothing
            await until(page, () => arenaState.kind === 'fight', null, { step: 500 });
            const midPlate = (await view(page)).plate, gamesBefore = await page.evaluate(() => window.__games.length);
            await mod(page, '!tournament stop');
            await until(page, () => !isBattleRunning && !resultHold, null, { step: 2000 });
            const after15 = await view(page);
            const end15 = await page.evaluate(n => ({ finished: window.__games.length === n + 1, aborted: /simulation error/i.test(document.body.innerText) }), gamesBefore);
            check(midPlate === '🏆 Tournament · Qualifier 1/7' && end15.finished && !end15.aborted && !after15.tourney && !(await page.evaluate(k => localStorage.getItem(k), KEY)) && !errors.length,
                `!tournament stop during a qualifier game ("${midPlate}"): the game is fought to its end (no "simulation error"), and the tournament is gone`, JSON.stringify({ midPlate, end15, errors }));
            // 16 players: exactly a bracket of 16, no qualifier (the 16th closes sign-up)
            await mod(page, '!tournament 16');
            for (const n of players) await say(page, n, '!join');
            await page.clock.runFor(1000);
            const v16 = await view(page), c16 = await cols(page);
            const mid16 = await page.evaluate(() => { const m = document.querySelector('#log-countdown .tb-mirror .tb-mid'); return m ? { h: m.querySelector('.tb-h').textContent, timer: !!m.querySelector('.tb-timer #cd-time'), matches: m.querySelectorAll('.tb-m').length } : null; });
            check(v16.tourney.bracket === 16 && !v16.tourney.qual.length && v16.plate === '🏆 Tournament · Round of 16 · Game 1 · 0:0'
                && c16.map(x => x.h).join() === 'Round of 16,Quarterfinal,Semifinal,Semifinal,Quarterfinal,Round of 16' && c16[0].ms.length === 4 && c16[5].ms.length === 4
                && mid16 && mid16.h === 'Final' && mid16.timer && mid16.matches === 2 && !/qualifier/.test(v16.chat) && await fits(page),
                `16 players: a bracket of 16, no qualifier, mirrored: two halves of 4 round-of-16 matches meeting at the final in the middle (the timer above it, the 3rd-place game under it); "${v16.plate}"`,
                JSON.stringify({ plate: v16.plate, chat: v16.chat, cols: c16.map(x => `${x.h} ${x.ms.length}`), mid16 }));
            await mod(page, '!tournament stop');
            await mod(page, '!tournament 4');
            await mod(page, '!tournament stop');
            const stopped2 = await view(page);
            check(!stopped2.tourney && stopped2.line === 'join the queue: !queue', '!tournament stop during sign-up: back to normal', JSON.stringify(stopped2.line));

            // Stopping in the middle of a game (a main-bracket game, game 3, the 3rd-place game, the final): the tournament,
            // its line and its save go at once; the game is fought to its end and counts for nothing; after its result
            // screen the queue carries on. Each from a 4-player tournament whose results follow a plan
            const four = players.slice(0, 4);
            const TOURNEY_STAGE_EN = { sf: 'Semifinal', third: '3rd-place match', final: 'Final', qf: 'Quarterfinal', qual: 'Qualifier', r16: 'Round of 16' };
            const newFour = async plan => {
                await until(page, () => !isBattleRunning && !resultHold, null, { step: 2000 });
                await mod(page, '!tournament 4');
                for (const n of four) await say(page, n, '!join');
                const [[a, b], [c, d]] = (await view(page)).tourney.rounds[0].map(m => [m.a, m.b]);
                await page.evaluate(p => { window.__plan = p; window.__played = {}; }, plan(a, b, c, d));
            };
            const stopDuring = async (label, plan, when) => {
                await newFour(plan);
                await until(page, when, null, { step: 500 });
                await say(page, 'q1', '!queue'); await say(page, 'q2', '!queue');
                const before = await page.evaluate(() => ({ games: window.__games.length, fights: window.__fights.length, plate: document.getElementById('status-plate').textContent }));
                await mod(page, '!tournament stop');
                const at = await view(page);
                await until(page, () => !isBattleRunning && arenaState.kind === 'result', null, { step: 250 });
                const ended = await page.evaluate(() => ({ games: window.__games.length, kind: arenaState.kind, aborted: /simulation error/i.test(document.body.innerText), t: Date.now() }));
                // The play log has the game, marked as counting for nothing
                const logged = await page.evaluate(async () => JSON.parse(await exportPlayLog({ names: true })).events.filter(e => e.kind === 'tournament').pop());
                await until(page, n => window.__fights.length > n, before.fights, { step: 250 });
                const next = await page.evaluate(() => window.__fights[window.__fights.length - 1]);
                check(!at.tourney && /cancelled/.test(at.chat) && at.kind === 'fight' && at.line === 'join the queue: !queue' && !(await page.evaluate(k => localStorage.getItem(k), KEY))
                    && ended.games === before.games + 1 && ended.kind === 'result' && !ended.aborted && logged && logged.counted === false && before.plate.includes(TOURNEY_STAGE_EN[logged.stage])
                    && next.ranked && [next.p1, next.p2].sort().join() === 'q1,q2' && next.t - ended.t >= 18000 && next.t - ended.t <= 20000 && !errors.length,
                    `!tournament stop during ${label} («${before.plate}»): the tournament goes at once; the game is fought to its end (no "simulation error") and counts for nothing (so the play log says); after its 20 s result screen the queue carries on (@q1 against @q2)`,
                    JSON.stringify({ at: { kind: at.kind, chat: at.chat, line: at.line }, before, ended, logged, next, errors }));
            };
            await stopDuring('a main-bracket game', () => ({}), () => tourGame && tourGame.stage === 'sf' && arenaState.kind === 'fight');
            await stopDuring('game 3', (a, b) => ({ [key(a, b)]: [a, b, a] }), () => tourGame && tourGame.game === 3 && arenaState.kind === 'fight');
            await stopDuring('the 3rd-place game', (a, b, c, d) => ({ [key(a, b)]: [a, a], [key(c, d)]: [c, c] }), () => tourGame && tourGame.third && arenaState.kind === 'fight');
            await stopDuring('the final', (a, b, c, d) => ({ [key(a, b)]: [a, a], [key(c, d)]: [c, c], [key(b, d)]: [b] }), () => tourGame && tourGame.stage === 'final' && arenaState.kind === 'fight');
            // On the podium the tournament is over: stop is refused, the podium stays
            await newFour((a, b, c, d) => ({ [key(a, b)]: [a, a], [key(c, d)]: [c, c], [key(b, d)]: [b], [key(a, c)]: [a, a] }));
            await until(page, () => arenaState.kind === 'podium', null, { step: 1000 });
            await mod(page, '!tournament stop');
            const pod = await view(page);
            check(pod.tourney && pod.tourney.phase === 'podium' && pod.kind === 'podium' && /already over/.test(pod.chat),
                `!tournament stop on the podium: refused ("${pod.chat}"), the podium stays`, JSON.stringify({ phase: pod.tourney && pod.tourney.phase, kind: pod.kind, chat: pod.chat }));
            await until(page, () => !tourney, null, { step: 1000 });
            check(!errors.length, 'no page errors', errors.join(' | '));
            await context.close();
        }
    }

    // 5. Rewards
    if (run(5)) {
        console.log('\n[5. rewards, uk]');
        const { page, context, errors } = await open(browser, { lang: 'uk' });
        const players = ['ruslana', 'petro', 'marta', 'ostap', 'nadiia'];
        await register(page, 'uk', players, { ruslana: 6, petro: 4, marta: 9, ostap: 2, nadiia: 3 });
        await page.evaluate(() => recordStats('petro', true));   // a ladder record, so the wipe has a stats key to remove
        // A tournament where the earlier name in pri always wins; returns [1st, 2nd, 3rd] as the bracket made them
        const play = async (pri, who) => {
            await mod(page, '!турнір 4');
            for (const n of who) await say(page, n, '!учасник');
            await page.evaluate(p => { window.__plan = new Proxy({}, { get: (_, k) => { const [a, b] = k.split('-'); const w = p.indexOf(a) < p.indexOf(b) ? a : b; return [w, w, w]; } }); }, pri);
            await until(page, () => arenaState.kind === 'podium', null, { step: 5000 });
            return page.evaluate(() => tourney.podium);
        };
        const p1 = await play(['ruslana', 'petro', 'marta', 'ostap'], ['ruslana', 'petro', 'marta', 'ostap']);
        await page.clock.runFor(20000 + 500);                                // the podium's 20 s: then the Hall of Fame
        const hallScreen = await page.evaluate(() => ({ kind: arenaState.kind, on: document.getElementById('log-countdown').classList.contains('hall') && document.getElementById('log-panel').classList.contains('counting'),
            rows: [...document.querySelectorAll('#log-countdown .hf-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()), type: document.getElementById('fight-type').textContent, tourney: !!tourney }));
        // !турнір стоп during the Hall of Fame: the tournament is over, so it's refused and the prizes stay
        await mod(page, '!турнір стоп');
        const hallStop = await view(page), hallPrizes = await page.evaluate(() => getHonours().hall.length);
        check(hallStop.tourney && hallStop.tourney.phase === 'hall' && hallStop.kind === 'hall' && /уже завершено/.test(hallStop.chat) && hallPrizes === 1,
            `!турнір стоп during the Hall of Fame: refused («${hallStop.chat}»), the Hall of Fame stays and so do the prizes`, JSON.stringify({ phase: hallStop.tourney && hallStop.tourney.phase, chat: hallStop.chat, hallPrizes }));
        await page.clock.runFor(15000 + 500);
        const afterHall = await page.evaluate(() => ({ kind: arenaState.kind, on: document.getElementById('log-countdown').classList.contains('hall'), tourney: !!tourney }));
        check(hallScreen.kind === 'hall' && hallScreen.on && hallScreen.tourney && hallScreen.rows.length === 1 && hallScreen.rows[0].includes(`🥇 @${p1[0]}`) && hallScreen.rows[0].includes('4 учасників')
            && hallScreen.type === '🏛️ Зала слави' && !afterHall.tourney && afterHall.on,
            `after the podium, the Hall of Fame for 15 s ("${hallScreen.rows[0]}"); then the tournament is over and it stays on the arena`, JSON.stringify({ hallScreen, afterHall }));
        // Badges: the Top, the arena cards, !стата
        const top = await page.evaluate(() => [...document.querySelectorAll('#leaderboard-list .lb-row')].map(r => r.querySelector('.lb-name').textContent));
        check(top.includes(`@${p1[0]}🏆`) && top.includes(`@${p1[1]}🥈`) && top.includes(`@${p1[2]}🥉`) && top.includes('@nadiia'),
            `the Top: ${top.filter(x => /🏆|🥈|🥉/.test(x)).join(', ')} (no badge for @nadiia)`, JSON.stringify(top));
        await say(page, p1[0], `!бій @nadiia`); await say(page, 'nadiia', '!прийняти');
        await page.clock.runFor(4500 + 4500 * 2);
        const cards = await page.evaluate(() => ['p1', 'p2'].map(p => { const n = document.getElementById(`name-${p}`), c = document.getElementById(`card-${p}`);
            return { text: n.textContent, medal: getComputedStyle(n, '::after').content, champion: c.classList.contains('champion'), glow: getComputedStyle(c.querySelector('.drake-sprite')).filter }; }));
        const champ = cards.find(c => c.text === '@' + p1[0]), other = cards.find(c => c.text === '@nadiia');
        check(champ && other && champ.medal === '"🏆"' && champ.champion && /drop-shadow/.test(champ.glow) && other.medal === 'none' && !other.champion && !/drop-shadow/.test(other.glow),
            `the arena card: "@${p1[0]}" with 🏆 after the name (the name's text stays the name) and a golden glow on the drake; @nadiia neither`, JSON.stringify(cards));
        await shot(page, 'tournament-champion.png');
        await say(page, p1[0], '!стата');
        const stata = (await view(page)).chat;
        check(stata.includes(`@${p1[0]} 🏆`) && stata.includes('🏆×1 🥈×0 🥉×0') && stata.includes('Безкоштовні прокрути титулу: 3'),
            `!стата: "${stata.slice(0, 40)}…" with the badge, "🏆×1 🥈×0 🥉×0" and the 3 free spins`, stata);
        // Free spins
        await say(page, p1[0], '!титул'); const spin1 = (await view(page)).chat;
        await say(page, p1[0], '!титул', { 'custom-reward-id': 'reward-xyz' }); const pts = (await view(page)).chat;
        const spinsLeft = await page.evaluate(n => getHonours().spins[n], p1[0]);
        await say(page, 'nadiia', '!титул'); const refused = (await view(page)).chat;
        check(/Безкоштовний прокрут за турнір · лишилось 2/.test(spin1) && !/Безкоштовний прокрут/.test(pts) && spinsLeft === 2 && /ТІЛЬКИ за бали каналу/.test(refused),
            '!титул in chat uses a free spin ("лишилось 2"); a channel-point !титул rolls without using one; with none, "ТІЛЬКИ за бали каналу"', JSON.stringify({ spin1, pts, spinsLeft, refused }));
        // The play log: the free spin and the channel-point roll, and nothing for the refused one
        const rolls = JSON.parse(await page.evaluate(() => exportPlayLog({ names: true }))).events.filter(e => e.type === 'title');
        check(rolls.length === 2 && rolls.every(r => r.user === p1[0]) && rolls[0].via === 'free' && rolls[1].via === 'points',
            `the play log: @${p1[0]}'s free spin (via "free"), then the channel-point roll (via "points"); nothing for the refused one`, JSON.stringify(rolls));
        // A second tournament: new badges, medals add up
        await page.clock.runFor(4 * 60000);
        const p2 = await play(['nadiia', 'ruslana', 'petro', 'marta'], ['ruslana', 'petro', 'marta', 'nadiia']);
        await page.clock.runFor(20000 + 15000 + 1000);
        const h = await page.evaluate(() => getHonours());
        const count = n => [0, 1, 2].map(i => (p1[i] === n ? 1 : 0) + (p2[i] === n ? 1 : 0)).join();
        check(JSON.stringify(h.holders) === JSON.stringify(p2) && players.every(n => (h.medals[n] || [0, 0, 0]).join() === count(n)) && h.hall.length === 2,
            `a second tournament (🏆 @${p2[0]}) takes the badges; the medal counts add up: ${players.filter(n => h.medals[n]).map(n => `@${n} ${h.medals[n].join('/')}`).join(', ')}`, JSON.stringify(h));
        // The play log's export carries the honours too, by id like everything else
        const exp = await page.evaluate(() => exportPlayLog());
        const ex = JSON.parse(exp), named = JSON.parse(await page.evaluate(() => exportPlayLog({ names: true })));
        const idOf = Object.fromEntries(Object.keys(named.saves.drakes).map((n, i) => [n, Object.keys(ex.saves.drakes)[i]]));
        const hx = ex.saves.honours;
        check(hx && JSON.stringify(named.saves.honours) === JSON.stringify(h) && hx.holders.join() === p2.map(n => idOf[n]).join()
            && hx.hall.length === 2 && hx.hall[0].podium.join() === p1.map(n => idOf[n]).join() && Object.keys(hx.medals).every(k => /^p\d{3}$/.test(k))
            && Object.keys(hx.spins).every(k => /^p\d{3}$/.test(k)) && !players.some(n => exp.includes(n)),
            `the play log export has the honours (the last podium, medals, spins, both Hall of Fame entries), every player as an id, no name left`, JSON.stringify({ hx, idOf }));
        await say(page, 'viewer_x', '!зала');
        const card = await page.evaluate(() => { const c = document.querySelector('#info-feed .info-card.hall-card'); return c ? { rows: [...c.querySelectorAll('.hf-card-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()), text: c.textContent.replace(/\s+/g, ' ') } : null; });
        check(card && card.rows.length === 2 && card.rows[0].includes(`🥇 @${p2[0]}`) && card.rows[1].includes(`🥇 @${p1[0]}`) && /Найбільше перемог: .* — 🏆×1/.test(card.text),
            `!зала (anyone, no drake needed): a card with both tournaments, the latest first, and who has won the most`, JSON.stringify(card));
        await shot(page, 'tournament-hall-card.png');
        // The ladder wipe, with a sign-up open; then a reload: the idle arena shows the Hall of Fame
        await mod(page, '!турнір 8');
        await say(page, 'ruslana', '!учасник');
        const wiped = await page.evaluate(() => { const gone = Object.keys(localStorage).filter(k => /db|stats/.test(k)); gone.forEach(k => localStorage.removeItem(k)); return gone; });
        await storageSettled(page);   // the wipe and the game's saves (the sign-up, the honours) in the browser before the reload
        await page.reload();
        await page.evaluate(() => document.fonts.ready);
        await page.clock.runFor(500);
        await settleArena(page);
        const after = await page.evaluate(([K, H]) => ({ keys: Object.keys(localStorage), db: Object.keys(getDragonDB()).length, honours: JSON.parse(localStorage.getItem(H)), signup: tourney && tourney.phase, joined: tourney && tourney.players.map(p => p.name),
            line: document.getElementById('queue-hint').textContent, hall: document.getElementById('log-countdown').classList.contains('hall') && document.getElementById('log-panel').classList.contains('counting'),
            rows: document.querySelectorAll('#log-countdown .hf-row').length, idle: arenaState.kind, idleBanner: getComputedStyle(document.getElementById('log-feed')).opacity }), [KEY, HONOURS]);
        check(wiped.includes('drake_arena_showcase_db') && wiped.includes('drake_arena_showcase_stats') && !after.keys.some(k => /db|stats/.test(k)) && after.keys.includes(KEY) && after.keys.includes(HONOURS) && !wiped.includes(KEY) && !wiped.includes(HONOURS) && after.db === 0
            && JSON.stringify(after.honours) === JSON.stringify(h) && after.signup === 'signup' && after.joined.join() === 'ruslana' && after.line.includes('1/8'),
            `the ladder wipe removes ${wiped.join(', ')}; after a reload the rewards (badges, medals, spins, Hall of Fame) and the open sign-up (1/8) are all still there`, JSON.stringify({ wiped, after }));
        check(after.idle === 'idle' && after.hall && after.rows === 2 && after.idleBanner === '0',
            'the idle arena after the reload: the Hall of Fame (2 tournaments) instead of «Арена готова! Очікування бійців…»', JSON.stringify(after));
        await shot(page, 'tournament-hall-idle.png');
        check(!errors.length, 'no page errors', errors.join(' | '));
        await context.close();
    }

    // 6. The show: the tournament with its effects on (Ukrainian, sounds on)
    if (run(6)) {
        console.log('\n[6. the show: effects on, uk]');
        const { page, context, errors } = await open(browser, { lang: 'uk', fx: true, sound: true });
        const players = ['sofiia_k', 'bohdan', 'ira_77', 'maks', 'oleh_the_great', 'zoryana', 'taras', 'yana'];
        await register(page, 'uk', [...players, 'r_one', 'r_two']);
        // The show's state: arena classes, overlays, the pips, what's in the log area; and where things are
        const looks = () => page.evaluate(() => {
            const arena = document.getElementById('arena'), box = document.getElementById('log-countdown');
            const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
            const pips = id => [...document.querySelectorAll(`#${id} .ts-pip`)].map(p => p.className.replace('ts-pip', '').trim() || '·');
            return { kind: arenaState.kind, cls: [...arena.classList].filter(c => c.startsWith('ts-')), box: box.className,
                over: [...document.querySelectorAll('.ts-over')].map(o => o.className.replace('ts-over', '').trim()),
                overText: txt(document.querySelector('.ts-over')), pips: [pips('ts-pips-p1'), pips('ts-pips-p2')], plaque: txt(document.querySelector('.plaque-text')),
                cues: [...showCues], left: fv.p1 && fv.p1.name, right: fv.p2 && fv.p2.name };
        });
        // Long finite animations running now (ms): the frame's loops are endless and don't count
        const longAnims = () => page.evaluate(() => document.getAnimations().map(a => a.effect.getComputedTiming()).filter(t => Number.isFinite(t.endTime) && t.endTime > 3000).map(t => t.endTime));
        // While a game is fought: nothing of the show over the cards or the log (what's at their centre and corners is theirs)
        const uncovered = () => page.evaluate(() => {
            // The show's layers don't take the mouse (pointer-events: none), so hit-testing would look through them: let it see them
            const probe = document.createElement('style');
            probe.textContent = '.ts-over, .ts-over *, #ts-frame, #ts-frame *, .ts-pips, .ts-pips * { pointer-events: auto !important; }';
            document.head.appendChild(probe);
            const pts = [];
            ['card-p1', 'card-p2', 'log-panel'].forEach(id => {
                const r = document.getElementById(id).getBoundingClientRect();
                [[0.5, 0.5], [0.05, 0.05], [0.95, 0.95], [0.05, 0.95], [0.95, 0.05]].forEach(([x, y]) => {
                    const el = document.elementFromPoint(r.left + r.width * x, r.top + r.height * y);
                    pts.push(!!el && !!el.closest('#' + id) && !el.closest('.ts-over, #ts-frame'));
                });
            });
            const gap = [document.querySelector('.fighters-box').getBoundingClientRect().bottom, document.getElementById('log-panel').getBoundingClientRect().top];
            const pipsIn = [...document.querySelectorAll('.ts-pips')].every(p => { const r = p.getBoundingClientRect(); return r.top >= gap[0] && r.bottom <= gap[1]; });
            probe.remove();
            return { all: pts.every(Boolean), pipsIn };
        });
        const settle = ms => page.waitForTimeout(ms);   // CSS animations run on real time, not the game clock

        // A regular fight: none of the show
        await say(page, 'r_one', '!черга'); await say(page, 'r_two', '!черга');
        await until(page, () => arenaState.kind === 'fight', null, { step: 500 });
        const plain = await looks();
        check(!plain.cls.length && !plain.over.length && !(await page.evaluate(() => !!document.getElementById('ts-frame'))),
            'a regular fight: no championship frame, no pips, no overlay', JSON.stringify(plain));
        await until(page, () => !isBattleRunning && !resultHold, null, { step: 2000 });

        // 1. The sign-up board on the free arena
        await mod(page, '!турнір');
        for (const n of players.slice(0, 5)) await say(page, n, '!учасник');
        await page.clock.runFor(100);
        const board = await page.evaluate(() => ({ box: document.getElementById('log-countdown').className, counting: document.getElementById('log-panel').classList.contains('counting'),
            slots: document.querySelectorAll('.ts-slot').length, filled: [...document.querySelectorAll('.ts-slot:not(.empty) .ts-slot-name')].map(n => n.textContent),
            sprites: document.querySelectorAll('.ts-slot-sprite').length, pop: [...document.querySelectorAll('.ts-slot.pop .ts-slot-name')].map(n => n.textContent),
            count: document.querySelector('.tsb-count').textContent, bar: document.querySelector('.tsb-fill').style.transform, mini: !!document.querySelector('#queue-hint .ts-mini') }));
        check(board.box.includes('ts-board') && board.counting && board.slots === 8 && board.filled.join() === players.slice(0, 5).map(n => '@' + n).join() && board.sprites === 5
            && board.pop.join() === '@oleh_the_great' && board.count === '5/8' && board.bar === 'scaleX(0.625)' && board.mini,
            `the sign-up board: 8 slots, 5 filled with sprite and name in sign-up order, the newest (@oleh_the_great) popping in, "5/8" and its bar; a small bar on the strip`, JSON.stringify(board));
        await settle(700);
        await shot(page, 'show-signup.png');
        // A regular fight during sign-up takes the log area as usual; the board comes back on the free arena
        await say(page, 'r_one', '!черга'); await say(page, 'r_two', '!черга');
        await until(page, () => arenaState.kind === 'fight', null, { step: 500 });
        await say(page, players[5], '!учасник');   // a join during the fight: the fight's log stays
        const during = await looks();
        await until(page, () => !isBattleRunning && !resultHold, null, { step: 2000 });
        await page.clock.runFor(100);
        const back = await looks();
        check(!during.cls.length && !during.box.includes('ts-board') && back.box.includes('ts-board'),
            'a regular fight during sign-up looks as always (no board, no frame, also when someone joins meanwhile); after it the board is back', JSON.stringify({ during, back: back.box }));

        // 2. The draw: the 8th player closes sign-up; the draw holds the arena SHOW_DRAW_MS, then the first game
        for (const n of players.slice(6)) await say(page, n, '!учасник');
        // From here (the seeding is done) to the first game, nothing may draw from the game's random numbers
        const closeAt = await page.evaluate(() => { window.__rnd = 0; const r = Math.random; Math.random = function () { window.__rnd++; return r.apply(this, arguments); }; return Date.now(); });
        const d0 = await looks();
        const draw0 = await page.evaluate(() => ({ title: document.querySelector('.ts-slam').textContent, chips: document.querySelectorAll('.ts-chip').length,
            hidden: document.querySelectorAll('.tb-n.ts-hide').length, header: document.getElementById('status-plate').textContent }));
        check(d0.kind === 'draw' && d0.cls.includes('ts-on') && draw0.title === 'Турнір Дрейк-Арени' && draw0.chips === 8 && draw0.hidden === 8 && /Жеребкування/.test(draw0.header) && d0.cues.includes('fanfare'),
            `the draw: «${draw0.title}» slams in, 8 names in the middle, the 8 slots still empty; «${draw0.header}» on the plate; the fanfare`, JSON.stringify({ d0, draw0 }));
        await page.clock.runFor(4200);
        await settle(600);
        await shot(page, 'show-draw.png');
        await page.clock.runFor(2700);
        const drawn = await page.evaluate(() => ({ hidden: document.querySelectorAll('.tb-n.ts-hide').length, started: window.__starts.filter(s => s.tour).length, rnd: window.__rnd }));
        await until(page, () => window.__starts.some(s => s.tour), null, { step: 100 });
        const first = await page.evaluate(() => window.__starts.find(s => s.tour));
        check(drawn.hidden === 0 && !drawn.started && drawn.rnd === 0 && first.t - closeAt === 7500,
            `every name is in its slot before the draw ends, and the draw's shuffles took no game random numbers; the first game's countdown starts ${first.t - closeAt} ms after sign-up closed (the draw, 7.5 s)`, JSON.stringify({ drawn, wait: first.t - closeAt }));

        // 3. The match intro over the start of game 1's countdown
        const qf = (await view(page)).tourney.rounds[0].map(m => [m.a, m.b]);
        await page.evaluate(q => { const key = (a, b) => [a, b].sort().join('-'); q.forEach(([a, b], i) => { window.__plan[key(a, b)] = i === 0 ? [a, b, a] : [a, a]; }); }, qf);
        const i0 = await looks();
        const introLong = await longAnims();
        check(i0.over.join() === 'ts-intro' && i0.overText.includes('Чвертьфінал') && i0.overText.includes('@' + i0.left) && i0.overText.includes('@' + i0.right) && !introLong.length,
            `game 1's intro: «${i0.overText}» (sprites sliding in from both sides), no animation longer than 3 s`, JSON.stringify({ i0, introLong }));
        await settle(900);
        await shot(page, 'show-intro.png');
        await page.clock.runFor(2700);
        const i1 = await looks();
        check(!i1.over.length && i1.kind === 'countdown', 'the intro is gone after 2.6 s; the countdown carries on', JSON.stringify(i1));

        // 4. During the game: the frame, the pips, nothing over the cards or the log
        await until(page, () => arenaState.kind === 'fight', null, { step: 500 });
        const f1 = await looks(), cover = await uncovered();
        const laurels = await page.evaluate(() => document.querySelectorAll('#ts-frame .tsf-laurel').length);
        check(f1.cls.includes('ts-on') && f1.cls.includes('ts-pipson') && laurels === 4 && f1.pips.every(p => p.join() === 'now,·,·') && !f1.over.length && cover.all && cover.pipsIn,
            'game 1: the championship frame (4 laurel corners), 3 pips under each card (the first blinking), nothing over the cards or the log; the pips sit in the gap below the cards', JSON.stringify({ f1, cover }));
        await until(page, () => window.__starts.filter(s => s.tour).length >= 2 && arenaState.kind === 'fight', null, { step: 1000 });
        await settle(800);
        const crownOff = await page.evaluate(() => getComputedStyle(document.querySelector('.tsf-crown')).opacity);
        check(crownOff === '0', 'no crown before the final', crownOff);
        await shot(page, 'show-game.png');

        // 5. Game 3: the «ВИРІШАЛЬНА ГРА» banner and the drumroll, then the red glow
        await until(page, () => window.__starts.filter(s => s.tour).length >= 3, null, { step: 500 });
        const g3 = await looks(), g3Long = await longAnims();
        const aLeft = g3.left === qf[0][0];
        check(g3.over.join() === 'ts-banner' && /Вирішальна гра/.test(g3.overText) && /1:1/.test(g3.overText) && g3.cues.includes('drum') && g3.cls.includes('ts-decider')
            && g3.pips[0].join() === (aLeft ? 'won,lost,now' : 'lost,won,now') && g3.pips[1].join() === (aLeft ? 'lost,won,now' : 'won,lost,now') && !g3Long.length,
            `game 3: «${g3.overText}», the drumroll, the red glow; pips ${g3.pips[0].join(' ')} | ${g3.pips[1].join(' ')}`, JSON.stringify({ g3, g3Long }));
        await settle(800);
        await shot(page, 'show-decider.png');
        await until(page, () => arenaState.kind === 'fight', null, { step: 500 });
        const g3f = await looks(), cover3 = await uncovered();
        check(!g3f.over.length && g3f.cls.includes('ts-decider') && cover3.all, 'game 3 itself: the red glow on the frame, the banner gone, nothing over the cards or the log', JSON.stringify(g3f));

        // 6. The bracket between matches: QF1's winner slides on to the semifinal, its line lights up, the next match pulses
        await until(page, () => window.__starts.filter(s => s.tour).length >= 4, null, { step: 500 });
        await page.clock.runFor(2700);   // past QF2's intro
        const br = await page.evaluate(() => ({ lines: document.querySelectorAll('#log-countdown .tsl').length, lit: document.querySelectorAll('#log-countdown .tsl-lit').length,
            fresh: document.querySelectorAll('#log-countdown .tsl-lit.new').length, out: [...document.querySelectorAll('#log-countdown .tb-p.out .tb-n')].map(n => n.textContent),
            live: !!document.querySelector('#log-countdown .ts-tb .tb-m.live') }));
        check(br.lines === 6 && br.lit === 1 && br.fresh === 1 && br.out.join() === '@' + qf[0][1] && br.live,
            `the bracket: 6 lines (4 quarterfinals → 2 semifinals → the final), QF1's lit; @${qf[0][1]} greyed out; the next match pulsing`, JSON.stringify(br));
        // Its slide: shown again from the start (a language switch redraws it; the slide is only for the first showing)
        await page.evaluate(() => { const t = tourney; const m = t.rounds[0][0]; t.adv = [{ from: { r: 0, m: 0 }, to: { r: 1, m: 0, side: 'a' }, name: m.winner }]; fvRepaintCountdown(); });
        await page.clock.runFor(400);
        const fly = await page.evaluate(() => { const f = document.querySelector('.ts-fly'); return f ? { name: f.textContent, transform: f.style.transform } : null; });
        await settle(450);
        await shot(page, 'show-bracket.png');
        await page.clock.runFor(1000);
        const landed = await page.evaluate(() => ({ fly: !!document.querySelector('.ts-fly'), wait: document.querySelectorAll('.ts-wait').length }));
        check(fly && fly.name === '@' + qf[0][0] && /translate\(/.test(fly.transform) && !landed.fly && !landed.wait,
            `@${qf[0][0]} slides along the line to the semifinal, and lands`, JSON.stringify({ fly, landed }));
        // The plates: every player's slot with its element's stripe, a tiny sprite and a pip per game it takes to win (QF1's
        // winner with both lit); gold header plates in the pixel font; the winner's name in gold; the final leading into a
        // trophy; the next match pulsing (a glow, opacity only)
        const skin = await page.evaluate(() => {
            const tb = document.querySelector('#log-countdown .ts-tb'), slots = [...tb.querySelectorAll('.tb-p')].filter(p => p.querySelector('.tb-n[data-full]'));
            const live = tb.querySelector('.tb-m.live'), after = live ? getComputedStyle(live, '::after') : null, won = tb.querySelector('.tb-p.won .tb-n');
            return {
                slots: slots.length,
                plates: slots.filter(p => { const n = p.querySelector('.tb-n').dataset.full.slice(1), d = getDragonStrict(n);
                    return p.querySelector('img.tb-sp') && p.style.getPropertyValue('--el') === ELEMENT_COLORS[d.drakeObj.type] && p.querySelectorAll('.tb-pips i').length === 2; }).length,
                wonPips: tb.querySelector('.tb-m[data-id="r0m0"] .tb-p.won .tb-pips') ? tb.querySelectorAll('.tb-m[data-id="r0m0"] .tb-p.won .tb-pips i.on').length : -1,
                headers: [...tb.querySelectorAll('.tb-h')].every(h => /Press Start/.test(getComputedStyle(h).fontFamily)),
                wonGold: won ? getComputedStyle(won).color : null, gold: getComputedStyle(document.getElementById('arena')).getPropertyValue('--gold-hi').trim(),
                trophy: !!tb.querySelector('.tb-mid .tb-trophy img, .tb-last .tb-trophy img'),
                pulse: after ? [after.animationName, after.content !== 'none'] : null,
            };
        });
        const rgb = h => { const v = parseInt(h.slice(1), 16); return `rgb(${v >> 16}, ${(v >> 8) & 255}, ${v & 255})`; };
        check(skin.slots >= 8 && skin.plates === skin.slots && skin.wonPips === 2 && skin.headers && skin.wonGold === rgb(skin.gold) && skin.trophy && skin.pulse && skin.pulse[0] === 'tsf-pulse',
            `the plates: all ${skin.slots} players' slots with their element's stripe, a tiny sprite and 2 pips (QF1's winner with both lit, the name in gold); header plates in the pixel font; a trophy under the final; the next match's glow pulsing`,
            JSON.stringify(skin));
        // The light: drawn again with QF1's winner just moved on, a light runs from QF1 along the line to the semifinal slot,
        // by transform and opacity only
        await page.evaluate(() => { const t = tourney; const m = t.rounds[0][0]; t.adv = [{ from: { r: 0, m: 0 }, to: { r: 1, m: 0, side: 'a' }, name: m.winner }]; fvRepaintCountdown(); });
        const light = await page.evaluate(() => {
            const l = document.querySelector('#log-countdown .ts-light');
            if (!l || !l.getAnimations) return null;
            const a = l.getAnimations()[0], frames = a ? a.effect.getKeyframes() : [];
            if (!frames.length) return { props: [], steps: 0, ends: false };   // a light that doesn't move
            const tb = document.querySelector('#log-countdown .ts-tb').getBoundingClientRect(), k = tb.width / document.querySelector('#log-countdown .ts-tb').offsetWidth;
            const end = /translate\(([\d.]+)px, ([\d.]+)px\)/.exec(frames[frames.length - 1].transform), slot = document.querySelector('#log-countdown .tb-m[data-id="r1m0"] .tb-p').getBoundingClientRect();
            return { props: [...new Set(frames.flatMap(f => Object.keys(f).filter(p => !['offset', 'easing', 'composite', 'computedOffset'].includes(p))))],
                steps: frames.length, ends: end ? Math.abs(tb.left + end[1] * k - slot.left) <= 2 && Math.abs(tb.top + end[2] * k - (slot.top + slot.height / 2)) <= 2 : false };
        });
        check(light && light.props.every(p => p === 'transform' || p === 'opacity') && light.steps >= 4 && light.ends,
            'a light runs along the winner\'s line from QF1 to their semifinal slot (transform and opacity only)', JSON.stringify(light));

        // 7. The final: the plaque says «ФІНАЛ», a crown above the arena, the frame's slow pulse
        await until(page, () => tourGame && tourGame.stage === 'final' && arenaState.kind === 'countdown', null, { step: 2000 });
        const fin = await looks();
        await page.clock.runFor(2700);
        await until(page, () => arenaState.kind === 'fight', null, { step: 500 });
        const finF = await looks(), coverF = await uncovered();
        check(fin.over.join() === 'ts-intro' && /Фінал/.test(fin.overText) && finF.plaque === 'ФІНАЛ' && finF.cls.includes('ts-final') && !finF.over.length && coverF.all,
            `the final: its intro («${fin.overText.slice(0, 40)}…»), «${finF.plaque}» on the plaque, the crown and the pulsing frame; nothing over the cards or the log`, JSON.stringify({ fin, finF }));
        await settle(1500);
        const crown = await page.evaluate(() => {
            const r = s => document.querySelector(s).getBoundingClientRect(), c = r('.tsf-crown'), a = r('#arena');
            const hit = (x, y) => !(x.right <= y.left || y.right <= x.left || x.bottom <= y.top || y.bottom <= x.top);
            return { opacity: getComputedStyle(document.querySelector('.tsf-crown')).opacity, inside: c.top >= a.top && c.bottom <= a.bottom && c.left >= a.left && c.right <= a.right,
                clear: ['.plaque', '#status-plate', '#fight-type', '.fighters-box'].filter(s => hit(c, r(s))), top: Math.round(c.top - a.top) };
        });
        check(crown.opacity === '1' && crown.inside && !crown.clear.length,
            `the final's crown: shown, inside the arena (${crown.top} px below its top edge; the strip above stays free), clear of the plaque, the header and the cards`, JSON.stringify(crown));
        await shot(page, 'show-final.png');

        // 8. The champion: the banner, confetti, the jump, the crown; then engraved into the Hall of Fame
        await until(page, () => arenaState.kind === 'podium', null, { step: 2000 });
        const champ = await page.evaluate(() => ({ title: document.querySelector('.ts-champ-title') && document.querySelector('.ts-champ-title').textContent,
            jump: !!document.querySelector('.pd-1 .ts-drake.ts-jump'), crown: !!document.querySelector('.pd-1 .ts-drake.ts-jump > .ts-crown'), confetti: document.querySelectorAll('.ts-conf').length, cues: [...showCues] }));
        check(champ.title === 'Чемпіон арени' && champ.jump && champ.crown && champ.confetti === 70 && champ.cues.includes('champion'),
            `the champion: «${champ.title}», the drake's jump onto the top step, the crown, 70 pieces of confetti, the fanfare`, JSON.stringify(champ));
        await settle(3200);
        // Once landed: the crown on the champion's head anchor, in the same wrapper as the drake (so it bobs with it); its
        // drop starts only after the jump has ended
        const onHead = await page.evaluate(() => {
            const wrap = document.querySelector('.pd-1 .ts-drake'), s = wrap.querySelector('.pd-sprite').getBoundingClientRect(), c = wrap.querySelector('.ts-crown-img').getBoundingClientRect();
            const type = tourneyFighter(arenaState.podium[0]).drakeObj.type, head = SHOW_HEADS[type], k = s.width / DRAKE_SPRITES[type].rows[0].length;
            const jump = wrap.getAnimations().find(a => a.animationName === 'ts-jump').effect.getTiming(), drop = wrap.querySelector('.ts-crown-img').getAnimations()[0].effect.getTiming();
            return { type, k, dy: +(c.bottom - (s.top + head.y * k)).toFixed(2), dx: +((c.left + c.right) / 2 - (s.left + (head.x + 0.5) * k)).toFixed(2),
                jumpEnds: jump.delay + jump.duration, dropStarts: drop.delay };
        });
        check(Math.abs(onHead.dy) <= 2 && Math.abs(onHead.dx) <= 2 && onHead.dropStarts >= onHead.jumpEnds,
            `the champion's crown (a ${onHead.type} drake at ${onHead.k}×) lands after the jump (${onHead.dropStarts} ms ≥ ${onHead.jumpEnds} ms) and sits on its head anchor (${onHead.dx}, ${onHead.dy} px off)`, JSON.stringify(onHead));
        await shot(page, 'show-champion.png');
        await until(page, () => arenaState.kind === 'hall', null, { step: 1000 });
        const hall = await page.evaluate(() => { const r = document.querySelector('#log-countdown .hf-row'); return { isNew: r.classList.contains('ts-new'), letters: [...r.querySelectorAll('.ts-ch')].map(c => c.textContent).join('') }; });
        const champion = (await view(page)).tourney.podium[0];
        check(hall.isNew && hall.letters === '@' + champion, `the Hall of Fame: «${hall.letters}» engraved letter by letter in the newest row`, JSON.stringify(hall));
        await settle(2800);
        await shot(page, 'show-hall.png');
        await until(page, () => !tourney, null, { step: 1000 });
        const after = await looks();
        check(!after.cls.includes('ts-on') && !after.over.length, 'after the Hall of Fame: the frame goes, the arena is back to normal', JSON.stringify(after));

        // 9. The setting off: no draw (the first game starts as sign-up closes) and none of the show
        await page.evaluate(() => setShowFx(false));
        await mod(page, '!турнір 4');
        for (const n of players.slice(0, 4)) await say(page, n, '!учасник');
        const offClose = await page.evaluate(() => Date.now());
        await page.clock.runFor(100);
        const off = await looks(), offStart = await page.evaluate(() => window.__starts[window.__starts.length - 1]);
        check(offStart.tour && offStart.t === offClose && !off.cls.length && !off.over.length && !off.box.includes('ts-'),
            'with the effects off: the first game starts the moment sign-up closes (no draw), and none of the show appears', JSON.stringify({ off, offStart, offClose }));
        await mod(page, '!турнір стоп');

        // 10. Stopping with the effects on: during the draw and a match intro (they go, and the queue starts at once), in
        // the middle of game 3 and the final (the show goes at once; the game plays on plainly to its end), and on the
        // champion screen and the Hall of Fame after it (refused: they carry on)
        await page.evaluate(() => setShowFx(true));
        const four = players.slice(0, 4);
        const start4 = async plan => {
            await until(page, () => !isBattleRunning && !resultHold, null, { step: 2000 });
            await mod(page, '!турнір 4');
            for (const n of four) await say(page, n, '!учасник');
            const [[a, b], [c, d]] = (await view(page)).tourney.rounds[0].map(m => [m.a, m.b]);
            await page.evaluate(p => { window.__plan = p; window.__played = {}; }, plan ? plan(a, b, c, d) : {});
        };
        const shown = () => page.evaluate(() => ({ cls: [...document.getElementById('arena').classList].filter(c => c.startsWith('ts-')), over: document.querySelectorAll('.ts-over').length,
            box: document.getElementById('log-countdown').className, plaque: document.querySelector('.plaque-text').textContent, kind: arenaState.kind, hold: !!resultHold, tourney: !!tourney,
            last: window.__fights[window.__fights.length - 1], now: Date.now() }));
        const stopNow = async () => { await mod(page, '!турнір стоп'); return shown(); };
        // During the draw
        await start4();
        await say(page, 'r_one', '!черга'); await say(page, 'r_two', '!черга');   // they wait: the draw holds the arena
        await page.clock.runFor(2000);
        const inDraw = await shown(), sDraw = await stopNow();
        check(inDraw.kind === 'draw' && !sDraw.tourney && sDraw.kind !== 'draw' && !sDraw.cls.length && !sDraw.box.includes('ts-draw') && !sDraw.hold
            && sDraw.last.ranked && [sDraw.last.p1, sDraw.last.p2].sort().join() === 'r_one,r_two' && sDraw.last.t === sDraw.now,
            '!турнір стоп during the draw: the draw and its hold go at once, the frame goes, and the queue starts that moment (@r_one against @r_two)', JSON.stringify({ inDraw: inDraw.kind, sDraw }));
        // During a match intro
        await start4();
        await page.clock.runFor(7600);
        await say(page, 'r_one', '!черга'); await say(page, 'r_two', '!черга');
        const inIntro = await shown(), sIntro = await stopNow();
        check(inIntro.over === 1 && inIntro.kind === 'countdown' && !sIntro.tourney && !sIntro.over && !sIntro.cls.length
            && sIntro.last.ranked && [sIntro.last.p1, sIntro.last.p2].sort().join() === 'r_one,r_two' && sIntro.last.t === sIntro.now,
            '!турнір стоп during a match intro: the intro, its countdown and the frame go at once, and the queue starts that moment', JSON.stringify({ inIntro: inIntro.over, sIntro }));
        // In the middle of game 3, and of the final
        const midGame = async (label, plan, when, extra) => {
            await start4(plan);
            await until(page, when, null, { step: 500 });
            const before = await shown(), games = await page.evaluate(() => window.__games.length);
            const s = await stopNow();
            await until(page, () => !isBattleRunning && arenaState.kind === 'result', null, { step: 250 });
            const end = await page.evaluate(n => ({ games: window.__games.length - n, aborted: /simulation error/i.test(document.body.innerText),
                cls: [...document.getElementById('arena').classList].filter(c => c.startsWith('ts-')), hall: getHonours().hall.length }), games);
            check(extra(before) && !s.tourney && s.kind === 'fight' && !s.cls.length && s.plaque === 'ДРЕЙК-АРЕНА' && end.games === 1 && !end.aborted && !end.cls.length && !errors.length,
                `!турнір стоп in the middle of ${label}: the frame, glow, pips (and the final's crown and «ФІНАЛ») go at once; the game plays on plainly to its end, counting for nothing`,
                JSON.stringify({ before: before.cls, s, end, errors }));
            return end;
        };
        await midGame('game 3', (a, b) => ({ [key(a, b)]: [a, b, a] }), () => tourGame && tourGame.game === 3 && arenaState.kind === 'fight', b => b.cls.includes('ts-decider'));
        const hallBefore = await page.evaluate(() => getHonours().hall.length);
        const finStop = await midGame('the final', (a, b, c, d) => ({ [key(a, b)]: [a, a], [key(c, d)]: [c, c], [key(b, d)]: [b] }),
            () => tourGame && tourGame.stage === 'final' && arenaState.kind === 'fight', b => b.cls.includes('ts-final') && b.plaque === 'ФІНАЛ');
        check(finStop.hall === hallBefore, 'a final stopped midway: no podium, no prizes, no Hall of Fame entry', JSON.stringify({ hallBefore, after: finStop.hall }));
        // On the champion screen, and the Hall of Fame after it: refused
        await start4((a, b, c, d) => ({ [key(a, b)]: [a, a], [key(c, d)]: [c, c], [key(b, d)]: [b], [key(a, c)]: [a, a] }));
        await until(page, () => arenaState.kind === 'podium', null, { step: 1000 });
        const sPod = await stopNow();
        const podChat = (await view(page)).chat;
        const podScreen = await page.evaluate(() => ({ title: !!document.querySelector('.ts-champ-title'), confetti: document.querySelectorAll('.ts-conf').length }));
        await until(page, () => arenaState.kind === 'hall', null, { step: 1000 });
        const sHall = await stopNow();
        const hallChat = (await view(page)).chat, letters = await page.evaluate(() => document.querySelectorAll('#log-countdown .ts-ch').length);
        check(sPod.tourney && sPod.kind === 'podium' && sPod.cls.includes('ts-on') && podScreen.title && podScreen.confetti === 70 && /уже завершено/.test(podChat)
            && sHall.tourney && sHall.kind === 'hall' && /уже завершено/.test(hallChat) && letters > 0,
            '!турнір стоп on the champion screen and during the Hall of Fame: refused («Турнір уже завершено»); the banner, confetti, frame and engraving carry on',
            JSON.stringify({ sPod, podScreen, podChat, sHall, hallChat, letters }));
        await until(page, () => !tourney, null, { step: 1000 });

        // 11. The crown on every drake: the six on podium steps as drawn (3×, as the champion stands), and mirrored (2×).
        // For each, the anchor is at the top of the head (the crown's bottom row covers the head's first or second row in that
        // column, and the head goes on below it), the crown's bottom edge sits on the anchor and its middle on the anchor's
        // column (within 2 px), on the sprite's pixel grid
        const crowns = await page.evaluate(() => {
            const st = document.createElement('div');
            st.id = 'crown-review';   // no .ts-champ here: the crowns are shown as they are once landed, without the drop
            st.style.cssText = 'position:fixed;left:0;top:0;width:1920px;height:600px;z-index:99;background:#0b0c11;display:grid;grid-template-columns:repeat(6, 1fr);grid-template-rows:56px 330px 214px;align-items:end;justify-items:center';
            st.innerHTML = `<div style="grid-column:1 / -1;align-self:center;font:800 20px var(--pixel), sans-serif;color:var(--gold);letter-spacing:2px;text-transform:uppercase">${sT('champion')}</div>`;
            document.body.appendChild(st);
            const out = [];
            [false, true].forEach(flip => VIEWER_DRAKE_TYPES.forEach(d => {
                const col = document.createElement('div');
                col.className = `pd-col ${flip ? 'pd-2' : 'pd-1'}`;
                col.innerHTML = `<img class="pd-sprite" src="${drakeSpriteURL(d.type)}" alt=""${flip ? ' style="transform:scaleX(-1)"' : ''}>`
                    + `<span class="pd-name" style="color:${ELEMENT_COLORS[d.type]}">${d.name[currentLang].replace(/\s*\S+$/u, '')}${flip ? ' ⇆' : ''}</span>`
                    + (flip ? '' : `<div class="pd-step frame-sm"><span class="pd-medal">🥇</span><span class="pd-place">1</span></div>`);
                st.appendChild(col);
                const img = col.querySelector('.pd-sprite'), wrap = showCrown(img, d.type);
                const s = img.getBoundingClientRect(), c = wrap.querySelector('.ts-crown').getBoundingClientRect();
                const rows = DRAKE_SPRITES[d.type].rows, W = rows[0].length, k = s.width / W, head = SHOW_HEADS[d.type], x = flip ? W - 1 - head.x : head.x;
                const onGrid = v => Math.abs(v - Math.round(v)) < 0.01;
                out.push({ type: d.type, flip, k, dy: +(c.bottom - (s.top + head.y * k)).toFixed(2), dx: +((c.left + c.right) / 2 - (s.left + (x + 0.5) * k)).toFixed(2),
                    grid: onGrid((c.left - s.left) / k) && onGrid((c.top - s.top) / k), onHead: (top => top >= head.y - 2 && top <= head.y - 1)(rows.findIndex(r => r[head.x] !== '.')) && rows[head.y][head.x] !== '.' });
            }));
            return out;
        });
        await page.screenshot({ path: path.join(SHOTS, 'show-crowns.png'), clip: { x: 0, y: 0, width: 1920, height: 600 } });
        await page.evaluate(() => document.getElementById('crown-review').remove());
        const offHead = crowns.filter(c => !(Math.abs(c.dy) <= 2 && Math.abs(c.dx) <= 2 && c.grid && c.onHead));
        check(crowns.length === 12 && !offHead.length,
            `the crown sits on the head anchor of all six drakes, as drawn (3×) and mirrored (2×): ${crowns.map(c => `${c.type}${c.flip ? '⇆' : ''} ${c.dx},${c.dy}`).join(' · ')} px; on the sprite's pixel grid`,
            JSON.stringify(offHead.length ? offHead : crowns));
        check(!errors.length, 'no page errors', errors.join(' | '));
        await context.close();
    }

    await browser.close();
    console.log(failures ? `\n${failures} tournament check(s) failed.` : '\nAll tournament checks passed.');
    process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
