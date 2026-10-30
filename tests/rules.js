// Game rules test: loads the real game code in Node (the same stub page as the balance sim) and checks the rules
// fixed or decided after the code review, through the game's own functions and chat handler.
//
// Usage (from the project folder):
//   node tests/rules.js                      (part of npm test; npm run test:rules on its own)
//   node tests/rules.js --file path/to/index.html
//
// Checks:
//   1  max HP is always a whole number (every title, element and level), so level-up gains are whole too
//   2  a command's words can be separated by any run of whitespace ("!drake  red")
//   4  a "next hit casts" pick only lasts for its fight: cleared when a fight starts and when it ends
//   7  rerolling into the White Dragon says its level (20), not "reset to 1"
//   8  a fight that reaches the limit plays turn 30, then times out, and its result says 30 turns
//   9  a ranked draw gives both +10 XP (Gold its bonus) and leaves wins and losses alone
//   10 no rest after a fight: fighters can !queue, !battle and !accept straight away (ranked or duel); one open
//      challenge per viewer
//   11 a duel accepted during a fight waits and starts after it, before the ranked queue; one waiting duel; both
//      players busy meanwhile; a fighter can accept a challenge, or be challenged, while their fight is on
//   12 "!battle" with no name says how to challenge, before any other check
//   13 the opening-buff banner shows the title's icon once
//   18 tournaments: sign-up (the streamer or a moderator opens it; refusals; leaving), first to 2 with a drawn game
//      replayed, the 3rd-place game right before the final, everyone at level 20 with saved levels untouched, no XP and
//      no change to wins, losses or the Top, the ranked queue paused and duels refused until the tournament is over (a waiting duel
//      first), and a cancel mid-game
//   19 tournament rewards: the podium's badges (in the Top and !stats, replaced when the next tournament ends), free
//      title spins 3 / 2 / 1 (they add up; !title typed in chat uses one, a channel-point redemption doesn't, none left
//      gets the usual reply), medals that add up, the Hall of Fame (!hall), nothing for a cancelled tournament
//   20 the play log, as the game hands it to playLog: the tournament events (opened, each join and leave with the count
//      after it, closed when full and by !tournament start, cancelled during sign-up and mid-game, the podium) and
//      every fight's HP left and max HP (ranked, duel, tournament game, simulation error)
//   21 the coin flip in Ukrainian is «Герб» / «Число» (title 189 «Герб чи число», and the log lines it shares with
//      «Картопля Шредінгера»); English stays Heads / Tails
//   22 the renamed titles (Ukrainian names of 11, English of 3) and Ice Mirror's wording, pinned; a save and a saved
//      tournament holding an old title name take the new one on load
// Exits non-zero if any check fails.
const { mulberry32, gameScript, setupEnv } = require('./game_env');

const args = process.argv.slice(2);
const fi = args.indexOf('--file');
const FILE = fi === -1 ? 'showcase/index.html' : args[fi + 1];

Math.random = mulberry32(777);
setupEnv();
const _warn = console.warn; console.warn = () => {};
eval(gameScript(FILE) + `
;globalThis.__game = {
    TITLES_DB, DRAKE_TYPES, VIEWER_DRAKE_TYPES, DRAGON_TYPE, EFFECTS, FV_TEXT: typeof FV_TEXT !== 'undefined' ? FV_TEXT : null,
    getMaxHP, getRequiredXP, calculateLevelAndProgress, getDragonDB, saveDragonDB, setStreamerUser,
    say: (user, text, channel) => handleChatMessage('#' + (channel || 'streamchannel'), { username: user, color: '#8ab4f8' }, text, false),
    sayAs: (user, text, extra) => handleChatMessage('#streamchannel', { username: user, color: '#8ab4f8', ...extra }, text, false),
    get resultHold() { return typeof resultHold !== 'undefined' ? resultHold : undefined; },
    resetStartGuard: () => { if (typeof lastStartAt !== 'undefined') lastStartAt = -Infinity; },
    runBattle: (...a) => runBattle(...a), finishBattle: (...a) => finishBattle(...a), checkQueue: () => checkQueue(),
    nextFight: typeof nextFight === 'function' ? () => nextFight() : null,
    fvT: typeof fvT === 'function' ? fvT : null,
    setForcedCast: id => { forcedCast = id; }, get forcedCast() { return forcedCast; },
    get arenaState() { return arenaState; }, get stats() { return playerLeaderboardStats; },
    get pending() { return pendingChallenges; }, get queue() { return matchmakingQueue; }, set queue(q) { matchmakingQueue = q; },
    get waitingDuel() { return typeof waitingDuel !== 'undefined' ? waitingDuel : undefined; },
    get running() { return isBattleRunning; }, set running(v) { isBattleRunning = v; },
    get streamer() { return STREAMER_USER; },
    CLASS_ULTIMATES, describeUltimate, migrateOldSaves: () => migrateOldSaves(),
    tourneyLoad: typeof tourneyLoad === 'function' ? () => tourneyLoad() : null, TOURNEY_KEY: typeof TOURNEY_KEY !== 'undefined' ? TOURNEY_KEY : null,
    get tourGame() { return typeof tourGame !== 'undefined' ? tourGame : null; },
    get tourney() { return typeof tourney !== 'undefined' ? tourney : undefined; },
    tourneyReset: () => { if (typeof tourney !== 'undefined') { tourney = null; tourGame = null; tourneySave(); } },
    get honours() { return typeof getHonours === 'function' ? getHonours() : null; },
    honoursReset: () => { if (typeof HONOURS_KEY !== 'undefined') localStorage.setItem(HONOURS_KEY, 'null'); },
    get topHtml() { return document.getElementById('leaderboard-list').innerHTML; },
    wrapFinishBattle: f => { const orig = finishBattle; finishBattle = (...a) => orig(...f(...a)); },
    ELEMENT_BASE, getTierMultiplier, renderLeaderboard: () => renderLeaderboard(),
    get topRows() { return [...document.getElementById('leaderboard-list').innerHTML.matchAll(/class="lb-name[^>]*>@([^<]+)</g)].map(m => m[1]); },
    setLang: l => { currentLang = l; },
    withMaxHP: (f, fn) => { const orig = getMaxHP; getMaxHP = f; try { return fn(); } finally { getMaxHP = orig; } },
    wrapRunBattle: f => { const orig = runBattle; runBattle = (...a) => { f(...a); return orig(...a); }; },
    wrapAddInfo: f => { const orig = addInfo; addInfo = (html, ...r) => { f(html); return orig(html, ...r); }; },
    wrapAddLog: f => { const orig = addLog; addLog = t => { orig(t); f(t); }; },
    // Every play log event as the game hands it over (Node has no IndexedDB: the write itself fails quietly, as designed)
    wrapPlayLog: f => { if (typeof playLog !== 'function') return false; const orig = playLog; playLog = (type, data) => { f(type, data); return orig(type, data); }; return true; },
    // The next fight turn throws (inside the fight loop's try), as a simulation error would
    failNextTurn: () => { const orig = fvTurnEnd; fvTurnEnd = function () { fvTurnEnd = orig; throw new Error('forced by a test'); }; },
    // The White Drake (section 23)
    WHITE_DRAKE, WHITE_DRAKE_TYPE, WHITE_DRAKE_TITLE_ID, DRAGON_TITLE_ID, POOL_IDS, scalesOf, newFxState, HONOURS_KEY,
    applyEffect: (...a) => applyEffect(...a), addXP: (...a) => addXP(...a),
    get battleFx() { return battleFx; },
    wrapUIHP: f => { const orig = updateUIHP; updateUIHP = (...a) => { f(...a); return orig(...a); }; },
    wrapFighterCard: f => { const orig = updateFighterCard; updateFighterCard = (side, d, fx) => { f(side, d); return orig(side, d, fx); }; },
};`);
console.warn = _warn;
const G = globalThis.__game;

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);
const strip = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
const xpFor = lvl => { let x = 0; for (let l = 1; l < lvl; l++) x += G.getRequiredXP(l); return x; };
const DRAKE = Object.fromEntries(G.DRAKE_TYPES.map(d => [d.type, d]));

let infos = [], logs = [], fightsStarted = [];
G.wrapAddInfo(h => infos.push(strip(h)));
// onSimError: run once, right when a "simulation error" is logged (inside the fight loop's catch, before its 2 s nextFight)
let onSimError = null;
G.wrapAddLog(t => { logs.push(strip(t)); if (onSimError && /simulation error|помилка симуляції/i.test(strip(t))) { const f = onSimError; onSimError = null; f(); } });
G.wrapRunBattle((a, ac, b, bc, ranked) => fightsStarted.push({ a, b, ranked }));
const lastInfo = () => infos[infos.length - 1] || '';
// The play log's events, in order ({ type, ...data })
let plays = [];
const hasPlayLog = G.wrapPlayLog((type, data) => plays.push({ type, ...JSON.parse(JSON.stringify(data)) }));
// A clean slate: no saves, stats, queue, challenges or fight
const fresh = () => {
    __drain();
    G.saveDragonDB({}); Object.keys(G.stats).forEach(k => delete G.stats[k]); G.queue = [];
    Object.keys(G.pending).forEach(k => delete G.pending[k]); G.running = false;
    G.resetStartGuard();
    G.tourneyReset();
    infos = []; logs = []; fightsStarted = []; plays = []; finishes = [];
};
// The HP every fight ended on, as finishBattle got it: registered before the rigging below, so it sees the rigged HP
let finishes = [];
G.wrapFinishBattle((p1, p2, h1, h2, ranked) => { finishes.push({ [p1.name]: h1, [p2.name]: h2 }); return [p1, p2, h1, h2, ranked]; });
// Tournament games: rig(p1, p2) returns the winner's name or null (a draw); every game's fighters and levels are kept
let rig = null, tourneyGames = [];
G.wrapFinishBattle((p1, p2, h1, h2, ranked) => {
    if (!rig || !G.tourGame) return [p1, p2, h1, h2, ranked];
    const w = rig(p1.name, p2.name);
    tourneyGames.push({ a: p1.name, b: p2.name, w, stage: G.tourGame.stage, lv: [G.calculateLevelAndProgress(p1.xp).level, G.calculateLevelAndProgress(p2.xp).level] });
    return [p1, p2, w === p1.name ? 50 : w ? 0 : 30, w === p2.name ? 50 : w ? 0 : 30, ranked];
});
const make = (name, type, opts = {}) => {
    const db = G.getDragonDB();
    db[name] = { name, color: '#fff', drakeObj: DRAKE[type], title: opts.title || G.TITLES_DB.find(t => t.rarity === 'common'), xp: xpFor(opts.level || 1), level: opts.level || 1 };
    G.saveDragonDB(db);
    return db[name];
};

for (const lang of ['en', 'uk']) {
    G.setLang(lang);
    const t = (en, uk) => lang === 'uk' ? uk : en;
    console.log(`\n[${lang}]`);

    // 1. Whole max HP
    if (lang === 'en') {
        const bad = [];
        for (const title of G.TITLES_DB) for (const d of G.DRAKE_TYPES) for (let l = 1; l <= 20; l++) {
            const hp = G.getMaxHP(l, d.type, title);
            if (!Number.isInteger(hp)) bad.push(`${title.icon} ${title.name.en} (${title.id}), ${d.type}, L${l}: ${hp}`);
        }
        const king = G.TITLES_DB.find(x => x.id === 61);
        check(!bad.length, `1. max HP is a whole number for every title, element and level (e.g. Red Drake + ${king.icon} ${king.name.en} at L2: ${G.getMaxHP(2, 'red', king)} HP, +${G.getMaxHP(2, 'red', king) - G.getMaxHP(1, 'red', king)} HP on level-up)`,
            `${bad.length} fractional, first: ${bad.slice(0, 3).join(' | ')}`);
    }

    // 2. Any run of whitespace between words
    fresh();
    G.say('spacey', t('!drake  red', '!дрейк   червоний'));
    G.say('tabby', t('!drake\tblue', '!дрейк\tсиній'));
    const db2 = G.getDragonDB();
    check(db2.spacey && db2.spacey.drakeObj.type === 'red' && db2.tabby && db2.tabby.drakeObj.type === 'blue',
        `2. "${t('!drake  red', '!дрейк   червоний')}" (extra spaces) and a tab both create the drake, not the help card`, `saves: ${JSON.stringify(Object.keys(db2))}, last reply: ${lastInfo()}`);
    G.say('spacey', t('!battle   @tabby', '!бій   @tabby'));
    check(G.pending.tabby === 'spacey', `2. "${t('!battle   @tabby', '!бій   @tabby')}" sends the challenge`, `pending: ${JSON.stringify(G.pending)}`);

    // 4. A pick lasts only for its fight
    fresh();
    make('alpha', 'red', { level: 10 }); make('omega', 'blue', { level: 10 });
    G.setForcedCast('frost');   // picked with no fight running
    G.runBattle('alpha', '#fff', 'omega', '#fff', true);
    const atStart = G.forcedCast;
    G.setForcedCast('burn');    // picked during this fight; whatever happens, it must not outlive the fight
    __drain();
    // A pick still armed when the fight ends (no damaging hit came after it) must not reach the next fight
    G.setForcedCast('mark');
    G.finishBattle({ ...G.getDragonDB().alpha }, { ...G.getDragonDB().omega }, 40, 0, false);
    const atEnd = G.forcedCast;
    __drain();
    check(atStart === null && atEnd === null, '4. a pick made before a fight is cleared when the fight starts, and one still armed when it ends is cleared then',
        `at the start: ${atStart}, at the end: ${atEnd}`);

    // 7. «білий» in a reroll is the streamer's White Drake (a reroll: level 1); the White Dragon comes only through !дракон,
    // at level 20
    fresh();
    G.setStreamerUser('boss');
    G.say('boss', t('!drake white', '!дрейк білий'), 'boss');
    G.say('boss', t('!reroll white', '!рерол білий'), 'boss');
    const reroll = lastInfo();
    G.say('boss', t('!dragon', '!дракон'), 'boss');
    const toDragon = lastInfo(), boss = G.getDragonDB().boss;
    check(reroll.endsWith(t('Level reset to 1!', 'Рівень скинуто до 1!')) && boss.drakeObj.type === G.DRAGON_TYPE && G.calculateLevelAndProgress(boss.xp).level === 20 && toDragon.includes(t('becomes the White Dragon', 'стає Білим Драконом')),
        `7. the streamer's "${t('!reroll white', '!рерол білий')}" gives the White Drake ("${t('Level reset to 1!', 'Рівень скинуто до 1!')}"); "${t('!dragon', '!дракон')}" gives the White Dragon at level 20`,
        JSON.stringify({ reroll, toDragon }));
    make('rerolly', 'red', { level: 4 });
    G.sayAs('rerolly', t('!reroll blue', '!рерол синій'), { 'custom-reward-id': 'reward-1' });
    check(lastInfo().endsWith(t('Level reset to 1!', 'Рівень скинуто до 1!')), `7. any viewer's reroll still ends with "${t('Level reset to 1!', 'Рівень скинуто до 1!')}"`, lastInfo());
    G.setStreamerUser('');

    // 8. Turn 30 is played (fighters too tough to finish each other)
    fresh();
    make('tank1', 'red', { level: 5 }); make('tank2', 'green', { level: 5 });
    G.withMaxHP(() => 10000000, () => { G.runBattle('tank1', '#fff', 'tank2', '#fff', false); __drain(); });
    const turnLines = logs.filter(l => /^\[(Turn|Хід) \d+\]/.test(l)).map(l => +/\d+/.exec(l)[0]);
    const timeoutAt = logs.findIndex(l => /Time out|Час вийшов/.test(l)), turn30At = logs.findIndex(l => /^\[(Turn|Хід) 30\]/.test(l));
    check(Math.max(...turnLines) === 30 && turn30At !== -1 && timeoutAt > turn30At && G.arenaState.turns === 30,
        '8. a fight that reaches the limit plays turn 30, then times out, and its result says 30 turns',
        `last turn played: ${Math.max(...turnLines)}, time-out line after turn 30: ${timeoutAt > turn30At}, result turns: ${G.arenaState.turns}`);

    // 9. A ranked draw: +10 XP each (Gold +its bonus), record unchanged
    fresh();
    const ra = make('drawa', 'red', { level: 3 }), rb = make('drawb', 'gold', { level: 3 });
    G.stats.drawa = { wins: 4, losses: 2 }; G.stats.drawb = { wins: 1, losses: 5 };
    G.finishBattle({ ...ra }, { ...rb }, 50, 50, true);
    const after9 = G.getDragonDB();
    const xpA = after9.drawa.xp - ra.xp, xpB = after9.drawb.xp - rb.xp;
    check(JSON.stringify(G.stats.drawa) === '{"wins":4,"losses":2}' && JSON.stringify(G.stats.drawb) === '{"wins":1,"losses":5}' && xpA === 10 && xpB > 10,
        `9. a ranked draw keeps both records (4–2, 1–5) and gives +10 XP (Gold +${xpB})`, `records ${JSON.stringify(G.stats.drawa)} ${JSON.stringify(G.stats.drawb)}, XP +${xpA} / +${xpB}`);

    // 10. No rest after a fight
    fresh();
    ['c1', 'c2', 'c3', 'c4'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i].type));
    G.say('c1', t('!battle @c2', '!бій @c2'));
    G.say('c1', t('!battle @c3', '!бій @c3'));
    check(G.pending.c2 === 'c1' && !G.pending.c3 && /already have an open challenge|уже є відкритий виклик/.test(lastInfo()),
        '10. a viewer can have one open challenge; a second !battle gets a short reply', `pending ${JSON.stringify(G.pending)}, reply: ${lastInfo()}`);
    G.say('c2', t('!accept', '!прийняти'));                                   // the duel c1 vs c2 starts …
    const duelOn = G.running && fightsStarted.length === 1;
    G.say('c1', t('!queue', '!черга')); G.say('c2', t('!queue', '!черга'));    // … and both join the ranked queue during it
    const queuedDuringDuel = [...G.queue];
    G.say('c1', t('!queue', '!черга'));
    const already = lastInfo();
    __drain();                                                                // the duel ends; 5 s later the queue goes on
    const rankedNext = fightsStarted[1];
    __drain();
    check(duelOn && queuedDuringDuel.join() === 'c1,c2' && rankedNext && rankedNext.ranked && [rankedNext.a, rankedNext.b].sort().join() === 'c1,c2',
        '10. no rest: both duellists join the ranked queue during their duel, and their ranked fight starts right after it',
        `duel on: ${duelOn}; queue during the duel: ${queuedDuringDuel}; next fight: ${JSON.stringify(rankedNext)}`);
    check(/already in queue|вже в черзі/.test(already), '10. "already in the queue" still applies', already);
    G.say('c3', t('!battle @c1', '!бій @c1'));                                // straight after two fights in a row
    const challenged = G.pending.c1 === 'c3';
    G.say('c1', t('!accept', '!прийняти'));
    const thirdFight = fightsStarted[2];
    G.say('c4', t('!battle @c2', '!бій @c2'));                                // c2 fought twice, c1 is fighting
    check(challenged && thirdFight && thirdFight.a === 'c3' && thirdFight.b === 'c1' && G.pending.c2 === 'c4',
        '10. no rest: a viewer who just fought can be challenged and accept at once, and can be challenged mid-fight', `challenge opened: ${challenged}; fight: ${JSON.stringify(thirdFight)}; pending ${JSON.stringify(G.pending)}`);
    __drain();
    check(!infos.some(x => /exhausted|resting|виснажена|відпочиває/.test(x)), '10. no "exhausted" or "resting" reply anywhere', infos.filter(x => /exhausted|resting|виснажена|відпочиває/.test(x)).slice(0, 2).join(' | '));

    // 11. An accepted duel waits for the arena
    fresh();
    ['d1', 'd2', 'd3', 'd4', 'q1', 'q2'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type));
    G.queue = ['d2', 'q1'];
    G.running = true;   // a fight is on
    G.say('d1', t('!battle @d2', '!бій @d2'));
    G.say('d2', t('!accept', '!прийняти'));
    const acceptReply = lastInfo();
    const waiting = G.waitingDuel;
    // !battle to a viewer in the waiting duel: said at once, no challenge opened
    G.say('d3', t('!battle @d1', '!бій @d1'));
    const toWaiting = lastInfo(), pendingD1 = G.pending.d1;
    const wantWait = t('⏳ @d1 is waiting for a duel. Challenge them after the next fight.', '⏳ @d1 чекає на дуель. Киньте виклик після наступного бою.');
    check(toWaiting === wantWait && pendingD1 === undefined, `11. "!battle" to a viewer whose duel is waiting says "${wantWait}" and opens no challenge`, `reply: ${toWaiting}; pending ${JSON.stringify(G.pending)}`);
    G.say('d3', t('!battle @d4', '!бій @d4'));
    G.say('d4', t('!accept', '!прийняти'));
    const secondReply = lastInfo();
    const busy = [t('!queue', '!черга'), t('!battle @d3', '!бій @d3'), t('!accept', '!прийняти')].map(c => { G.say('d1', c); return lastInfo(); });
    G.say('q2', t('!queue', '!черга'));   // two in the ranked queue now, but the waiting duel goes first
    G.running = false;                  // the fight ends …
    if (G.nextFight) G.nextFight();     // … and 5 s after its result the next fight starts
    const first = fightsStarted[0];
    check(/after the current fight|після поточного бою/.test(acceptReply) && !!waiting && waiting.challenger === 'd1' && waiting.accepter === 'd2' && !G.queue.includes('d2'),
        '11. !accept during a fight: the duel waits ("starts after the current fight"), and both players leave the ranked queue', `reply: ${acceptReply}; waiting: ${JSON.stringify(waiting)}; queue ${G.queue}`);
    check(/after the next fight|після наступного бою/.test(secondReply) && !G.pending.d4, '11. only one duel waits: another !accept is told to challenge again after the next fight', secondReply);
    check(busy.every(r => /waiting for the arena|чекає на арену/.test(r)), '11. while their duel waits, both players get a short "busy" reply to !queue, !battle and !accept', busy.join(' | '));
    check(first && first.a === 'd1' && first.b === 'd2' && !first.ranked && G.waitingDuel === null,
        '11. after the fight, the waiting duel starts first (before the ranked queue)', `first fight: ${JSON.stringify(first)}`);
    __drain();
    // A fighter accepts a challenge during their own fight: the duel waits for the arena, and the challenge closes
    fresh();
    ['e1', 'e2', 'e3', 'e4'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i].type));
    G.say('e2', t('!battle @e1', '!бій @e1'));                               // e2 challenges e1 …
    G.say('e1', t('!queue', '!черга')); G.say('e3', t('!queue', '!черга'));    // … then e1 starts a ranked fight
    G.say('e1', t('!accept', '!прийняти'));
    const midFight = lastInfo(), waitingE = G.waitingDuel, openAfter = G.pending.e1;
    __drain();   // the fight, the waiting duel after it, and the 30 s the challenge would have had
    const noAnswerMsg = infos.some(x => /did not answer|не відповів/.test(x));
    check(/after the current fight|після поточного бою/.test(midFight) && waitingE && waitingE.challenger === 'e2' && waitingE.accepter === 'e1' && openAfter === undefined && !noAnswerMsg
        && fightsStarted.length === 2 && fightsStarted[1].a === 'e2' && fightsStarted[1].b === 'e1',
        '11. a fighter accepts a challenge during their own fight: the duel waits and starts right after it (no "did not answer" 30 s later)',
        `reply: ${midFight}; waiting: ${JSON.stringify(waitingE)}; challenge after: ${openAfter}; "did not answer": ${noAnswerMsg}; fights ${JSON.stringify(fightsStarted)}`);

    // 12. "!battle" with no name
    fresh();
    make('hinty', 'red');
    G.say('hinty', t('!queue', '!черга')); make('other', 'blue'); G.say('other', t('!queue', '!черга'));   // hinty is fighting
    G.say('hinty', t('!battle', '!бій'));
    const want12 = t('ℹ️ @hinty, to challenge someone type !battle @name.', 'ℹ️ @hinty, щоб кинути виклик, напишіть !бій @нік.');
    check(lastInfo() === want12, `12. "${t('!battle', '!бій')}" with no name (even mid-fight) replies "${want12}"`, lastInfo());
    __drain();

    // 14. The result screen holds the arena (RESULT_HOLD_MS) after every fight; the timer only runs on __drain()
    {
        fresh();
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type));
        const end = (a, b, hpA, hpB, ranked) => { G.running = true; G.finishBattle({ ...G.getDragonDB()[a] }, { ...G.getDragonDB()[b] }, hpA, hpB, ranked); };
        end('h1', 'h2', 40, 0, true);                              // a ranked fight ends: its result screen holds the arena
        const held = !!G.resultHold && !G.running;
        G.say('h3', t('!queue', '!черга')); G.say('h4', t('!queue', '!черга'));
        const queued = [...G.queue], startedInHold = fightsStarted.length;
        G.say('h5', t('!battle @h6', '!бій @h6')); G.say('h6', t('!accept', '!прийняти'));
        const acceptReply = lastInfo(), waiting = G.waitingDuel;
        check(held && queued.join() === 'h3,h4' && startedInHold === 0 && waiting && waiting.challenger === 'h5' && /after the current fight|після поточного бою/.test(acceptReply),
            '14. during the result screen two !queue only join the queue and an accepted duel waits, as during a fight', `held ${held}; queue ${queued}; fights ${startedInHold}; reply: ${acceptReply}`);
        G.say('viewer', t('!start', '!старт'));
        G.sayAs('vip', t('!start', '!старт'), { badges: { vip: '1' } });
        const ignored = !!G.resultHold && fightsStarted.length === 0;
        G.sayAs('mod1', t('!start', '!старт'), { mod: true, badges: { moderator: '1' } });
        const afterMod = fightsStarted[0];
        check(ignored && !G.resultHold && afterMod && afterMod.a === 'h5' && afterMod.b === 'h6' && !afterMod.ranked && fightsStarted.length === 1,
            "14. a viewer's and a VIP's !start are ignored; a moderator's ends the hold and the waiting duel starts first (before the queue)", `ignored ${ignored}; fights ${JSON.stringify(fightsStarted)}`);
        __drain();                                                  // the duel runs; then its own hold, then the queue
        const second = fightsStarted[1];
        check(second && second.ranked && [second.a, second.b].sort().join() === 'h3,h4', '14. after the duel and its hold the ranked queue carries on', JSON.stringify(fightsStarted));
        __drain();
        // A friendly draw and a ranked draw hold the arena too
        for (const ranked of [false, true]) {
            fresh();
            ['d1', 'd2', 'd3', 'd4'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i].type));
            end('d1', 'd2', 30, 30, ranked);
            G.say('d3', t('!queue', '!черга')); G.say('d4', t('!queue', '!черга'));
            const during = fightsStarted.length;
            __drain();
            check(!!during === false && fightsStarted.length >= 1 && fightsStarted[0].ranked && G.resultHold === null,
                `14. after a ${ranked ? 'ranked' : 'friendly'} draw the queue waits for the hold, then starts`, JSON.stringify({ during, fights: fightsStarted }));
        }
        // The owner's !start with nobody waiting just ends the hold; the result stays and the next two !queue start at once
        fresh();
        ['o1', 'o2', 'o3', 'o4'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i].type));
        end('o1', 'o2', 40, 0, true);
        G.say('streamchannel', t('!start', '!старт'));
        const freeAfterOwner = G.resultHold === null && fightsStarted.length === 0 && G.arenaState.kind === 'result';
        G.say('o3', t('!queue', '!черга')); G.say('o4', t('!queue', '!черга'));
        check(freeAfterOwner && fightsStarted.length === 1, "14. the channel owner's !start ends the hold; with nobody waiting the result stays, and the queue then starts at once",
            JSON.stringify({ freeAfterOwner, fights: fightsStarted, kind: G.arenaState.kind }));
        __drain();
    }

    // 14b. After an accepted !start, further ones are ignored for 5 s (Node's clock is real: these run within milliseconds)
    {
        fresh();
        ['g1', 'g2', 'g3', 'g4'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i].type));
        const end = (a, b) => { G.running = true; G.finishBattle({ ...G.getDragonDB()[a] }, { ...G.getDragonDB()[b] }, 40, 0, true); };
        end('g1', 'g2');
        G.say('streamchannel', t('!start', '!старт'));             // ends this hold
        const first = G.resultHold === null;
        end('g3', 'g4');                                            // another result screen straight away
        G.sayAs('mod1', t('!start', '!старт'), { mod: true });      // within 5 s of the first: ignored
        G.say('streamchannel', t('!start', '!старт'));
        const guarded = !!G.resultHold;
        G.resetStartGuard();                                        // as if 5 s had passed
        G.sayAs('mod1', t('!start', '!старт'), { mod: true });
        check(first && guarded && G.resultHold === null, '14b. after an accepted !start, a moderator\'s and the owner\'s !start within 5 s are ignored; after it, one works again',
            JSON.stringify({ first, guarded, hold: !!G.resultHold }));
        __drain();
    }

    // 15. The ranked queue: the longest wait fights first, against the closest level (a tie: whoever waited longer)
    {
        fresh();
        const lv = { qa: 5, qb: 12, qc: 7, qd: 4, qe: 5, qf: 7, qg: 3, qh: 9 };
        Object.entries(lv).forEach(([n, l], i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: l }));
        const queueUp = names => { G.running = true; names.forEach(n => G.say(n, t('!queue', '!черга'))); const q = [...G.queue]; G.running = false; G.checkQueue(); return q; };
        const q1 = queueUp(['qa', 'qb', 'qc', 'qd']);             // L5, L12, L7, L4
        const f1 = fightsStarted[0], left1 = [...G.queue];
        check(q1.join() === 'qa,qb,qc,qd' && f1 && f1.a === 'qa' && f1.b === 'qd' && f1.ranked && left1.join() === 'qb,qc',
            '15. the longest-waiting fighter (@qa, L5) goes first, against the closest level among the rest (@qd, L4); the others keep their places',
            JSON.stringify({ q1, f1, left1 }));
        __drain(); fresh();
        Object.entries(lv).forEach(([n, l], i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: l }));
        queueUp(['qe', 'qh', 'qf', 'qg']);                           // L5, L9, L7, L3: L7 and L3 are both 2 away
        const f2 = fightsStarted[0];
        check(f2 && f2.a === 'qe' && f2.b === 'qf', '15. a level tie goes to whoever waited longer (@qf, L7, queued before @qg, L3)', JSON.stringify({ f2, queue: G.queue }));
        __drain(); fresh();
        Object.entries(lv).forEach(([n, l], i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: l }));
        queueUp(['qg', 'qb', 'qc', 'qh']);                           // L3 first: L7 is closest
        const f3 = fightsStarted[0];
        G.say('qg', t('!queue', '!черга'));                          // queues again during the fight: to the back
        check(f3 && f3.a === 'qg' && f3.b === 'qc' && G.queue.join() === 'qb,qh,qg', '15. @qg (L3, first in line) fights @qc (L7); joining again puts them at the back',
            JSON.stringify({ f3, queue: G.queue }));
        __drain();
    }

    // 16. Underdog XP (ranked): +5 per level below the loser, at most +40, on top of 40; Gold on the whole amount
    {
        const fight = (win, lose, ranked = true, hp = [40, 0]) => {
            const db = G.getDragonDB(), w0 = db[win].xp, l0 = db[lose].xp;
            G.running = true;
            G.finishBattle({ ...db[win] }, { ...db[lose] }, hp[0], hp[1], ranked);
            const after = G.getDragonDB();
            return [after[win].xp - w0, after[lose].xp - l0];
        };
        const cases = [];
        for (const [wl, ll, want] of [[9, 10, 45], [6, 10, 60], [5, 15, 80], [1, 20, 80], [12, 10, 40], [10, 10, 40]]) {
            fresh(); make('uw', 'red', { level: wl }); make('ul', 'blue', { level: ll });
            const [gw, gl] = fight('uw', 'ul');
            cases.push({ wl, ll, want, got: gw, loser: gl });
        }
        check(cases.every(c => c.got === c.want && c.loser === (c.ll >= 20 ? 0 : 10)),
            '16. underdog XP: L9 beats L10 → +45, L6 beats L10 → +60, L5 beats L15 → +80 (capped at +40 bonus), L1 beats L20 → +80; a higher or equal level winner → +40; the loser +10 as before (0 at level 20)',
            JSON.stringify(cases));
        fresh(); make('uw', 'red', { level: 6 }); make('ul', 'blue', { level: 10 });
        fight('uw', 'ul');
        const said = logs.find(l => /stronger opponent|сильнішого суперника/.test(l)) || '';
        check(said.includes(t('+60 XP, +20 for a stronger opponent', '+60 XP, +20 за сильнішого суперника')), '16. the fight record names the bonus: "' + said.slice(0, 90) + '"', said);
        // Gold applies to the whole amount (40 + bonus), at the winner's own tier
        fresh(); make('gw', 'gold', { level: 6 }); make('ul', 'blue', { level: 10 });
        const tier = G.getTierMultiplier(6), pct = G.ELEMENT_BASE.goldXp + tier.goldXpBonus;
        const [gold] = fight('gw', 'ul');
        check(gold === Math.round(60 * (1 + pct / 100)), `16. a Gold underdog (L6 beats L10) gets Gold's +${pct}% on all 60: +${gold} XP`, `got ${gold}, want ${Math.round(60 * (1 + pct / 100))}`);
        // Level 20 gets nothing; draws and duels are unchanged
        fresh(); make('top', 'red', { level: 20 }); make('ul', 'blue', { level: 20 });
        const [l20] = fight('top', 'ul');
        fresh(); make('dw', 'red', { level: 3 }); make('dl', 'blue', { level: 12 });
        const draw = fight('dw', 'dl', true, [30, 30]);
        fresh(); make('dw', 'red', { level: 3 }); make('dl', 'blue', { level: 12 });
        const duel = fight('dw', 'dl', false);
        check(l20 === 0 && draw.join() === '10,10' && duel.join() === '0,0', '16. level 20 gets no XP; a ranked draw is +10 each and a duel nothing, whatever the levels',
            JSON.stringify({ l20, draw, duel }));
        __drain();
    }

    // 17. The Top: more wins first; on equal wins fewer losses, then the higher level. The streamer and test fighters stay out
    if (lang === 'en') {
        fresh();
        const rows = { t1: [7, 6, 15], t2: [6, 2, 3], t3: [6, 1, 3], t4: [4, 0, 3], t5: [3, 0, 10], t6: [3, 0, 12], t7: [3, 1, 20] };   // wins, losses, level
        Object.entries(rows).forEach(([n, [w, l, lvl]], i) => { make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: lvl }); G.stats[n] = { wins: w, losses: l }; });
        const prevStreamer = G.streamer;
        G.setStreamerUser('streamchannel'); make('streamchannel', 'white', { level: 20 }); G.stats.streamchannel = { wins: 50, losses: 0 };
        make('QA-Tester-Alpha', 'red', { level: 20 }); G.stats['QA-Tester-Alpha'] = { wins: 40, losses: 0 };
        G.renderLeaderboard();
        const order = G.topRows;
        check(order.join() === 't1,t3,t2,t4,t6,t5,t7',
            '17. the Top by wins: @t1 7–6 first (most wins, though only +1), @t3 6–1 before @t2 6–2 (equal wins: fewer losses), @t4 4–0, @t6 3–0 L12 before @t5 3–0 L10 (same record: higher level), @t7 3–1 L20 last (fewer losses before level); no streamer, no test fighter',
            order.join());
        G.setStreamerUser(prevStreamer);
    }

    // 17b. A ranked fight against the streamer's White Dragon gives no win or loss to either side; the XP is as usual.
    // Other ranked fights count as before
    {
        fresh();
        const prevStreamer = G.streamer;
        G.setStreamerUser('streamchannel'); make('streamchannel', 'white', { level: 10 }); make('fan', 'red', { level: 5 }); make('pal', 'blue', { level: 5 });
        const rec = n => G.stats[n] ? `${G.stats[n].wins}-${G.stats[n].losses}` : '0-0';
        const ranked = (win, lose, hp = [40, 0]) => {
            const db = G.getDragonDB(), w0 = db[win].xp, l0 = db[lose].xp;
            G.running = true;
            G.finishBattle({ ...db[win] }, { ...db[lose] }, hp[0], hp[1], true);
            const after = G.getDragonDB();
            return [after[win].xp - w0, after[lose].xp - l0];
        };
        const lost = ranked('streamchannel', 'fan');                 // the dragon wins, as it always does
        const lostRec = [rec('streamchannel'), rec('fan')];
        const won = ranked('fan', 'streamchannel', [30, 20]);        // a time-out the viewer wins on HP (as if): still not counted
        const wonRec = [rec('streamchannel'), rec('fan')];
        const usual = ranked('pal', 'fan');                          // two viewers: counted as before
        check(lost.join() === '40,10' && lostRec.join() === '0-0,0-0' && wonRec.join() === '0-0,0-0' && won[0] === 65 && rec('pal') === '1-0' && rec('fan') === '0-1' && usual.join() === '40,10',
            t('17b. a ranked fight against the White Dragon: no win or loss for either side (the dragon wins: +40 / +10 XP as usual; if the viewer ever won on HP: +65 as usual, still no record); a fight between viewers counts (@pal 1–0, @fan 0–1)',
              '17b. рейтинговий бій з Білим Драконом: без перемоги й поразки для обох (дракон перемагає: +40 / +10 XP, як завжди; якби глядач переміг за HP: +65, як завжди, і теж без запису); бій між глядачами рахується (@pal 1–0, @fan 0–1)'),
            JSON.stringify({ lost, lostRec, won, wonRec, usual, pal: rec('pal'), fan: rec('fan') }));
        G.setStreamerUser(prevStreamer);
        __drain();
    }

    // 18. Tournaments
    {
        fresh();
        ['ta', 'tb', 'tc', 'td', 'te'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: 2 + i * 3 }));
        G.say('viewer', t('!tournament 4', '!турнір 4'));
        const viewerIgnored = !G.tourney;
        G.sayAs('mod1', t('!tournament 4', '!турнір 4'), { mod: true });
        const opened = G.tourney && G.tourney.phase === 'signup' && G.tourney.size === 4;
        G.say('ghost', t('!join', '!учасник')); const noDrake = lastInfo();
        G.setStreamerUser('streamchannel'); make('streamchannel', 'white', { level: 20 });
        G.say('streamchannel', t('!join', '!учасник')); const dragon = lastInfo();
        G.say('ta', t('!join', '!учасник')); G.say('ta', t('!join', '!учасник')); const twice = lastInfo();
        G.say('tb', t('!join', '!учасник')); G.say('tb', t('!leave', '!вийти')); const left = lastInfo();
        ['tb', 'tc', 'td'].forEach(n => G.say(n, t('!join', '!учасник')));   // the 4th fills the bracket: sign-up closes
        const closed = G.tourney.phase !== 'signup';
        G.say('te', t('!join', '!учасник')); const late = lastInfo();
        G.say('ta', t('!leave', '!вийти')); const noLeave = lastInfo();
        check(viewerIgnored && opened, "18. a viewer's !tournament does nothing; a moderator's opens sign-up for 4", JSON.stringify(G.tourney));
        check(/create a drake|створіть дрейка/.test(noDrake) && /White Dragon|Білий Дракон/.test(dragon) && /already in the tournament|вже в турнірі/.test(twice)
            && /leaves|виходить/.test(left) && closed && /bracket is full|сітка вже заповнена/.test(late) && /only leave during sign-up|лише під час реєстрації/.test(noLeave),
            '18. refusals: no drake, the White Dragon, already in; leaving during sign-up; the 4th player fills the bracket and closes it ("full" after that); leaving then is refused',
            JSON.stringify({ noDrake, dragon, twice, left, closed, late, noLeave }));
        G.setStreamerUser('');
        __drain(); fresh();
    }
    {
        // A full 4-player run, rigged: every semifinal and final game is decided by the plan below
        const levels = { ta: 2, tb: 5, tc: 9, td: 14, te: 4, tf: 4 };
        Object.keys(levels).forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: levels[n] }));
        G.stats.ta = { wins: 3, losses: 1 };
        // A duel accepted and two !queue while a fight is on: the duel goes first, the tournament next, the queue last
        G.running = true;
        G.say('te', t('!queue', '!черга')); G.say('tf', t('!queue', '!черга'));
        G.say('ta', t('!battle @tb', '!бій @tb')); G.say('tb', t('!accept', '!прийняти'));
        G.running = false;
        G.sayAs('mod1', t('!tournament', '!турнір'), { mod: true });
        ['ta', 'tb', 'tc', 'td'].forEach(n => G.say(n, t('!join', '!учасник')));
        G.sayAs('mod1', t('!tournament start', '!турнір старт'), { mod: true });
        const bracket = G.tourney.rounds[0].map(m => [m.a, m.b]);
        const key = (a, b) => [a, b].sort().join('-');
        const sf = bracket.map(p => key(...p));
        const finalists = [bracket[0][0], bracket[1][0]], thirds = [bracket[0][1], bracket[1][1]];
        // Semifinal 1: 2:0. Semifinal 2: 2:1 with a draw in game 2 (replayed). 3rd place: one game. Final: 2:1
        const plan = { [sf[0]]: [bracket[0][0], bracket[0][0]], [sf[1]]: [bracket[1][1], null, bracket[1][0], bracket[1][0]],
                       [key(...thirds)]: [thirds[0]], [key(...finalists)]: [finalists[1], finalists[0], finalists[0]] };
        const played = {};
        const mine = () => JSON.stringify(['ta', 'tb', 'tc', 'td'].map(n => [G.getDragonDB()[n].xp, G.getDragonDB()[n].level, G.stats[n] || null]));
        const before = mine();
        tourneyGames = [];
        rig = (a, b) => { const k = key(a, b); played[k] = (played[k] || 0) + 1; return plan[k][played[k] - 1]; };
        G.say('tf', t('!battle @te', '!бій @te')); const duelReply = lastInfo();
        const duelFirst = fightsStarted[0];
        __drain();
        rig = null;
        const order = [...new Set(tourneyGames.map(g => key(g.a, g.b)))];
        check(duelFirst && !duelFirst.ranked && key(duelFirst.a, duelFirst.b) === 'ta-tb' && /tournament is on|триває турнір/.test(duelReply),
            '18. a duel accepted before the tournament goes first; a new !battle meanwhile gets the "tournament is on" reply', JSON.stringify({ duelFirst, duelReply }));
        check(order.join('|') === [sf[0], sf[1], key(...thirds), key(...finalists)].join('|') && played[sf[0]] === 2 && played[sf[1]] === 4 && played[key(...finalists)] === 3,
            '18. semifinals first to 2 (2:0, and 2:1 with a drawn game replayed), then the 3rd-place game (one game), then the final (2:1)',
            JSON.stringify({ order, played }));
        check(tourneyGames.length === 10 && tourneyGames.every(g => g.lv[0] === 20 && g.lv[1] === 20), '18. every tournament game is fought at level 20 (players at levels 2, 5, 9 and 14)',
            JSON.stringify(tourneyGames.map(g => g.lv)));
        check(mine() === before, '18. no XP for the players, saved levels untouched, wins and losses (the Top) unchanged', mine() + ' vs ' + before);
        const ranked = fightsStarted.filter(f => f.ranked);
        const lastTourney = fightsStarted.map(f => !f.ranked).lastIndexOf(true);
        check(ranked.length === 1 && [ranked[0].a, ranked[0].b].join() === 'te,tf' && fightsStarted.indexOf(ranked[0]) > lastTourney && !G.tourney,
            '18. the ranked queue waits for the whole tournament, then carries on in its order (@te, @tf)', JSON.stringify(fightsStarted));
        check(logs.some(l => /Tournament over|Турнір завершено/.test(l) && l.includes('🥇 @' + finalists[0]) && l.includes('🥈 @' + finalists[1]) && l.includes('🥉 @' + thirds[0])),
            `18. the podium: 🥇 @${finalists[0]}, 🥈 @${finalists[1]}, 🥉 @${thirds[0]}`, logs.filter(l => /🥇/.test(l)).join(' | '));
        __drain(); fresh();
    }
    // Uneven sign-ups: the main bracket is the largest of 4, 8, 16 that fits; the highest levels go straight in (here
    // everyone is level 3, so sign-up order decides), the rest play single qualifier games for the spots left
    for (const [n, size, news] of [
        [5, 4, t('5 players: 3 with the highest levels straight into the semifinals, 2 play a qualifier for 1 spot', '5 учасників: 3 з найвищим рівнем — одразу в півфінал, 2 грають кваліфікацію за 1 місце')],
        [8, 8, null],
        [9, 8, t('9 players: 7 with the highest levels straight into the quarterfinals, 2 play a qualifier for 1 spot', '9 учасників: 7 з найвищим рівнем — одразу в чвертьфінал, 2 грають кваліфікацію за 1 місце')],
        [13, 8, t('13 players: 3 with the highest levels straight into the quarterfinals, 10 play a qualifier for 5 spots', '13 учасників: 3 з найвищим рівнем — одразу в чвертьфінал, 10 грають кваліфікацію за 5 місць')],
        [15, 8, t('15 players: 1 with the highest levels straight into the quarterfinals, 14 play a qualifier for 7 spots', '15 учасників: 1 з найвищим рівнем — одразу в чвертьфінал, 14 грають кваліфікацію за 7 місць')],
        [16, 16, null]]) {
        fresh();
        const names = Array.from({ length: n }, (_, i) => 'u' + String(i + 1).padStart(2, '0'));
        names.forEach((p, i) => make(p, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: 3 }));
        G.sayAs('mod1', t('!tournament 16', '!турнір 16'), { mod: true });
        names.forEach(p => G.say(p, t('!join', '!учасник')));
        tourneyGames = [];
        rig = (a, b) => a < b ? a : b;   // the earlier name wins: every game decided, no draws
        G.sayAs('mod1', t('!tournament start', '!турнір старт'), { mod: true });
        const T = JSON.parse(JSON.stringify(G.tourney));
        const direct = 2 * size - n, r1 = T.rounds[0].flatMap(m => [m.a, m.b]).filter(Boolean);
        const qualPlayers = T.qual.flatMap(m => [m.a, m.b]);
        check(T.bracket === size && T.rounds[0].length === size / 2 && r1.slice().sort().join() === names.slice(0, direct).join()
            && T.qual.length === (n - direct) / 2 && qualPlayers.slice().sort().join() === names.slice(direct).join()
            && T.qual.every(m => m.to && !T.rounds[0][m.to.m][m.to.side]) && new Set(T.qual.map(m => m.to.m + m.to.side)).size === T.qual.length,
            direct === n ? `18. ${n} players: a main bracket of ${size}, everyone straight in, no qualifier`
                : `18. ${n} players, all level 3: a main bracket of ${size}; the first ${direct} (sign-up order breaks the tie) straight in, the last ${n - direct} in ${(n - direct) / 2} qualifier game(s), each winner to a place of its own in round 1`,
            JSON.stringify({ bracket: T.bracket, r1, qual: T.qual }));
        check(news ? infos.some(i => i.endsWith(news)) : !infos.some(i => /qualifier|кваліфікацію/.test(i)),
            news ? `18. ${n} players: the ЧАТ panel says «${news}»` : `18. ${n} players: no qualifier, nothing about one in the ЧАТ panel`, JSON.stringify(infos));
        __drain();
        rig = null;
        const q = T.qual.length, stages = tourneyGames.map(g => g.stage);
        const qualWinners = T.qual.map(m => m.a < m.b ? m.a : m.b);
        const firstRound = tourneyGames.filter(g => g.stage === ({ 4: 'sf', 8: 'qf', 16: 'r16' })[size]);
        const inFirst = [...new Set(firstRound.flatMap(g => [g.a, g.b]))].sort();
        check(stages.slice(0, q).every(s => s === 'qual') && !stages.slice(q).includes('qual')
            && tourneyGames.slice(0, q).every((g, i) => [g.a, g.b].sort().join() === [T.qual[i].a, T.qual[i].b].sort().join())
            && inFirst.join() === [...names.slice(0, direct), ...qualWinners].sort().join() && firstRound.length === size && !G.tourney
            && logs.some(l => /Tournament over|Турнір завершено/.test(l)),
            q ? `18. ${n} players: the ${q} qualifier game(s) come first, one game each; round 1 is the ${direct} direct players and the ${q} qualifier winner(s); on to the podium`
                : `18. ${n} players: round 1 straight away, on to the podium`,
            JSON.stringify({ stages, inFirst }));
        fresh();
    }
    // Level shapes the bracket. Where each player is: their place in round 1 (0 … size-1), directly or through their
    // qualifier game; the half is the place's first or second half
    const placeIn = (T, who) => {
        const i = T.rounds[0].findIndex(m => m.a === who || m.b === who);
        if (i !== -1) return 2 * i + (T.rounds[0][i].b === who ? 1 : 0);
        const q = T.qual.find(m => m.a === who || m.b === who);
        return q ? 2 * q.to.m + (q.to.side === 'b' ? 1 : 0) : -1;
    };
    const halfOf = (T, who) => Math.floor(placeIn(T, who) / (T.bracket / 2));
    {
        // 9 players, levels shuffled against sign-up order, a tie at the cut: the 7 highest straight in, the tie (level 2)
        // to the earlier sign-up; the two highest (@v05 15, @v08 12) in opposite halves; the higher level wins every game,
        // so they meet in the final
        fresh();
        const lv = { v01: 2, v02: 2, v03: 9, v04: 4, v05: 15, v06: 4, v07: 1, v08: 12, v09: 4 };
        const names = Object.keys(lv);
        names.forEach((p, i) => make(p, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: lv[p] }));
        G.sayAs('mod1', t('!tournament 16', '!турнір 16'), { mod: true });
        names.forEach(p => G.say(p, t('!join', '!учасник')));
        tourneyGames = [];
        rig = (a, b) => lv[a] > lv[b] || (lv[a] === lv[b] && a < b) ? a : b;
        G.sayAs('mod1', t('!tournament start', '!турнір старт'), { mod: true });
        const T = JSON.parse(JSON.stringify(G.tourney));
        const r1 = T.rounds[0].flatMap(m => [m.a, m.b]).filter(Boolean).sort(), qualPlayers = T.qual.flatMap(m => [m.a, m.b]).sort();
        check(r1.join() === 'v01,v03,v04,v05,v06,v08,v09' && qualPlayers.join() === 'v02,v07',
            '18. 9 players at levels 1–15: the 7 highest straight into the main bracket (@v01 before @v02 at level 2: sign-up order breaks the tie), @v02 and @v07 in the qualifier',
            JSON.stringify({ r1, qualPlayers }));
        const seedsLine = t('The highest levels, @v05 and @v08, are in opposite halves of the bracket: they can only meet in the final or in the 3rd-place match.',
            'Найвищі рівні — @v05 і @v08: вони в різних половинах сітки й можуть зустрітися лише у фіналі або в матчі за 3-тє місце.');
        check(halfOf(T, 'v05') !== halfOf(T, 'v08') && infos.some(i => i.endsWith(seedsLine)),
            `18. @v05 (15) and @v08 (12) in opposite halves; the ЧАТ panel says «${seedsLine}»`, JSON.stringify({ halves: [halfOf(T, 'v05'), halfOf(T, 'v08')], infos }));
        __drain();
        rig = null;
        const fin = tourneyGames.filter(g => g.stage === 'final');
        check(fin.length >= 1 && fin.every(g => [g.a, g.b].sort().join() === 'v05,v08') && tourneyGames.every(g => g.lv[0] === 20 && g.lv[1] === 20)
            && logs.some(l => /🥇 @v05/.test(l) && /🥈 @v08/.test(l)),
            '18. the higher level winning every game, they meet only in the final; every game still at level 20', JSON.stringify({ fin, podium: logs.filter(l => /🥇/.test(l)) }));
        fresh();
    }
    {
        // Every draw: the two highest levels in opposite halves, in brackets of 4, 8 and 16, with and without a qualifier
        // (with 15 the second highest is in the qualifier: their game's place is in the other half). The two highest
        // signed up last, so sign-up order alone would put them in the qualifier
        const bad = [];
        let draws = 0;
        for (const n of [4, 5, 8, 9, 13, 15, 16]) {
            for (let k = 0; k < 8; k++) {
                fresh();
                const names = Array.from({ length: n }, (_, i) => 'w' + String(i + 1).padStart(2, '0'));
                names.forEach((p, i) => make(p, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: i === n - 1 ? 18 : i === n - 2 ? 17 : 1 + (i % 5) }));
                G.sayAs('mod1', t('!tournament 16', '!турнір 16'), { mod: true });
                names.forEach(p => G.say(p, t('!join', '!учасник')));
                G.sayAs('mod1', t('!tournament start', '!турнір старт'), { mod: true });
                const T = JSON.parse(JSON.stringify(G.tourney));
                const top = names[n - 1], second = names[n - 2];
                const directTop = T.rounds[0].some(m => m.a === top || m.b === top);
                if (!directTop || halfOf(T, top) === halfOf(T, second) || placeIn(T, second) === -1 || T.seeds.join() !== [top, second].join()) bad.push({ n, k, T: { r1: T.rounds[0], qual: T.qual, seeds: T.seeds } });
                draws++;
                G.sayAs('mod1', t('!tournament stop', '!турнір стоп'), { mod: true });
            }
        }
        check(!bad.length, `18. ${draws} draws (4–16 players): the highest level always straight in, the two highest always in opposite halves`, JSON.stringify(bad.slice(0, 2)));
        fresh();
    }
    {
        // A simulation error in a tournament game: for 2 s the arena is free before the next fight. Two !queue in that
        // moment only join the queue (it goes through nextFight, which runs the tournament): no ranked fight starts, the
        // tournament game comes next, and the queue waits for the whole tournament
        fresh();
        ['ea', 'eb', 'ec', 'ed', 'q1', 'q2'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: 3 }));
        G.sayAs('mod1', t('!tournament 4', '!турнір 4'), { mod: true });
        ['ea', 'eb', 'ec', 'ed'].forEach(n => G.say(n, t('!join', '!учасник')));   // full: the first game starts
        const first = fightsStarted[0];
        let atError = null;
        onSimError = () => {
            G.say('q1', t('!queue', '!черга')); G.say('q2', t('!queue', '!черга'));
            atError = { fights: fightsStarted.length, queue: [...G.queue], last: fightsStarted[fightsStarted.length - 1] };
        };
        G.failNextTurn();
        __drain();
        const ranked = fightsStarted.filter(f => f.ranked), lastTourney = fightsStarted.map(f => !f.ranked).lastIndexOf(true);
        check(first && !first.ranked && atError && atError.fights === 2 && !atError.last.ranked && [atError.last.a, atError.last.b].sort().join() === [first.a, first.b].sort().join()
            && atError.queue.join() === 'q1,q2' && ranked.length === 1 && fightsStarted.indexOf(ranked[0]) > lastTourney && !G.tourney,
            '18. a simulation error in a tournament game, then two !queue at once: no ranked fight; the same tournament game is played again next, and the queue (@q1, @q2) waits for the end of the tournament',
            JSON.stringify({ first, atError, fights: fightsStarted }));
        onSimError = null;
        __drain(); fresh();
    }
    {
        // Cancelled in the middle of a game: that game counts for nothing, and the queue and duels are back
        ['ca', 'cb', 'cc', 'cd', 'q1', 'q2'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: 3 }));
        const mine = () => JSON.stringify(['ca', 'cb', 'cc', 'cd'].map(n => G.getDragonDB()[n].xp));
        const before = mine();
        G.sayAs('mod1', t('!tournament 4', '!турнір 4'), { mod: true });
        ['ca', 'cb', 'cc', 'cd'].forEach(n => G.say(n, t('!join', '!учасник')));   // full: it starts at once
        const gameOn = G.running && fightsStarted.length === 1;
        G.sayAs('mod1', t('!tournament stop', '!турнір стоп'), { mod: true });
        const gone = !G.tourney && /cancelled|скасовано/.test(lastInfo());
        G.say('q1', t('!queue', '!черга')); G.say('q2', t('!queue', '!черга'));
        __drain();
        const after = fightsStarted.slice(1);
        check(gameOn && gone && after.length === 1 && after[0].ranked && mine() === before,
            '18. !tournament stop mid-game: the tournament is gone, the game counts for nothing (no XP), then the queue carries on', JSON.stringify({ gameOn, gone, fights: fightsStarted }));
        __drain();
    }

    // 19. Tournament rewards
    if (G.honours) {
        fresh(); G.honoursReset();
        const names = ['ra', 'rb', 'rc', 'rd', 're'];
        names.forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: 3 + i }));
        // A 4-player tournament where the earlier name in `pri` always wins; returns [1st, 2nd, 3rd]
        const playTourney = (pri, players) => {
            G.sayAs('mod1', t('!tournament 4', '!турнір 4'), { mod: true });
            rig = (a, b) => pri.indexOf(a) < pri.indexOf(b) ? a : b;
            players.forEach(n => G.say(n, t('!join', '!учасник')));
            const r0 = G.tourney.rounds[0];
            __drain();
            rig = null;
            const win = m => pri.indexOf(m.a) < pri.indexOf(m.b) ? [m.a, m.b] : [m.b, m.a];
            const [w1, l1] = win(r0[0]), [w2, l2] = win(r0[1]);
            const [gold, silver] = win({ a: w1, b: w2 }), [bronze] = win({ a: l1, b: l2 });
            return [gold, silver, bronze];
        };
        const p1 = playTourney(['ra', 'rb', 'rc', 'rd'], ['ra', 'rb', 'rc', 'rd']);
        let h = G.honours;
        const spins1 = { ...h.spins };
        check(JSON.stringify(h.holders) === JSON.stringify(p1) && p1[0] === 'ra' && h.medals.ra.join() === '1,0,0' && h.medals[p1[1]].join() === '0,1,0' && h.medals[p1[2]].join() === '0,0,1'
            && spins1.ra === 3 && spins1[p1[1]] === 2 && spins1[p1[2]] === 1 && h.hall.length === 1 && h.hall[0].players === 4 && h.hall[0].podium.join() === p1.join(),
            `19. the podium (🏆 @${p1[0]}, 🥈 @${p1[1]}, 🥉 @${p1[2]}) gets the badges, one medal each, 3 / 2 / 1 free title spins and a Hall of Fame entry`, JSON.stringify(h));
        G.renderLeaderboard();
        G.say('ra', t('!stats', '!стата')); const stats = lastInfo();
        check(G.topHtml.includes('@ra<span class="lb-medal">🏆</span>') && G.topHtml.includes(`@${p1[1]}<span class="lb-medal">🥈</span>`) && !G.topHtml.includes('@re<span')
            && stats.includes('@ra 🏆') && stats.includes('🏆×1 🥈×0 🥉×0') && /Free title spins: 3|Безкоштовні прокрути титулу: 3/.test(stats),
            '19. the badges in the Top (🏆 after @ra, 🥈 after the runner-up, none for @re) and in !stats, with the medal count and the spins left', `${stats}`);
        const titleOf = n => G.getDragonDB()[n].title.id;
        // !title typed in chat: a free spin pays for it; a channel-point redemption doesn't use one; none left: the usual reply
        const before = titleOf('ra');
        let rolled = 0;
        for (let i = 0; i < 5 && rolled === 0; i++) { G.say('ra', t('!title', '!титул')); if (titleOf('ra') !== before || /Free spin|Безкоштовний прокрут/.test(lastInfo())) rolled++; }
        const afterFree = G.honours.spins.ra, freeReply = lastInfo();
        G.sayAs('ra', t('!title', '!титул'), { 'custom-reward-id': 'reward-1' });
        const afterPoints = G.honours.spins.ra;
        G.say('re', t('!title', '!титул')); const noSpin = lastInfo();
        check(afterFree === 2 && /Free spin from a tournament · 2 left|Безкоштовний прокрут за турнір · лишилось 2/.test(freeReply) && afterPoints === 2 && /ONLY|ТІЛЬКИ/.test(noSpin),
            '19. !title in chat uses a free spin (3 → 2, "2 left" on the roll card); a channel-point !title leaves the spins alone; with none, the usual "channel points only" reply',
            JSON.stringify({ afterFree, freeReply, afterPoints, noSpin }));
        // A cancelled tournament gives nothing
        const h1 = JSON.stringify(G.honours);
        G.sayAs('mod1', t('!tournament 4', '!турнір 4'), { mod: true });
        ['ra', 'rb', 'rc', 'rd'].forEach(n => G.say(n, t('!join', '!учасник')));
        G.sayAs('mod1', t('!tournament stop', '!турнір стоп'), { mod: true });
        __drain();
        check(JSON.stringify(G.honours) === h1, '19. a cancelled tournament gives no badges, medals, spins or Hall of Fame entry', JSON.stringify(G.honours));
        // The next tournament: new badges; medals and spins add up
        const p2 = playTourney(['re', 'ra', 'rb', 'rc'], ['ra', 'rb', 'rc', 're']);
        h = G.honours;
        const raMedals = [0, 1, 2].map(i => (p1[i] === 'ra' ? 1 : 0) + (p2[i] === 'ra' ? 1 : 0));
        const raSpins = 2 + [3, 2, 1][p2.indexOf('ra')];
        G.renderLeaderboard();
        check(JSON.stringify(h.holders) === JSON.stringify(p2) && h.medals.ra.join() === raMedals.join() && h.spins.ra === raSpins && h.hall.length === 2
            && G.topHtml.includes('@re<span class="lb-medal">🏆</span>') && !G.topHtml.includes('@ra<span class="lb-medal">🏆</span>'),
            `19. the next tournament (🏆 @${p2[0]}, 🥈 @${p2[1]}, 🥉 @${p2[2]}) takes the badges; @ra's medals add up (${raMedals.join('/')}), and so do the spins (2 left + ${raSpins - 2} = ${raSpins})`,
            JSON.stringify(h));
        G.say('viewer', t('!hall', '!зала')); const hall = lastInfo();
        check(/Hall of Fame|Зала слави/.test(hall) && hall.includes('🥇 @' + p2[0]) && hall.includes('🥇 @' + p1[0]) && hall.indexOf('@' + p2[0]) < hall.indexOf('🥇 @' + p1[0]) && /Most wins|Найбільше перемог/.test(hall),
            '19. !hall: both tournaments, the latest first, and who has won the most', hall);
        __drain(); fresh(); G.honoursReset();
    }

    // 20. The play log: tournament events and every fight's HP. What the game hands to playLog, in order
    if (hasPlayLog) {
        const tour = () => plays.filter(p => p.type === 'tournament').map(({ type, t: _, ...e }) => e);
        const fightsLogged = () => plays.filter(p => p.type === 'fight');
        const hpOk = (f, end) => f.players.every(p => p.hpLeft === Math.round(Math.max(0, end[p.name])) && Number.isInteger(p.hpLeft) && p.hpLeft >= 0 && p.hpLeft <= p.maxHp);
        // Sign-up: opened (size, who), each !join and !leave with how many are signed up after it, closed when it fills up
        fresh();
        ['pa', 'pb', 'pc', 'pd'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: 2 + i }));
        G.sayAs('mod1', t('!tournament 4', '!турнір 4'), { mod: true });
        G.say('pa', t('!join', '!учасник')); G.say('pb', t('!join', '!учасник')); G.say('pb', t('!leave', '!вийти'));
        G.say('pb', t('!join', '!учасник')); G.say('pc', t('!join', '!учасник'));
        G.say('pd', t('!join', '!учасник'));   // the 4th: full, it closes by itself
        const signup = tour();
        check(JSON.stringify(signup) === JSON.stringify([
            { event: 'opened', size: 4, user: 'mod1' }, { event: 'joined', user: 'pa', signedUp: 1 }, { event: 'joined', user: 'pb', signedUp: 2 },
            { event: 'left', user: 'pb', signedUp: 1 }, { event: 'joined', user: 'pb', signedUp: 2 }, { event: 'joined', user: 'pc', signedUp: 3 },
            { event: 'joined', user: 'pd', signedUp: 4 }, { event: 'closed', how: 'full', user: null, signedUp: 4, bracket: 4, qualifierGames: 0 }]),
            '20. sign-up in the play log: opened (4, by @mod1), each join and leave with the count after it, closed when the 4th filled it (bracket 4, no qualifier)',
            JSON.stringify(signup));
        // The games to the podium (the earlier name wins every game): each logged with both players' max HP (level 20's)
        // and the HP left as the arena shows it; then the podium
        rig = (a, b) => [a, b].sort()[0];
        __drain();
        rig = null;
        const games = fightsLogged(), podium = tour().filter(e => e.event === 'podium');
        const want20 = n => { const d = G.getDragonDB()[n]; return G.getMaxHP(20, d.drakeObj.type, d.title); };
        check(games.length === 7 && games.length === finishes.length && games.every((f, i) => f.kind === 'tournament' && f.players.every(p => p.maxHp === want20(p.name)) && hpOk(f, finishes[i]))
            && podium.length === 1 && JSON.stringify(podium[0]) === JSON.stringify({ event: 'podium', podium: G.honours.holders, signedUp: 4, bracket: 4 }),
            `20. all 7 games (2:0 semifinals, the 3rd-place game, a 2:0 final) each with both players' max HP at level 20 and the HP left; then the podium (🥇 @${podium[0] && podium[0].podium.join(', @')})`,
            JSON.stringify({ games: games.map(f => f.players.map(p => [p.name, p.hpLeft, p.maxHp])), podium, holders: G.honours.holders }));
        // Closed by !tournament start with a qualifier, then cancelled in the middle of the qualifier game
        fresh(); G.honoursReset();
        ['qa', 'qb', 'qc', 'qd', 'qe'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type, { level: 3 }));
        G.sayAs('mod1', t('!tournament', '!турнір'), { mod: true });
        ['qa', 'qb', 'qc', 'qd', 'qe'].forEach(n => G.say(n, t('!join', '!учасник')));
        G.sayAs('mod2', t('!tournament start', '!турнір старт'), { mod: true });
        const gameOn = G.running && G.tourGame && G.tourGame.stage === 'qual';
        G.sayAs('mod1', t('!tournament stop', '!турнір стоп'), { mod: true });
        __drain();
        const q = tour().filter(e => e.event === 'closed' || e.event === 'cancelled');
        const qGame = fightsLogged()[0];
        check(gameOn && JSON.stringify(q) === JSON.stringify([
            { event: 'closed', how: 'start', user: 'mod2', signedUp: 5, bracket: 4, qualifierGames: 1 },
            { event: 'cancelled', user: 'mod1', phase: 'running', stage: 'qual', game: 1, during: 'countdown', signedUp: 5 }])
            && qGame && qGame.counted === false && hpOk(qGame, finishes[0]),
            '20. closed by @mod2\'s !tournament start (5 signed up, bracket 4, 1 qualifier game); cancelled by @mod1 during the qualifier game (running, qual, game 1; in Node the arena is still on its countdown); that game logged as not counted, with its HP',
            JSON.stringify({ q, qGame }));
        // Cancelled during sign-up, straight after that (the stopped game is still the last tournament game the arena had)
        ['sa', 'sb'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i].type, { level: 1 }));
        G.sayAs('mod1', t('!tournament 8', '!турнір 8'), { mod: true });
        G.say('sa', t('!join', '!учасник')); G.say('sb', t('!join', '!учасник'));
        const shown = G.arenaState.kind;   // what the arena shows meanwhile (the last fight's result, here)
        G.sayAs('mod3', t('!tournament stop', '!турнір стоп'), { mod: true });
        const c = tour().pop();
        check(JSON.stringify(c) === JSON.stringify({ event: 'cancelled', user: 'mod3', phase: 'signup', stage: null, game: null, during: shown, signedUp: 2 }),
            '20. cancelled during sign-up: by @mod3, phase "signup", no game, 2 signed up', JSON.stringify(c));
        // Every other kind of fight with its HP: a ranked fight (different levels and elements, so different max HP), a duel,
        // and a simulation error
        fresh();
        make('ha', 'red', { level: 4 }); make('hb', 'gold', { level: 11 }); make('hc', 'blue', { level: 7 });
        G.say('ha', t('!queue', '!черга')); G.say('hb', t('!queue', '!черга'));
        __drain();
        G.say('hc', t('!battle @ha', '!бій @ha')); G.say('ha', t('!accept', '!прийняти'));
        __drain();
        G.failNextTurn();
        G.say('hb', t('!battle @hc', '!бій @hc')); G.say('hc', t('!accept', '!прийняти'));
        __drain();
        const [rf, df, ef] = fightsLogged();
        const wantMax = n => { const d = G.getDragonDB()[n]; return G.getMaxHP(d.level, d.drakeObj.type, d.title); };
        check(rf && rf.kind === 'ranked' && rf.players.every(p => p.maxHp === wantMax(p.name)) && rf.players[0].maxHp !== rf.players[1].maxHp && hpOk(rf, finishes[0])
            && df && df.kind === 'duel' && hpOk(df, finishes[1])
            && ef && ef.result === 'error' && ef.players.every(p => p.maxHp === wantMax(p.name) && Number.isInteger(p.hpLeft) && p.hpLeft >= 0 && p.hpLeft <= p.maxHp),
            `20. every fight's HP in the log: the ranked one (${rf && rf.players.map(p => `@${p.name} ${p.hpLeft}/${p.maxHp}`).join(', ')}), the duel, and a fight stopped by a simulation error; max HP each player's own, HP left as the arena shows it (rounded, never below 0)`,
            JSON.stringify({ rf, df, ef, finishes }));
        __drain(); fresh();
    }

    // 21. The coin flip's words: title 189 and the log lines of both coin-flip titles (189 and 190). Its own seeded
    // Math.random, so the fights here don't shift the rest of the run
    {
        fresh();
        const coin = G.TITLES_DB.find(x => x.id === 189);
        check(coin && coin.name.uk === 'Герб чи число' && coin.name.en === 'Heads or Tails',
            '21. title 189 is «Герб чи число» in Ukrainian, "Heads or Tails" in English', JSON.stringify(coin && coin.name));
        const keep = Math.random; Math.random = mulberry32(189);
        const seen = {};
        try {
            for (const id of [189, 190]) {
                make('ca', 'red', { level: 5, title: G.TITLES_DB.find(x => x.id === id) }); make('cb', 'blue', { level: 5 });
                const lines = [];
                for (let i = 0; i < 6 && !(lines.some(l => l.includes('🪙 ' + t('Heads!', 'Герб!'))) && lines.some(l => l.includes('🪙 ' + t('Tails...', 'Число...')))); i++) {
                    logs = [];
                    G.say('ca', t('!battle @cb', '!бій @cb')); G.say('cb', t('!accept', '!прийняти'));
                    __drain();
                    lines.push(...logs.filter(l => l.includes('🪙')));
                }
                seen[id] = { heads: lines.some(l => l.includes('🪙 ' + t('Heads!', 'Герб!'))), tails: lines.some(l => l.includes('🪙 ' + t('Tails...', 'Число...'))),
                             other: lines.filter(l => !/🪙 (Heads!|Tails...|Герб!|Число...)/.test(l)), sample: lines.slice(0, 2) };
                fresh();
            }
        } finally { Math.random = keep; }
        check([189, 190].every(id => seen[id].heads && seen[id].tails && !seen[id].other.length),
            `21. the coin flip in the log, for «${G.TITLES_DB.find(x => x.id === 190).name.uk}» too: ${t('"🪙 Heads!" and "🪙 Tails..."', '«🪙 Герб!» і «🪙 Число...»')}, no other coin words`,
            JSON.stringify(seen));
    }

    // 13. One icon in the opening banner
    const opener = G.TITLES_DB.filter(x => x.mechanic === 'opening_buff' || (x.bonus && x.bonus.mechanic === 'opening_buff'));
    const banners = G.fvT ? opener.map(x => G.fvT('opening', { title: `${x.icon} ${x.name[lang]}`, who: '@x', fx: 'FX' })) : [];
    check(opener.length && banners.every((b, i) => b.startsWith(opener[i].icon + ' ') && b.split(opener[i].icon).length === 2 && !b.includes('🌅 🌅')),
        `13. the opening banner shows the title's icon once: ${banners.slice(0, 2).join(' | ')}`, banners.join(' | ') || 'no banner template');
}

// 22. Renamed titles: each keeps its id, icon, rarity and bonus; only these names changed. Ice Mirror ends «…повертається
// нападникові». Old names stay away from saves: migrateOldSaves refreshes a saved title, tourneyLoad a tournament's
{
    console.log('\n[22. renamed titles]');
    const RENAMED = {
        1: { uk: 'Сесійний трайхардер', en: 'Session Tryhard' },
        4: { uk: 'Професійний буквоїд', en: 'Professional Nitpicker' },
        87: { uk: 'Легендарний буквоїд', en: 'Legendary Nitpicker' },
        146: { uk: 'Знову «ще один матч»', en: '"Just One More Match" Again' },
        68: { uk: 'Директор жартів', en: 'Director of Jokes' },
        50: { uk: 'Володар шкарпеток', en: 'Sock Lord' },
        31: { uk: 'Володар капців', en: 'Slipper Lord' },
        84: { uk: 'Магістр FPS', en: 'FPS Master' },
        82: { uk: 'Підвищені налаштування', en: 'High Settings' },
        69: { uk: 'Володар хорор-ігор', en: 'Horror Game Lord' },
        16: { uk: 'Диванний лорд', en: 'Couch Lord' },
    };
    const wrong = Object.entries(RENAMED).map(([id, want]) => [id, want, G.TITLES_DB.find(x => x.id === +id)])
        .filter(([, want, t]) => !t || t.name.uk !== want.uk || t.name.en !== want.en).map(([id, want, t]) => `${id}: ${JSON.stringify(t && t.name)}`);
    check(!wrong.length, `22. the 11 renamed titles: ${Object.entries(RENAMED).map(([id, n]) => `${id} «${n.uk}»`).join(', ')}; English "FPS Master" (84), "High Settings" (82), "Couch Lord" (16)`, wrong.join('; '));
    const fps = G.TITLES_DB.filter(x => /FPS/.test(x.name.uk) || /FPS/.test(x.name.en)).map(x => x.id);
    check(fps.join() === '84', '22. id 84 «Магістр FPS» is the only title with FPS in its name', JSON.stringify(fps));
    const mirrorUk = G.describeUltimate('mirror', 'uk');
    check(G.CLASS_ULTIMATES.mirror.desc.uk.endsWith('повертається нападникові') && mirrorUk.endsWith('повертається нападникові') && !mirrorUk.includes('атаку' + 'юч'),
        `22. Ice Mirror's description, as written and as the game fills it in: «…${mirrorUk.slice(-60)}»`, `${G.CLASS_ULTIMATES.mirror.desc.uk} | ${mirrorUk}`);

    // Thorns in the Ukrainian log: «🌵 Шипи: -N HP нападникові!» (a duel against a thorns title, on its own seeded
    // Math.random so the rest of the run plays the same fights)
    {
        fresh();
        G.setLang('uk');
        const keep = Math.random; Math.random = mulberry32(183);
        const thorns = [];
        try {
            make('ta', 'red', { level: 5 }); make('tb', 'blue', { level: 5, title: G.TITLES_DB.find(x => x.id === 183) });
            for (let i = 0; i < 4 && !thorns.length; i++) {
                logs = [];
                G.say('ta', '!бій @tb'); G.say('tb', '!прийняти');
                __drain();
                thorns.push(...logs.filter(l => l.includes('🌵 Шипи')));
            }
        } finally { Math.random = keep; }
        check(thorns.length && thorns.every(l => /🌵 Шипи: -\d+ HP нападникові!/.test(l)) && !thorns.some(l => l.includes('атаку' + 'юч')),
            `22. Thorns in the Ukrainian log: «${(thorns[0] || '').match(/🌵[^!]*!/)}»`, JSON.stringify(thorns.slice(0, 2)));
    }

    // A save from before the rename (title 31 under its old name): the load-time migration gives it the new name
    fresh();
    const slipper = G.TITLES_DB.find(x => x.id === 31);
    const db = G.getDragonDB();
    db.oldsave = { name: 'oldsave', color: '#fff', drakeObj: DRAKE.red, title: { ...slipper, name: { uk: 'Володар тапків', en: 'Slipper Lord' } }, xp: 0, level: 1 };
    G.saveDragonDB(db);
    G.migrateOldSaves();
    const saved = G.getDragonDB().oldsave.title.name;
    check(saved.uk === 'Володар капців' && saved.en === 'Slipper Lord', '22. a save holding title 31 under its old name «Володар тапків» takes «Володар капців» on load', JSON.stringify(saved));
    // A tournament saved before the rename keeps each player's title as at sign-up: on load it takes the new name too
    if (G.tourneyLoad) {
        const socks = G.TITLES_DB.find(x => x.id === 50);
        localStorage.setItem(G.TOURNEY_KEY, JSON.stringify({ phase: 'signup', size: 4, players: [{ name: 'gone', color: '#fff', drakeObj: DRAKE.red, title: { ...socks, name: { uk: 'Володар носків', en: 'Sock Lord' } } }] }));
        G.tourneyLoad();
        const t = G.tourney && G.tourney.players[0].title.name;
        check(t && t.uk === 'Володар шкарпеток' && t.en === 'Sock Lord', '22. a saved tournament whose player has title 50 under its old name «Володар носків» shows «Володар шкарпеток» once loaded', JSON.stringify(t));
    }
    fresh();
}

// 23. The streamer's White Drake: its scales (tiers; hits take them first, armour-piercing too; debuffs bounce while they
// hold; the break; Перекування rebuilding them, a broken bar too, Poison not cutting that; Удар ковадла re-forging them),
// Магніт, Shadow Theft taking Перекування; the two forms (!дракон both ways keeping level, XP and title; the Dragon at
// level 20 gaining nothing; between fights only; the queue place; the refusals; the play-log event), records, the Top,
// tournaments, and the migration of old saves
{
    console.log('\n[23. the White Drake]');
    G.setLang('uk');
    fresh();
    const WD = G.WHITE_DRAKE_TYPE, steelTitle = G.TITLES_DB.find(x => x.id === G.WHITE_DRAKE_TITLE_ID), common = G.TITLES_DB.find(x => x.rarity === 'common');
    // The bar's share of max HP at each level tier: the table's, within half a point (the bar is whole HP), never shrinking
    const tiers = [1, 5, 10, 15, 20].map(l => { const max = G.getMaxHP(l, WD, steelTitle); return 100 * G.scalesOf(l, max) / max; });
    check(tiers.every((x, i) => Math.abs(x - G.WHITE_DRAKE.scales[i]) <= 0.5 && (!i || x >= tiers[i - 1])),
        `23. the scales («Луска Дракона»): ${tiers.map(x => x.toFixed(1)).join(' / ')}% of max HP over the five level tiers, as WHITE_DRAKE.scales says (${G.WHITE_DRAKE.scales.join(' / ')})`, tiers.join());
    make('wdfighter', WD, { level: 10, title: steelTitle }); make('foe', 'red', { level: 10 });
    G.runBattle('wdfighter', '#fff', 'foe', '#fff', false);
    const st0 = G.battleFx.wdfighter.scales, max10 = G.getMaxHP(10, WD, steelTitle);
    check(st0 && st0.now === G.scalesOf(10, max10) && st0.max === st0.now && !G.battleFx.foe.scales,
        `23. a fight starts with the bar full on top of HP (level 10: ${st0 && st0.now} on ${max10} HP); the viewer has none`, JSON.stringify(st0));
    __drain();

    // Bouncing, straight through applyEffect: every debuff of the shared pool while the bar holds, then none once broken
    const wdF = { name: 'wd', color: '#fff', drakeObj: DRAKE[WD], title: steelTitle, xp: 0 }, vF = { name: 'v', color: '#fff', drakeObj: DRAKE.purple, title: common, xp: 0 };
    const fxB = { wd: { ...G.newFxState(), scales: { now: 10, max: 40 } }, v: G.newFxState() };
    logs = [];
    const debuffs = G.POOL_IDS.filter(id => G.EFFECTS[id].kind === 'debuff');
    const results = debuffs.map(id => G.applyEffect(vF, wdF, id, 10, fxB));
    check(results.every(r => r === 'bounced') && !fxB.wd.debuff.length && logs.filter(l => l.includes('🤍 відскочило від луски')).length === debuffs.length,
        `23. while the bar holds every viewer debuff bounces (${debuffs.map(id => G.EFFECTS[id].name.uk).join(', ')}): «${(logs[0] || '').slice(0, 60)}»`, JSON.stringify({ results, logs }));
    fxB.wd.scales.now = 0;
    const landed = G.applyEffect(vF, wdF, 'burn', 10, fxB);
    check(landed === 'applied' && fxB.wd.debuff.some(x => x.id === 'burn'), '23. once the bar is broken, a debuff lands (Підпал)', JSON.stringify({ landed, debuff: fxB.wd.debuff }));

    // Магніт: the target's new buffs go to the White Drake, under the 2-buff limit; buffs it already has stay put
    const fxM = { wd: { ...G.newFxState(), scales: { now: 30, max: 30 } }, v: G.newFxState() };
    fxM.v.buff.push({ id: 'shield', left: 2, power: 1 });
    fxM.v.debuff.push({ id: 'magnet', left: G.EFFECTS.magnet.count, power: 1 });
    logs = [];
    const r1 = G.applyEffect(vF, wdF, 'rage', 10, fxM);
    const pulledOk = r1 === 'pulled' && fxM.wd.buff.map(x => x.id).join() === 'rage' && fxM.v.buff.map(x => x.id).join() === 'shield' && logs.some(l => l.includes('Лють притягується до Білого Дрейка'));
    fxM.wd.buff = [{ id: 'reforge', left: 1, power: 1 }, { id: 'regen', left: 3, power: 1 }];
    const r2 = G.applyEffect(vF, wdF, 'blessing', 10, fxM);
    const goneLine = logs.find(l => l.includes('Благословіння притягується до Білого Дрейка')) || '';
    check(pulledOk && r2 === 'pulled' && fxM.wd.buff.map(x => x.id).sort().join() === 'blessing,regen' && fxM.v.buff.map(x => x.id).join() === 'shield'
        && strip(goneLine).endsWith(': @wd (⚒️ Перекування зникає)'),
        `23. Магніт: the target's new buff lands on the White Drake («Лють притягується до Білого Дрейка»), its own Щит stays; with 2 buffs already the pulled one replaces the one closest to ending: «${strip(goneLine)}»`,
        JSON.stringify({ r1, r2, wd: fxM.wd.buff, v: fxM.v.buff, logs }));

    // Real fights, the White Drake against every element at every level tier: what the game logs, checked against its state
    const KEEP = Math.random;
    Math.random = mulberry32(2323);
    const obs = { hits: 0, pierced: 0, fortune: 0, wrongHit: [], cracks: 0, wrongCrack: [], rebuilds: 0, poisoned: 0, fromZero: 0, bounceAfterZero: 0, wrongRebuild: [],
                  anvils: 0, wrongAnvil: [], theft: 0, blackRebuilt: 0, pulled: 0, wdKo: 0 };
    let snap = null, ctx = null;
    // Each fighter's HP as the cards show it (which side each one is on, then the HP of both sides)
    const sideOf = {}, hpNow = {};
    G.wrapFighterCard((side, d) => { if (d) sideOf[d.name] = side; });
    G.wrapUIHP((h1, m1, h2, m2) => { hpNow.p1 = Math.round(Math.max(0, h1)); hpNow.p2 = Math.round(Math.max(0, h2)); });
    const hpOf = n => hpNow[sideOf[n]];
    const state = () => { const fx = G.battleFx, d = ctx && fx[ctx.wd]; return d ? { hp: hpOf(ctx.wd), sc: d.scales.now, max: d.scales.max, poisoned: d.debuff.some(x => x.id === 'poison'), blackReforge: fx[ctx.v] && fx[ctx.v].buff.some(x => x.id === 'reforge') } : null; };
    G.wrapAddLog(raw => {
        if (!ctx) return;
        const line = strip(raw), now = state();
        if (!now) return;
        if (line.includes('💔 Луска розкололася!')) { obs.cracks++; if (now.sc !== 0) obs.wrongCrack.push(line.slice(0, 80)); }
        if (line.includes('притягується до Білого Дрейка')) obs.pulled++;
        if (line.includes('🤍 відскочило від луски') && ctx.zero && now.sc > 0) obs.bounceAfterZero++;
        const m = line.match(/^\[Хід \d+\] @(\S+) ➜ @(\S+) /);
        // Turn lines without an attack (frozen) and the start-of-turn ticks move the snapshot on too
        if (!m) { if (/^\[Хід \d+\]/.test(line) || /втрачає HP через|відновлює HP завдяки/.test(line)) snap = now; return; }
        const before = snap || now;
        if (m[2] === ctx.wd) {
            const dmg = +(line.match(/(\d+) шкоди/) || [0, 0])[1];
            const fortune = line.includes('Фортуна (1 HP)');
            const toScales = fortune ? 0 : Math.min(before.sc, dmg);
            const hpLost = Math.min(before.hp, dmg - toScales);
            obs.hits++; if (line.includes('⚡ Пробиття броні') && before.sc > 0) obs.pierced++; if (fortune) obs.fortune++;
            if (now.sc !== before.sc - toScales || before.hp - now.hp !== hpLost) obs.wrongHit.push(`${line.slice(0, 90)} | scales ${before.sc}→${now.sc}, HP ${before.hp}→${now.hp}`);
            if (now.hp <= 0) obs.wdKo++;
            if (line.includes('забирає') && line.includes('Перекування')) obs.theft++;
            if (line.includes('Перекування: +')) obs.blackRebuilt++;
        } else if (m[1] === ctx.wd) {
            const rb = line.match(/⚒️ Перекування: \+(\d+) луски/);
            if (rb) {
                obs.rebuilds++;
                const want = Math.min(before.max - before.sc, Math.round(ctx.maxHP * G.EFFECTS.reforge.nums[ctx.level >= 20 ? 'barTop' : 'bar'] / 100));
                if (+rb[1] !== want || (now.sc !== before.sc + want && !line.includes('Удар ковадла'))) obs.wrongRebuild.push(`+${rb[1]} (want ${want}), scales ${before.sc}→${now.sc}`);
                if (before.poisoned) obs.poisoned++;
                if (before.sc === 0) { obs.fromZero++; ctx.zero = true; }
            }
            if (line.includes('Удар ковадла')) {
                obs.anvils++;
                const mult = '×' + G.CLASS_ULTIMATES.anvil.nums[ctx.level >= 20 ? 'topMult' : 'dmgMult'];
                if (now.sc !== now.max || !line.includes(mult)) obs.wrongAnvil.push(`${line.slice(0, 100)} | scales ${now.sc}/${now.max}`);
            }
        }
        snap = now;
    });
    for (let i = 0; i < 480; i++) {
        fresh();
        const level = [1, 5, 10, 20][i % 4], vt = G.VIEWER_DRAKE_TYPES[Math.floor(i / 4) % 6].type;
        make('wdx', WD, { level, title: steelTitle }); make('vx', vt, { level, title: G.TITLES_DB[(i * 37) % 150] });
        ctx = { wd: 'wdx', v: 'vx', level, maxHP: G.getMaxHP(level, WD, steelTitle), zero: false };
        snap = null;
        G.runBattle('wdx', '#fff', 'vx', '#fff', false);
        snap = state();
        __drain();
        ctx = null;
    }
    Math.random = KEEP;
    check(!obs.wrongHit.length && obs.hits > 1000 && obs.pierced > 50,
        `23. every hit on the White Drake (${obs.hits}) takes the bar first, only the rest comes off HP; armour-piercing too (${obs.pierced}: through the defence, not the bar); Gold's Fortune slips past it (${obs.fortune})`,
        obs.wrongHit.slice(0, 3).join(' || '));
    check(!obs.wrongCrack.length && obs.cracks > 50, `23. «💔 Луска розкололася!» exactly when the bar breaks (${obs.cracks} times)`, obs.wrongCrack.slice(0, 3).join(' | '));
    check(!obs.wrongRebuild.length && obs.rebuilds > 100 && obs.fromZero > 5 && obs.bounceAfterZero > 0 && obs.poisoned > 0,
        `23. Перекування: each damaging own attack rebuilds ${G.EFFECTS.reforge.nums.bar}% of max HP (${G.EFFECTS.reforge.nums.barTop}% at level 20) up to the starting size (${obs.rebuilds} rebuilds), a broken bar too (${obs.fromZero}), after which debuffs bounce again (${obs.bounceAfterZero}); Отруєння doesn't cut it (${obs.poisoned} while poisoned)`,
        JSON.stringify({ wrong: obs.wrongRebuild.slice(0, 3), rebuilds: obs.rebuilds, fromZero: obs.fromZero, bounceAfterZero: obs.bounceAfterZero, poisoned: obs.poisoned }));
    check(!obs.wrongAnvil.length && obs.anvils > 50, `23. Удар ковадла: ×${G.CLASS_ULTIMATES.anvil.nums.dmgMult} (×${G.CLASS_ULTIMATES.anvil.nums.topMult} at level 20), and the bar is whole again after it (${obs.anvils} strikes)`, obs.wrongAnvil.slice(0, 3).join(' | '));
    check(obs.theft > 0 && obs.blackRebuilt === 0, `23. Чорний's Крадіжка тіні can take Перекування (${obs.theft} times), and in its hands it rebuilds nothing`, JSON.stringify({ theft: obs.theft, blackRebuilt: obs.blackRebuilt }));
    check(obs.pulled > 20, `23. Магніт pulls buffs in real fights (${obs.pulled})`, String(obs.pulled));

    // The two forms, through chat
    fresh();
    const prevStreamer = G.streamer;
    G.setStreamerUser('streamchannel');
    const me = () => G.getDragonDB().streamchannel;
    G.say('streamchannel', '!дрейк білий');
    const born = me();
    check(born && born.drakeObj.type === WD && born.title.id === G.WHITE_DRAKE_TITLE_ID && G.calculateLevelAndProgress(born.xp).level === 1,
        '23. «!дрейк білий» gives the streamer the White Drake (level 1, title «Біла сталь»)', JSON.stringify(born));
    { const db = G.getDragonDB(); db.streamchannel.xp = xpFor(7) + 13; G.saveDragonDB(db); }
    G.queue = ['q1', 'streamchannel', 'q2'];
    G.say('streamchannel', '!дракон');
    const asDragon = me(), toMsg = lastInfo();
    const dragonGain = G.addXP('streamchannel', 40);
    G.say('streamchannel', '!дракон');
    const back = me(), backMsg = lastInfo();
    check(/Білий Дрейк чекає на рівні 7\.$/.test(toMsg) && /знову Білий Дрейк: рівень 7, нічого не втрачено\.$/.test(backMsg),
        `23. both switches name the White Drake's level: «${toMsg.slice(toMsg.indexOf('стає'))}», «${backMsg.slice(backMsg.indexOf('знову'))}»`, JSON.stringify({ toMsg, backMsg }));
    check(asDragon.drakeObj.type === G.DRAGON_TYPE && asDragon.title.id === G.DRAGON_TITLE_ID && G.calculateLevelAndProgress(asDragon.xp).level === 20 && dragonGain === 0
        && back.drakeObj.type === WD && back.xp === xpFor(7) + 13 && back.title.id === G.WHITE_DRAKE_TITLE_ID && G.queue.join() === 'q1,streamchannel,q2',
        "23. !дракон and back: the Dragon at level 20 gains nothing (+0 XP for a win's 40), the White Drake returns with its exact XP (level 7) and title; the queue place stays (#2)",
        JSON.stringify({ asDragon: [asDragon.drakeObj.type, asDragon.xp], dragonGain, back: [back.drakeObj.type, back.xp, back.title.id], queue: G.queue }));
    const forms = plays.filter(p => p.type === 'form');
    check(hasPlayLog && forms.length === 2 && forms[0].from === WD && forms[0].to === G.DRAGON_TYPE && forms[0].level === 7 && forms[1].from === G.DRAGON_TYPE && forms[1].to === WD && forms[1].level === 7,
        "23. the play log: one 'form' event per switch, with the form before and after and the level kept (7)", JSON.stringify(forms));
    // Refusals: viewers can't take either form; the streamer can't take a viewer's colour
    G.queue = [];
    make('fanx', 'red', { level: 3 });
    infos = [];
    G.say('fanx', '!дракон'); G.say('newbie', '!дрейк білий'); G.sayAs('fanx', '!рерол білий', { 'custom-reward-id': 'reward-1' });
    const refusals = infos.filter(l => l.includes('секретна зброя стрімера')).length;
    G.say('streamchannel', '!рерол червоний');
    check(refusals === 3 && !G.getDragonDB().newbie && G.getDragonDB().fanx.drakeObj.type === 'red' && me().drakeObj.type === WD && /Білим Дрейком.*Білим Драконом/.test(lastInfo()),
        "23. a viewer's !дракон, «!дрейк білий» and «!рерол білий» get the White Dragon's refusal; the streamer's «!рерол червоний» says their forms are the White Drake and the Dragon",
        JSON.stringify({ refusals, infos: infos.slice(-4) }));
    // Between fights only: on the arena (the betting window or the fight) !дракон says so; on the result screen it works
    make('rival', 'blue', { level: 7 });
    G.runBattle('streamchannel', '#fff', 'rival', '#fff', true);
    G.say('streamchannel', '!дракон');
    const midFight = me().drakeObj.type, midReply = lastInfo();
    __drain();
    check(midFight === WD && /на арені/.test(midReply), '23. mid-fight !дракон is refused («…ви зараз на арені: форму можна змінити між боями»)', JSON.stringify({ midFight, midReply }));

    // Records: a ranked fight against the White Drake counts like any fair fight; the streamer stays off the Top in both forms
    fresh();
    G.setStreamerUser('streamchannel');
    G.say('streamchannel', '!дрейк білий');
    make('pal', 'green', { level: 1 });
    { const db = G.getDragonDB(); G.running = true; G.finishBattle({ ...db.pal }, { ...db.streamchannel }, 30, 0, true); }
    const rec = n => G.stats[n] ? `${G.stats[n].wins}-${G.stats[n].losses}` : '0-0';
    const counted = [rec('pal'), rec('streamchannel')];
    G.stats.streamchannel = { wins: 50, losses: 0 };
    G.renderLeaderboard(); const topAsDrake = G.topRows;
    G.say('streamchannel', '!дракон'); G.renderLeaderboard(); const topAsDragon = G.topRows;
    check(counted.join() === '1-0,0-1' && !topAsDrake.includes('streamchannel') && !topAsDragon.includes('streamchannel') && topAsDrake.includes('pal'),
        '23. a ranked fight against the White Drake counts (@pal 1–0, the streamer 0–1); the streamer stays off the Top as the White Drake and as the Dragon',
        JSON.stringify({ counted, topAsDrake, topAsDragon }));
    __drain();

    // Tournaments: the White Drake can sign up, the Dragon can't; !дракон waits while the streamer is signed up or playing
    fresh();
    G.setStreamerUser('streamchannel');
    G.say('streamchannel', '!дрейк білий');
    G.sayAs('streamchannel', '!турнір 4', { badges: { broadcaster: '1' } });
    G.say('streamchannel', '!учасник');
    const joinedAsDrake = !!(G.tourney && G.tourney.players.some(p => p.name === 'streamchannel'));
    G.say('streamchannel', '!дракон');
    const duringSignup = me().drakeObj.type, signupReply = lastInfo();
    G.say('streamchannel', '!вийти');
    G.say('streamchannel', '!дракон');
    const afterLeaving = me().drakeObj.type;
    G.say('streamchannel', '!учасник');
    const dragonJoined = G.tourney.players.some(p => p.name === 'streamchannel');
    check(joinedAsDrake && duringSignup === WD && /в турнірі/.test(signupReply) && afterLeaving === G.DRAGON_TYPE && !dragonJoined,
        '23. the White Drake signs up for a tournament; !дракон is refused while signed up («…ви в турнірі…»), works after !вийти; the Dragon can\'t sign up',
        JSON.stringify({ joinedAsDrake, duringSignup, signupReply, afterLeaving, dragonJoined }));
    G.say('streamchannel', '!дракон');   // back to the White Drake
    G.tourneyReset();
    const match = (a, b, winner = null) => ({ a, b, w: [0, 0], winner });
    const bracket = (phase, rounds, third) => ({ phase, size: 4, bracket: 4, qual: [], rounds, third: third || match(null, null),
        players: ['streamchannel', 'ta', 'tb', 'tc'].map(n => ({ name: n, color: '#fff', drakeObj: n === 'streamchannel' ? DRAKE[WD] : DRAKE.red, title: n === 'streamchannel' ? steelTitle : common })) });
    const moment = t => { localStorage.setItem(G.TOURNEY_KEY, JSON.stringify(t)); G.tourneyLoad(); G.say('streamchannel', '!дракон'); return me().drakeObj.type; };
    const during = {
        ready: moment(bracket('ready', [[match('streamchannel', 'ta'), match('tb', 'tc')], [match(null, null)]])),
        playing: moment(bracket('running', [[match('streamchannel', 'ta'), match('tb', 'tc')], [match(null, null)]])),
        // knocked out in the semifinal and beaten in the 3rd-place game, the final still to come
        out: moment(bracket('running', [[match('streamchannel', 'ta', 'ta'), match('tb', 'tc', 'tb')], [match('ta', 'tb')]], match('streamchannel', 'tc', 'tc'))),
        podium: moment(bracket('podium', [[match('streamchannel', 'ta', 'ta'), match('tb', 'tc', 'tb')], [match('ta', 'tb', 'ta')]], match('streamchannel', 'tc', 'streamchannel'))),
    };
    G.tourneyReset();
    G.say('streamchannel', '!дракон');
    const afterEnd = me().drakeObj.type;
    check(Object.values(during).every(t => t === WD) && afterEnd === G.DRAGON_TYPE,
        "23. !дракон is refused until the tournament ends: sign-up closed, being played, knocked out with the final still to come, on the podium; once it's over it works",
        JSON.stringify({ during, afterEnd }));
    G.say('streamchannel', '!дракон');   // back to the White Drake
    G.tourneyReset();

    // Migration of old saves (idempotent)
    fresh();
    G.setStreamerUser('streamchannel');
    const oldDragonName = { uk: 'Білий Дракон 🐉', en: 'White Dragon 🐉' };
    const save = (name, type, xp, titleId, extra = {}) => ({ name, color: '#fff', drakeObj: { name: DRAKE[type] ? DRAKE[type].name : oldDragonName, type }, title: G.TITLES_DB.find(x => x.id === titleId), xp, level: 1, ...extra });
    const run = db => { G.saveDragonDB(db); G.migrateOldSaves(); const a = JSON.stringify(G.getDragonDB()); G.migrateOldSaves(); return { db: G.getDragonDB(), twice: a === JSON.stringify(G.getDragonDB()) }; };
    let m = run({ streamchannel: save('streamchannel', G.DRAGON_TYPE, 1000000, 999) });
    const d1 = m.db.streamchannel;
    G.say('streamchannel', '!дракон');
    const d1back = me();
    check(m.twice && d1.drakeObj.type === G.DRAGON_TYPE && G.calculateLevelAndProgress(d1.xp).level === 20 && d1.regular && d1.regular.drakeObj.type === WD && d1.regular.xp === 0
        && d1back.drakeObj.type === WD && G.calculateLevelAndProgress(d1back.xp).level === 1 && d1back.title.id === G.WHITE_DRAKE_TITLE_ID,
        "23. migration: the streamer's old Dragon save (1,000,000 XP) stays the Dragon at level 20; its White Drake starts at level 1, never 20",
        JSON.stringify({ d1, d1back }));
    m = run({ streamchannel: save('streamchannel', 'red', xpFor(9) + 5, 61) });
    const d2 = m.db.streamchannel;
    check(m.twice && d2.drakeObj.type === WD && d2.xp === xpFor(9) + 5 && d2.title.id === G.WHITE_DRAKE_TITLE_ID,
        "23. migration: the streamer's regular drake (a Red Drake, level 9) becomes the White Drake with the same XP and its title", JSON.stringify(d2));
    m = run({ oldviewer: save('oldviewer', 'white', xpFor(6), 61), formerstreamer: save('formerstreamer', WD, xpFor(4), G.WHITE_DRAKE_TITLE_ID),
              exdragon: save('exdragon', G.DRAGON_TYPE, 1000000, 999, { regular: { drakeObj: DRAKE[WD], title: steelTitle, xp: xpFor(3) } }) });
    const v = m.db;
    check(m.twice && v.oldviewer.drakeObj.type === 'green' && v.oldviewer.xp === xpFor(6) && v.oldviewer.title.id === 61
        && G.VIEWER_DRAKE_TYPES.some(d => d.type === v.formerstreamer.drakeObj.type) && v.formerstreamer.xp === xpFor(4) && ![998, 999].includes(v.formerstreamer.title.id)
        && G.VIEWER_DRAKE_TYPES.some(d => d.type === v.exdragon.drakeObj.type) && v.exdragon.xp === xpFor(3) && !v.exdragon.regular,
        "23. migration: an old viewer save from when the Green Drake was the White Drake loads as Green (same XP, same title); someone no longer the streamer gets a viewer element with the same XP (their White Drake, or the regular drake behind their Dragon) and never the streamer's titles; every step idempotent",
        JSON.stringify({ oldviewer: [v.oldviewer.drakeObj.type, v.oldviewer.xp], formerstreamer: [v.formerstreamer.drakeObj.type, v.formerstreamer.title.id], exdragon: [v.exdragon.drakeObj.type, v.exdragon.xp] }));

    // !титул: the White Drake's title is fixed (a free spin isn't spent on it)
    fresh();
    G.setStreamerUser('streamchannel');
    G.say('streamchannel', '!дрейк білий');
    G.honoursReset();
    { const h = G.honours; h.spins.streamchannel = 1; localStorage.setItem(G.HONOURS_KEY, JSON.stringify(h)); }
    G.say('streamchannel', '!титул');
    check(me().title.id === G.WHITE_DRAKE_TITLE_ID && G.honours.spins.streamchannel === 1 && /власний титул/.test(lastInfo()),
        "23. !титул doesn't change the White Drake's «Біла сталь» (and a free spin stays unspent)", JSON.stringify({ title: me().title.id, spins: G.honours.spins, reply: lastInfo() }));
    G.honoursReset();
    G.setStreamerUser(prevStreamer);
    fresh();
}

console.log(failures ? `\n${failures} rule check(s) failed.` : '\nAll rule checks passed.');
process.exit(failures ? 1 : 0);
