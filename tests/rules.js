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
//   10 the cooldown starts when a fight starts (both fighters, ranked or duel); a challenge alone costs nothing; one
//      open challenge per viewer
//   11 a duel accepted during a fight waits and starts after it, before the ranked queue; one waiting duel; both
//      players busy meanwhile; accepting needs both players free, and a refusal charges nothing
//   12 "!battle" with no name says how to challenge, before any other check
//   13 the opening-buff banner shows the title's icon once
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
    getMaxHP, getRequiredXP, calculateLevelAndProgress, getDragonDB, saveDragonDB, setStreamerUser, getCooldownRemaining,
    say: (user, text, channel) => handleChatMessage('#' + (channel || 'streamchannel'), { username: user, color: '#8ab4f8' }, text, false),
    runBattle: (...a) => runBattle(...a), finishBattle: (...a) => finishBattle(...a), checkQueue: () => checkQueue(),
    nextFight: typeof nextFight === 'function' ? () => nextFight() : null,
    fvT: typeof fvT === 'function' ? fvT : null,
    setForcedCast: id => { forcedCast = id; }, get forcedCast() { return forcedCast; },
    get arenaState() { return arenaState; }, get stats() { return playerLeaderboardStats; },
    get pending() { return pendingChallenges; }, get queue() { return matchmakingQueue; }, set queue(q) { matchmakingQueue = q; },
    get waitingDuel() { return typeof waitingDuel !== 'undefined' ? waitingDuel : undefined; },
    get running() { return isBattleRunning; }, set running(v) { isBattleRunning = v; },
    resetCooldowns: () => { Object.keys(cooldowns).forEach(k => delete cooldowns[k]); },
    setLang: l => { currentLang = l; },
    withMaxHP: (f, fn) => { const orig = getMaxHP; getMaxHP = f; try { return fn(); } finally { getMaxHP = orig; } },
    wrapRunBattle: f => { const orig = runBattle; runBattle = (...a) => { f(...a); return orig(...a); }; },
    wrapAddInfo: f => { const orig = addInfo; addInfo = (html, ...r) => { f(html); return orig(html, ...r); }; },
    wrapAddLog: f => { const orig = addLog; addLog = t => { orig(t); f(t); }; },
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
G.wrapAddLog(t => logs.push(strip(t)));
G.wrapRunBattle((a, ac, b, bc, ranked) => fightsStarted.push({ a, b, ranked }));
const lastInfo = () => infos[infos.length - 1] || '';
// A clean slate: no saves, stats, queue, challenges, cooldowns or fight
const fresh = () => {
    __drain();
    G.saveDragonDB({}); Object.keys(G.stats).forEach(k => delete G.stats[k]); G.queue = [];
    Object.keys(G.pending).forEach(k => delete G.pending[k]); G.resetCooldowns(); G.running = false;
    infos = []; logs = []; fightsStarted = [];
};
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

    // 7. Rerolling into the White Dragon
    fresh();
    G.setStreamerUser('boss');
    G.say('boss', t('!drake red', '!дрейк червоний'), 'boss');
    G.say('boss', t('!reroll white', '!рерол білий'), 'boss');
    const reroll = lastInfo();
    check(reroll.endsWith(t('Level 20!', 'Рівень 20!')) && !/1!$/.test(reroll), `7. the streamer's "${t('!reroll white', '!рерол білий')}" ends with "${t('Level 20!', 'Рівень 20!')}"`, reroll);
    G.say('boss', t('!reroll red', '!рерол червоний'), 'boss');
    check(lastInfo().endsWith(t('Level reset to 1!', 'Рівень скинуто до 1!')), `7. any other reroll still ends with "${t('Level reset to 1!', 'Рівень скинуто до 1!')}"`, lastInfo());
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

    // 10. Cooldowns start with a fight
    fresh();
    ['c1', 'c2', 'c3', 'c4'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i].type));
    G.say('c1', t('!battle @c2', '!бій @c2'));
    G.say('c2', t('!decline', '!відхилити'));
    const afterDecline = G.getCooldownRemaining('c1');
    G.say('c1', t('!battle @c3', '!бій @c3'));
    __drain();   // the challenge expires unanswered
    const afterExpiry = G.getCooldownRemaining('c1');
    check(afterDecline === 0 && afterExpiry === 0, '10. a declined or expired challenge costs the challenger nothing (no cooldown)', `cooldown after decline: ${afterDecline} min, after expiry: ${afterExpiry} min`);
    G.say('c1', t('!battle @c2', '!бій @c2'));
    G.say('c1', t('!battle @c3', '!бій @c3'));
    check(G.pending.c2 === 'c1' && !G.pending.c3 && /already have an open challenge|уже є відкритий виклик/.test(lastInfo()),
        '10. a viewer can have one open challenge; a second !battle gets a short reply', `pending ${JSON.stringify(G.pending)}, reply: ${lastInfo()}`);
    G.say('c2', t('!accept', '!прийняти'));
    const duelCd = [G.getCooldownRemaining('c1'), G.getCooldownRemaining('c2')];
    __drain();
    G.say('c3', t('!queue', '!черга')); G.say('c4', t('!queue', '!черга'));
    const rankedCd = [G.getCooldownRemaining('c3'), G.getCooldownRemaining('c4')];
    __drain();
    check(duelCd.every(m => m > 0) && rankedCd.every(m => m > 0), '10. when a fight starts, both fighters go on the cooldown (duel and ranked)', `duel ${duelCd}, ranked ${rankedCd}`);

    // 11. An accepted duel waits for the arena
    fresh();
    ['d1', 'd2', 'd3', 'd4', 'q1', 'q2'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i % 6].type));
    G.queue = ['d2', 'q1'];
    G.running = true;   // a fight is on
    G.say('d1', t('!battle @d2', '!бій @d2'));
    G.say('d2', t('!accept', '!прийняти'));
    const acceptReply = lastInfo();
    const waiting = G.waitingDuel;
    G.say('d3', t('!battle @d4', '!бій @d4'));
    G.say('d4', t('!accept', '!прийняти'));
    const secondReply = lastInfo();
    const busy = [t('!queue', '!черга'), t('!battle @d3', '!бій @d3'), t('!accept', '!прийняти')].map(c => { G.say('d1', c); return lastInfo(); });
    G.say('q2', t('!queue', '!черга'));   // two in the ranked queue now, but the waiting duel goes first
    G.running = false;                  // the fight ends …
    if (G.nextFight) G.nextFight();     // … and 5 s after its result the next fight starts
    const first = fightsStarted[0];
    const cds = [G.getCooldownRemaining('d1'), G.getCooldownRemaining('d2')];
    check(/after the current fight|після поточного бою/.test(acceptReply) && !!waiting && waiting.challenger === 'd1' && waiting.accepter === 'd2' && !G.queue.includes('d2'),
        '11. !accept during a fight: the duel waits ("starts after the current fight"), and both players leave the ranked queue', `reply: ${acceptReply}; waiting: ${JSON.stringify(waiting)}; queue ${G.queue}`);
    check(/after the next fight|після наступного бою/.test(secondReply) && !G.pending.d4, '11. only one duel waits: another !accept is told to challenge again after the next fight', secondReply);
    check(busy.every(r => /waiting for the arena|чекає на арену/.test(r)), '11. while their duel waits, both players get a short "busy" reply to !queue, !battle and !accept', busy.join(' | '));
    check(first && first.a === 'd1' && first.b === 'd2' && !first.ranked && cds.every(m => m > 0) && G.waitingDuel === null,
        '11. after the fight, the waiting duel starts first (before the ranked queue), and both duellists go on the cooldown then', `first fight: ${JSON.stringify(first)}, cooldowns ${cds}`);
    __drain();
    // Accepting needs both players free; a refusal charges nothing and keeps the challenge
    fresh();
    ['e1', 'e2', 'e3', 'e4'].forEach((n, i) => make(n, G.VIEWER_DRAKE_TYPES[i].type));
    G.say('e1', t('!queue', '!черга')); G.say('e3', t('!queue', '!черга')); __drain();   // e1 and e3 fought: both resting
    G.say('e2', t('!battle @e1', '!бій @e1'));
    G.say('e1', t('!accept', '!прийняти'));
    const refused = lastInfo();
    check(/is resting|відпочиває/.test(refused) && G.getCooldownRemaining('e2') === 0 && G.pending.e1 === 'e2' && fightsStarted.length === 1,
        '11. accepting while one player is still resting: a clear reply, no fight, nothing charged, the challenge stays open', `reply: ${refused}; e2 cooldown ${G.getCooldownRemaining('e2')}; fights ${fightsStarted.length}`);

    // 12. "!battle" with no name
    fresh();
    make('hinty', 'red');
    G.say('hinty', t('!queue', '!черга')); make('other', 'blue'); G.say('other', t('!queue', '!черга')); __drain();   // hinty is now on the cooldown
    G.say('hinty', t('!battle', '!бій'));
    const want12 = t('ℹ️ @hinty, to challenge someone type !battle @name.', 'ℹ️ @hinty, щоб кинути виклик, напишіть !бій @нік.');
    check(lastInfo() === want12, `12. "${t('!battle', '!бій')}" with no name (even on the cooldown) replies "${want12}"`, lastInfo());

    // 13. One icon in the opening banner
    const opener = G.TITLES_DB.filter(x => x.mechanic === 'opening_buff' || (x.bonus && x.bonus.mechanic === 'opening_buff'));
    const banners = G.fvT ? opener.map(x => G.fvT('opening', { title: `${x.icon} ${x.name[lang]}`, who: '@x', fx: 'FX' })) : [];
    check(opener.length && banners.every((b, i) => b.startsWith(opener[i].icon + ' ') && b.split(opener[i].icon).length === 2 && !b.includes('🌅 🌅')),
        `13. the opening banner shows the title's icon once: ${banners.slice(0, 2).join(' | ')}`, banners.join(' | ') || 'no banner template');
}

console.log(failures ? `\n${failures} rule check(s) failed.` : '\nAll rule checks passed.');
process.exit(failures ? 1 : 0);
