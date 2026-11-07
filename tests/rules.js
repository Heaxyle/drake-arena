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
//   24 the 100 new titles: ids, rarities, bonuses and card lines; the odds and !шанси; each of the 24 abilities with fixed
//      dice, from what it is meant to do (its numbers, once-a-fight limits, thresholds and caps); that each one tells the
//      fight view when it fires; and what they meet: the White Dragon, the White Drake's scales, debuff immunity, Магніт,
//      sudden death and the time-out
//   25 Season 2's Помаранчевий: the colour words; only an attack that lands adds heat; the
//      tick (its numbers, its order, a knockout), its block roll, and everything that doesn't touch it; the White Dragon, the White Drake's scales;
//      Оплавлення and Запал with the title abilities, debuff immunity and the scales; the card's heat and the record's words
//   26 Season 2's Вишневий: Кривавий шал (its numbers, the level-20 tier, stacking with Загартування, the card's +N%); Кров за кров
//      (Отруєння, max HP, the caps, Двійник, a knocked-out drake); Кровотеча (what ticks and what doesn't, never after a knockout,
//      knocking its own drake out, the scales, immunity); both with the title abilities
//   28 Season 2's Рожевий: Ілюзія (each element's fight part at its own level's tier, nothing from another Рожевий or the streamer's
//      forms, no titles, no XP bonus, the banner and the card's emblem); Чарівний пилок; Закоханість (what applies, what doesn't,
//      what it still counts as, a self-knockout); the other three drakes' ten-drake list and help text
//   27 Season 2's Бірюзовий: Перламутр (what adds a layer, the cut on every kind of hit, the tier, the 90% cap, what it never
//      cuts, the White Dragon, the card and the record's words); Чиста вода (with the opening buff, Магніт, the heat); Водорості
//      (Удар ковадла, immunity, the scales); Приплив with Підзарядка and Перевантаження; the title abilities
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
    // The new titles (section 24)
    RARITIES, describeTitleBonus, getRandomTitle: () => getRandomTitle(),
    // What the fight tells the view: f(key, value) for every note, ultimate detail and cast's result (Node has no fight view)
    wrapFv: f => { const n = fvNote, u = fvUltInfo, c = fvCast; fvNote = (k, v = true) => { f(k, v); return n(k, v); }; fvUltInfo = i => { Object.keys(i).forEach(k => f(k, i[k])); return u(i); }; fvCast = (o, id, r, x) => { f('cast:' + r, id); return c(o, id, r, x); }; const t = fvTick; fvTick = (id, v, x) => { f('tick:' + id, v); if (x && x.block) f('tickBlock', x); return t(id, v, x); }; },
    // Every cast as it's made, recasts too (null to stop): the arguments
    wrapApplyEffect: f => { if (!globalThis.__castSpy) { const orig = applyEffect; applyEffect = (...a) => { if (globalThis.__castSpy.f) globalThis.__castSpy.f(a); return orig(...a); }; globalThis.__castSpy = {}; } globalThis.__castSpy.f = f; },
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
// Replies as the overlay shows them: the text, each pixel icon as [id] (a reply's leading emoji went; a drake, a title or a
// medal it names shows its icon)
const viewInfo = s => s.replace(/<img[^>]*\bdata-icon="(\w+)"[^>]*>/g, '[$1]').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
G.wrapAddInfo(h => infos.push(viewInfo(h)));
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
    check(reroll.endsWith(t('Level reset to 1!', 'Рівень скинуто до 1!')) && boss.drakeObj.type === G.DRAGON_TYPE && G.calculateLevelAndProgress(boss.xp).level === 20 && toDragon.includes(t('becomes the [emDragon] White Dragon', 'стає [emDragon] Білим Драконом')),
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
    const wantWait = t('@d1 is waiting for a duel. Challenge them after the next fight.', '@d1 чекає на дуель. Киньте виклик після наступного бою.');   // its ⏳ went: the warning card says it
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
    const want12 = t('@hinty, to challenge someone type !battle @name.', '@hinty, щоб кинути виклик, напишіть !бій @нік.');   // its ℹ️ went: the warning card says it
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

    // 16. Ranked win XP from the level gap: +5 per level below the loser (at most +40) on top of 40, or 5 less per level
    // above it (never below 10); Gold on the whole amount, after the gap
    {
        const fight = (win, lose, ranked = true, hp = [40, 0]) => {
            const db = G.getDragonDB(), w0 = db[win].xp, l0 = db[lose].xp;
            G.running = true;
            G.finishBattle({ ...db[win] }, { ...db[lose] }, hp[0], hp[1], ranked);
            const after = G.getDragonDB();
            return [after[win].xp - w0, after[lose].xp - l0];
        };
        const levelCases = list => list.map(([wl, ll, want]) => {
            fresh(); make('uw', 'red', { level: wl }); make('ul', 'blue', { level: ll });
            const [gw, gl] = fight('uw', 'ul');
            return { wl, ll, want, got: gw, loser: gl };
        });
        const cases = levelCases([[9, 10, 45], [6, 10, 60], [5, 15, 80], [1, 20, 80], [12, 10, 30], [10, 10, 40]]);
        check(cases.every(c => c.got === c.want && c.loser === (c.ll >= 20 ? 0 : 10)),
            '16. underdog XP: L9 beats L10 → +45, L6 beats L10 → +60, L5 beats L15 → +80 (capped at +40 bonus), L1 beats L20 → +80; an equal level winner → +40, a higher one less (L12 beats L10 → +30); the loser +10 as before (0 at level 20)',
            JSON.stringify(cases));
        // Beating a lower level: 5 less per level, never below 10 (a loss's XP); the loser's +10 as always
        const cuts = levelCases([[10, 9, 35], [10, 6, 20], [10, 4, 10], [18, 1, 10], [7, 7, 40]]);
        check(cuts.every(c => c.got === c.want && c.loser === 10),
            '16. the cut for a weaker opponent: L10 beats L9 → +35, L10 beats L6 → +20, L10 beats L4 → +10, L18 beats L1 → +10 (the floor, not -45); equal levels (L7) → +40; the loser +10 every time',
            JSON.stringify(cuts));
        fresh(); make('uw', 'red', { level: 6 }); make('ul', 'blue', { level: 10 });
        fight('uw', 'ul');
        const said = logs.find(l => /stronger opponent|сильнішого суперника/.test(l)) || '';
        check(said.includes(t('+60 XP, +20 for a stronger opponent', '+60 XP, +20 за сильнішого суперника')), '16. the fight record names the bonus: "' + said.slice(0, 90) + '"', said);
        // The record names the cut the same way: the number before Gold and after the floor (L18 beating L1: -30, not -85)
        const cutSaid = [[10, 6], [18, 1]].map(([wl, ll]) => {
            fresh(); make('uw', 'red', { level: wl }); make('ul', 'blue', { level: ll });
            fight('uw', 'ul');
            return logs.find(l => /weaker opponent|слабшого суперника/.test(l)) || '';
        });
        check(cutSaid[0].includes(t('+20 XP, -20 for a weaker opponent', '+20 XP, -20 за слабшого суперника')) && cutSaid[1].includes(t('+10 XP, -30 for a weaker opponent', '+10 XP, -30 за слабшого суперника'))
            && !cutSaid.some(s => /stronger opponent|сильнішого суперника/.test(s)),
            '16. the fight record names the cut: "' + cutSaid.map(s => s.slice(0, 90)).join('" / "') + '"', JSON.stringify(cutSaid));
        // Gold applies to the whole amount (40 + bonus), at the winner's own tier
        fresh(); make('gw', 'gold', { level: 6 }); make('ul', 'blue', { level: 10 });
        const tier = G.getTierMultiplier(6), pct = G.ELEMENT_BASE.goldXp + tier.goldXpBonus;
        const [gold] = fight('gw', 'ul');
        check(gold === Math.round(60 * (1 + pct / 100)), `16. a Gold underdog (L6 beats L10) gets Gold's +${pct}% on all 60: +${gold} XP`, `got ${gold}, want ${Math.round(60 * (1 + pct / 100))}`);
        // ... and on the reduced amount after a cut (Gold after the gap, not 40 with Gold and then the cut); the record shows the
        // cut before Gold
        fresh(); make('gw', 'gold', { level: 10 }); make('ul', 'blue', { level: 6 });
        const pct10 = G.ELEMENT_BASE.goldXp + G.getTierMultiplier(10).goldXpBonus;
        const [goldCut, goldLoser] = fight('gw', 'ul');
        const goldSaid = logs.find(l => /weaker opponent|слабшого суперника/.test(l)) || '';
        const wantGold = Math.round(20 * (1 + pct10 / 100));
        check(goldCut === wantGold && goldLoser === 10 && goldSaid.includes(t(`+${wantGold} XP, -20 for a weaker opponent`, `+${wantGold} XP, -20 за слабшого суперника`)),
            `16. a Gold winner over a lower level (L10 beats L6) gets Gold's +${pct10}% on the reduced 20: +${goldCut} XP (not ${Math.round(40 * (1 + pct10 / 100)) - 20}); the record says "-20"; the loser +10`,
            JSON.stringify({ goldCut, wantGold, goldLoser, goldSaid: goldSaid.slice(0, 120) }));
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
        check(lost.join() === '15,10' && lostRec.join() === '0-0,0-0' && wonRec.join() === '0-0,0-0' && won[0] === 65 && rec('pal') === '1-0' && rec('fan') === '0-1' && usual.join() === '40,10',
            t('17b. a ranked fight against the White Dragon: no win or loss for either side (the dragon, level 10 here, beats L5: +15 / +10 XP, as any ranked win; if the viewer ever won on HP: +65 as usual, still no record); a fight between viewers counts (@pal 1–0, @fan 0–1)',
              '17b. рейтинговий бій з Білим Драконом: без перемоги й поразки для обох (дракон, тут 10-го рівня, перемагає 5-й: +15 / +10 XP, як за будь-яку рейтингову перемогу; якби глядач переміг за HP: +65, як завжди, і теж без запису); бій між глядачами рахується (@pal 1–0, @fan 0–1)'),
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
        const medalAfter = (n, id) => new RegExp(`@${n}<span class="lb-medal"><img[^>]*data-icon="${id}"`).test(G.topHtml);
        check(medalAfter('ra', 'medalGold') && medalAfter(p1[1], 'medalSilver') && !G.topHtml.includes('@re<span')
            && stats.includes('@ra [medalGold]') && stats.includes('[medalGold]×1 [medalSilver]×0 [medalBronze]×0') && /\[ticket\] (Free title spins: 3|Безкоштовні прокрути титулу: 3)/.test(stats),
            '19. the badges in the Top (the gold medal after @ra, the silver after the runner-up, none for @re) and in !stats, with the medal count and the spins left (the ticket)', `${stats}`);
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
            && medalAfter('re', 'medalGold') && !medalAfter('ra', 'medalGold'),
            `19. the next tournament (🏆 @${p2[0]}, 🥈 @${p2[1]}, 🥉 @${p2[2]}) takes the badges; @ra's medals add up (${raMedals.join('/')}), and so do the spins (2 left + ${raSpins - 2} = ${raSpins})`,
            JSON.stringify(h));
        G.say('viewer', t('!hall', '!зала')); const hall = lastInfo();
        check(/\[hall\] (Hall of Fame|Зала слави)/.test(hall) && hall.includes('[medalGold] @' + p2[0]) && hall.includes('[medalGold] @' + p1[0]) && hall.indexOf('@' + p2[0]) < hall.indexOf('[medalGold] @' + p1[0]) && /Most wins|Найбільше перемог/.test(hall),
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
                  anvils: 0, wrongAnvil: [], theft: 0, blackRebuilt: 0, pulled: 0, wdKo: 0,
                  keptUnderMagnet: [], pulledOn: new Array(G.EFFECTS.magnet.count + 1).fill(0), magnetMax: 0 };
    const magnetName = `${G.EFFECTS.magnet.icon} ${G.EFFECTS.magnet.name.uk}`;
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
        // Магніт: the viewer's attacks it covers (their lines name it: «[🔗 Магніт]»), counted from the line where it lands
        // (or is refreshed); a buff the viewer casts during one of them goes to the White Drake
        const v = `@${ctx.v}`;
        if (line.startsWith(`${v} отримує дебаф ${magnetName}`) || line.startsWith(`${v}: дебаф ${magnetName} оновлено`)) ctx.magnetN = 0;
        if (/^\[Хід \d+\]/.test(line)) {
            const a = line.match(/^\[Хід \d+\] @(\S+) ➜ /);
            ctx.magnetAttack = a && a[1] === ctx.v && line.includes(`[${magnetName}]`) ? ++ctx.magnetN : 0;
            obs.magnetMax = Math.max(obs.magnetMax, ctx.magnetAttack);
        } else if (ctx.magnetAttack && (line.startsWith(`${v} отримує баф `) || line.startsWith(`${v}: баф `))) obs.keptUnderMagnet.push(line.slice(0, 100));
        else if (ctx.magnetAttack && line.includes('притягується до Білого Дрейка')) obs.pulledOn[ctx.magnetAttack] = (obs.pulledOn[ctx.magnetAttack] || 0) + 1;
        if (line.includes('🤍 відскочило від луски') && ctx.zero && now.sc > 0) obs.bounceAfterZero++;
        const m = line.match(/^\[Хід \d+\] @(\S+) ➜ @(\S+) /);
        // Turn lines without an attack (frozen) and the start-of-turn ticks move the snapshot on too
        if (!m) { if (/^\[Хід \d+\]/.test(line) || /втрачає HP через|відновлює HP завдяки/.test(line)) snap = now; return; }
        const before = snap || now;
        if (m[2] === ctx.wd) {
            const dmg = +(line.match(/Шкода: (\d+)/) || [0, 0])[1];
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
        ctx = { wd: 'wdx', v: 'vx', level, maxHP: G.getMaxHP(level, WD, steelTitle), zero: false, magnetN: 0, magnetAttack: 0 };
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
    const mc = G.EFFECTS.magnet.count, pulledOn = obs.pulledOn.slice(1, mc + 1);
    check(!obs.keptUnderMagnet.length && pulledOn.every(n => n > 0) && obs.magnetMax === mc,
        `23. Магніт covers ${mc === 1 ? "the target's next attack (its line names it), and a buff the target casts on it" : `each of the target's next ${mc} attacks (their lines name it), and a buff the target casts on any of them`} goes to the White Drake (${pulledOn.map((n, i) => `${n} pulled on attack ${i + 1}`).join(', ')}), none stays with the target`,
        JSON.stringify({ kept: obs.keptUnderMagnet.slice(0, 3), pulledOn: obs.pulledOn, magnetMax: obs.magnetMax }));

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
    G.say('streamchannel', '!рерол білий');
    const stayMsg = lastInfo(), stayed = me().drakeObj.type;
    G.say('streamchannel', '!дракон');
    const back = me(), backMsg = lastInfo();
    check(/\[emSteel\] Білий Дрейк чекає на рівні 7\.$/.test(toMsg) && /знову \[emSteel\] Білий Дрейк: рівень 7, нічого не втрачено\.$/.test(backMsg),   // each form by its emblem
        `23. both switches name the White Drake's level: «${toMsg.slice(toMsg.indexOf('стає'))}», «${backMsg.slice(backMsg.indexOf('знову'))}»`, JSON.stringify({ toMsg, backMsg }));
    check(asDragon.drakeObj.type === G.DRAGON_TYPE && asDragon.title.id === G.DRAGON_TITLE_ID && G.calculateLevelAndProgress(asDragon.xp).level === 20 && dragonGain === 0
        && back.drakeObj.type === WD && back.xp === xpFor(7) + 13 && back.title.id === G.WHITE_DRAKE_TITLE_ID && G.queue.join() === 'q1,streamchannel,q2',
        "23. !дракон and back: the Dragon at level 20 gains nothing (+0 XP for a win's 40), the White Drake returns with its exact XP (level 7) and title; the queue place stays (#2)",
        JSON.stringify({ asDragon: [asDragon.drakeObj.type, asDragon.xp], dragonGain, back: [back.drakeObj.type, back.xp, back.title.id], queue: G.queue }));
    check(stayed === G.DRAGON_TYPE && stayMsg === '@streamchannel, зараз ви [emDragon] Білий Дракон. Повернутися до [emSteel] Білого Дрейка: !дракон.',   // its 🐉 went; each form by its emblem
        `23. «!рерол білий» as the Dragon changes nothing and says how to go back: «${stayMsg}»`, JSON.stringify({ stayed, stayMsg }));
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

// 24. The 100 new titles (195–294) and their 24 abilities, from what each is meant to do: every number below is written out
// here, not read from MECH, so a changed number fails. Fixed dice where an ability rolls; its limits, thresholds and caps.
// Then what they meet: the White Dragon, the White Drake's scales, debuff immunity, Магніт, sudden death and the time-out.
{
    console.log('\n[24. the new titles and abilities]');
    fresh();
    const KEEP = Math.random;
    const T = id => G.TITLES_DB.find(x => x.id === id);
    const titleWith = mech => G.TITLES_DB.find(x => x.bonus && x.bonus.mechanic === mech);
    const bare = t => ({ ...t, bonus: { type: 'stats', stats: { ...t.bonus.stats } } });   // the title's stats, without its ability
    const drake = (type = 'plain', title = null, level = 20) => ({ color: '#fff', title, xp: xpFor(level),
        drakeObj: DRAKE[type] || { name: { uk: 'Простий', en: 'Plain' }, type: 'plain' } });
    const WD = () => drake(G.WHITE_DRAKE_TYPE, T(G.WHITE_DRAKE_TITLE_ID));
    const DRAGON = () => drake(G.DRAGON_TYPE, T(G.DRAGON_TITLE_ID));
    // One attack's rolls, in the order the fight makes them: `before` (Синій екран, AFK's draw, Jackpot's reels), attack type,
    // sub-type, damage, crit, ultra-block, `after` (the abilities that roll on a landed hit), the cast. Missing rolls are 0.99
    const dice = (o = {}) => [...(o.before || []), o.attack ?? 0.5, o.sub ?? 0.5, o.dmg ?? 0.5, o.crit ?? 0.99, o.block ?? 0.99, ...(o.after || []), o.cast ?? 0.99];
    const rounds = (n, o) => Array.from({ length: n }, () => dice(o));
    // What the fight told the view during the current turn
    let heard = {};
    G.wrapFv((k, v) => { heard[k] = v; });
    // Plays scripted turns of the real fight: A (fighter 1) attacks on odd turns. setup(fx, a, b) runs once the fight is set
    // up; at[i](fx, a, b) just before turn i + 1. hp: everyone's max HP, for fights that must last
    function scripted({ A = {}, B = {}, setup = null, turns = [], at = {}, hp = null, lang = 'en', start = [] }) {
        G.setLang(lang);
        const db = G.getDragonDB();
        db.A = { ...drake(), ...A, name: 'A' }; db.B = { ...drake(), ...B, name: 'B' };
        G.saveDragonDB(db);
        let tick = null, queue = [0.9, ...start];   // 0.9: the coin flip keeps A first; start: rolls for the fight's setting up
        const realInterval = global.setInterval, realRandom = Math.random;
        global.setInterval = f => { tick = f; return { on: true }; };
        Math.random = () => queue.length ? queue.shift() : 0.99;
        const hpOn = id => Number(document.getElementById(id).innerText.split('/')[0]);   // the card shows "44/150"
        const play = () => {
            G.running = true;
            G.runBattle('A', '#fff', 'B', '#fff', false);
            global.setInterval = realInterval;
            const fx = G.battleFx, a = G.getDragonDB().A, b = G.getDragonDB().B, done = finishes.length;
            if (setup) setup(fx, a, b);
            const out = [];
            for (let i = 0; i < turns.length && finishes.length === done; i++) {
                if (at[i]) at[i](fx, a, b);
                queue = [...turns[i]];
                const from = logs.length;
                heard = {};
                tick();
                const text = logs.slice(from).join('\n'), dm = text.match(/Damage: (\d+)/);
                out.push({ text, dmg: dm ? Number(dm[1]) : null, hpA: hpOn('hp-text-p1'), hpB: hpOn('hp-text-p2'), notes: heard, fx: JSON.parse(JSON.stringify(fx)) });
            }
            return { turns: out, fx, ended: finishes.length > done };
        };
        try { return hp ? G.withMaxHP(() => hp, play) : play(); }
        finally { global.setInterval = realInterval; Math.random = realRandom; G.running = false; }
    }
    const of = (r, who) => r.turns.filter((t, i) => i % 2 === (who === 'A' ? 0 : 1));
    const dmgs = (r, who = 'A') => of(r, who).map(t => t.dmg);
    const near = (got, want) => got !== null && Math.abs(got - want) <= 1;   // both from the same float, rounded once each
    // Rage at a big power: hits of a few hundred, so a +4% shows and rounding doesn't
    const strong = (who, power = 25) => fx => { fx[who].buff.push({ id: 'rage', left: 999, power }); };
    const put = (fx, who, id, left) => { const k = G.EFFECTS[id].kind; fx[who][k].push({ id, left: left ?? G.EFFECTS[id].count, power: 1 }); };
    // A Burn that takes `who` from `now` to `to` HP at the start of its next turn, then ends: HP set exactly, with no extra rolls
    const hurt = (fx, who, max, to, now = max) => { fx[who].debuff.push({ id: 'burn', left: 1, power: (now - to) / max * 100 / G.EFFECTS.burn.nums.hp }); };
    // applyEffect with its own dice
    const rolled = (rolls, f) => { const keep = Math.random, q = [...rolls]; Math.random = () => q.length ? q.shift() : 0.99; try { return f(); } finally { Math.random = keep; } };
    const ids = (...r) => r.flatMap(x => Array.isArray(x) ? Array.from({ length: x[1] - x[0] + 1 }, (_, i) => x[0] + i) : [x]);

    // ---- The titles, their bonuses, the card lines
    const ABILITIES = [
        ['combo', 'legendary', ids([205, 207]), { power: 0.3 }, 'Кожен 3-й власний удар +50% шкоди', '+0.3 сили криту'],
        ['first_blood', 'legendary', ids([208, 210]), { hp: 8, hpPerLevel: 0.5 }, 'Перші 3 удари в бою +25% шкоди і не блокуються', '+8 HP, +0.5 HP/рів.'],
        ['iron_hide', 'legendary', ids([211, 213]), { hp: 8, hpPerLevel: 0.6 }, 'Перші 3 отримані удари −40% шкоди', '+8 HP, +0.6 HP/рів.'],
        ['last_stand', 'legendary', ids([214, 216]), { hp: 14 }, 'При <40% HP +50% шкоди', '+14 HP'],
        ['counter', 'legendary', ids([217, 219]), { hp: 12 }, 'Отримавши удар, 30% шанс відповісти (60% шкоди)', '+12 HP'],
        ['buff_eater', 'legendary', ids([220, 222]), { hp: 12 }, '60% шанс з’їсти баф цілі (+15% макс. HP)', '+12 HP'],
        ['meter_rush', 'legendary', ids([223, 225]), { hp: 8, hpPerLevel: 0.6 }, 'Починає бій зі шкалою Сили 2/5, а ультимейт +50% (шкода, лікування чи поглинання)', '+8 HP, +0.6 HP/рів.'],
        ['momentum', 'legendary', ids([226, 228]), { power: 0.3 }, 'Кожен власний удар +4% шкоди до кінця бою (до +35%)', '+0.3 сили криту'],
        ['cleanse', 'legendary', ids([229, 231]), { hp: 14, hpPerLevel: 0.6 }, 'На початку ходу знімає з себе всі дебафи', '+14 HP, +0.6 HP/рів.'],
        ['long_buffs', 'legendary', ids([232, 234]), { hp: 10, hpPerLevel: 0.6, effect: 10 }, 'Його бафи тривають удвічі довше', '+10 HP, +0.6 HP/рів., +10% шанс ефекту'],
        ['phoenix', 'mythic', ids([245, 248]), { hp: 15, hpPerLevel: 1.1 }, 'Раз за бій переживає смертельний удар з 1 HP', '+15 HP, +1.1 HP/рів.'],
        ['double_strike', 'mythic', ids([249, 252]), { hp: 15, crit: 8, hpPerLevel: 1.1 }, '20% шанс ударити двічі (другий удар — 70% шкоди)', '+15 HP, +1.1 HP/рів., +8% криту'],
        ['storm_eye', 'mythic', ids([253, 256]), { hp: 20, hpPerLevel: 1.1 }, 'Після кожних 4 отриманих ударів наступний удар ×1.5 і не блокується', '+20 HP, +1.1 HP/рів.'],
        ['time_rewind', 'mythic', ids([257, 259]), { hp: 15, hpPerLevel: 1.1 }, 'Раз за бій при <20% HP відкочує HP на хід назад', '+15 HP, +1.1 HP/рів.'],
        ['tempered', 'mythic', ids([260, 263]), { hp: 20, hpPerLevel: 1.1 }, '+1% шкоди за кожні 3% втраченого HP', '+20 HP, +1.1 HP/рів.'],
        ['return_debuff', 'mythic', ids([264, 267]), { hp: 15, hpPerLevel: 1.1 }, '60% дебафів, накладених на нього, повертаються тому, хто їх наклав', '+15 HP, +1.1 HP/рів.'],
        ['overcharge', 'mythic', ids([268, 270]), { hp: 18, hpPerLevel: 1.1 }, 'Ультимейт ×1.6 (шкода, лікування чи поглинання); після нього шкала Сили починає з 2, а не з 0', '+18 HP, +1.1 HP/рів.'],
        ['verdict', 'mythic', ids([271, 274]), { hp: 15, crit: 12, hpPerLevel: 1.1 }, '25% шанс винести цілі вирок: 3-й удар по ній після цього ×2', '+15 HP, +1.1 HP/рів., +12% криту'],
        ['error_404', 'meme', ids([275, 277]), { hp: 18 }, 'Будь-чий удар: 8% шанс на 0 шкоди — «404»', '+18 HP'],
        ['blue_screen', 'meme', ids([278, 280]), { hp: 18 }, 'Щоходу 5% шанс, що той, хто ходить, зависне й пропустить хід', '+18 HP'],
        ['chat_decides', 'meme', ids([281, 283]), { hp: 18 }, 'Його ефекти — випадкові зі стихій обох бійців', '+18 HP'],
        ['afk', 'meme', ids([284, 286]), { hp: 18 }, 'Раз за бій пропускає хід, зате наступний удар ×3', '+18 HP'],
        ['lag', 'meme', ids([287, 288], 291), { hp: 18 }, '10% шанс, що удар долетить на хід пізніше, зате ×1.8', '+18 HP'],
        ['copy_paste', 'meme', ids([292, 294]), { hp: 18 }, '10% шанс завдати стільки ж, скільки останній удар суперника', '+18 HP'],
    ];
    const REUSED = [['guardian_shield', ids([235, 236]), { hp: 12 }], ['armor_piercer', ids([237, 238]), { power: 0.5 }], ['debuff_immunity', ids([239, 240]), { hp: 15 }],
        ['quantum_dodge', ids([241, 242]), { hp: 16 }], ['chaotic_charge', ids([243, 244]), { effect: 15 }], ['coin_flip', [289], { hp: 20 }], ['sleepy', [290], { hp: 5 }]];
    const EPIC = [[[195, 202], { crit: 12, power: 0.28 }, '+12% криту, +0.28 сили криту'], [[196, 200, 203], { effect: 12, buffEff: 40 }, '+12% шанс ефекту, +40% сила ефектів'],
        [[197, 199, 201], { hp: 44, hpPerLevel: 1.1 }, '+44 HP, +1.1 HP/рів.'], [[198, 204], { crit: 8, power: 0.4 }, '+8% криту, +0.4 сили криту']];
    const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
    const numbers = s => (s.match(/\d+(?:\.\d+)?/g) || []).map(Number).sort((x, y) => x - y).join();
    {
        const count = r => G.TITLES_DB.filter(t => t.rarity === r).length;
        check(count('common') === 80 && count('uncommon') === 30 && count('rare') === 40 && count('epic') === 30 && count('legendary') === 50 && count('mythic') === 38 && count('meme') === 26 && G.TITLES_DB.length === 296,
            '24. 294 titles to roll: 80 Common, 30 Uncommon, 40 Rare, 30 Epic, 50 Legendary, 38 Mythic, 26 Meme, plus the two divine', JSON.stringify(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'meme'].map(count)));
        const rarityOf = id => id <= 204 ? 'epic' : id <= 244 ? 'legendary' : id <= 274 ? 'mythic' : 'meme';
        const badIds = ids([195, 294]).filter(id => !T(id) || T(id).rarity !== rarityOf(id));
        check(!badIds.length, '24. ids 195–294 in order: Epic 195–204, Legendary 205–244, Mythic 245–274, Meme 275–294', badIds.join());
        const covered = [...ABILITIES.flatMap(a => a[2]), ...REUSED.flatMap(a => a[1]), ...EPIC.flatMap(a => a[0])].sort((a, b) => a - b);
        check(covered.join() === ids([195, 294]).join(), "24. every new title is in this test's tables, once", covered.length + ' ids');
        const bad = [];
        G.setLang('uk');
        for (const [mech, rarity, list, stats, line, bonus] of ABILITIES) for (const id of list) {
            const t = T(id);
            if (t.rarity !== rarity || t.bonus.type !== 'unique' || t.bonus.mechanic !== mech || !same(t.bonus.stats, stats)) bad.push(`${id}: ${JSON.stringify(t.bonus)}`);
            if (G.describeTitleBonus(t) !== `${line}, ${bonus}`) bad.push(`${id}'s card says: ${G.describeTitleBonus(t)}`);
        }
        for (const [mech, list, stats] of REUSED) for (const id of list) if (T(id).bonus.mechanic !== mech || !same(T(id).bonus.stats, stats)) bad.push(`${id}: ${JSON.stringify(T(id).bonus)}`);
        for (const [list, stats, bonus] of EPIC) for (const id of list) {
            if (T(id).bonus.type !== 'stats' || !same(T(id).bonus.stats, stats)) bad.push(`${id}: ${JSON.stringify(T(id).bonus)}`);
            if (G.describeTitleBonus(T(id)) !== bonus) bad.push(`${id}'s card says: ${G.describeTitleBonus(T(id))}`);
        }
        check(!bad.length, `24. each ability's titles carry its bonus, and its card line reads as decided (${ABILITIES.length} new abilities, ${REUSED.length} reused, 4 Epic bonuses)`, bad.slice(0, 4).join(' | '));
        const noEn = [];
        for (const [, , list, , line] of ABILITIES) {
            const t = T(list[0]);
            const justIt = { ...t, bonus: { type: 'unique', mechanic: t.bonus.mechanic, stats: {} } };   // its line alone, no stats after it
            G.setLang('en'); const en = G.describeTitleBonus(justIt); G.setLang('uk');
            if (en === line || numbers(en) !== numbers(line)) noEn.push(`${t.id}: ${en}`);
        }
        check(!noEn.length, "24. each ability's English card line carries the same numbers as its Ukrainian one", noEn.slice(0, 4).join(' | '));
    }

    // ---- The odds
    {
        const w = Object.fromEntries(Object.entries(G.RARITIES).map(([k, r]) => [k, r.weight]));
        check(w.common === 44.7 && w.uncommon === 25 && w.rare === 15 && w.epic === 9 && w.legendary === 4.5 && w.mythic === 1.3 && w.meme === 0.5 && w.divine === 0,
            '24. the odds: Meme 0.5%, taken from Common (44.7%); the other rarities as they were', JSON.stringify(w));
        const rarity = r => rolled([r, 0.5], () => G.getRandomTitle()).rarity;
        check(rarity(0.4469) === 'common' && rarity(0.4471) === 'uncommon' && rarity(0.9949) === 'mythic' && rarity(0.9951) === 'meme',
            '24. the roll itself: Common up to 44.7, Meme from 99.5', [0.4469, 0.4471, 0.9949, 0.9951].map(rarity).join());
        for (const [lang, cmd, common, meme] of [['uk', '!шанси', 'Звичайний 44.7%', 'Мемний 0.5%'], ['en', '!odds', 'Common 44.7%', 'Meme 0.5%']]) {
            G.setLang(lang);
            G.say('viewer1', cmd);
            const card = lastInfo();
            check(card.includes(common) && card.includes(meme) && !/\b45%|0\.2%/.test(card), `24. ${cmd} shows ${common} and ${meme}, not rounded`, card);
        }
    }

    // ---- Legendary
    {   // Комбо: every 3rd own hit deals +50%
        const t = T(205), run = title => dmgs(scripted({ A: drake('plain', title), setup: strong('A'), turns: rounds(14), hp: 1e6 }));
        const base = run(bare(t)), got = run(t);
        check(got.every((d, i) => near(d, base[i] * ((i + 1) % 3 ? 1 : 1.5))), '24. Комбо: hits 3 and 6 deal +50%, the others as usual', JSON.stringify({ base, got }));
    }
    {   // Перша кров: its first 3 hits +25% and unblockable
        const t = T(208), run = (title, o) => dmgs(scripted({ A: drake('plain', title), setup: strong('A'), turns: rounds(8, o), hp: 1e6 }));
        const b = run(bare(t))[0], open = run(t), shut = run(t, { block: 0.05 });
        check(open.slice(0, 3).every(d => near(d, b * 1.25)) && near(open[3], b), '24. Перша кров: its first 3 hits deal +25%, the 4th as usual', JSON.stringify({ b, open }));
        check(shut.slice(0, 3).every(d => near(d, b * 1.25)) && shut[3] === 0, "24. Перша кров: those 3 hits can't be blocked, the 4th can", JSON.stringify(shut));
    }
    {   // Залізна шкура: the first 3 hits it takes deal 40% less
        const t = T(211), run = (title, turns) => dmgs(scripted({ B: drake('plain', title), setup: strong('A'), turns: turns || rounds(8), hp: 1e6 }));
        const b = run(bare(t))[0], got = run(t);
        check(got.slice(0, 3).every(d => near(d, b * 0.6)) && near(got[3], b), '24. Залізна шкура: the first 3 hits taken deal 40% less, the 4th as usual', JSON.stringify({ b, got }));
        const blocked = run(t, [dice({ block: 0.05 }), ...rounds(7)]);
        check(blocked[0] === 0 && near(blocked[1], b * 0.6) && near(blocked[2], b * 0.6) && near(blocked[3], b), '24. Залізна шкура: a blocked hit counts as one of the 3, like every "hits taken" count', JSON.stringify(blocked));
    }
    {   // Останній рубіж: below 40% HP, +50%
        const t = T(214), max = G.getMaxHP(20, 'plain', t), line = Math.ceil(max * 0.4);
        const hit = (title, hp) => scripted({ A: drake('plain', title), setup: fx => { hurt(fx, 'A', max, hp); strong('A')(fx); }, turns: [dice()] }).turns[0].dmg;
        const b = hit(bare(t), line - 1);
        check(near(hit(t, line - 1), b * 1.5) && near(hit(t, line), b), `24. Останній рубіж: +50% at ${line - 1} of ${max} HP (below 40%), nothing at ${line}`, JSON.stringify([b, hit(t, line - 1), hit(t, line)]));
    }
    {   // Контратака: when hit, 30% to hit back for 60% of the damage
        const t = T(217), run = (roll, o = {}) => scripted({ B: drake('plain', t), turns: [dice({ after: [roll], ...o })] }).turns[0], maxA = G.getMaxHP(20, 'plain', null);
        const yes = run(0.29), no = run(0.3), blocked = run(0.1, { block: 0.05 });
        check(maxA - yes.hpA === Math.round(yes.dmg * 0.6) && yes.hpA < maxA, `24. Контратака: a roll under 30% hits back for 60% of the ${yes.dmg} taken`, JSON.stringify({ maxA, hpA: yes.hpA }));
        check(no.hpA === maxA && blocked.hpA === maxA, '24. Контратака: no hit back at 30% or after a blocked hit', JSON.stringify([no.hpA, blocked.hpA]));
    }
    {   // Пожирач бафів: 60% on a hit to eat one of the target's buffs and heal 15% max HP
        const t = T(220), max = G.getMaxHP(20, 'plain', t);
        const run = (roll, B = drake()) => scripted({ A: drake('plain', t), B, setup: fx => { hurt(fx, 'A', max, 100); put(fx, 'B', 'shield'); put(fx, 'B', 'rage'); }, turns: [dice({ after: [roll, 0] })] }).turns[0];
        const yes = run(0.59), no = run(0.6), immune = run(0.1, drake('plain', titleWith('debuff_immunity')));
        check(yes.fx.B.buff.map(x => x.id).join() === 'rage' && yes.hpA === 100 + Math.round(max * 0.15), `24. Пожирач бафів: a roll under 60% eats a buff and heals 15% of ${max}`, JSON.stringify({ hp: yes.hpA, buffs: yes.fx.B.buff }));
        check(no.fx.B.buff.length === 2 && no.hpA === 100, '24. Пожирач бафів: nothing at 60%', JSON.stringify({ hp: no.hpA, buffs: no.fx.B.buff }));
        check(immune.fx.B.buff.length === 2 && immune.hpA === 100, '24. Пожирач бафів: debuff immunity keeps the buffs, and no heal', JSON.stringify({ hp: immune.hpA, buffs: immune.fx.B.buff }));
        const none = scripted({ A: drake('plain', t), setup: fx => hurt(fx, 'A', max, 100), turns: [dice({ after: [0.1, 0] })] }).turns[0];
        check(none.hpA === 100, '24. Пожирач бафів: no buffs on the target, no heal', String(none.hpA));
    }
    // Підзарядка +50%, Перевантаження ×1.6: on every ultimate, an attack's damage, Bloom's heal and Ice Mirror's absorbing
    const ultimateChecks = (name, t, mult) => {
        const hit = (type, title, before) => scripted({ A: drake(type, title), setup: fx => { fx.A.meter = 5; strong('A')(fx); }, turns: [dice({ before })], hp: 1e6 }).turns[0];
        const REELS = [0.1, 0.1, 0.1];   // Jackpot: three gems
        for (const [type, before, label] of [['red', [], 'Вогняний шторм'], ['black', [], 'Крадіжка тіні'], ['purple', [], 'Арканна детонація'], ['gold', REELS, 'Джекпот']]) {
            const b = hit(type, bare(t), before).dmg, got = hit(type, t, before).dmg;
            check(near(got, b * mult), `24. ${name}: ${label} deals ×${mult}`, JSON.stringify({ b, got }));
        }
        const healed = title => { const m = G.getMaxHP(20, 'green', title), low = Math.round(m * 0.2);
            return { m, got: scripted({ A: drake('green', title), setup: fx => { fx.A.meter = 5; hurt(fx, 'A', m, low); }, turns: [dice()] }).turns[0].hpA - low }; };
        const hb = healed(bare(t)), hm = healed(t);
        check(hb.got === Math.round(hb.m * 0.25) && hm.got === Math.round(hm.m * 0.25 * mult), `24. ${name}: Цвітіння heals 25% ×${mult} of max HP (without it, 25%)`, JSON.stringify({ hb, hm }));
        const absorbed = title => { const r = scripted({ A: drake('blue', title), setup: fx => { fx.A.meter = 5; strong('B', 100)(fx); }, turns: [dice(), dice()], hp: 5000 }).turns[1];
            const m = r.text.match(/(\d+) → (\d+), -\d+ back/); return m ? Number(m[1]) - Number(m[2]) : null; };
        check(absorbed(bare(t)) === 500 && absorbed(t) === Math.round(500 * mult), `24. ${name}: Крижане дзеркало absorbs up to 10% ×${mult} of max HP (without it, 10%)`, JSON.stringify([absorbed(bare(t)), absorbed(t)]));
    };
    {
        const t = T(223), start = (type, title) => scripted({ A: drake(type, title) }).fx.A.meter;
        const elements = ['red', 'blue', 'black', 'gold', 'purple', 'green'];
        check(elements.every(e => start(e, t) === 2) && elements.every(e => start(e, bare(t)) === 0), '24. Підзарядка: every element starts the fight at 2/5, without it at 0', elements.map(e => start(e, t)).join());
        ultimateChecks('Підзарядка', t, 1.5);
        const after = scripted({ A: drake('red', t), setup: fx => { fx.A.meter = 5; }, turns: [dice()] }).turns[0].fx.A.meter;
        check(after === 0, '24. Підзарядка: after the ultimate the meter restarts at 0, as usual', String(after));
    }
    {   // Інерція: each own hit adds +4% for the rest of the fight, up to +35%
        const t = T(226), run = title => dmgs(scripted({ A: drake('plain', title), setup: strong('A'), turns: rounds(24), hp: 1e6 }));
        const base = run(bare(t)), got = run(t);
        check(got.every((d, i) => near(d, base[i] * (1 + Math.min(0.35, 0.04 * i)))), '24. Інерція: hit n deals +4% for each hit before it, stopping at +35% (the 10th hit on)', JSON.stringify({ base: base[0], got }));
    }
    {   // Очищення: at the start of its turn, every debuff off, before they can act
        const t = T(229), max = G.getMaxHP(20, 'plain', t);
        const turn = (setup, turns = [dice()]) => scripted({ A: drake('plain', t), setup, turns }).turns;
        for (const id of ['burn', 'poison']) {
            const r = turn(fx => put(fx, 'A', id))[0];
            check(r.hpA === max && !r.fx.A.debuff.length, `24. Очищення: ${G.EFFECTS[id].name.uk} comes off before it can act: no HP lost`, JSON.stringify({ hp: r.hpA, max, debuffs: r.fx.A.debuff.map(x => x.id) }));
        }
        const frost = turn(fx => put(fx, 'A', 'frost'))[0];
        check(frost.dmg > 0 && !frost.fx.A.debuff.length, '24. Очищення: Мороз comes off before it can skip the attack', frost.text);
        const b = scripted({ A: drake('plain', bare(t)), turns: [dice()] }).turns[0].dmg, weak = turn(fx => put(fx, 'A', 'weakness'))[0];
        check(weak.dmg === b, '24. Очищення: Слабкість comes off before the hit', JSON.stringify([b, weak.dmg]));
        const both = turn(fx => { put(fx, 'A', 'burn'); put(fx, 'A', 'weakness'); })[0];
        check(!both.fx.A.debuff.length && both.hpA === max, '24. Очищення: all its debuffs go at once', JSON.stringify({ d: both.fx.A.debuff, hp: both.hpA, max }));
        const kept = scripted({ A: drake('plain', bare(t)), setup: fx => put(fx, 'A', 'weakness'), turns: [dice()] }).turns[0];
        check(kept.dmg < b, '24. (control) without the ability Слабкість stays and cuts the hit', JSON.stringify([b, kept.dmg]));
    }
    {   // Довгий баф: its buffs last twice as long
        const t = T(232);
        const lands = (title, id) => { let left = null; scripted({ A: drake('plain', title), setup: (fx, a, b) => { G.applyEffect(a, b, id, 20, fx); left = fx.A.buff.find(x => x.id === id).left; } }); return left; };
        const buffs = ['rage', 'shield', 'shadow', 'blessing', 'divine', 'regen'];
        check(buffs.every(id => lands(t, id) === G.EFFECTS[id].count * 2 && lands(bare(t), id) === G.EFFECTS[id].count), '24. Довгий баф: every buff it casts lasts twice its count (without it, its count)', buffs.map(id => `${id} ${lands(t, id)}`).join());
        let refreshed = null;
        scripted({ A: drake('plain', t), setup: (fx, a, b) => { G.applyEffect(a, b, 'shield', 20, fx); fx.A.buff[0].left = 1; G.applyEffect(a, b, 'shield', 20, fx); refreshed = fx.A.buff[0].left; } });
        check(refreshed === 4, '24. Довгий баф: a refresh gives the doubled count too', String(refreshed));
        let onIt = null;
        scripted({ B: drake('plain', t), setup: (fx, a, b) => { G.applyEffect(a, b, 'burn', 20, fx); onIt = fx.B.debuff[0].left; } });
        check(onIt === G.EFFECTS.burn.count, "24. Довгий баф: debuffs on it don't last any longer", String(onIt));
        const might = title => dmgs(scripted({ A: drake('plain', title), setup: (fx, a, b) => { strong('A')(fx); G.applyEffect(a, b, 'divine', 20, fx); }, turns: rounds(6), hp: 1e6 }));
        const once = might(bare(t)), twice = might(t), up = 1 + G.EFFECTS.divine.nums.dmg / 100, plainHit = once[1];
        check(near(once[0], plainHit * up) && near(twice[0], plainHit * up) && near(twice[1], plainHit * up) && near(twice[2], plainHit), '24. Довгий баф: Божественна міць covers 2 attacks instead of 1, the 3rd as usual', JSON.stringify({ once, twice }));
    }

    // ---- Mythic
    {   // Відродження: once a fight, survives a killing blow at 1 HP
        const t = T(245), lethal = strong('A', 2000);
        const r = scripted({ B: drake('plain', t), setup: lethal, turns: [dice(), dice({ block: 0.05 }), dice()] });   // the block: Rage this strong would make its hit back fatal
        check(r.turns[0].hpB === 1 && r.turns.length === 3 && r.turns[2].hpB === 0 && r.ended, '24. Відродження: a killing blow leaves 1 HP, the next one kills', JSON.stringify(r.turns.map(x => x.hpB)));
        const ctl = scripted({ B: drake('plain', bare(t)), setup: lethal, turns: rounds(1) });
        check(ctl.turns[0].hpB === 0 && ctl.ended, '24. (control) without the ability the blow kills', String(ctl.turns[0].hpB));
        const m = G.getMaxHP(20, 'plain', t), tick = scripted({ A: drake('plain', t), setup: fx => hurt(fx, 'A', m, -50), turns: [dice()] });
        check(tick.turns[0].hpA === 1 && !tick.ended, '24. Відродження: a tick that would kill leaves 1 HP too', JSON.stringify({ hp: tick.turns[0].hpA, ended: tick.ended }));
    }
    {   // Двійник: 20% to strike twice, the second hit deals 70%
        const t = T(249), run = (roll, o = {}) => scripted({ A: drake('plain', t), setup: strong('A', 4), turns: [dice({ after: [roll], ...o })], hp: 5000 }).turns[0];
        const yes = run(0.19), no = run(0.2), blocked = run(0.1, { block: 0.05 });
        check(5000 - yes.hpB === yes.dmg + Math.round(yes.dmg * 0.7), `24. Двійник: a roll under 20% strikes twice, the second hit 70% of ${yes.dmg}`, JSON.stringify({ lost: 5000 - yes.hpB, dmg: yes.dmg }));
        check(5000 - no.hpB === no.dmg && blocked.hpB === 5000, '24. Двійник: no second hit at 20% or after a blocked first', JSON.stringify([no.hpB, blocked.hpB]));
    }
    {   // Око бурі: after every 4 hits it takes, its next hit deals ×1.5 and can't be blocked
        const t = T(253), run = (title, o) => dmgs(scripted({ A: drake('plain', title), setup: strong('A'), turns: rounds(18, o), hp: 1e6 }));
        const base = run(bare(t)), got = run(t), shut = run(t, { block: 0.05 });   // hit 9 is on turn 17: sudden death, in the base too
        check(got.every((d, i) => near(d, base[i] * (i === 4 || i === 8 ? 1.5 : 1))), '24. Око бурі: its hit after each 4th hit taken deals ×1.5 (hits 5 and 9 here), every other as usual', JSON.stringify({ base, got }));
        check(shut.every((d, i) => i === 4 || i === 8 ? near(d, base[i] * 1.5) : d === 0), "24. Око бурі: that hit can't be blocked, and blocked hits it takes count towards the 4", JSON.stringify(shut));
    }
    {   // Перемотка: once a fight, below 20% HP, its HP rolls back to where it was at the start of its previous turn
        const t = T(257), max = G.getMaxHP(20, 'plain', t), line = Math.ceil(max * 0.2);
        // Turn 1 is its own (HP full), turn 2 the opponent's, then at the start of turn 3 a Burn takes it to `to`
        const hitB = max - scripted({ A: drake('plain', t), turns: rounds(2) }).turns[1].hpA;
        const aim = to => scripted({ A: drake('plain', t), turns: rounds(3), at: { 2: fx => hurt(fx, 'A', max, to, max - hitB) } }).turns[2];
        check(aim(line - 1).hpA === max, `24. Перемотка: at ${line - 1} of ${max} HP (below 20%) it rolls back to the ${max} it had at the start of its previous turn`, String(aim(line - 1).hpA));
        check(aim(line).hpA === line, `24. Перемотка: nothing at ${line} (20%)`, String(aim(line).hpA));
        const first = scripted({ A: drake('plain', t), setup: fx => hurt(fx, 'A', max, line - 1), turns: [dice()] }).turns[0];
        check(first.hpA === line - 1, '24. Перемотка: on its first turn there is no previous turn to go back to', String(first.hpA));
        // Below 20% again on turn 7, with a healthy turn 5 to go back to: it stays down
        const twice = scripted({ A: drake('plain', t), turns: rounds(7), at: { 2: fx => hurt(fx, 'A', max, 10, max - hitB), 6: fx => hurt(fx, 'A', max, 10, max - 2 * hitB) } }).turns;
        check(twice[2].hpA === max && twice[6].hpA === 10, '24. Перемотка: once a fight', JSON.stringify([twice[2].hpA, twice[6].hpA]));
    }
    {   // Загартування: +1% damage for every 3% of HP it has lost
        const t = T(260), max = G.getMaxHP(20, 'plain', t);
        const hit = (title, share) => scripted({ A: drake('plain', title), setup: fx => { if (share) hurt(fx, 'A', max, Math.round(max * (1 - share))); strong('A')(fx); }, turns: [dice()] }).turns[0].dmg;
        const b = hit(bare(t), 0);
        const ok = [[0, 1], [0.3, 1.1], [0.6, 1.2], [0.9, 1.3]].every(([share, m]) => Math.abs(hit(t, share) / (b * m) - 1) < 0.01);
        check(ok, '24. Загартування: +10% at 30% of its HP lost, +20% at 60%, +30% at 90%, nothing at full HP', JSON.stringify([0, 0.3, 0.6, 0.9].map(s => hit(t, s) / b)));
    }
    {   // Повернення: 60% of the debuffs cast on it go back to the caster; the rest land
        const t = T(264);
        const cast = (roll, A = drake(), id = 'burn') => { let out = null;
            scripted({ A, B: drake('plain', t), setup: (fx, a, b) => { const res = rolled([roll], () => G.applyEffect(a, b, id, 20, fx)); out = { res, a: fx.A.debuff.map(x => x.id), b: fx.B.debuff.map(x => x.id) }; } });
            return out; };
        const back = cast(0.59), land = cast(0.6);
        check(back.a.join() === 'burn' && !back.b.length, '24. Повернення: a roll under 60% sends the debuff back to its caster', JSON.stringify(back));
        check(!land.a.length && land.b.join() === 'burn', '24. Повернення: at 60% it lands', JSON.stringify(land));
        const pingpong = cast(0.1, drake('plain', T(265)));
        check(pingpong.a.join() === 'burn' && !pingpong.b.length, '24. Повернення: a debuff comes back once, never twice, even to another holder', JSON.stringify(pingpong));
        const immune = cast(0.1, drake('plain', titleWith('debuff_immunity')));
        check(immune.res === 'immune' && !immune.a.length && !immune.b.length, '24. Повернення: debuff immunity stops a debuff sent back at an immune caster', JSON.stringify(immune));
        const dragon = cast(0.1, DRAGON());
        check(dragon.res === 'immune' && !dragon.a.length && !dragon.b.length, "24. Повернення: the White Dragon's own immunity too", JSON.stringify(dragon));
        let buff = null;
        scripted({ B: drake('plain', t), setup: (fx, a, b) => { G.applyEffect(b, a, 'rage', 20, fx); buff = fx.B.buff.map(x => x.id).join(); } });
        check(buff === 'rage', "24. Повернення: buffs aren't sent anywhere", String(buff));
        // A Dispel sent back: a caster with buffs loses them; with none it does nothing, and no recast (no free cast for the holder)
        let stripped = null;
        scripted({ A: drake('purple'), B: drake('red', t), setup: (fx, a, b) => { put(fx, 'A', 'rage'); put(fx, 'B', 'shield'); const res = rolled([0.1], () => G.applyEffect(a, b, 'dispel', 20, fx)); stripped = { res, a: fx.A.buff.length, b: fx.B.buff.length }; } });
        check(stripped.res === 'dispelled' && stripped.a === 0 && stripped.b === 1, "24. Повернення: a Dispel sent back takes the caster's buffs, not the holder's", JSON.stringify(stripped));
        let nothing = null;
        scripted({ A: drake('purple'), B: drake('red', t), setup: (fx, a, b) => { const res = rolled([0.1, 0.1, 0], () => G.applyEffect(a, b, 'dispel', 20, fx)); nothing = { res, fx: JSON.parse(JSON.stringify([fx.A.buff, fx.A.debuff, fx.B.buff, fx.B.debuff])) }; } });
        check(nothing.res === 'returned' && nothing.fx.every(l => !l.length), '24. Повернення: a Dispel sent back to a caster with no buffs does nothing, and no recast', JSON.stringify(nothing));
        let plainDispel = null;
        scripted({ A: drake('purple'), B: drake('red', t), setup: (fx, a, b) => { const res = rolled([0.6, 0.1, 0], () => G.applyEffect(a, b, 'dispel', 20, fx)); plainDispel = res; } });
        check(plainDispel !== 'returned' && plainDispel !== 'dispelled', '24. (control) a Dispel that lands on a holder with no buffs is recast, as on anyone', String(plainDispel));
    }
    {
        const t = T(268);
        ultimateChecks('Перевантаження', t, 1.6);
        const m = title => scripted({ A: drake('red', title), setup: fx => { fx.A.meter = 5; }, turns: [dice()] }).turns[0].fx.A.meter;
        check(m(t) === 2 && m(bare(t)) === 0, '24. Перевантаження: after the ultimate the meter restarts at 2, not 0', JSON.stringify([m(t), m(bare(t))]));
        const blooms = scripted({ A: drake('green', t), setup: fx => { fx.A.meter = 5; }, turns: [dice()] }).turns[0].fx.A.meter;
        check(blooms === 2, '24. Перевантаження: Цвітіння too', String(blooms));
        const start = scripted({ A: drake('red', t) }).fx.A.meter;
        check(start === 0, '24. Перевантаження: the fight itself starts at 0', String(start));
    }
    {   // Вирок: 25% on a hit to sentence the target; its 3rd hit after that deals ×2
        const t = T(271), run = (title, rolls) => dmgs(scripted({ A: drake('plain', title), setup: strong('A'), turns: rolls.flatMap(r => [dice({ after: r === null ? [] : [r] }), dice()]), hp: 1e6 }));
        const b = run(bare(t), [null])[0];
        const got = run(t, [0.24, 0.99, 0.99, 0.99, 0.99]), not = run(t, [0.25, 0.99, 0.99, 0.99, 0.99]);
        check(near(got[0], b) && near(got[1], b) && near(got[2], b) && near(got[3], b * 2) && near(got[4], b), '24. Вирок: a roll under 25% on hit 1 makes hit 4 deal ×2, and only hit 4', JSON.stringify({ b, got }));
        check(not.every(d => near(d, b)), '24. Вирок: no sentence at 25%', JSON.stringify(not));
    }

    // ---- Meme
    {   // 404: in its fights any hit, by either drake, has an 8% chance to vanish
        const t = T(275), maxB = G.getMaxHP(20, 'plain', t);
        const mine = roll => scripted({ B: drake('plain', t), turns: [dice({ after: [roll] })] }).turns[0];
        const theirs = roll => scripted({ A: drake('plain', t), turns: [dice({ after: [roll] })] }).turns[0];
        const yes = mine(0.07), no = mine(0.08), other = theirs(0.07);
        check(yes.dmg === 0 && yes.hpB === maxB && /404/.test(yes.text), '24. 404: a roll under 8% and the hit deals nothing (the holder hit)', yes.text);
        check(no.dmg > 0 && no.hpB === maxB - no.dmg, '24. 404: at 8% the hit lands', no.text);
        check(other.dmg === 0 && /404/.test(other.text), "24. 404: the holder's own hit can vanish too", other.text);
        const meter = scripted({ A: drake('red'), B: drake('plain', t), turns: [dice({ after: [0.07] })] }).turns[0].fx.A.meter;
        check(meter === 0, "24. 404: a hit that vanished doesn't fill the meter", String(meter));
    }
    {   // Синій екран: each turn, 5% that whoever is about to hit crashes and loses the turn
        const t = T(278);
        const run = (who, roll) => scripted({ [who]: drake('plain', t), turns: [dice({ before: [roll] }), dice({ before: [roll] })] }).turns;
        for (const who of ['A', 'B']) {
            const lost = run(who, 0.04), kept = run(who, 0.05);
            check(lost.every(x => x.dmg === null) && lost[1].hpA === G.getMaxHP(20, 'plain', who === 'A' ? t : null), `24. Синій екран (held by ${who}): a roll under 5% and the turn is lost, whoever's turn it is`, lost.map(x => x.text).join(' / '));
            check(kept.every(x => x.dmg > 0), `24. Синій екран (held by ${who}): at 5% both hit`, kept.map(x => x.text).join(' / '));
        }
    }
    {   // Чат вирішує: the effects it casts come at random from both fighters' elements
        const t = T(281);
        Math.random = mulberry32(2424);
        const seen = [];
        G.wrapApplyEffect((a, top) => { if (a[0].name === 'chat') seen.push(a[2]); });
        G.setLang('en');
        for (let i = 0; i < 60; i++) {
            const d = G.getDragonDB(); d.chat = { ...drake('purple', t), name: 'chat' }; d.foe = { ...drake('red'), name: 'foe' }; G.saveDragonDB(d);
            G.running = true; G.runBattle('chat', '#fff', 'foe', '#fff', false); __drain();
        }
        G.wrapApplyEffect(null);
        Math.random = KEEP;
        const outside = seen.filter(id => !['purple', 'red'].includes(G.EFFECTS[id].element));
        check(seen.length > 100 && !outside.length, `24. Чат вирішує: all its ${seen.length} casts come from the two fighters' elements`, `${outside.length} from elsewhere: ${[...new Set(outside)].join()}`);
        check(new Set(seen.map(id => G.EFFECTS[id].element)).size >= 2, "24. Чат вирішує: both fighters' elements come up", [...new Set(seen)].join());
    }
    {   // AFK: once a fight, on one of its turns 2–5, it leaves; next turn it's back and hits ×3
        const t = T(284);
        for (const [roll, own] of [[0, 2], [0.25, 3], [0.5, 4], [0.75, 5]]) {
            const turns = rounds(16); turns[0] = dice({ before: [roll] });
            const r = scripted({ A: drake('plain', t), setup: strong('A'), turns, hp: 1e6 }), hits = dmgs(r), b = hits[0];
            const lostAt = hits.map((d, i) => d === null ? i + 1 : 0).filter(Boolean);
            check(lostAt.join() === String(own) && near(hits[own], b * 3) && hits.slice(own + 1).every(d => near(d, b)), `24. AFK: drawn for its turn ${own}, it skips that turn, its next hit deals ×3, and it never leaves again`, JSON.stringify({ lostAt, hits }));
        }
        // The turn it drew lost to the opponent's Синій екран: still only turns 2–5
        const turns = [];
        for (let i = 1; i <= 16; i++) turns.push(i === 9 ? [0.01] : dice({ before: i === 1 ? [0.99, 0.75] : [0.99] }));
        const r = scripted({ A: drake('plain', t), B: drake('plain', T(278)), turns, hp: 1e6 });
        const away = of(r, 'A').map((x, i) => /AFK\)/.test(x.text) ? i + 1 : 0).filter(Boolean), late = dmgs(r).slice(5);
        check(!away.length && late.every(d => near(d, dmgs(r)[0])), "24. AFK: its turn 5 lost to the opponent's Синій екран, it doesn't leave on turn 6 instead: no AFK and no ×3 in that fight", JSON.stringify({ away, late }));
        // A lost turn inside the window moves it to the next turn
        const moved = [];
        for (let i = 1; i <= 8; i++) moved.push(i === 5 ? [0.01] : dice({ before: i === 1 ? [0.99, 0.25] : [0.99] }));
        const m = scripted({ A: drake('plain', t), B: drake('plain', T(278)), turns: moved, hp: 1e6 });
        const movedTo = of(m, 'A').map((x, i) => /AFK\)/.test(x.text) ? i + 1 : 0).filter(Boolean);
        check(movedTo.join() === '4', "24. AFK: its turn 3 lost to Синій екран moves it to turn 4, still inside 2–5", 'left on its turn ' + movedTo.join());
    }
    {   // Лаг: 10% its hit hangs and nothing happens; at the start of its next turn it lands at ×1.8, then its normal hit
        const t = T(287), run = roll => scripted({ A: drake('plain', t), setup: strong('A', 4), turns: [dice({ after: [roll] }), dice(), dice({ after: [0.99] })], hp: 5000 });
        const r = run(0.09), no = run(0.1), would = no.turns[0].dmg;
        check(r.turns[0].dmg === 0 && r.turns[0].hpB === 5000, '24. Лаг: a roll under 10% and the hit hangs: nothing happens', r.turns[0].text);
        check(5000 - r.turns[2].hpB === Math.round(would * 1.8) + r.turns[2].dmg && r.turns[2].dmg > 0, `24. Лаг: at the start of its next turn the hit lands at ×1.8 (${Math.round(would * 1.8)}), then its normal hit`, JSON.stringify({ lost: 5000 - r.turns[2].hpB, dmg: r.turns[2].dmg, would }));
        check(no.turns[0].dmg > 0 && 5000 - no.turns[0].hpB === would, '24. Лаг: at 10% the hit lands as usual', no.turns[0].text);
    }
    {   // Копіпаст: 10% it copies the opponent's last hit that did damage and deals exactly that
        const t = T(292), run = roll => scripted({ A: drake('plain', t), setup: strong('B', 3), turns: [dice(), dice(), dice({ after: [roll] })], hp: 5000 }).turns;
        const yes = run(0.09), no = run(0.1), theirs = yes[1].dmg;
        check(yes[2].dmg === theirs && theirs !== no[2].dmg, `24. Копіпаст: a roll under 10% deals exactly the opponent's last hit (${theirs})`, JSON.stringify([yes[2].dmg, no[2].dmg, theirs]));
        const first = scripted({ A: drake('plain', t), turns: [dice({ after: [0.01] })] }).turns[0];
        check(first.dmg > 0 && !/Ctrl/.test(first.text), '24. Копіпаст: nothing to copy before the opponent has hit', first.text);
        const blockedLast = scripted({ A: drake('plain', t), setup: strong('B', 3), turns: [dice(), dice(), dice({ after: [0.99] }), dice({ block: 0.05 }), dice({ after: [0.09] })], hp: 5000 }).turns;
        check(blockedLast[4].dmg === theirs, "24. Копіпаст: a blocked hit doesn't count, it copies the last one that did damage", JSON.stringify([blockedLast[4].dmg, theirs]));
    }

    // ---- Nothing only in the hidden record: each ability tells the view when it fires (tests/fightview.js and the icon test draw it)
    {
        const told = [];
        const says = (name, ok, got) => { if (!ok) told.push(`${name}: ${JSON.stringify(got)}`); };
        const at = (id, who, turns, setup, hp) => scripted({ [who]: drake('plain', T(id)), turns, setup, hp }).turns;
        const hurtA = (id, to) => fx => { const m = G.getMaxHP(20, 'plain', T(id)); hurt(fx, 'A', m, Math.round(m * to)); };
        says('Комбо', at(205, 'A', rounds(5))[4].notes.combo === true, at(205, 'A', rounds(5))[4].notes);
        says('Перша кров', at(208, 'A', rounds(1))[0].notes.firstBlood === true, at(208, 'A', rounds(1))[0].notes);
        const unblocked = scripted({ A: drake('plain', T(208)), turns: [dice({ block: 0.05 })] }).turns[0].notes;
        says('Перша кров past a block', unblocked.unblock === 'first_blood', unblocked);
        says('Залізна шкура', at(211, 'B', rounds(1))[0].notes.ironHide === true, at(211, 'B', rounds(1))[0].notes);
        const low = at(214, 'A', rounds(1), hurtA(214, 0.2))[0];
        says('Останній рубіж', low.notes.lastStand === true, low.notes);
        const back = at(217, 'B', [dice({ after: [0.1] })])[0];
        says('Контратака', back.notes.counter === Math.round(back.dmg * 0.6), { n: back.notes, dmg: back.dmg });
        const m220 = G.getMaxHP(20, 'plain', T(220)), ate = at(220, 'A', [dice({ after: [0.1, 0] })], fx => { hurt(fx, 'A', m220, 100); put(fx, 'B', 'shield'); })[0];
        says('Пожирач бафів', ate.notes.eaten && ate.notes.eaten.id === 'shield' && ate.notes.eaten.healed === Math.round(m220 * 0.15), ate.notes);
        const ult = id => scripted({ A: drake('red', T(id)), setup: fx => { fx.A.meter = 5; }, turns: [dice()] }).turns[0].notes;
        says('Підзарядка', ult(223).boost === 1.5, ult(223));
        says('Перевантаження', Math.abs(ult(268).boost - 1.6) < 1e-9, ult(268));
        says('Інерція', at(226, 'A', rounds(3))[2].notes.momentum === 4, at(226, 'A', rounds(3))[2].notes);
        says('Очищення', (at(229, 'A', rounds(1), fx => put(fx, 'A', 'burn'))[0].notes.cleanse || []).join() === 'burn', at(229, 'A', rounds(1), fx => put(fx, 'A', 'burn'))[0].notes);
        says('Відродження', (scripted({ B: drake('plain', T(245)), setup: strong('A', 2000), turns: rounds(1) }).turns[0].notes.phoenix || {}).hp === 1, 'no note');
        const twin = scripted({ A: drake('plain', T(249)), turns: [dice({ after: [0.1] })] }).turns[0];
        says('Двійник', twin.notes.twin === Math.round(twin.dmg * 0.7), { n: twin.notes, dmg: twin.dmg });
        const storm = scripted({ A: drake('plain', T(253)), turns: [...rounds(8), dice({ block: 0.05 })], hp: 1e6 }).turns[8].notes;
        says('Око бурі', storm.storm === 1.5 && storm.unblock === 'storm_eye', storm);
        const m257 = G.getMaxHP(20, 'plain', T(257)), hitB = m257 - at(257, 'A', rounds(2))[1].hpA;
        const rolled257 = scripted({ A: drake('plain', T(257)), turns: rounds(3), at: { 2: fx => hurt(fx, 'A', m257, 10, m257 - hitB) } }).turns[2].notes;
        says('Перемотка', rolled257.rewind && rolled257.rewind.from === 10 && rolled257.rewind.to === m257, rolled257);
        says('Загартування', at(260, 'A', rounds(1), hurtA(260, 0.7))[0].notes.tempered === 10, at(260, 'A', rounds(1), hurtA(260, 0.7))[0].notes);
        heard = {};
        scripted({ B: drake('plain', T(264)), setup: (fx, a, b) => { heard = {}; rolled([0.1], () => G.applyEffect(a, b, 'burn', 20, fx)); says('Повернення', heard['cast:returned'] === 'burn' && heard['cast:applied'] === 'burn', heard); } });
        const sentence = scripted({ A: drake('plain', T(271)), turns: [dice({ after: [0.1] }), dice(), dice(), dice(), dice(), dice(), dice()] }).turns;
        says('Вирок', sentence[0].notes.sentenced === true && sentence[6].notes.sentenceDone === 2, [sentence[0].notes, sentence[6].notes]);
        const gone = scripted({ B: drake('plain', T(275)), turns: [dice({ after: [0.01] })] }).turns[0].notes;
        says('404', gone.notFound && gone.notFound.name === 'B', gone.notFound);
        says('Чат вирішує', scripted({ A: drake('red', T(281)), turns: [dice({ cast: 0 })] }).turns[0].notes.chat === true, 'no note');
        const afk = [dice({ before: [0] }), dice(), [], dice(), dice()], away = scripted({ A: drake('plain', T(284)), turns: afk }).turns[4].notes;
        says('AFK', away.afkBack === 3, away);
        const lag = scripted({ A: drake('plain', T(287)), turns: [dice({ after: [0.01] }), dice(), dice({ after: [0.99] })] }).turns;
        says('Лаг', lag[0].notes.lagHang === true && lag[2].notes.lagLand > 0, [lag[0].notes, lag[2].notes]);
        const copied = scripted({ A: drake('plain', T(292)), turns: [dice(), dice(), dice({ after: [0.01] })] }).turns;
        says('Копіпаст', copied[2].notes.copy === copied[1].dmg, [copied[2].notes, copied[1].dmg]);
        check(!told.length, '24. nothing only in the hidden record: every ability that changes a fight tells the view (Синій екран and AFK: tests/fightview.js)', told.slice(0, 5).join(' | '));
    }

    // ---- What they meet
    {   // The White Dragon still wins every fight, against every ability
        Math.random = mulberry32(2425);
        const lost = [];
        G.setLang('en');
        for (const [mech, , list] of ABILITIES) for (const level of [1, 20]) for (let i = 0; i < 3; i++) {
            const d = G.getDragonDB();
            d.wdragon = { ...DRAGON(), name: 'wdragon', xp: 1000000 }; d.foe = { ...drake(['red', 'blue', 'black', 'gold', 'purple', 'green'][(i * 2 + level) % 6], T(list[i % list.length]), level), name: 'foe' };
            G.saveDragonDB(d);
            G.running = true;
            const before = finishes.length;
            G.runBattle('wdragon', '#fff', 'foe', '#fff', false);
            __drain();
            const f = finishes[before];
            if (!f || !(f.wdragon > 0 && f.foe <= 0)) lost.push(`${mech}: ${JSON.stringify(f)}`);
        }
        Math.random = KEEP;
        check(!lost.length, `24. the White Dragon wins every fight against all ${ABILITIES.length} abilities, by knockout`, lost.slice(0, 3).join(' | '));
        const hit = id => scripted({ A: DRAGON(), B: drake('plain', T(id)), turns: [dice({ after: [0.01, 0.01, 0.01] })] });
        const vanish = hit(275);
        check(vanish.turns[0].hpB === 0 && vanish.ended, "24. the White Dragon's hit can't vanish (404)", String(vanish.turns[0].hpB));
        const iron = hit(211);
        check(iron.turns[0].hpB === 0, "24. Залізна шкура doesn't soften the White Dragon's hit", String(iron.turns[0].hpB));
        const rise = scripted({ A: DRAGON(), B: drake('plain', T(245)), turns: rounds(3) });
        check(rise.turns[0].hpB === 1 && rise.ended, "24. Відродження only delays the White Dragon's win (its hit leaves 1 HP, the fight still ends)", JSON.stringify(rise.turns.map(x => x.hpB)));
        const onDragon = id => scripted({ A: drake('plain', T(id)), B: DRAGON(), setup: strong('A'), turns: [dice({ after: [0.01] })] }).turns[0];
        check(onDragon(208).dmg === 0, "24. Перша кров's hits still dissolve on the White Dragon", onDragon(208).text);
    }
    {   // The White Drake's scales
        const wd = WD();
        const hitsWd = (id, roll, turns = 1) => scripted({ A: drake('plain', T(id)), B: wd, turns: [dice({ after: [roll] }), dice(), dice({ after: [0.99] })].slice(0, turns), hp: 5000 });
        const start = scripted({ B: wd, hp: 5000 }).fx.B.scales.now, maxWd = 5000;
        const twice = hitsWd(249, 0.1).turns[0];
        check(twice.fx.B.scales.now === start - twice.dmg - Math.round(twice.dmg * 0.7) && twice.hpB === maxWd, "24. the scales: Двійник's second hit takes them first, like a hit", JSON.stringify({ start, now: twice.fx.B.scales.now, dmg: twice.dmg, hp: twice.hpB }));
        const late = hitsWd(287, 0.05, 3).turns, plain = hitsWd(287, 0.5).turns[0].dmg;
        check(late[2].fx.B.scales.now === start - Math.round(plain * 1.8) - late[2].dmg && late[2].hpB === maxWd, "24. the scales: Лаг's stuck hit takes them first too", JSON.stringify({ start, now: late[2].fx.B.scales.now, plain, dmg: late[2].dmg, hp: late[2].hpB }));
        const vanish = scripted({ A: drake('plain', T(275)), B: wd, turns: [dice({ after: [0.01] })], hp: 5000 }).turns[0];
        check(vanish.fx.B.scales.now === start, '24. the scales: a hit that vanished (404) leaves them whole', String(vanish.fx.B.scales.now));
        const countered = scripted({ A: wd, B: drake('plain', T(217)), turns: [dice({ after: [0.1] })], hp: 5000 }).turns[0];
        check(countered.fx.A.scales.now === start && maxWd - countered.hpA === Math.round(countered.dmg * 0.6), "24. the scales: Контратака goes past them, as Шипи do (it isn't a hit)", JSON.stringify({ sc: countered.fx.A.scales.now, hp: countered.hpA, dmg: countered.dmg }));
        let bounced = null;
        scripted({ A: wd, B: drake('plain', T(264)), setup: (fx, a, b) => { const res = rolled([0.1], () => G.applyEffect(a, b, 'burn', 20, fx)); bounced = { res, a: fx.A.debuff.length, b: fx.B.debuff.length }; } });
        check(bounced.res === 'bounced' && !bounced.a && !bounced.b, '24. the scales: a debuff Повернення sends back bounces off them', JSON.stringify(bounced));
    }
    {   // Магніт
        const wd = WD();
        let pulled = null;
        scripted({ A: drake('plain', T(232)), B: wd, setup: (fx, a, b) => { put(fx, 'A', 'magnet'); pulled = { res: G.applyEffect(a, b, 'shield', 20, fx), wd: fx.B.buff.map(x => [x.id, x.left]), mine: fx.A.buff.length }; } });
        check(pulled.res === 'pulled' && pulled.wd[0][1] === G.EFFECTS.shield.count && !pulled.mine, "24. Магніт: a Довгий баф holder's buff pulled to the White Drake lasts its usual count", JSON.stringify(pulled));
        const cleansed = scripted({ A: drake('plain', T(229)), B: wd, setup: fx => put(fx, 'A', 'magnet'), turns: [dice()] }).turns[0];
        check(!cleansed.fx.A.debuff.length, '24. Магніт: Очищення takes it off before the attack it covers', JSON.stringify(cleansed.fx.A.debuff));
        let back = null;
        scripted({ A: wd, B: drake('plain', T(264)), setup: (fx, a, b) => { fx.A.scales.now = 0; rolled([0.1], () => G.applyEffect(a, b, 'magnet', 20, fx)); const res = G.applyEffect(a, b, 'reforge', 20, fx); back = { res, on: fx.A.debuff.map(x => x.id), a: fx.A.buff.map(x => x.id), b: fx.B.buff.map(x => x.id) }; } });
        check(back.a.join() === 'reforge' && !back.b.length, '24. Магніт sent back at the White Drake: its own buff stays with it, it never goes to the viewer', JSON.stringify(back));
    }
    {   // Sudden death and the time-out
        const sd = scripted({ A: drake('plain', T(292)), turns: [...rounds(16), dice({ after: [0.05] })], hp: 1e6 }).turns;
        check(sd[16].dmg === sd[15].dmg && /Sudden Death/.test(sd[16].text), "24. sudden death: Копіпаст deals exactly the opponent's last hit, no multiplier on top", JSON.stringify([sd[16].dmg, sd[15].dmg]));
        const lost = scripted({ A: drake('plain', T(278)), turns: [...rounds(29, { before: [0.99] }), [0.01], []], hp: 1e6 });
        check(lost.ended && lost.turns.length === 31 && /Time out/.test(lost.turns[30].text) && !/\[Turn 31\]/.test(lost.turns.map(x => x.text).join('\n')), '24. the time-out: a turn 30 lost to Синій екран is still the last turn', JSON.stringify({ ended: lost.ended, n: lost.turns.length }));
        const hung = scripted({ B: drake('plain', T(287)), turns: [...rounds(29), dice({ after: [0.01] }), []], hp: 1e6 });
        check(hung.ended && hung.turns[29].dmg === 0 && hung.turns[30].hpA === hung.turns[29].hpA, '24. the time-out: a hit stuck on turn 30 (Лаг) never lands', JSON.stringify({ ended: hung.ended, hp: hung.turns.slice(29).map(x => x.hpA) }));
    }

    // ---- 25. Season 2's Помаранчевий. Every number is written out here, like section 24's, so a changed one fails
    {
        console.log('\n[25. Season 2: Помаранчевий]');
        const OR = (title = null, level = 20) => drake('orange', title, level);
        const MAX = 340, OMAX = 380;   // a plain level-20 drake's max HP (150 + 19 × 10); Помаранчевий's, 12% more
        const heatAfter = (A, turns, setup = null) => scripted({ A, turns, setup }).turns.map(t => t.fx.A.heat);

        for (const [lang, make1, words] of [['uk', '!дрейк', ['помаранчевий']], ['en', '!drake', ['orange']]]) {
            G.setLang(lang);
            fresh();
            G.say('viewer1', `${make1} ${words[0]}`);
            const made = G.getDragonDB().viewer1;
            check(made && made.drakeObj.type === 'orange', `25. "${make1} ${words[0]}" gives the Orange Drake`, JSON.stringify(made && made.drakeObj));
            const named = lastInfo();
            check(named.includes(lang === 'uk' ? 'Помаранчевий Дрейк' : 'Orange Drake') && !named.includes('🟧'), `25. the reply names it with no emoji: ${named.slice(0, 90)}`, named);
        }
        check(G.VIEWER_DRAKE_TYPES.map(d => d.type).join() === 'red,blue,black,gold,purple,green,orange,cherry,pink,turquoise', '25. the viewers have the ten drakes, Season 2\'s after Зелений', JSON.stringify(G.VIEWER_DRAKE_TYPES.map(d => d.type)));

        // What adds heat
        {
            const cold = scripted({ A: OR(), B: drake('red'), turns: [] }).fx;
            check(cold.A.heat === 0 && cold.B.heat === null, '25. a fight starts with 0 heat, and only Помаранчевий has any', JSON.stringify([cold.A.heat, cold.B.heat]));
            const three = heatAfter(OR(), rounds(5));
            check(three.join() === '1,1,2,2,3', '25. each attack that lands adds 1 heat, its opponent\'s turns none', three.join());
            const capped = heatAfter(OR(), rounds(3), fx => { fx.A.heat = 7; });
            check(capped.join() === '8,8,8', '25. heat stops at 8', capped.join());
            const blocked = scripted({ A: OR(), turns: [dice({ block: 0.01 })] }).turns[0];
            check(blocked.dmg === 0 && blocked.fx.A.heat === 0, '25. an ultra-blocked attack adds no heat', JSON.stringify([blocked.dmg, blocked.fx.A.heat]));
            const vanished = scripted({ A: OR(), B: drake('plain', T(275)), turns: [dice({ after: [0.01] })] }).turns[0];
            check(/404/.test(vanished.text) && vanished.fx.A.heat === 0, '25. a missed attack (404) adds no heat', vanished.text.slice(0, 120));
            const slept = scripted({ A: OR(titleWith('sleepy')), turns: [[0.5, 0.5, 0.5, 0, 0.99, 0.99, 0.99]] }).turns[0];
            check(/Slept through/.test(slept.text) && slept.fx.A.heat === 0, '25. a «Проспав хід» attack adds no heat', slept.text.slice(0, 120));
            // Лаг: the hit that hangs adds its heat when it lands, a turn later; Виверження's adds none then either
            const hung = scripted({ A: OR(T(287)), turns: [dice({ after: [0.01] }), dice(), dice()] }).turns;
            check(hung[0].fx.A.heat === 0 && hung[2].notes.lagLand > 0 && hung[2].fx.A.heat === 2, "25. Лаг: a hit that hangs adds no heat until it lands (0, then its landing's 1 and that turn's own hit's)", hung.map(t => t.fx.A.heat).join());
            const hungUlt = scripted({ A: OR(T(287)), setup: fx => { fx.A.meter = 5; fx.A.heat = 4; }, turns: [dice({ after: [0.01] }), dice(), dice()] }).turns;
            check(hungUlt[0].fx.A.heat === 2 && hungUlt[2].notes.lagLand > 0 && hungUlt[2].fx.A.heat === 3, "25. Лаг: a hung Виверження adds no heat when it lands (4 drops to 2, then only that turn's own hit adds one)", hungUlt.map(t => t.fx.A.heat).join());
            // Ice Mirror took the whole hit: the attack still landed (and it used a charge of the mirror)
            const mirrored = scripted({ A: OR(), B: drake('blue'), setup: fx => { fx.B.mirror = 2; }, turns: [dice()] }).turns[0];
            check(mirrored.dmg === 0 && mirrored.fx.B.mirror === 1 && mirrored.fx.A.heat === 1, '25. a hit Ice Mirror absorbs whole has landed: it adds heat', JSON.stringify([mirrored.dmg, mirrored.fx.B.mirror, mirrored.fx.A.heat]));
            const frozen = scripted({ A: OR(), setup: fx => put(fx, 'A', 'frost'), turns: [[]] }).turns[0];
            check(/frozen/.test(frozen.text) && frozen.fx.A.heat === 0, '25. a turn lost to Мороз adds none', frozen.text.slice(0, 120));
            const crashed = scripted({ A: OR(), B: drake('plain', T(278)), turns: [[0.01]] }).turns[0];
            check(/freezes/.test(crashed.text) && crashed.fx.A.heat === 0, '25. a turn lost to Синій екран adds none', crashed.text.slice(0, 120));
            const afk = scripted({ A: OR(T(284)), turns: [dice({ before: [0] }), dice(), []] }).turns;
            check(/is away/.test(afk[2].text) && afk[0].fx.A.heat === 1 && afk[2].fx.A.heat === 1, '25. a turn AFK skips adds none', afk.map(t => t.fx.A.heat).join());
            const twin = scripted({ A: OR(T(249)), turns: [dice({ after: [0.01] })] }).turns[0];
            check(twin.notes.twin > 0 && twin.fx.A.heat === 1, "25. Двійник's second hit is part of the same attack: one heat", JSON.stringify(twin.notes));
        }

        // The tick: the target's max HP, the holder's level tier
        const tick = (a, b, heat, setup = () => {}, o = {}) => {
            const r = scripted({ A: drake('plain', null, a), B: OR(null, b), setup: fx => { fx.B.heat = heat; setup(fx); }, turns: [dice({ before: [0.99], block: 0.01 })], ...o });
            return r.turns[0];
        };
        {
            const maxOf = l => 150 + (l - 1) * 10;
            const cases = [[20, 20, 8, 38], [20, 20, 1, 5], [19, 19, 8, 30], [1, 1, 1, 2], [1, 20, 8, 17], [20, 1, 8, 29], [10, 10, 4, 11], [5, 5, 8, 17]];
            const wrong = cases.filter(([a, b, heat, want]) => maxOf(a) - tick(a, b, heat).hpA !== want).map(c => `${c}: ${maxOf(c[0]) - tick(c[0], c[1], c[2]).hpA}`);
            check(!wrong.length, "25. the tick: 1.05% of the opponent's max HP per heat, 1.15% from the holder's level 5, 1.4% at its level 20 (340 HP at 8 heat: 38; a level-1 target of a level-20 holder: 17)", wrong.join(' | '));
            const tiny = scripted({ A: drake(), B: OR(null, 1), hp: 20, setup: fx => { fx.B.heat = 1; }, turns: [dice({ before: [0.99], block: 0.01 })] }).turns[0];
            check(tiny.notes['tick:heat'] === -1, '25. a tick is 1 HP at least (20 max HP at 1 heat)', JSON.stringify(tiny.notes));
            const none = tick(20, 20, 0);
            check(none.hpA === MAX && !none.text.includes('🌡️') && !('tick:heat' in none.notes), '25. no heat, no tick', none.text.slice(0, 100));
            const heard25 = tick(20, 20, 8);
            check(heard25.notes['tick:heat'] === -38, '25. nothing only in the hidden record: the tick tells the view', JSON.stringify(heard25.notes));
            for (const [lang, line] of [['uk', '@A 🌡️ жар -38'], ['en', '@A 🌡️ heat -38']])
                check(tick(20, 20, 8, () => {}, { lang }).text.includes(line), `25. the record says «${line}» on the opponent's turn`, tick(20, 20, 8, () => {}, { lang }).text.slice(0, 120));
            G.setLang('en');
        }
        {   // Its place among the start-of-turn ticks: after the target's own, so it can knock out
            const order = tick(20, 20, 8, fx => put(fx, 'A', 'burn'));
            check(order.text.indexOf('Burn') !== -1 && order.text.indexOf('Burn') < order.text.indexOf('🌡️') && order.hpA === MAX - 17 - 38, "25. the tick comes after the target's own debuff ticks (Burn -17, then heat -38)", order.text.slice(0, 160));
            // 20 HP after the Burn, +22 from Regeneration, -38 from the heat: 4. Heat before the heal would stop at 0 and end on 22
            const healed = tick(20, 20, 8, fx => { hurt(fx, 'A', MAX, 20); put(fx, 'A', 'regen'); });
            check(healed.hpA === 4, "25. ...and after its buff ticks: Regeneration can't undo a knockout the heat deals", String(healed.hpA));
            const out = scripted({ A: drake(), B: OR(), setup: fx => { fx.B.heat = 8; hurt(fx, 'A', MAX, 10); }, turns: [dice({ before: [0.99] })] });
            check(out.ended && out.turns[0].hpA === 0 && out.turns[0].text.includes('🌡️ heat -38') && !/\[Turn 1\]/.test(out.turns[0].text), '25. the tick can knock the opponent out, before it attacks', JSON.stringify([out.ended, out.turns[0].hpA, out.turns[0].text.slice(0, 160)]));
            const dead = scripted({ A: drake(), B: OR(), setup: fx => { fx.B.heat = 8; hurt(fx, 'A', MAX, 0); }, turns: [dice()] });
            check(dead.ended && !dead.turns[0].text.includes('🌡️'), "25. a debuff tick that knocks it out leaves the heat nothing to do", dead.turns[0].text.slice(0, 160));
            const m = G.getMaxHP(20, 'plain', T(245));
            const reborn = scripted({ A: drake('plain', T(245)), B: OR(), setup: fx => { fx.B.heat = 8; hurt(fx, 'A', m, 10, m); }, turns: [dice({ before: [0.99] })] });
            check(!reborn.ended && reborn.turns[0].hpA > 0 && reborn.turns[0].notes.phoenix, '25. Відродження survives a tick that would knock it out', JSON.stringify(reborn.turns[0].notes));
        }

        // The block roll: the chance a hit would face now, no more; a blocked tick deals nothing, and it never uses up a count
        {
            const roll = (r, A, setup = () => {}, B = OR()) => scripted({ A, B, setup: fx => { fx.B.heat = 8; setup(fx); }, turns: [dice({ before: [r], block: 0.01 })] }).turns[0];
            const bad = [];
            for (const [what, A, setup, chance] of [['a plain drake', drake(), () => {}, 10], ['Чорний at level 20', drake('black'), () => {}, 20], ['Чорний at level 1', drake('black', null, 1), () => {}, 13],
                ['Тінь', drake(), fx => put(fx, 'A', 'shadow'), 35], ['Тінь on Чорний', drake('black'), fx => put(fx, 'A', 'shadow'), 45], ['Квантовий ухил', drake('plain', titleWith('quantum_dodge')), () => {}, 20]]) {
                const under = roll((chance - 0.01) / 100, A, setup), at = roll(chance / 100, A, setup);
                if (!under.notes.tickBlock || under.notes['tick:heat'] !== 0) bad.push(`${what}: a roll under ${chance}% isn't blocked: ${JSON.stringify(under.notes)}`);
                if (at.notes.tickBlock || !(at.notes['tick:heat'] < 0)) bad.push(`${what}: a roll at ${chance}% is blocked: ${JSON.stringify(at.notes)}`);
            }
            check(!bad.length, '25. the tick rolls the ultra-block a hit would face now: 10%, Чорний 13–20%, Тінь +25%, Квантовий ухил +10%', bad.join(' | '));
            const shadeBlocked = roll(0.3, drake(), fx => put(fx, 'A', 'shadow')), plainBlocked = roll(0.05, drake(), fx => put(fx, 'A', 'shadow'));
            check(shadeBlocked.notes.tickBlock.shadow === true && plainBlocked.notes.tickBlock.shadow === false, "25. the view hears whether Тінь's bonus did it, as on a blocked hit", JSON.stringify([shadeBlocked.notes.tickBlock, plainBlocked.notes.tickBlock]));
            const blocked = roll(0.05, drake());
            check(blocked.hpA === MAX && blocked.fx.B.heat === 8, '25. a blocked tick deals nothing, and the heat stays', JSON.stringify([blocked.hpA, blocked.fx.B.heat]));
            const left = (t, id) => (t.fx.A.buff.find(x => x.id === id) || {}).left;
            const shadeKept = roll(0.05, drake(), fx => put(fx, 'A', 'shadow')), shadeHit = roll(0.99, drake(), fx => put(fx, 'A', 'shadow'));
            const shieldKept = roll(0.05, drake(), fx => put(fx, 'A', 'shield')), shieldHit = roll(0.99, drake(), fx => put(fx, 'A', 'shield'));
            check([shadeKept, shadeHit].every(t => left(t, 'shadow') === 2) && [shieldKept, shieldHit].every(t => left(t, 'shield') === 2), '25. a tick uses up no Тінь or Щит count, blocked or not', JSON.stringify([shadeKept, shadeHit].map(t => left(t, 'shadow')).concat([shieldKept, shieldHit].map(t => left(t, 'shield')))));
            const divine = roll(0.05, drake(), fx => put(fx, 'B', 'divine'));
            check(divine.notes.tickBlock && divine.fx.B.buff[0].left === 1, "25. the holder's Божественна міць doesn't pierce the block: that's a hit's, and the tick doesn't use it up", JSON.stringify(divine.notes));
            const first = scripted({ A: drake(), B: OR(T(208)), setup: fx => { fx.B.heat = 8; }, turns: [dice({ before: [0.05], block: 0.01 })] }).turns[0];
            check(first.notes.tickBlock, "25. nor do the holder's Перша кров's unblockable hits", JSON.stringify(first.notes));
            const wd = scripted({ A: WD(), B: OR(), setup: fx => { fx.B.heat = 8; fx.A.scales.now = 50; }, turns: [dice({ before: [0.05], block: 0.01 })] }).turns[0];
            check(wd.notes.tickBlock && wd.fx.A.scales.now === 50, "25. a blocked tick leaves the White Drake's scales alone", JSON.stringify(wd.fx.A.scales));
            for (const [lang, line] of [['uk', '@A 🌡️ жар: 🚫 блок'], ['en', '@A 🌡️ heat: 🚫 block']]) {
                const t = scripted({ A: drake(), B: OR(), lang, setup: fx => { fx.B.heat = 8; }, turns: [dice({ before: [0.05], block: 0.01 })] }).turns[0];
                check(t.text.includes(line), `25. the record says «${line}»`, t.text.slice(0, 120));
            }
            G.setLang('en');
        }

        // Nothing else that stops a hit or a debuff stops it
        {
            const untouched = [['Щит', 'plain', null, fx => put(fx, 'A', 'shield')], ["Синій's armour and reflect", 'blue', null, () => {}],
                ['Шипи', 'plain', titleWith('thorns'), () => {}], ['Контратака', 'plain', T(217), () => {}], ['404', 'plain', T(275), () => {}],
                ['debuff immunity', 'plain', titleWith('debuff_immunity'), () => {}], ['Очищення', 'plain', T(229), fx => put(fx, 'A', 'mark')]];
            const bad = [];
            for (const [what, type, title, setup] of untouched) {
                const m = G.getMaxHP(20, type, title), want = Math.round(m * 1.4 * 8 / 100);
                const r = scripted({ A: drake(type, title), B: OR(), setup: fx => { fx.B.heat = 8; setup(fx); }, turns: [dice({ before: [0.99], block: 0.01 })] }).turns[0];
                if (r.hpA !== m - want || r.hpB !== OMAX) bad.push(`${what}: A ${m} → ${r.hpA} (want ${m - want}), B ${r.hpB} (want ${OMAX})`);
            }
            check(!bad.length, "25. the tick is neither a hit nor a debuff: Щит, armour, reflect, Шипи, Контратака, 404, debuff immunity and Очищення don't touch it, and nothing comes back at the holder", bad.join(' | '));
            const bloom = scripted({ A: drake('green'), B: OR(), setup: fx => { fx.A.meter = 5; fx.B.heat = 8; }, turns: [dice({ before: [0.99] }), dice({ block: 0.01 }), dice({ before: [0.99], block: 0.01 })] }).turns;
            check(/Bloom/.test(bloom[0].text) && bloom[0].fx.B.heat === 8 && bloom[2].text.includes('🌡️ heat'), "25. Цвітіння takes off debuffs, not the heat", JSON.stringify(bloom.map(t => t.fx.B.heat)));
        }

        // The White Dragon and the White Drake
        {
            const dragon = scripted({ A: DRAGON(), B: OR(), setup: fx => { fx.B.heat = 8; }, turns: [dice()] }).turns[0];
            check(dragon.hpA === 99999 && !dragon.text.includes('🌡️'), '25. the White Dragon ignores the heat', dragon.text.slice(0, 120));
            const m = G.getMaxHP(20, G.WHITE_DRAKE_TYPE, T(G.WHITE_DRAKE_TITLE_ID)), burn = Math.round(m * 1.4 * 8 / 100), sc = G.scalesOf(20, m);
            const full = scripted({ A: WD(), B: OR(), setup: fx => { fx.B.heat = 8; }, turns: [dice({ before: [0.99], block: 0.01 })] }).turns[0];
            check(full.fx.A.scales.now === sc - burn && full.hpA === m, `25. against the White Drake the heat burns the scales first (${sc} → ${sc - burn}), her HP stays`, JSON.stringify([full.fx.A.scales, full.hpA]));
            const thin = scripted({ A: WD(), B: OR(), setup: fx => { fx.B.heat = 8; fx.A.scales.now = 5; }, turns: [dice({ before: [0.99], block: 0.01 })] }).turns[0];
            check(thin.fx.A.scales.now === 0 && thin.hpA === m - (burn - 5) && thin.notes.crack, '25. ...then her HP, the way hits do, and the scales crack', JSON.stringify([thin.fx.A.scales, thin.hpA, thin.notes]));
            let bounced = null, landed = null;
            scripted({ A: OR(), B: WD(), setup: (fx, a, b) => { bounced = G.applyEffect(a, b, 'melt', 20, fx); fx.B.scales.now = 0; landed = G.applyEffect(a, b, 'melt', 20, fx); } });
            check(bounced === 'bounced' && landed === 'applied', "25. Оплавлення bounces off the scales while they hold, and lands once they're gone", JSON.stringify([bounced, landed]));
        }

        // The effects with the title abilities: each treats them like any other
        {
            const long = (() => { let left = null; scripted({ A: drake('plain', T(232)), setup: (fx, a, b) => { G.applyEffect(a, b, 'stoke', 20, fx); left = fx.A.buff[0].left; } }); return left; })();
            check(long === 4, '25. Довгий баф: Запал lasts 4 attacks', String(long));
            const eaten = scripted({ A: drake('plain', T(220)), setup: fx => { hurt(fx, 'A', G.getMaxHP(20, 'plain', T(220)), 100); put(fx, 'B', 'stoke'); }, turns: [dice({ after: [0.1, 0] })] }).turns[0];
            check(eaten.notes.eaten && eaten.notes.eaten.id === 'stoke' && !eaten.fx.B.buff.length, '25. Пожирач бафів eats Запал', JSON.stringify(eaten.notes));
            let sent = null;
            scripted({ A: OR(), B: drake('plain', T(264)), setup: (fx, a, b) => { rolled([0.1], () => G.applyEffect(a, b, 'melt', 20, fx)); sent = { a: fx.A.debuff.map(x => x.id), b: fx.B.debuff.map(x => x.id) }; } });
            check(sent.a.join() === 'melt' && !sent.b.length, '25. Повернення sends Оплавлення back to its caster', JSON.stringify(sent));
            const cleansed = scripted({ A: drake('plain', T(229)), setup: fx => put(fx, 'A', 'melt'), turns: [dice()] }).turns[0];
            check(!cleansed.fx.A.debuff.length && cleansed.notes.cleanse.join() === 'melt', '25. Очищення takes Оплавлення off', JSON.stringify(cleansed.notes));
            const stolen = scripted({ A: drake('black'), setup: fx => { fx.A.meter = 5; put(fx, 'B', 'stoke', 2); }, turns: [dice()] }).turns[0];
            check(stolen.fx.A.buff.map(x => `${x.id}:${x.left}`).join() === 'stoke:1' && !stolen.fx.B.buff.length, '25. Крадіжка тіні takes Запал with what it has left (2, and its own attack uses one)', JSON.stringify(stolen.fx.A.buff));
            let dispelled = null;
            scripted({ A: drake('purple'), B: OR(), setup: (fx, a, b) => { put(fx, 'B', 'stoke'); dispelled = { r: G.applyEffect(a, b, 'dispel', 20, fx), left: fx.B.buff.length }; } });
            check(dispelled.r === 'dispelled' && dispelled.left === 0, '25. Розвіювання takes Запал off', JSON.stringify(dispelled));
            let pulled = null;
            scripted({ A: OR(), B: WD(), setup: (fx, a, b) => { put(fx, 'A', 'magnet'); pulled = { r: G.applyEffect(a, b, 'stoke', 20, fx), wd: fx.B.buff.map(x => x.id), mine: fx.A.buff.length }; } });
            check(pulled.r === 'pulled' && pulled.wd.join() === 'stoke' && !pulled.mine, '25. Магніт pulls Запал to the White Drake', JSON.stringify(pulled));
            let immune = null;
            scripted({ A: OR(), B: drake('plain', titleWith('debuff_immunity')), setup: (fx, a, b) => { immune = G.applyEffect(a, b, 'melt', 20, fx); } });
            check(immune === 'immune', '25. debuff immunity stops Оплавлення', String(immune));
            const inPool = ['stoke', 'melt'].every(id => G.POOL_IDS.includes(id));
            check(inPool, '25. both join the shared pool', G.POOL_IDS.join());
        }

        // Effect power and the sims' own ultimates are in effects.js and ultimates.js; Перевантаження scales Виверження like any attack
        {
            const hit = title => scripted({ A: OR(title), setup: fx => { fx.A.meter = 5; fx.A.heat = 8; strong('A')(fx); }, turns: [dice()], hp: 1e6 }).turns[0];
            const bare8 = hit(bare(T(268))), boosted = hit(T(268));
            check(near(boosted.dmg, Math.round(bare8.dmg * 1.6)) && boosted.fx.A.heat === 4, '25. Перевантаження: Виверження ×1.6 on top of its heat', JSON.stringify([bare8.dmg, boosted.dmg]));
        }

        {
            const told = scripted({ A: OR(), setup: fx => put(fx, 'A', 'stoke'), turns: [dice()] }).turns[0];
            check(told.notes.stoke && /POWER/.test(told.text), '25. nothing only in the hidden record: Запал\'s extra point tells the view', JSON.stringify(told.notes));
            const erupted = scripted({ A: OR(), setup: fx => { fx.A.meter = 5; fx.A.heat = 8; }, turns: [dice()] }).turns[0];
            check(erupted.notes.mult === 1.9 && erupted.notes.heatFrom === 8 && erupted.notes.heatTo === 4 && erupted.text.includes('8 → 4'), '25. nothing only in the hidden record: Виверження tells the view its multiplier and the heat', JSON.stringify(erupted.notes));
        }

        // The card: the heat in the meter's row, for Помаранчевий alone
        {
            scripted({ A: OR(), B: drake('red'), turns: [dice(), dice({ before: [0.99], block: 0.01 }), dice()] });
            const mine = document.getElementById('power-p1').innerHTML, theirs = document.getElementById('power-p2').innerHTML;
            check(mine.includes('pm-heat') && mine.includes('2/8') && !theirs.includes('pm-heat'), "25. the fighter card shows the heat (2/8) in the meter's row, and only on Помаранчевий's card", mine.slice(-160));
        }
    }

    // ---- 26. Season 2's Вишневий. Every number is written out here, like section 24's
    {
        console.log('\n[26. Season 2: Вишневий]');
        const CH = (title = null, level = 20) => drake('cherry', title, level);
        const MAX = 340, CMAX = 360;   // a plain level-20 drake's max HP (150 + 19 × 10); Вишневий's, 6% more

        for (const [lang, make1, word] of [['uk', '!дрейк', 'вишневий'], ['en', '!drake', 'cherry']]) {
            G.setLang(lang);
            fresh();
            G.say('viewer1', `${make1} ${word}`);
            const made = G.getDragonDB().viewer1, named = lastInfo();
            check(made && made.drakeObj.type === 'cherry' && named.includes(lang === 'uk' ? 'Вишневий Дрейк' : 'Cherry Drake') && !named.includes('🍒'), `26. "${make1} ${word}" gives the Cherry Drake, named with no emoji`, named);
        }
        check(G.VIEWER_DRAKE_TYPES.some(d => d.type === 'cherry'), '26. random picks can give the Cherry Drake', JSON.stringify(G.VIEWER_DRAKE_TYPES.map(d => d.type)));

        // Кривавий шал: +1% for every 2.5% of max HP lost, every 2.1% from level 10, every 1.38% at level 20
        {
            const hit = (level, share, title = null) => { const m = G.getMaxHP(level, 'cherry', title); return scripted({ A: CH(title, level), setup: fx => { if (share) hurt(fx, 'A', m, Math.round(m * (1 - share))); strong('A')(fx); }, turns: [dice()] }).turns[0]; };
            const steps = (level, table) => { const b = hit(level, 0).dmg; return table.filter(([share, m]) => Math.abs(hit(level, share).dmg / (b * m) - 1) >= 0.01).map(([s]) => `${level}: ${s} → ${hit(level, s).dmg / b}`); };
            const bad = [...steps(19, [[0.3, 1.1429], [0.6, 1.2857], [0.9, 1.4286]]), ...steps(1, [[0.9, 1.36]]), ...steps(20, [[0.3, 1.2174], [0.6, 1.4348], [0.9, 1.6522]])];
            check(!bad.length, '26. Кривавий шал: +1% for every 2.5% of max HP lost (+36% at 10% HP), every 2.1% from level 10 (+43%), every 1.38% at level 20 (+65%), nothing at full HP', bad.join(' | '));
            const t = T(260), both = hit(20, 0.9, t).dmg, neither = hit(20, 0, bare(t)).dmg;
            check(Math.abs(both / (neither * 1.6522 * 1.3) - 1) < 0.01, '26. it stacks with Загартування: ×1.65 and ×1.3 together', String(both / neither));
            const told = hit(20, 0.6);
            check(told.notes.frenzy === 43, '26. nothing only in the hidden record: the bonus tells the view', JSON.stringify(told.notes));
            const notHere = scripted({ A: drake('red'), setup: fx => hurt(fx, 'A', MAX, 34), turns: [dice()] }).turns[0];
            check(!notHere.notes.frenzy, "26. Кривавий шал is Вишневий's alone", JSON.stringify(notHere.notes));
            // The card: +N% once it's above 0, from the HP it has now
            const row = () => document.getElementById('power-p1').innerHTML;
            scripted({ A: CH(), B: drake('red'), turns: [dice({ block: 0.01 })] });
            const full = row();
            scripted({ A: CH(), B: drake('red'), setup: fx => hurt(fx, 'A', CMAX, 144), turns: [dice({ block: 0.01 })] });
            const hurtRow = row();
            check(!full.includes('pm-frenzy') && hurtRow.includes('pm-frenzy') && hurtRow.includes('+43%'), "26. the card shows the bonus (+43% at 40% HP) once it's above 0, and nothing at full HP", hurtRow.slice(-160));
            const healed = scripted({ A: CH(), setup: fx => { hurt(fx, 'A', CMAX, 144); put(fx, 'A', 'regen'); }, turns: [dice({ block: 0.01 })] }).turns[0];
            check(healed.fx.A.frenzy === 39, "26. the card's bonus follows its HP down as well as up (+39% once Регенерація has healed it)", String(healed.fx.A.frenzy));
        }

        // Кров за кров
        {
            const heal = (setup, d = {}, A = CH(), B = {}) => scripted({ A, B, setup: fx => { hurt(fx, 'A', CMAX, 100); setup(fx); }, turns: [dice(d)] }).turns[0];
            const buff = fx => put(fx, 'A', 'bloodprice');
            const t = heal(buff);
            check(t.notes.bloodprice === Math.round(t.dmg * 0.5) && t.hpA === 100 + Math.round(t.dmg * 0.5), `26. Кров за кров: heals half the damage the attack dealt (${t.dmg} → +${t.notes.bloodprice})`, JSON.stringify([t.dmg, t.notes, t.hpA]));
            const poisoned = heal(fx => { buff(fx); put(fx, 'A', 'poison'); });
            check(poisoned.notes.bloodprice === Math.round(poisoned.dmg * 0.5 * 0.5), `26. Отруєння cuts it (${poisoned.dmg} → +${poisoned.notes.bloodprice})`, JSON.stringify(poisoned.notes));
            const deep = heal(fx => { buff(fx); fx.A.debuff.push({ id: 'poison', left: 3, power: 100 }); });
            check(deep.notes.bloodprice === Math.round(deep.dmg * 0.5 * 0.1) || (deep.dmg * 0.05 < 0.5 && !deep.notes.bloodprice), "26. Отруєння's cut stops at 90%", JSON.stringify([deep.dmg, deep.notes]));
            const big = heal(fx => { fx.A.buff.push({ id: 'bloodprice', left: 2, power: 3 }); });
            check(big.notes.bloodprice === Math.round(big.dmg * 0.9), `26. effect power scales it, up to 90% of the damage (power ×3: ${big.dmg} → +${big.notes.bloodprice})`, JSON.stringify([big.dmg, big.notes]));
            const top = scripted({ A: CH(), setup: fx => { hurt(fx, 'A', CMAX, CMAX - 5); buff(fx); }, turns: [dice()] }).turns[0];
            check(top.notes.bloodprice === 5 && top.hpA === CMAX, '26. it stops at max HP', JSON.stringify([top.notes, top.hpA]));
            const blocked = heal(buff, { block: 0.01 });
            check(blocked.dmg === 0 && !blocked.notes.bloodprice && blocked.fx.A.buff[0].left === 1, '26. a blocked attack heals nothing, and it still counts down', JSON.stringify(blocked.fx.A.buff));
            const twin = heal(buff, { after: [0.01] }, CH(T(249)));
            check(twin.notes.twin > 0 && twin.notes.bloodprice === Math.round((twin.dmg + twin.notes.twin) * 0.5), "26. Двійник's second hit is part of the attack, so its damage counts", JSON.stringify([twin.dmg, twin.notes]));
            const vamp = heal(buff, { attack: 0.95 });
            check(vamp.notes.vamp > 0 && vamp.notes.bloodprice > 0, "26. it adds to a vampire attack's own heal", JSON.stringify(vamp.notes));
            const thorned = scripted({ A: CH(), B: drake('plain', titleWith('thorns')), setup: fx => { hurt(fx, 'A', CMAX, 2); buff(fx); }, turns: [dice()] });
            check(thorned.ended && !thorned.turns[0].notes.bloodprice && thorned.turns[0].hpA === 0, "26. a drake Шипи knocked out on its own attack doesn't heal back", JSON.stringify([thorned.ended, thorned.turns[0].notes]));
        }

        // Кровотеча: 4% of its own max HP after each attack it makes
        {
            const bled = (A = drake(), B = {}, turn = dice({ block: 0.01 }), setup = () => {}) => scripted({ A, B, setup: fx => { put(fx, 'A', 'bleed'); setup(fx); }, turns: [turn] }).turns[0];
            const t = bled();
            check(t.notes.bleed === 14 && t.hpA === MAX - 14 && t.text.includes('Bleed (-14 HP)'), '26. Кровотеча: 4% of its own max HP after its attack, blocked or not', JSON.stringify([t.notes, t.hpA]));
            const slept = bled(drake('plain', titleWith('sleepy')), {}, [0.5, 0.5, 0.5, 0, 0.99, 0.99, 0.99]);
            check(/Slept through/.test(slept.text) && slept.notes.bleed > 0, '26. a «Проспав хід» attack is still an attack: it ticks', slept.text.slice(0, 120));
            const twin = bled(drake('plain', T(249)), {}, dice({ after: [0.01] }));
            const twinMax = G.getMaxHP(20, 'plain', T(249));
            check(twin.notes.twin > 0 && twin.fx.A.debuff[0].left === 2 && twin.hpA === twinMax - Math.round(twinMax * 0.04) && (twin.text.match(/Bleed \(-/g) || []).length === 1, "26. Двійник's second hit is part of the same attack: one tick, one 4% off its HP", JSON.stringify([twin.hpA, twinMax, twin.text.slice(0, 120)]));
            // Read on the next turn: a lost turn doesn't draw the HP again, so the card would hide a tick
            const [frozen, afterFrozen] = scripted({ A: drake(), setup: fx => { put(fx, 'A', 'bleed'); put(fx, 'A', 'frost'); }, turns: [[], dice({ block: 0.01 })] }).turns;
            check(/frozen/.test(frozen.text) && !frozen.notes.bleed && afterFrozen.hpA === MAX && frozen.fx.A.debuff.find(x => x.id === 'bleed').left === 3, "26. a turn lost to Мороз makes no attack: no tick, no HP lost, and it doesn't count down", JSON.stringify([afterFrozen.hpA, frozen.fx.A.debuff]));
            const crashed = bled(drake(), drake('plain', T(278)), [0.01]);
            check(/freezes/.test(crashed.text) && !crashed.notes.bleed && crashed.hpA === MAX, '26. nor does a turn lost to Синій екран', crashed.text.slice(0, 120));
            const away = scripted({ A: drake('plain', T(284)), setup: fx => put(fx, 'A', 'bleed'), turns: [dice({ before: [0] }), dice(), []] }).turns[2];
            check(/is away/.test(away.text) && !away.notes.bleed, '26. nor does a turn AFK skips', away.text.slice(0, 120));
            const bloom = bled(drake('green'), {}, dice(), fx => { fx.A.meter = 5; });
            check(/Bloom/.test(bloom.text) && !bloom.notes.bleed, '26. Цвітіння replaces the attack and takes the debuff off: no tick', bloom.text.slice(0, 120));
            const mirror = bled(drake('blue'), {}, dice(), fx => { fx.A.meter = 5; });
            check(/Ice Mirror/.test(mirror.text) && !mirror.notes.bleed && mirror.fx.A.debuff[0].left === 3, 'Крижане дзеркало replaces the attack too: no tick, no count'.replace(/^/, '26. '), mirror.text.slice(0, 120));
            const storm = bled(drake('red'), {}, dice(), fx => { fx.A.meter = 5; });
            check(/Firestorm/.test(storm.text) && storm.notes.bleed > 0, '26. an attacking ultimate is an attack: it ticks', storm.text.slice(0, 120));
            const hurtB = scripted({ B: drake(), setup: fx => put(fx, 'A', 'bleed'), turns: [dice({ block: 0.01 }), dice({ block: 0.01 })] }).turns;
            check(hurtB[0].notes.bleed && !hurtB[1].notes.bleed, "26. it ticks on its holder's attacks only", JSON.stringify(hurtB.map(x => x.notes)));
            // Knockouts
            const won = scripted({ A: drake('plain'), setup: fx => { put(fx, 'A', 'bleed'); fx.A.buff.push({ id: 'rage', left: 2, power: 100 }); }, turns: [dice()] });
            check(won.ended && won.turns[0].hpB === 0 && won.turns[0].hpA === MAX && !won.turns[0].notes.bleed, "26. the attack that ends the fight: no tick after it", JSON.stringify([won.ended, won.turns[0].hpA, won.turns[0].notes]));
            const lost = scripted({ A: drake(), setup: fx => { hurt(fx, 'A', MAX, 5); put(fx, 'A', 'bleed'); }, turns: [dice({ block: 0.01 })] });
            check(lost.ended && lost.turns[0].hpA === 0 && lost.turns[0].notes.bleed === 14, '26. it can knock the bleeding drake out', JSON.stringify([lost.ended, lost.turns[0].hpA, lost.turns[0].notes]));
            const m = G.getMaxHP(20, 'plain', T(245));
            const reborn = scripted({ A: drake('plain', T(245)), setup: fx => { hurt(fx, 'A', m, 5, m); put(fx, 'A', 'bleed'); }, turns: [dice({ block: 0.01 })] });
            check(!reborn.ended && reborn.turns[0].hpA === 1 && reborn.turns[0].notes.phoenix, '26. Відродження survives it', JSON.stringify([reborn.ended, reborn.turns[0].hpA]));
            // The White Drake and the White Dragon
            let bounced = null, landed = null;
            scripted({ A: CH(), B: WD(), setup: (fx, a, b) => { bounced = G.applyEffect(a, b, 'bleed', 20, fx); fx.B.scales.now = 0; landed = G.applyEffect(a, b, 'bleed', 20, fx); } });
            check(bounced === 'bounced' && landed === 'applied', "26. Кровотеча bounces off the White Drake's scales while they hold, and lands once they're gone", JSON.stringify([bounced, landed]));
            const wdMax = G.getMaxHP(20, G.WHITE_DRAKE_TYPE, T(G.WHITE_DRAKE_TITLE_ID));
            const onHp = scripted({ A: WD(), setup: fx => { put(fx, 'A', 'bleed'); fx.A.scales.now = 40; }, turns: [dice({ block: 0.01 })] }).turns[0];
            check(onHp.fx.A.scales.now === 40 && onHp.hpA === wdMax - Math.round(wdMax * 0.04), "26. it's damage, not a hit: the scales rebuilt over it don't take it, like Burn and Poison", JSON.stringify([onHp.fx.A.scales, onHp.hpA]));
            let immune = null, dragon = null;
            scripted({ A: CH(), B: drake('plain', titleWith('debuff_immunity')), setup: (fx, a, b) => { immune = G.applyEffect(a, b, 'bleed', 20, fx); } });
            scripted({ A: CH(), B: DRAGON(), setup: (fx, a, b) => { dragon = G.applyEffect(a, b, 'bleed', 20, fx); } });
            check(immune === 'immune' && dragon === 'immune', 'debuff immunity and the White Dragon stop it'.replace(/^/, '26. '), JSON.stringify([immune, dragon]));
        }

        // The effects with the title abilities: each treats them like any other
        {
            const long = (() => { let left = null; scripted({ A: drake('plain', T(232)), setup: (fx, a, b) => { G.applyEffect(a, b, 'bloodprice', 20, fx); left = fx.A.buff[0].left; } }); return left; })();
            check(long === 4, '26. Довгий баф: Кров за кров lasts 4 attacks', String(long));
            const eaten = scripted({ A: drake('plain', T(220)), setup: fx => { hurt(fx, 'A', G.getMaxHP(20, 'plain', T(220)), 100); put(fx, 'B', 'bloodprice'); }, turns: [dice({ after: [0.1, 0] })] }).turns[0];
            check(eaten.notes.eaten && eaten.notes.eaten.id === 'bloodprice' && !eaten.fx.B.buff.length, '26. Пожирач бафів eats Кров за кров', JSON.stringify(eaten.notes));
            let sent = null;
            scripted({ A: CH(), B: drake('plain', T(264)), setup: (fx, a, b) => { rolled([0.1], () => G.applyEffect(a, b, 'bleed', 20, fx)); sent = { a: fx.A.debuff.map(x => x.id), b: fx.B.debuff.map(x => x.id) }; } });
            check(sent.a.join() === 'bleed' && !sent.b.length, '26. Повернення sends Кровотеча back to its caster', JSON.stringify(sent));
            const cleansed = scripted({ A: drake('plain', T(229)), setup: fx => put(fx, 'A', 'bleed'), turns: [dice()] }).turns[0];
            check(!cleansed.fx.A.debuff.length && cleansed.notes.cleanse.join() === 'bleed' && !cleansed.notes.bleed, '26. Очищення takes Кровотеча off before it can act', JSON.stringify(cleansed.notes));
            const stolen = scripted({ A: drake('black'), setup: fx => { fx.A.meter = 5; put(fx, 'B', 'bloodprice', 2); }, turns: [dice()] }).turns[0];
            check(stolen.fx.A.buff.map(x => `${x.id}:${x.left}`).join() === 'bloodprice:1' && !stolen.fx.B.buff.length, '26. Крадіжка тіні takes Кров за кров with what it has left (2, and its own attack uses one)', JSON.stringify(stolen.fx.A.buff));
            let dispelled = null;
            scripted({ A: drake('purple'), B: CH(), setup: (fx, a, b) => { put(fx, 'B', 'bloodprice'); dispelled = { r: G.applyEffect(a, b, 'dispel', 20, fx), left: fx.B.buff.length }; } });
            check(dispelled.r === 'dispelled' && dispelled.left === 0, '26. Розвіювання takes Кров за кров off', JSON.stringify(dispelled));
            let pulled = null;
            scripted({ A: CH(), B: WD(), setup: (fx, a, b) => { put(fx, 'A', 'magnet'); pulled = { r: G.applyEffect(a, b, 'bloodprice', 20, fx), wd: fx.B.buff.map(x => x.id), mine: fx.A.buff.length }; } });
            check(pulled.r === 'pulled' && pulled.wd.join() === 'bloodprice' && !pulled.mine, '26. Магніт pulls Кров за кров to the White Drake', JSON.stringify(pulled));
            check(['bloodprice', 'bleed'].every(id => G.POOL_IDS.includes(id)), '26. both join the shared pool', G.POOL_IDS.join());
            const hit = title => scripted({ A: CH(title), setup: fx => { fx.A.meter = 5; hurt(fx, 'A', G.getMaxHP(20, 'cherry', title), 40); strong('A')(fx); }, turns: [dice()], hp: null }).turns[0];
            const plain = hit(bare(T(268))), boosted = hit(T(268));
            check(/Last Breath/.test(plain.text) && boosted.dmg > plain.dmg * 1.3, 'Перевантаження scales Останній подих like any attacking ultimate'.replace(/^/, '26. '), JSON.stringify([plain.dmg, boosted.dmg]));
        }
    }

    // ---- 27. Season 2's Бірюзовий. Every number is written out here, like section 24's
    {
        console.log('\n[27. Season 2: Бірюзовий]');
        const TQ = (title = null, level = 20) => drake('turquoise', title, level);
        const MAX = 346;   // Бірюзовий's max HP at level 20: 2% more than a plain drake's 340

        for (const [lang, make1, word] of [['uk', '!дрейк', 'бірюзовий'], ['en', '!drake', 'turquoise']]) {
            G.setLang(lang);
            fresh();
            G.say('viewer1', `${make1} ${word}`);
            const made = G.getDragonDB().viewer1, named = lastInfo();
            check(made && made.drakeObj.type === 'turquoise' && named.includes(lang === 'uk' ? 'Бірюзовий Дрейк' : 'Turquoise Drake') && !named.includes('🐚'), `27. "${make1} ${word}" gives the Turquoise Drake, named with no emoji`, named);
        }

        // What adds a layer. B is Бірюзовий here: A's hits are the ones it takes
        const layers = r => r.turns.map(t => t.fx.B.layers);
        {
            const cold = scripted({ A: drake('red'), B: TQ(), turns: [] }).fx;
            check(cold.B.layers === 0 && cold.A.layers === null, '27. a fight starts with no layers, and only Бірюзовий has any', JSON.stringify([cold.A.layers, cold.B.layers]));
            check(layers(scripted({ B: TQ(), turns: rounds(3) })).join() === '1,1,2', "27. every hit it takes adds a layer; its own attacks don't", layers(scripted({ B: TQ(), turns: rounds(3) })).join());
            check(layers(scripted({ B: TQ(), turns: [dice({ block: 0.01 })] })).join() === '1', '27. a blocked hit adds one too', '');
            check(layers(scripted({ B: TQ(), setup: fx => { fx.B.layers = 5; }, turns: [dice(), dice(), dice()] })).join() === '6,6,6', '27. layers stop at 6', '');
            const twin = scripted({ A: drake('plain', T(249)), B: TQ(), turns: [dice({ after: [0.01] })] }).turns[0];
            check(twin.notes.twin > 0 && twin.fx.B.layers === 2, "27. Двійник's second hit is a hit of its own: another layer", JSON.stringify(twin.fx.B.layers));
            const lag = scripted({ A: drake('plain', T(287)), B: TQ(), turns: [dice({ after: [0.01] }), dice({ block: 0.01 }), dice({ block: 0.01 })] }).turns;
            check(lag[0].fx.B.layers === 1 && lag[2].notes.lagLand > 0 && lag[2].fx.B.layers === 3, "27. Лаг: the attack is a hit taken and the stuck hit a hit of its own (then that turn's attack): a layer each", lag.map(t => t.fx.B.layers).join());
            const ticks = scripted({ A: TQ(), setup: fx => { put(fx, 'A', 'burn'); put(fx, 'A', 'poison'); fx.B.heat = 8; }, turns: [dice({ before: [0.99], block: 0.01 })] }).turns[0];
            check(ticks.fx.A.layers === 0, '27. ticks add none', String(ticks.fx.A.layers));
        }

        // The cut: 3.75% a layer, 4% from level 5, 4.5% from level 10, 5.5% at level 20, on every kind of hit
        {
            const hit = (layersOn, d = {}, level = 20, setup = () => {}) => scripted({ B: TQ(null, level), setup: fx => { fx.B.layers = layersOn; strong('A')(fx); setup(fx); }, turns: [dice(d)] }).turns[0];
            const ratio = (n, d, level) => hit(n, d, level).dmg / hit(0, d, level).dmg, close = (a, b) => Math.abs(a / b - 1) < 0.01;
            const SNEAKY = { attack: 0.3, sub: 0.9 }, VAMPIRE = { attack: 0.95, sub: 0.3 }, bad = [];
            for (const [what, d] of [['magic', {}], ['armour-piercing', SNEAKY], ['vampire', VAMPIRE]]) {
                if (!close(ratio(6, d, 19), 0.73)) bad.push(`${what} at 6 layers, level 19: ×${ratio(6, d, 19)}`);
                if (!close(ratio(6, d, 20), 0.67)) bad.push(`${what} at 6 layers, level 20: ×${ratio(6, d, 20)}`);
                if (!close(ratio(6, d, 5), 0.76)) bad.push(`${what} at 6 layers, level 5: ×${ratio(6, d, 5)}`);
                if (!close(ratio(1, d, 1), 0.9625)) bad.push(`${what} at 1 layer, level 1: ×${ratio(1, d, 1)}`);
            }
            check(!bad.length, '27. Перламутр: −3.75% a layer, −4% from level 5, −4.5% from level 10 (−27% at 6), −5.5% at level 20 (−33%), on every kind of hit, armour-piercing and vampire too', bad.join(' | '));
            const withShield = hit(6, {}, 20, fx => put(fx, 'B', 'shield')).dmg, shieldOnly = hit(0, {}, 20, fx => put(fx, 'B', 'shield')).dmg;
            check(close(withShield, shieldOnly * 0.67), '27. it comes on top of armour and Щит', JSON.stringify([withShield, shieldOnly]));
            // The cap: Щит at its 90% and 6 layers on a hit past armour would leave 6.7%; everything together stops at 90%
            const raw = hit(0, SNEAKY).dmg, capped = hit(6, SNEAKY, 20, fx => { fx.B.buff.push({ id: 'shield', left: 2, power: 10 }); }).dmg;
            check(close(capped, raw * 0.1), `27. defence, Щит and layers together stay inside the 90% cap (${raw} → ${capped})`, JSON.stringify([raw, capped]));
            const told = hit(6);
            check(told.notes.nacre === 33 && told.text.includes('🐚 −33%'), '27. the cut tells the view, and the record says «🐚 −33%»', JSON.stringify([told.notes, told.text.slice(-60)]));
            const none = hit(0), blocked = hit(6, { block: 0.01 });
            check(!none.notes.nacre && !blocked.notes.nacre, '27. no layers, or a blocked hit: no cut to show', JSON.stringify([none.notes, blocked.notes]));
            const dead = scripted({ A: DRAGON(), B: TQ(), setup: fx => { fx.B.layers = 6; }, turns: [dice()] });
            check(dead.ended && dead.turns[0].hpB === 0, "27. the White Dragon's hit stays lethal", JSON.stringify([dead.ended, dead.turns[0].hpB]));
            const copyOn = scripted({ A: drake('plain', T(292)), B: TQ(), setup: fx => { fx.B.layers = 6; }, turns: [dice({ block: 0.01 }), dice(), dice({ after: [0.05] })] }).turns;
            check(copyOn[2].notes.copy === copyOn[1].dmg, "27. Копіпаст deals exactly the number it copies: layers don't cut it", JSON.stringify([copyOn[1].dmg, copyOn[2].dmg]));
        }

        // What layers never touch: ticks and damage returns
        {
            const tick = setup => scripted({ A: TQ(), setup: fx => { fx.A.layers = 6; setup(fx); }, turns: [dice({ block: 0.01 })] }).turns[0];
            check(MAX - tick(fx => put(fx, 'A', 'burn')).hpA === 17, "27. Підпал isn't cut", String(tick(fx => put(fx, 'A', 'burn')).hpA));
            check(MAX - tick(fx => put(fx, 'A', 'poison')).hpA === 10, '27. nor is Отруєння', String(tick(fx => put(fx, 'A', 'poison')).hpA));
            check(MAX - tick(fx => put(fx, 'A', 'bleed')).hpA === 14, '27. nor is Кровотеча', String(tick(fx => put(fx, 'A', 'bleed')).hpA));
            const heat = scripted({ A: TQ(), B: drake('orange'), setup: fx => { fx.A.layers = 6; fx.B.heat = 8; }, turns: [dice({ before: [0.99], block: 0.01 })] }).turns[0];
            check(MAX - heat.hpA === 39, "27. nor is the heat's tick", String(heat.hpA));
            // It attacks a Шипи holder, a reflecting Синій, a Контратака holder and an Ice Mirror: what comes back is the same with 6 layers
            const back = (B, roll, setup = () => {}) => [0, 6].map(n => scripted({ A: TQ(), B, setup: fx => { fx.A.layers = n; setup(fx); }, turns: [dice({ after: roll })] }).turns[0].hpA);
            const same = ([a, b]) => a === b && a < MAX;
            check(same(back(drake('plain', titleWith('thorns')), [])), '27. nor is Шипи', JSON.stringify(back(drake('plain', titleWith('thorns')), [])));
            check(same(back(drake('plain', T(217)), [0.01])), '27. nor is Контратака', JSON.stringify(back(drake('plain', T(217)), [0.01])));
            check(same(back(drake('blue'), [0.01])), "27. nor is Синій's reflect", JSON.stringify(back(drake('blue'), [0.01])));
            check(same(back(drake('blue'), [], fx => { fx.B.mirror = 2; })), "27. nor is Ice Mirror's return", JSON.stringify(back(drake('blue'), [], fx => { fx.B.mirror = 2; })));
        }

        // The card and the record
        {
            scripted({ A: drake('red'), B: TQ(), turns: [dice()] });
            const theirs = document.getElementById('power-p1').innerHTML, mine = document.getElementById('power-p2').innerHTML;
            check(mine.includes('pm-nacre') && mine.includes('1/6') && !theirs.includes('pm-nacre'), "27. the fighter card shows the layers (1/6) in the meter's row, and only on Бірюзовий's card", mine.slice(-140));
            const uk = scripted({ B: TQ(), lang: 'uk', setup: fx => { fx.B.layers = 6; }, turns: [dice()] }).turns[0];
            check(uk.text.includes('🐚 −33%'), '27. the cut reads the same in both languages', uk.text.slice(-80));
            G.setLang('en');
        }

        // Чиста вода
        {
            const cast = (setup, by = TQ(), B = {}) => { let out = null; scripted({ A: by, B, setup: (fx, a, b) => { setup(fx); out = { r: G.applyEffect(a, b, 'clearwater', 20, fx), a: fx.A, b: fx.B }; } }); return out; };
            const washed = cast(fx => { put(fx, 'A', 'burn'); put(fx, 'A', 'seaweed'); put(fx, 'A', 'shield'); });
            check(washed.r === 'cleansed' && !washed.a.debuff.length && washed.a.buff.map(x => x.id).join() === 'shield', '27. Чиста вода takes off all its debuffs, and leaves its buffs', JSON.stringify(washed.a));
            let pulled = null;
            scripted({ A: TQ(), B: WD(), setup: (fx, a, b) => { put(fx, 'A', 'magnet'); put(fx, 'B', 'burn'); pulled = { r: G.applyEffect(a, b, 'clearwater', 20, fx), wd: fx.B.debuff.map(x => x.id), mine: fx.A.debuff.map(x => x.id) }; } });
            check(pulled.r === 'cleansed' && !pulled.wd.length && pulled.mine.join() === 'magnet', "27. Магніт pulls it to the White Drake, like any buff: it cleanses her, not its caster", JSON.stringify(pulled));
            const heat = cast(fx => { fx.B.heat = 8; put(fx, 'A', 'burn'); }, TQ(), drake('orange'));
            check(heat.b.heat === 8, "27. it doesn't stop the heat: no debuff", String(heat.b.heat));
            // The opening buff keeps to buffs that last
            const seen = new Set(), t = titleWith('opening_buff');
            for (let roll = 0.005; roll < 1; roll += 0.01) scripted({ A: drake('plain', t), start: [roll], turns: [] }).fx.A.buff.forEach(x => seen.add(x.id));
            const lasting = G.POOL_IDS.filter(id => G.EFFECTS[id].kind === 'buff' && G.EFFECTS[id].lasts !== 'instant');
            check(!seen.has('clearwater') && lasting.every(id => seen.has(id)), `27. the opening buff can be any buff that lasts, never Чиста вода (${[...seen].join(', ')})`, [...seen].join());
            const stolen = scripted({ A: drake('black'), B: TQ(), setup: fx => { fx.A.meter = 5; }, turns: [dice()] }).turns[0];
            check(!stolen.fx.A.buff.length && !stolen.fx.B.buff.length, '27. it never sits on the list, so Крадіжка тіні finds nothing of it', JSON.stringify(stolen.fx.A.buff));
        }

        // Водорості
        {
            const anvil = scripted({ A: WD(), setup: fx => { fx.A.meter = 5; put(fx, 'A', 'seaweed'); }, turns: [dice({ sub: 0.5 })] }).turns[0];
            check(/Anvil Strike/.test(anvil.text) && /\/ Light\)/.test(anvil.text), '27. Водорості: never heavy, so Удар ковадла goes out light', anvil.text.slice(0, 160));
            let bounced = null, landed = null, immune = null, dragon = null;
            scripted({ A: TQ(), B: WD(), setup: (fx, a, b) => { bounced = G.applyEffect(a, b, 'seaweed', 20, fx); fx.B.scales.now = 0; landed = G.applyEffect(a, b, 'seaweed', 20, fx); } });
            scripted({ A: TQ(), B: drake('plain', titleWith('debuff_immunity')), setup: (fx, a, b) => { immune = G.applyEffect(a, b, 'seaweed', 20, fx); } });
            scripted({ A: TQ(), B: DRAGON(), setup: (fx, a, b) => { dragon = G.applyEffect(a, b, 'seaweed', 20, fx); } });
            check(bounced === 'bounced' && landed === 'applied' && immune === 'immune' && dragon === 'immune', '27. Водорості bounce off the scales while they hold; debuff immunity and the White Dragon stop them', JSON.stringify([bounced, landed, immune, dragon]));
            const held = scripted({ A: drake('red'), setup: fx => { fx.A.meter = 5; put(fx, 'A', 'seaweed'); }, turns: [dice({ attack: 0.95 })] }).turns[0];
            check(/Firestorm/.test(held.text) && /\/ Light\)/.test(held.text) && held.fx.A.debuff[0].left === 1, '27. an attacking ultimate is an attack: it goes out light and counts down', held.text.slice(0, 160));
            let sent = null;
            scripted({ A: TQ(), B: drake('plain', T(264)), setup: (fx, a, b) => { rolled([0.1], () => G.applyEffect(a, b, 'seaweed', 20, fx)); sent = { a: fx.A.debuff.map(x => x.id), b: fx.B.debuff.map(x => x.id) }; } });
            check(sent.a.join() === 'seaweed' && !sent.b.length, '27. Повернення sends Водорості back', JSON.stringify(sent));
            const cleansed = scripted({ A: drake('plain', T(229)), setup: fx => put(fx, 'A', 'seaweed'), turns: [dice({ attack: 0.95 })] }).turns[0];
            check(!cleansed.fx.A.debuff.length && /\(Vamp \//.test(cleansed.text), '27. Очищення takes Водорості off before they can act', cleansed.text.slice(0, 120));
        }

        // Приплив with the titles that scale an ultimate
        {
            const healed = title => { const m = G.getMaxHP(20, 'turquoise', title), low = 40;
                return { m, got: scripted({ A: TQ(title), setup: fx => { fx.A.meter = 5; fx.A.layers = 4; hurt(fx, 'A', m, low); }, turns: [dice()] }).turns[0].hpA - low }; };
            const over = healed(T(268)), rush = healed(T(223));
            check(over.got === Math.round(over.m * 0.17 * 1.6), `27. Перевантаження scales Приплив ×1.6 (+${over.got})`, JSON.stringify(over));
            check(rush.got === Math.round(rush.m * 0.17 * 1.5), `27. Підзарядка scales it ×1.5 (+${rush.got})`, JSON.stringify(rush));
            const counted = scripted({ A: TQ(), setup: fx => { fx.A.meter = 5; put(fx, 'A', 'rage'); put(fx, 'A', 'burn'); put(fx, 'B', 'shield'); }, turns: [dice()] }).turns[0];
            check(counted.fx.A.buff[0].left === 2 && counted.fx.B.buff[0].left === 2 && counted.fx.A.debuff[0].left === 2, '27. it replaces the attack: only effects that last turns count down', JSON.stringify([counted.fx.A.buff, counted.fx.B.buff, counted.fx.A.debuff]));
            check(['clearwater', 'seaweed'].every(id => G.POOL_IDS.includes(id)), '27. both join the shared pool', G.POOL_IDS.join());
        }
    }

    // ---- 28. Season 2's Рожевий. Every number is written out here, like section 24's
    {
        console.log('\n[28. Season 2: Рожевий]');
        const PK = (title = null, level = 20) => drake('pink', title, level);
        const MAX = 340;

        for (const [lang, make1, word] of [['uk', '!дрейк', 'рожевий'], ['en', '!drake', 'pink']]) {
            G.setLang(lang);
            fresh();
            G.say('viewer1', `${make1} ${word}`);
            const made = G.getDragonDB().viewer1, named = lastInfo();
            check(made && made.drakeObj.type === 'pink' && named.includes(lang === 'uk' ? 'Рожевий Дрейк' : 'Pink Drake') && !named.includes('🩷'), `28. "${make1} ${word}" gives the Pink Drake, named with no emoji`, named);
            fresh();
            G.say('viewer2', make1);
            const help = lastInfo(), want = lang === 'uk' ? ['червоний', 'зелений', 'помаранчевий', 'вишневий', 'рожевий', 'бірюзовий'] : ['red', 'green', 'orange', 'cherry', 'pink', 'turquoise'];
            check(want.every(w => help.includes(w)), `28. the help card lists all ten colours (${lang})`, help);
        }

        // Ілюзія: each element's fight part, at its own level's tier
        {
            const start = (foe, level = 20, foeLevel = level, title = null) => scripted({ A: PK(title, level), B: drake(foe, null, foeLevel), turns: [] }).fx;
            const hpOf = (foe, level = 20, foeLevel = level) => { scripted({ A: PK(null, level), B: drake(foe, null, foeLevel), turns: [dice({ block: 0.01 })] }); return Number(document.getElementById('hp-text-p1').innerText.split('/')[1]); };
            check(['red', 'blue', 'black', 'gold', 'purple', 'green', 'orange', 'cherry', 'turquoise'].every(t => start(t).A.copied === t), '28. Ілюзія: it copies every other viewer element', '');
            // With nothing to copy: a random viewer element's, from the fight's own dice, never Рожевий's own
            const NINE = ['red', 'blue', 'black', 'gold', 'purple', 'green', 'orange', 'cherry', 'turquoise'];
            const drew = B => NINE.map((t, i) => [t, scripted({ A: PK(), B, start: [(i + 0.5) / NINE.length, (i + 0.5) / NINE.length], turns: [] }).fx.A.copied]).filter(([t, got]) => got !== t);
            check(!drew(WD()).length, '28. against the White Drake the dice pick any of the other nine, each by its own share of the roll', JSON.stringify(drew(WD())));
            check(!drew(PK()).length, '28. and against another Рожевий', JSON.stringify(drew(PK())));
            const twins = scripted({ A: PK(), B: PK(), start: [0.05, 0.95], turns: [] }).fx;
            check(twins.A.copied === 'red' && twins.B.copied === 'turquoise', '28. two Рожевий draw one each', JSON.stringify([twins.A.copied, twins.B.copied]));
            check(scripted({ A: PK(), B: DRAGON(), start: [0.5, 0.5], turns: [] }).fx.A.copied === null, '28. against the White Dragon it still copies nothing', '');
            const green = hpOf('green'), steel = scripted({ A: PK(), B: WD(), start: [0.6], turns: [dice({ block: 0.01 })] }).fx;
            check(steel.A.copied === 'green' && steel.A.scales === null, "28. the White Drake's scales are never copied: it has that element's passive, no bar", JSON.stringify(steel.A));
            check(Number(document.getElementById('hp-text-p1').innerText.split('/')[1]) === green, "28. and what it drew works like any copy, at its own level's tier (Зелений's HP)", document.getElementById('hp-text-p1').innerText);
            // Зелений: +34% at its own level 20, +22% at its own level 1, whatever the opponent's
            check(hpOf('green') === Math.floor(340 * 1.34), `28. from Зелений its HP (+34% at level 20: ${hpOf('green')})`, String(hpOf('green')));
            check(hpOf('green', 1, 20) === Math.floor(150 * 1.22) && hpOf('green', 20, 1) === Math.floor(340 * 1.34), "28. at its own level's tier, not the opponent's", JSON.stringify([hpOf('green', 1, 20), hpOf('green', 20, 1)]));
            // A drake's base numbers are its own, no part of a passive: the +12% HP of Помаранчевий and Бірюзовий's armour stay theirs
            check(['orange', 'cherry', 'turquoise'].every(t => hpOf(t) === 340), "28. it copies no base numbers: its HP stays its own against Помаранчевий, Вишневий and Бірюзовий (340)", ['orange', 'cherry', 'turquoise'].map(t => hpOf(t)).join());
            const struck = B => scripted({ A: drake('turquoise'), B, turns: [dice()] }).turns[0].dmg;
            check(struck(PK()) === struck(drake('plain')), "28. nor Бірюзовий's armour: a hit on it lands as on a plain drake", JSON.stringify([struck(PK()), struck(drake('plain'))]));
            // Червоний: 48% to crit at level 20 (34% plain), ×2.05
            const crit = (foe, roll) => scripted({ A: PK(), B: drake(foe), turns: [dice({ crit: roll })] }).turns[0];
            const hit = crit('red', 0.4), miss = crit('plain', 0.4);
            check(/CRIT \(x2\.05\)/.test(hit.text) && !/CRIT/.test(miss.text), '28. from Червоний its crit: 48% at level 20, ×2.05', hit.text.slice(0, 160));
            // Синій: armour and the reflect
            const armour = foe => scripted({ A: drake(foe), B: PK(), turns: [dice()] }).turns[0].dmg;
            check(armour('blue') < armour('plain'), `28. from Синій its armour (${armour('plain')} → ${armour('blue')})`, '');
            const reflected = scripted({ A: drake('blue'), B: PK(), turns: [dice({ after: [0.01] })] }).turns[0];
            check(reflected.notes.reflect > 0, '28. and the reflect, its chance at its own level', JSON.stringify(reflected.notes));
            // Чорний: 20% to block at level 20 and the cast chance
            const blocked = scripted({ A: drake('black'), B: PK(), turns: [dice({ block: 0.15 })] }).turns[0], notBlocked = scripted({ A: drake('plain'), B: PK(), turns: [dice({ block: 0.15 })] }).turns[0];
            check(blocked.dmg === 0 && notBlocked.dmg > 0, '28. from Чорний its block', JSON.stringify([blocked.dmg, notBlocked.dmg]));
            const cast = (foe, roll) => { let n = 0; G.wrapApplyEffect(() => n++); scripted({ A: PK(), B: drake(foe), turns: [dice({ cast: roll })] }); G.wrapApplyEffect(null); return n; };
            check(cast('black', 0.5) === 1 && cast('plain', 0.5) === 0, '28. and its cast chance (57% at level 20)', JSON.stringify([cast('black', 0.5), cast('plain', 0.5)]));
            // Золотий: the 1-HP hit, not the XP
            const fortune = scripted({ A: PK(), B: drake('gold'), turns: [dice({ after: [0.01] })] }).turns[0];
            check(fortune.notes.fortune && fortune.hpB === 1, '28. from Золотий the 1-HP hit', JSON.stringify([fortune.notes, fortune.hpB]));
            fresh();
            make('pinkie', 'pink', { level: 3 });
            const xp0 = G.getDragonDB().pinkie.xp;
            G.addXP('pinkie', 100);
            check(G.getDragonDB().pinkie.xp - xp0 === 100, '28. not its XP bonus', String(G.getDragonDB().pinkie.xp - xp0));
            // Фіолетовий: its effects 40% stronger at level 20
            let power = null;
            scripted({ A: PK(), B: drake('purple'), setup: (fx, a, b) => { G.applyEffect(a, b, 'rage', 20, fx); power = fx.A.buff[0].power; } });
            check(Math.abs(power - 1.4) < 1e-9, `28. from Фіолетовий its effect power (×${power})`, String(power));
            // Помаранчевий, Вишневий, Бірюзовий: its own heat, frenzy, layers
            const heat = scripted({ A: PK(), B: drake('orange'), turns: [dice(), dice({ before: [0.99] })] }).turns;
            check(heat[0].fx.A.heat === 1 && heat[0].fx.B.heat === 0 && heat[1].notes['tick:heat'] < 0, '28. from Помаранчевий its own heat, built by its own attacks, and it burns', JSON.stringify([heat[0].fx.A.heat, heat[1].notes]));
            const burnt = scripted({ A: drake('orange'), B: PK(), setup: fx => { fx.B.heat = 8; }, turns: [dice({ before: [0.99] })] }).turns[0];
            check(burnt.notes['tick:heat'] === -43, '28. which burns the opponent like any heat (380 HP at 8 heat)', JSON.stringify(burnt.notes));
            const frenzied = scripted({ A: PK(), B: drake('cherry'), setup: fx => hurt(fx, 'A', MAX, Math.round(MAX * 0.4)), turns: [dice()] }).turns[0];
            check(frenzied.notes.frenzy === 43, '28. from Вишневий the frenzy', JSON.stringify(frenzied.notes));
            const layered = scripted({ A: drake('turquoise'), B: PK(), turns: [dice()] }).turns[0];
            check(layered.fx.B.layers === 1 && layered.fx.A.layers === 0, '28. from Бірюзовий the layers', JSON.stringify([layered.fx.A.layers, layered.fx.B.layers]));
            // Never a title
            const titled = scripted({ A: PK(), B: drake('red', T(240)), turns: [] }).fx;
            check(titled.A.copied === 'red' && document.getElementById('hp-text-p1').innerText.endsWith(`/${MAX}`), "28. never a title: a title's HP stays its holder's", document.getElementById('hp-text-p1').innerText);
            // The record's banner and the card's emblem
            for (const [lang, line] of [['uk', '🎭 @A копіює: Червоний Дрейк'], ['en', '🎭 @A copies: Red Drake']]) {
                const from = logs.length;
                scripted({ A: PK(), B: drake('red'), lang, turns: [] });
                check(logs.slice(from).some(l => l.includes(line)), `28. the record says «${line}»`, logs.slice(from).join(' | ').slice(0, 160));
            }
            G.setLang('en');
            const drawn = logs.length;
            scripted({ A: PK(), B: WD(), start: [0.05], turns: [] });
            check(logs.slice(drawn).some(l => l.includes('🎭 @A copies: Red Drake')), '28. the banner names what it drew, against the White Drake too', logs.slice(drawn).join(' | ').slice(0, 160));
            const quiet = logs.length;
            scripted({ A: PK(), B: DRAGON(), turns: [] });
            check(!logs.slice(quiet).some(l => /🎭/.test(l)), '28. nothing copied, no banner', logs.slice(quiet).join(' | ').slice(0, 120));
            scripted({ A: PK(), B: drake('turquoise'), turns: [dice()] });
            const line = document.getElementById('info-p1').innerHTML, other = document.getElementById('info-p2').innerHTML;
            check(line.includes('data-icon="emTurquoise"') && line.includes('data-icon="emPink"') && !other.includes('emPink'), "28. its card shows its own emblem and the one it copied", line.slice(0, 200));
            scripted({ A: PK(), B: drake('blue'), turns: [dice({ block: 0.01 })] });
            const row = document.getElementById('stats-sub-p1').innerHTML;
            check(row.includes('39%'), "28. and the stats row follows what it copied (Синій's armour: 39% at level 20)", row.slice(0, 160));
        }

        // Закоханість: dice go first in its turn
        {
            const go = (o = {}) => scripted({ A: o.A || drake(), B: o.B || {}, setup: fx => { put(fx, 'A', 'infatuation'); (o.setup || (() => {}))(fx); }, turns: [[...(o.pre || []), 0.01, ...dice(o.d || {})]] }).turns[0];
            const lost = t => MAX - t.hpA, read = t => Number((t.text.match(/hits itself -(\d+)/) || [])[1]);
            const plainHit = scripted({ turns: [dice()] }).turns[0].dmg;
            const self = go();
            check(read(self) === plainHit && lost(self) === plainHit && self.hpB === MAX, `28. Закоханість: the attack lands on its maker: its own armour, the same hit (${plainHit})`, JSON.stringify([read(self), plainHit, self.hpB]));
            const armourless = go({ d: { attack: 0.3, sub: 0.9 } }), plainSneak = scripted({ turns: [dice({ attack: 0.3, sub: 0.9 })] }).turns[0].dmg;
            check(read(armourless) === plainSneak, '28. a sneaky attack goes past its armour too', JSON.stringify([read(armourless), plainSneak]));
            const shielded = go({ setup: fx => put(fx, 'A', 'shield') });
            check(Math.abs(read(shielded) - plainHit * 0.7) <= 1 && shielded.fx.A.buff[0].left === 2, "28. its own Щит cuts it, and uses up no count", JSON.stringify([read(shielded), shielded.fx.A.buff]));
            const unblockable = go({ d: { block: 0.01 } });
            check(read(unblockable) === plainHit, "28. no ultra-block: you can't dodge your own hit", String(read(unblockable)));
            for (const [what, B, after] of [['reflect', drake('blue'), [0.01]], ['Шипи', drake('plain', titleWith('thorns')), []], ['Контратака', drake('plain', T(217)), [0.01]]]) {
                const t = go({ B, d: { after } });
                check(lost(t) === read(t) && !t.notes.reflect && !t.notes.thorns && !t.notes.counter, `28. no ${what}`, JSON.stringify(t.notes));
            }
            const returned = go({ B: drake('plain', T(264)), setup: () => {} });
            check(!returned.fx.A.debuff.some(x => x.id !== 'infatuation'), '28. no Повернення: nothing comes back', JSON.stringify(returned.fx.A.debuff));
            let casts = 0;
            G.wrapApplyEffect(() => casts++);
            go({ d: { cast: 0 } });
            G.wrapApplyEffect(null);
            check(casts === 0, '28. no effect roll', String(casts));
            const meter = go({ A: drake('red') });
            check(meter.meterA === undefined ? meter.fx.A.meter === 0 : meter.meterA === 0, '28. no Element Power', String(meter.fx.A.meter));
            const noVamp = go({ d: { attack: 0.95 }, setup: fx => { hurt(fx, 'A', MAX, 200); put(fx, 'A', 'bloodprice'); } });
            check(!noVamp.notes.vamp && !noVamp.notes.bloodprice, '28. no heal from a vampire attack or Кров за кров', JSON.stringify(noVamp.notes));
            // It still counts as its own attack
            const counted = go({ setup: fx => { put(fx, 'A', 'rage'); put(fx, 'A', 'bleed'); } });
            check(counted.fx.A.buff[0].left === 1 && counted.notes.bleed === 14 && !counted.fx.A.debuff.some(x => x.id === 'infatuation') && lost(counted) === read(counted) + 14, "28. it's still its own attack: its own-attack effects count down, Кровотеча ticks, and Закоханість is used up", JSON.stringify([counted.fx.A, counted.notes]));
            const cool = go({ A: drake('orange') });
            check(cool.fx.A.heat === 0, '28. it adds no heat', String(cool.fx.A.heat));
            // A hit on nobody
            const nobody = go({ B: drake('turquoise'), setup: fx => put(fx, 'B', 'shield') });
            check(nobody.fx.B.buff[0].left === 2 && nobody.fx.B.layers === 0, "28. it's a hit on nobody: no \"hits taken\" count, no layer", JSON.stringify(nobody.fx.B));
            const ownLayer = go({ A: drake('turquoise') });
            check(ownLayer.fx.A.layers === 0, '28. not even on its own Бірюзовий', String(ownLayer.fx.A.layers));
            const marked = go({ setup: fx => put(fx, 'B', 'mark') });
            check(!/CRIT/.test(marked.text) && read(marked) === plainHit && marked.fx.B.debuff[0].left === 1, "28. the opponent's Мітка has no say in it, and stays", marked.text.slice(0, 120));
            const melted = go({ setup: fx => put(fx, 'B', 'melt') });
            check(read(melted) === plainHit && melted.fx.B.debuff[0].left === 2, "28. nor its Оплавлення", JSON.stringify([read(melted), melted.fx.B.debuff]));
            const raged = go({ setup: fx => put(fx, 'B', 'rage') });
            check(read(raged) === plainHit, "28. nor its Лють's extra damage taken", String(read(raged)));
            const copy = scripted({ A: drake(), B: drake('plain', T(292)), setup: fx => put(fx, 'A', 'infatuation'), turns: [[0.01, ...dice()], dice({ after: [0.05] })] }).turns;
            check(!copy[1].notes.copy, "28. it isn't a hit Копіпаст can copy", JSON.stringify(copy[1].notes));
            const storm = scripted({ A: drake(), B: drake('plain', T(253)), setup: fx => { put(fx, 'A', 'infatuation'); }, turns: [[0.01, ...dice()], ...rounds(9, { block: 0.01 })] }).turns;
            check(!storm[7].notes.storm && storm[9].notes.storm, "28. and no Око бурі count: it takes 4 real hits after it (turns 3, 5, 7 and 9)", JSON.stringify(storm.map(t => t.notes.storm || 0)));
            // A knockout, an ultimate, both languages, who it can't touch
            const out = scripted({ A: drake(), setup: fx => { put(fx, 'A', 'infatuation'); hurt(fx, 'A', MAX, 5); }, turns: [[0.01, ...dice()]] });
            check(out.ended && out.turns[0].hpA === 0 && out.turns[0].hpB === MAX, '28. it can knock its own maker out', JSON.stringify([out.ended, out.turns[0].hpA]));
            const erupted = scripted({ A: drake('orange'), setup: fx => { put(fx, 'A', 'infatuation'); fx.A.meter = 5; fx.A.heat = 8; }, turns: [[0.01, ...dice()]] }).turns[0];
            check(/hits itself/.test(erupted.text) && erupted.fx.A.heat === 4 && erupted.hpB === MAX, "28. an ultimate can turn on its maker too: Виверження's heat still drops", JSON.stringify([erupted.fx.A.heat, erupted.hpB]));
            const storm2 = scripted({ A: drake('red'), setup: fx => { put(fx, 'A', 'infatuation'); fx.A.meter = 5; }, turns: [[0.01, ...dice()]] }).turns[0];
            check(/hits itself/.test(storm2.text) && !storm2.fx.B.debuff.length, "28. and Вогняний шторм's Підпал never reaches the target", JSON.stringify(storm2.fx.B.debuff));
            const uk = scripted({ A: drake(), lang: 'uk', setup: fx => put(fx, 'A', 'infatuation'), turns: [[0.01, ...dice()]] }).turns[0];
            check(/💘 б'є себе -\d+/.test(uk.text), "28. the record says «💘 б'є себе -N»", uk.text.slice(0, 120));
            const en = scripted({ A: drake(), setup: fx => put(fx, 'A', 'infatuation'), turns: [[0.01, ...dice()]] }).turns[0];
            check(/💘 hits itself -\d+/.test(en.text), '28. and "💘 hits itself -N"', en.text.slice(0, 120));
            G.setLang('en');
            let bounced = null, landed = null, immune = null, dragon = null;
            scripted({ A: PK(), B: WD(), setup: (fx, a, b) => { bounced = G.applyEffect(a, b, 'infatuation', 20, fx); fx.B.scales.now = 0; landed = G.applyEffect(a, b, 'infatuation', 20, fx); } });
            scripted({ A: PK(), B: drake('plain', titleWith('debuff_immunity')), setup: (fx, a, b) => { immune = G.applyEffect(a, b, 'infatuation', 20, fx); } });
            scripted({ A: PK(), B: DRAGON(), setup: (fx, a, b) => { dragon = G.applyEffect(a, b, 'infatuation', 20, fx); } });
            check(bounced === 'bounced' && landed === 'applied' && immune === 'immune' && dragon === 'immune', "28. it bounces off the scales while they hold; debuff immunity and the White Dragon stop it", JSON.stringify([bounced, landed, immune, dragon]));
            const hundred = scripted({ A: drake(), setup: fx => fx.A.debuff.push({ id: 'infatuation', left: 1, power: 5 }), turns: [[0.999, ...dice()]] }).turns[0];
            check(/hits itself/.test(hundred.text), '28. effect power scales the chance, up to 100%', hundred.text.slice(0, 120));
        }

        // The effects with the title abilities
        {
            const long = (() => { let left = null; scripted({ A: drake('plain', T(232)), setup: (fx, a, b) => { G.applyEffect(a, b, 'fairydust', 20, fx); left = fx.A.buff[0].left; } }); return left; })();
            check(long === 4, '28. Довгий баф: Чарівний пилок lasts 4 attacks', String(long));
            const eaten = scripted({ A: drake('plain', T(220)), setup: fx => { hurt(fx, 'A', G.getMaxHP(20, 'plain', T(220)), 100); put(fx, 'B', 'fairydust'); }, turns: [dice({ after: [0.1, 0] })] }).turns[0];
            check(eaten.notes.eaten && eaten.notes.eaten.id === 'fairydust', '28. Пожирач бафів eats Чарівний пилок', JSON.stringify(eaten.notes));
            let sent = null;
            scripted({ A: PK(), B: drake('plain', T(264)), setup: (fx, a, b) => { rolled([0.1], () => G.applyEffect(a, b, 'infatuation', 20, fx)); sent = { a: fx.A.debuff.map(x => x.id), b: fx.B.debuff.map(x => x.id) }; } });
            check(sent.a.join() === 'infatuation' && !sent.b.length, '28. Повернення sends Закоханість back', JSON.stringify(sent));
            const cleansed = scripted({ A: drake('plain', T(229)), setup: fx => put(fx, 'A', 'infatuation'), turns: [[...dice()]] }).turns[0];
            check(!cleansed.fx.A.debuff.length && !/hits itself/.test(cleansed.text), '28. Очищення takes Закоханість off before it can act', cleansed.text.slice(0, 120));
            const stolen = scripted({ A: drake('black'), setup: fx => { fx.A.meter = 5; put(fx, 'B', 'fairydust', 2); }, turns: [dice({ cast: 0.99 })] }).turns[0];
            check(stolen.fx.A.buff.map(x => `${x.id}:${x.left}`).join() === 'fairydust:1', '28. Крадіжка тіні takes Чарівний пилок with what it has left (2, and its own attack uses one)', JSON.stringify(stolen.fx.A.buff));
            let dispelled = null, pulled = null;
            scripted({ A: drake('purple'), B: PK(), setup: (fx, a, b) => { put(fx, 'B', 'fairydust'); dispelled = { r: G.applyEffect(a, b, 'dispel', 20, fx), left: fx.B.buff.length }; } });
            check(dispelled.r === 'dispelled' && dispelled.left === 0, '28. Розвіювання takes Чарівний пилок off', JSON.stringify(dispelled));
            scripted({ A: PK(), B: WD(), setup: (fx, a, b) => { put(fx, 'A', 'magnet'); pulled = { r: G.applyEffect(a, b, 'fairydust', 20, fx), wd: fx.B.buff.map(x => x.id) }; } });
            check(pulled.r === 'pulled' && pulled.wd.join() === 'fairydust', '28. Магніт pulls Чарівний пилок to the White Drake', JSON.stringify(pulled));
            check(['fairydust', 'infatuation'].every(id => G.POOL_IDS.includes(id)) && G.POOL_IDS.length === 20, '28. both join the shared pool, which is 20 now', G.POOL_IDS.join());
        }
    }
    Math.random = KEEP;
    fresh();
}

console.log(failures ? `\n${failures} rule check(s) failed.` : '\nAll rule checks passed.');
process.exit(failures ? 1 : 0);
