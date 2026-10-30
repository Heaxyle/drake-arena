// Tests the tests: breaks a copy of the game in specific ways and checks that tests/effects.js or tests/ultimates.js catches every one.
//
// Usage: npm run test:mutations   (or node tests/mutations.js [--file path/to/index.html])
//
// Each mutation is one small code change that a real bug could make. For each, a copy of the game (plus its README,
// which effects.js also reads) goes into a temp folder, effects.js runs against it, and the mutation counts as caught
// only if effects.js exits non-zero. An unchanged copy runs first and must pass, so a broken test setup can't look like
// "everything caught". Exits non-zero if any mutation slips through.
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const fi = args.indexOf('--file');
const FILE = fi === -1 ? 'showcase/index.html' : args[fi + 1];
// Line endings normalised to \n, so the multi-line patterns below match on Windows (CRLF checkout) and in CI (LF)
const src = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const readme = fs.readFileSync(path.join(path.dirname(FILE), 'README.md'), 'utf8');

// [name, what the bug is, code to find, what to put instead]
const MUTATIONS = [
    ['hits counted on the attacker', "the attacker's own \"hits taken\" effects count down instead of the defender's",
        "countDownEffects(defFx, 'hits');", "countDownEffects(atkFx, 'hits');"],
    ['effect id in the log', 'the opening-buff line prints the internal id ("blessing") instead of the icon and name',
        'starts the fight with ${fxName(id)}', 'starts the fight with ${id}'],
    ["refresh doesn't reset", 'casting an active effect again leaves its count where it was',
        'current.left = e.count;', 'current.left = current.left;'],
    ['no debuff immunity', 'the immunity check is switched off',
        "if (e.kind === 'debuff' && isDebuffImmune(owner)) {", 'if (false) {'],
    ['Frost uses up other effects', "a frozen turn also counts down the frozen drake's other \"own attacks\" effects",
        'frost.left--;', "frost.left--; countDownEffects(atkFx, 'attacks');"],
    ['replaces the newest', 'a 3rd buff/debuff replaces the newest one instead of the one closest to ending',
        'replaced = list.reduce((a, b) => b.left < a.left ? b : a);', 'replaced = list[list.length - 1];'],
    ['Dispel wasted on no buffs', 'a Dispel that finds no buffs is cast anyway instead of a different effect',
        "if (e.lasts === 'instant' && !st.buff.length) {", 'if (false) {'],
    ['number typed into a description', "Shield's description has -30% typed in instead of taking it from the table",
        "Наступні {count} отримані удари −{cut}% шкоди", 'Наступні {count} отримані удари −30% шкоди'],
    ['Shield skips armour-piercing and vampire hits', 'Shield only cuts hits that go through armour',
        "if (shield) hitDmg *= 1 - fxNum(shield, 'cut') / 100;", "if (shield && subType !== 'sneaky' && attackType !== 'vampire') hitDmg *= 1 - fxNum(shield, 'cut') / 100;"],
    ["Poison doesn't cut healing", 'healing while poisoned is not reduced',
        'if (!poison) return amount;', 'return amount;'],
    ['effect name typed outside EFFECTS', 'the frozen-turn log line spells out "❄️ Frost" instead of using fxName()',
        "is frozen: ${fxName('frost')} — the attack is skipped!", 'is frozen: ❄️ Frost — the attack is skipped!'],
    ['0-damage hits cast', 'a hit that dealt no damage (ultra-blocked) can still cast an effect',
        'if (Math.random() * 100 < castChance && finalDmg > 0)', 'if (Math.random() * 100 < castChance)'],
    ['title effect-chance ignored', "the title's +effect chance bonus is left out of the cast chance",
        'let chance = EFFECT_CAST.castBase + titleStats(title).effect;', 'let chance = EFFECT_CAST.castBase;'],
    // Element Power meter
    ['meter fills on any attack', 'the meter gains a point even when the attack dealt no damage',
        'if (!ult && finalDmg > 0 && ultimateFor(attacker.drakeObj.type)) atkFx.meter', 'if (!ult && ultimateFor(attacker.drakeObj.type)) atkFx.meter'],
    ['below-half bonus every time', 'the below-half bonus is given on every hit under half HP, not once per fight',
        'if (!st.halfDone && v < maxHPOf(f) / 2', 'if (v < maxHPOf(f) / 2'],
    ['meter not reset', 'the meter stays full after the ultimate',
        "atkFx.meter = 0;\n                        tallyUltimate(ultId, 'fires');", "tallyUltimate(ultId, 'fires');"],
    ['ultimate fills the meter', 'the ultimate hit itself adds a meter point',
        'if (!ult && finalDmg > 0 && ultimateFor', 'if (finalDmg > 0 && ultimateFor'],
    ['Frost wipes the meter', 'a frozen turn empties a full meter instead of letting the ultimate wait',
        'frost.left--;', 'frost.left--; atkFx.meter = 0;'],
    ['White Dragon gets an ultimate', 'the streamer\'s dragon fills a meter and fires Firestorm',
        'const ultimateFor = drakeType => drakeType === DRAGON_TYPE ? null :', "const ultimateFor = drakeType => drakeType === DRAGON_TYPE ? 'firestorm' :"],
    // Ultimates
    ['Firestorm can be blocked', 'Firestorm is ultra-blocked like a normal hit',
        '(divine || (ult && ult.unblockable))', '(divine)'],
    ['Firestorm without Burn', 'Firestorm no longer applies 🔥 Burn',
        'if (ult && ult.applies) applyEffect(attacker, defender, ult.applies, attackerProg.level, fx);', ''],
    ['Firestorm multiplier ignored', "Firestorm's damage multiplier from the table isn't applied",
        'ultMult = ult.nums.dmgMult || 1;', 'ultMult = 1;'],
    ['Ice Mirror sends nothing back', 'Ice Mirror stops the hit but the attacker takes nothing',
        'if (back > 0) setHP(attacker, Math.max(0, hpOf(attacker) - back));', ''],
    ['Ice Mirror ignores its cap', 'Ice Mirror absorbs the whole hit instead of at most cap% of max HP',
        'const absorbed = Math.min(would, Math.round(maxHPOf(defender) * m.cap / 100));', 'const absorbed = would;'],
    ['Ice Mirror never runs out', "Ice Mirror's hits-left count doesn't go down",
        'defFx.mirror--;', ''],
    ['Shadow Theft ignores the buff limit', 'stolen buffs are added past the 2-buff limit',
        'else if (atkFx.buff.length < EFFECT_CAST.maxPerKind) {', 'else if (true) {'],
    ['Shadow Theft ignores immunity', 'Shadow Theft takes buffs from a debuff-immune target',
        'else if (isDebuffImmune(defender)) {', 'else if (false) {'],
    ['Shadow Theft without the crit', 'no guaranteed crit when the target had no buffs',
        '|| !!mark || ultForceCrit;', '|| !!mark;'],
    ['Jackpot never misses', 'two or more 💀 still hit',
        'ultMiss = skulls >= ult.nums.missAt;', 'ultMiss = false;'],
    ['Jackpot ignores 💎', 'the damage multiplier doesn\'t count the 💎 reels',
        'ult.nums.base + ult.nums.perGem * gems', 'ult.nums.base + ult.nums.perGem'],
    ['Arcane Detonation keeps the debuffs', 'the debuffs it counted stay on the target',
        'if (detonated.length) defFx.debuff = defFx.debuff.filter(x => !detonated.includes(x));', ''],
    ['Arcane Detonation ignores debuffs', 'the per-debuff bonus isn\'t added',
        'ultMult = ult.nums.dmgMult + ult.nums.perDebuff / 100 * detonated.length;', 'ultMult = ult.nums.dmgMult;'],
    ['effect power scales an ultimate', "Arcane Detonation's multiplier is scaled by the caster's effect power",
        'ultMult = ult.nums.dmgMult + ult.nums.perDebuff / 100 * detonated.length;', 'ultMult = (ult.nums.dmgMult + ult.nums.perDebuff / 100 * detonated.length) * getEffectMult(attacker.drakeObj.type, attacker.title, attackerProg.level);'],
    ['Bloom keeps the debuffs', "Bloom doesn't remove its own debuffs",
        'const removed = atkFx.debuff;\n                            atkFx.debuff = [];', 'const removed = [];'],
    ['Bloom heals nothing', "Bloom's heal from the table isn't applied",
        'before + Math.round(attackerMaxHP * ult.nums.heal / 100)', 'before'],
    ['no 90% cap', 'effect reductions are capped at 100% instead of 90%',
        'const EFFECT_CAPS = { cut: 90, healCut: 90 };', 'const EFFECT_CAPS = { cut: 100, healCut: 100 };'],
    ['ultimate icon typed outside the table', "the meter row spells out 💠 instead of reading Ice Mirror's icon from CLASS_ULTIMATES",
        '${CLASS_ULTIMATES.mirror.icon} ${unitLeftText(', '💠 ${unitLeftText('],
    // Interaction choices (each flipped)
    ['attacking ultimate is not an attack', "an attacking ultimate doesn't count down the attacker's \"own attacks\" effects",
        "countDownEffects(atkFx, 'attacks', id => !onCasts(id));", "if (!ult) countDownEffects(atkFx, 'attacks', id => !onCasts(id));"],
    ['Ice Mirror / Bloom count as attacks', 'a no-attack ultimate still counts down "own attacks" effects',
        '                        if (ult.applies) applyEffect(attacker, defender, ult.applies, attackerProg.level, fx);',
        "                        countDownEffects(atkFx, 'attacks'); if (ult.applies) applyEffect(attacker, defender, ult.applies, attackerProg.level, fx);"],
    ['Dispel clears Ice Mirror', 'Dispel treats Ice Mirror like a buff',
        "if (e.lasts === 'instant' && !st.buff.length) {", "if (e.lasts === 'instant') st.mirror = 0;\n            if (e.lasts === 'instant' && !st.buff.length) {"],
    ['Shadow Theft takes Ice Mirror', 'Shadow Theft steals the target\'s Ice Mirror along with its buffs',
        '                            defFx.buff = [];', '                            defFx.buff = []; atkFx.mirror = defFx.mirror; defFx.mirror = 0;'],
    ['blocked hits spare Ice Mirror', 'an ultra-blocked hit doesn\'t use up an Ice Mirror hit',
        'if (defFx.mirror > 0 && attacker.drakeObj.type !== DRAGON_TYPE) {', 'if (defFx.mirror > 0 && attacker.drakeObj.type !== DRAGON_TYPE && !ultraBlock) {'],
    ['Ice Mirror stops the White Dragon', "the White Dragon's hits are absorbed and reflected like any other",
        'if (defFx.mirror > 0 && attacker.drakeObj.type !== DRAGON_TYPE) {', 'if (defFx.mirror > 0) {'],
    ['Shadow Theft never merges up', 'a stolen buff the thief already has never replaces the thief\'s shorter one',
        'if (inst.left > same.left) { same.left = inst.left; same.power = inst.power; }', ''],
    ['immunity forces the crit', 'Shadow Theft forces a crit whenever the theft is stopped by immunity',
        'ultForceCrit = had.length === 0;', 'ultForceCrit = had.length === 0 || isDebuffImmune(defender);'],
    ['Jackpot miss counts nothing', "a Jackpot miss doesn't count down the attacker's \"own attacks\" effects",
        "countDownEffects(atkFx, 'attacks', id => !onCasts(id));", "if (!ultMiss) countDownEffects(atkFx, 'attacks', id => !onCasts(id));"],
    ['Detonation keeps debuffs on a block', 'Arcane Detonation only removes the debuffs when its hit lands',
        'if (detonated.length) defFx.debuff = defFx.debuff.filter(x => !detonated.includes(x));', 'if (detonated.length && finalDmg > 0) defFx.debuff = defFx.debuff.filter(x => !detonated.includes(x));'],
    ['below-half bonus waits for room', 'the below-half bonus is kept until the meter has room for it',
        'if (!st.halfDone && v < maxHPOf(f) / 2 && ultimateFor(f.drakeObj.type)) {', 'if (!st.halfDone && st.meter < METER.max && v < maxHPOf(f) / 2 && ultimateFor(f.drakeObj.type)) {'],
    ['effect power stretches counts', 'a stronger caster makes the effect last longer',
        'list.push({ id, left: e.count, power });', 'list.push({ id, left: Math.round(e.count * power), power });'],
    // Review fixes and rule changes (caught by rules.js)
    ['fractional max HP', 'max HP keeps the decimals some titles give per level',
        'return Math.floor(hp);   // always whole', 'return hp;   // always whole'],
    ['single-space command words', 'commands split on one space, so "!drake  red" shows the help card',
        'const args = msg.split(/\\s+/);', "const args = msg.split(' ');"],
    ['pick survives into the next fight', 'a "next hit casts" pick made before a fight is kept when the fight starts',
        'if (!opts.betting) clearForcedCast();', ''],
    ['pick survives the end of its fight', "a pick still armed when the fight ends isn't cleared",
        'clearForcedCast();   // a pick that never fired', '// a pick that never fired'],
    ['!дракон reports level 1', "the switch to the White Dragon and back reports level 1, not the White Drake's (the reroll into the Dragon this covered is gone)",
        'const kept = calculateLevelAndProgress(from === DRAGON_TYPE ? d.xp : d.regular.xp).level;', 'const kept = 1;'],
    ['turn 30 not played', 'the time-out comes before turn 30 (fights stop after turn 29)',
        'if (turn > MAX_TURNS) {', 'if (turn >= MAX_TURNS) {'],
    ['ranked draw counts as a loss', 'a ranked draw adds a loss to both records',
        '                // A draw is neither a win nor a loss: the record stays as it was', '                recordStats(p1.name, false); recordStats(p2.name, false);'],
    ['many open challenges', 'a viewer can send a second challenge while the first is open',
        'if (Object.values(pendingChallenges).includes(sender)) {', 'if (false) {'],
    ['waiting duel goes last', 'after a fight the ranked queue goes before the waiting duel',
        'if (waitingDuel) { const d = waitingDuel; waitingDuel = null;', 'if (false) { const d = waitingDuel; waitingDuel = null;'],
    ['busy duellists can queue', 'players whose duel is waiting can still !queue, !battle and !accept',
        "].includes(command) && inWaitingDuel(sender)) {", "].includes(command) && false) {"],
    ['silent !battle', '"!battle" with no name gets no explanation',
        "if ((command === '!бій' || command === '!battle') && !args[1]) {", 'if (false) {'],
    ['two icons in the opening banner', 'the opening banner template adds its own 🌅 before the title icon',
        "opening: '{title}: {who} starts with {fx}'", "opening: '🌅 {title}: {who} starts with {fx}'"],
    ['a rest crept back in', 'nobody can join the ranked queue while a fight is on (so fighters wait before they queue again)',
        'if (matchmakingQueue.includes(sender)) {', 'if (matchmakingQueue.includes(sender) || isBattleRunning) {'],
    ['challenging a waiting duellist', '!battle opens a challenge to a viewer whose duel is waiting',
        'if (inWaitingDuel(targetUser)) {', 'if (false) {'],
    // The result screen's hold (caught by rules.js)
    ['no hold after a ranked fight', 'the next ranked fight or duel starts as soon as a ranked fight ends',
        'renderLeaderboard();\n            holdResult();', 'renderLeaderboard();\n            nextFight();'],
    ['no hold after a friendly fight', 'the next fight starts as soon as a duel or a friendly draw ends',
        "setArenaState({ kind: 'result', ranked: false, winner, turns: fightTurns, ko });\n                isBattleRunning = false;\n                holdResult();",
        "setArenaState({ kind: 'result', ranked: false, winner, turns: fightTurns, ko });\n                isBattleRunning = false;\n                nextFight();"],
    // !queue goes through nextFight(), which checks arenaBusy() before checkQueue() does: the hold lives in arenaBusy()
    ['the queue ignores the hold', 'the result screen no longer keeps the arena busy, so two !queue during it start a fight at once',
        'const arenaBusy = () => isBattleRunning || !!resultHold;', 'const arenaBusy = () => isBattleRunning;'],
    ['an accepted duel ignores the hold', 'a duel accepted during the result screen starts at once',
        '// The arena is busy (a fight, or its result screen): the duel waits and starts after it\n                if (arenaBusy()) {', '// The arena is busy (a fight, or its result screen): the duel waits and starts after it\n                if (isBattleRunning) {'],
    ['!start can\'t end the hold', "a moderator's !start during the result screen does nothing",
        'if (!skipBettingWindow()) endResultHold();', 'skipBettingWindow();'],
    ["anyone's !start ends the hold", "a viewer's !start during the result screen ends it",
        'if (command === \'!старт\' || command === \'!start\') {', 'if (command === \'!старт\' || command === \'!start\') { if (!skipBettingWindow()) endResultHold(); return;'],
    ['no !start guard', 'two !start within 5 s both count (the second can skip the betting window the first opened)',
        'if (Date.now() - lastStartAt < START_GUARD_MS) return;', ''],
    // Ranked play: queue order, underdog XP, the Top (caught by rules.js)
    ['random first pick back', 'the first fighter is picked at random from the queue, not the longest-waiting one',
        'let p1Name = matchmakingQueue.shift();', 'let p1Name = matchmakingQueue.splice(Math.floor(Math.random() * matchmakingQueue.length), 1)[0];'],
    ['a level tie goes to the later one', 'on a level tie the opponent is whoever queued later',
        'if (diff < bestDiff) { bestDiff = diff; best = i; }', 'if (diff <= bestDiff) { bestDiff = diff; best = i; }'],
    ['no underdog cap', 'the underdog bonus is not capped at +40',
        'return Math.min(UNDERDOG_XP_MAX, UNDERDOG_XP_PER_LEVEL * Math.max(0, loserLevel - winnerLevel));', 'return UNDERDOG_XP_PER_LEVEL * Math.max(0, loserLevel - winnerLevel);'],
    ['bonus to the higher-level winner', 'a winner above the loser\'s level gets the bonus too',
        'Math.max(0, loserLevel - winnerLevel)', 'Math.abs(loserLevel - winnerLevel)'],
    ['Gold skips the bonus', 'Gold multiplies only the usual 40, not the bonus',
        'let winXP = addXP(winner.name, 40 + bonus);', 'let winXP = addXP(winner.name, 40) + bonus;'],
    ['Top by wins − losses', 'the Top is ordered by wins − losses again, not by wins',
        "if ((rb.wins || 0) !== (ra.wins || 0)) return (rb.wins || 0) - (ra.wins || 0);", "const net = ((rb.wins || 0) - (rb.losses || 0)) - ((ra.wins || 0) - (ra.losses || 0)); if (net) return net;"],
    ['Top tie: more losses first', 'on equal wins more losses go first',
        'if ((ra.losses || 0) !== (rb.losses || 0)) return (ra.losses || 0) - (rb.losses || 0);', 'if ((ra.losses || 0) !== (rb.losses || 0)) return (rb.losses || 0) - (ra.losses || 0);'],
    // Tournaments (caught by rules.js)
    ['tournament: first to 1', 'a tournament match ends after one won game instead of two',
        'const TOURNEY_WINS = 2;', 'const TOURNEY_WINS = 1;'],
    ['a drawn tournament game counts', "a drawn game goes to the match's first-named player instead of being replayed",
        "if (!winner) { t.replay = true; tourneySave(); addLog(tT('draw', { label })); return; }", 'if (!winner) { winner = m.a; loser = m.b; }'],
    ['no 3rd-place game', 'the semifinal losers never play for 3rd place',
        'if (r === last && t.third && !t.third.winner) return { third: true };', ''],
    ['tournament at saved levels', 'tournament games use the players\' saved levels, not level 20',
        'return d ? { ...d, xp: TOURNEY_XP } : null;', 'return d;'],
    ['tournament games give XP', 'a tournament game gives the usual XP and counts as a win and a loss',
        'tourneyResult(winner ? winner.name : null, looser ? looser.name : null);',
        'tourneyResult(winner ? winner.name : null, looser ? looser.name : null); if (winner) { addXP(winner.name, 40); addXP(looser.name, 10); recordStats(winner.name, true); recordStats(looser.name, false); }'],
    ['the queue ignores the tournament', 'ranked fights from the queue go on between tournament games',
        'if (tourneyOn()) { tourneyNext(); return; }\n            checkQueue();', 'checkQueue();\n            if (tourneyOn() && !arenaBusy()) tourneyNext();'],
    ['duels during the tournament', '!battle and !accept work as usual while a tournament is on',
        "if (tourneyOn() && ['!бій', '!battle', '!прийняти', '!accept'].includes(command)) {", 'if (false) {'],
    ['anyone runs tournaments', "a viewer's !tournament opens sign-up",
        "if (command === '!турнір' || command === '!tournament') {\n                if (!isMod) return true;", "if (command === '!турнір' || command === '!tournament') {"],
    ['«місць» for any number', 'the qualifier announcement says «за 1 місць» instead of «за 1 місце»',
        "spots: ['{n} місце', '{n} місця', '{n} місць']", "spots: ['{n} місць', '{n} місць', '{n} місць']"],
    ['random players skip the qualifier', 'who goes straight into the main bracket is drawn at random, not the highest levels',
        '.sort((x, y) => y.level - x.level || x.i - y.i).map(x => x.name);', '.sort((x, y) => y.level - x.level || x.i - y.i).map(x => x.name); shuffle(names);'],
    ['qualifier best of 3', 'a qualifier is first to 2 like a main-bracket match, not a single game',
        'const tourneySingle = id => id.q !== undefined || !!id.third;', 'const tourneySingle = id => !!id.third;'],
    ['qualifier after round 1', 'round-1 matches with both players known are played before the qualifier',
        'if (q !== -1) return { q };', "if (q !== -1 && t.rounds[0].every(m => !m.a || !m.b || m.winner)) return { q };"],
    ['!queue starts ranked fights directly', '!queue calls checkQueue() itself, so after a simulation error during a tournament a ranked fight starts',
        'nextFight();   // not checkQueue(): during a tournament the queue waits', 'checkQueue();   // not checkQueue(): during a tournament the queue waits'],
    ['sign-up order, not level', 'the earliest registrants go straight into the main bracket, whatever their level',
        '.sort((x, y) => y.level - x.level || x.i - y.i)', '.sort((x, y) => x.i - y.i)'],
    ['ties to the later sign-up', 'on a level tie the later registrant goes straight in',
        '.sort((x, y) => y.level - x.level || x.i - y.i)', '.sort((x, y) => y.level - x.level || y.i - x.i)'],
    ['the top two may share a half', 'the two highest levels are drawn anywhere, so they can meet before the final',
        'if (Math.floor(s1 / halfSize) === Math.floor(s2 / halfSize)) {', 'if (false) {'],
    ['a qualifier seed left anywhere', "when the second highest level is in the qualifier, their game's place can be in the top seed's half",
        "const placeOf = who => places.findIndex(p => p === who || (typeof p === 'object' && [t.qual[p.q].a, t.qual[p.q].b].includes(who)));",
        'const placeOf = who => places.indexOf(who);'],
    // Tournament rewards (caught by rules.js)
    ['channel points use up free spins', 'a channel-point !title also spends a free spin',
        'freeSpin = !isValidTitle && honours.spins[sender] > 0;', 'freeSpin = honours.spins[sender] > 0;'],
    ['free rolls without a spin', '!title typed in chat rolls a title even with no free spin left',
        'freeSpin = !isValidTitle && honours.spins[sender] > 0;', 'freeSpin = !isValidTitle;'],
    ['medals reset every tournament', "a player's medal count starts again at each tournament",
        'const m = medalCount(h, name); m[i]++; h.medals[name] = m;', 'const m = [0, 0, 0]; m[i]++; h.medals[name] = m;'],
    ['spins replaced, not added', "a new tournament's spins replace the ones still left",
        'h.spins[name] = (h.spins[name] || 0) + TOURNEY_SPINS[i];', 'h.spins[name] = TOURNEY_SPINS[i];'],
    ['badges kept for good', 'the first podium keeps the badges after the next tournament ends',
        'h.holders = [...t.podium];', 'h.holders = h.holders.length ? h.holders : [...t.podium];'],
    // The play log: tournament events and every fight's HP (caught by rules.js, which sees what the game hands to playLog)
    ['opened without who', "the play log's 'opened' event leaves out who opened sign-up",
        "playTourney('opened', { size, user: sender });", "playTourney('opened', { size });"],
    ['joined logs the size', "each 'joined' event logs the bracket size instead of how many have signed up",
        "playTourney('joined', { user: sender, signedUp: t.players.length });", "playTourney('joined', { user: sender, signedUp: t.size });"],
    ['!leave not logged', 'leaving sign-up leaves no event in the play log',
        "playTourney('left', { user: sender, signedUp: t.players.length });", ''],
    ['closed always "full"', "a sign-up closed by !tournament start is logged as having filled up",
        "how: by ? 'start' : 'full'", "how: 'full'"],
    ['no qualifier games logged', "the 'closed' event says 0 qualifier games whatever the draw",
        'qualifierGames: t.qual.length', 'qualifierGames: 0'],
    ['cancel loses the stage', "a cancel mid-tournament is logged without the stage it stopped at",
        'stage: g ? g.stage : null', 'stage: null'],
    ['stale game on a sign-up cancel', "a sign-up cancelled after an earlier tournament was stopped mid-game is logged with that old game's stage",
        "const g = tourney.phase === 'running' ? tourGame : null;", "const g = tourGame;"],
    ['podium reversed', "the 'podium' event lists 3rd place first",
        'podium: [...t.podium], signedUp', 'podium: [...t.podium].reverse(), signedUp'],
    ['max HP swapped', "each fighter's max HP is logged on the other fighter",
        'p.maxHp = [max1, max2][i];', 'p.maxHp = [max2, max1][i];'],
    ['HP left swapped', "a ranked fight logs each fighter's HP left on the other one",
        'playGot, { [p1.name]: p1HP, [p2.name]: p2HP });', 'playGot, { [p1.name]: p2HP, [p2.name]: p1HP });'],
    ['no HP on a duel', 'a duel is logged without the HP left',
        'turns: fightTurns }, null, { [p1.name]: p1HP, [p2.name]: p2HP });', 'turns: fightTurns }, null);'],
    ['no HP on a tournament game', 'a tournament game is logged without the HP left',
        "counted: !!tourney && tourney.phase === 'running' }, null, { [p1.name]: p1HP, [p2.name]: p2HP });", "counted: !!tourney && tourney.phase === 'running' }, null);"],
    ['no HP on a simulation error', 'a fight stopped by a simulation error is logged without the HP left',
        'error: String(error && error.message) }, null, { [p1.name]: p1HP, [p2.name]: p2HP });', 'error: String(error && error.message) }, null);'],
    // The coin flip's Ukrainian words (caught by rules.js)
    ['title 189 untranslated', 'title 189 shows its English name in Ukrainian',
        'name: { uk: "Герб чи число", en: "Heads or Tails" }', 'name: { uk: "Heads or Tails", en: "Heads or Tails" }'],
    ['coin heads in English', 'the Ukrainian log says "Heads!" for the coin flip',
        '`🪙 Герб! (×${MECH.coinHigh}) `', '`🪙 Heads! (×${MECH.coinHigh}) `'],
    ['coin tails reworded', "the Ukrainian log names the coin's other side with some other word",
        '`🪙 Число... (×${MECH.coinLow}) `', '`🪙 Монета... (×${MECH.coinLow}) `'],
    // The renamed titles and Ice Mirror's wording (caught by rules.js 22). Old names with a banned stem are built from
    // pieces, so tests/banned_words.js keeps the whole word out of this file
    ...[
        [1, 'uk: "Сесійний трайхардер"', 'uk: "Сесійний зад' + 'рот"'],
        [4, 'uk: "Професійний буквоїд"', 'uk: "Професійний душ' + 'ніла"'],
        [87, 'uk: "Легендарний буквоїд"', 'uk: "Легендарний душ' + 'ніла"'],
        [146, 'uk: "Знову «ще один матч»"', 'uk: "Знову «ще одна катка»"'],
        [68, 'uk: "Директор жартів"', 'uk: "Директор з при' + 'колів"'],
        [50, 'uk: "Володар шкарпеток"', 'uk: "Володар носків"'],
        [31, 'uk: "Володар капців"', 'uk: "Володар тапків"'],
        [84, 'uk: "Магістр FPS"', 'uk: "Магістр ультра-настроїв"'],
        [82, 'uk: "Підвищені налаштування"', 'uk: "Володар високих FPS"'],
        [69, 'uk: "Володар хорор-ігор"', 'uk: "Володар хоррор-ігор"'],
        [16, 'uk: "Диванний лорд"', 'uk: "Провідник дивану"'],
        [84, 'en: "FPS Master"', 'en: "Ultra Settings Master"'],
        [82, 'en: "High Settings"', 'en: "High FPS Lord"'],
        [16, 'en: "Couch Lord"', 'en: "Couch Guide"'],
    ].map(([id, now, old]) => [`title ${id} old ${now.slice(0, 2)} name`, `title ${id} gets its old ${now.startsWith('uk') ? 'Ukrainian' : 'English'} name back (${old.slice(4)})`, now, old]),
    ['Ice Mirror old wording', "Ice Mirror's description ends with the old word for the attacker again",
        "поглиненого повертається нападникові'", "поглиненого повертається атаку" + "ючому'"],
    ['Thorns old wording', 'the Ukrainian Thorns log line ends with the old word for the attacker again',
        '`🌵 Шипи: -${thorn} HP нападникові! `', '`🌵 Шипи: -${thorn} HP атаку' + 'ючому! `'],
    ['tournament titles not refreshed', "a saved tournament keeps its players' titles as at sign-up, old names and all",
        'if (tourney) tourney.players.forEach(p => { const fresh = p.title && TITLES_DB.find(t => t.id === p.title.id); if (fresh) p.title = fresh; });', ''],
    // The Top and the White Dragon (caught by rules.js)
    ['Top tie: level before losses', 'on equal wins the higher level goes first, not fewer losses',
        '                if ((ra.losses || 0) !== (rb.losses || 0)) return (ra.losses || 0) - (rb.losses || 0);\n', ''],
    ['a White Dragon fight counts', 'a ranked fight against the White Dragon counts a win and a loss again',
        'const dragonFight = [p1, p2].some(f => f.drakeObj && f.drakeObj.type === DRAGON_TYPE);', 'const dragonFight = false;'],
    ['no ranked fight counts', 'no ranked fight counts a win or a loss, not only those against the White Dragon',
        'const dragonFight = [p1, p2].some(f => f.drakeObj && f.drakeObj.type === DRAGON_TYPE);', 'const dragonFight = true;'],
    // The streamer's White Drake (caught by rules.js 23 and effects.js)
    ['White Drake: one bar size', 'the bar is the first tier\'s share of max HP at every level',
        'Math.round(maxHP * WHITE_DRAKE.scales[tierIndex(level)] / 100)', 'Math.round(maxHP * WHITE_DRAKE.scales[0] / 100)'],
    ['White Drake: hits skip the scales', 'hits go straight to HP, the scales take nothing',
        'const toScales = defFx.scales && !fortunePast ? Math.min(defFx.scales.now, finalDmg) : 0;', 'const toScales = 0;'],
    ['White Drake: armour-piercing through the scales', 'a sneaky (armour-piercing) hit goes past the scales too',
        'const toScales = defFx.scales && !fortunePast ? Math.min(', "const toScales = defFx.scales && !fortunePast && subType !== 'sneaky' ? Math.min("],
    ['White Drake: Fortune breaks the scales', "Gold's Fortune takes the scales too instead of slipping past them",
        'finalDmg = targetHPBefore - 1;\n                                fortunePast = true;', 'finalDmg = targetHPBefore - 1 + scalesLeft;'],
    ['White Drake: no bounce', 'debuffs land on the White Drake while its scales hold',
        "if (e.kind === 'debuff' && st.scales && st.scales.now > 0) {", 'if (false) {'],
    ['White Drake: bounce with broken scales', 'debuffs bounce off broken scales too',
        "if (e.kind === 'debuff' && st.scales && st.scales.now > 0) {", "if (e.kind === 'debuff' && st.scales && st.scales.now >= 0) {"],
    ['White Drake: no crack line', '«💔 Луска розкололася!» never shows',
        "addLog(`${tag(defender)}: ${fvT('cracked')}`);", ''],
    ['Перекування: past the starting size', 'Перекування fills the bar to its starting size at least, not by its share',
        'atkFx.scales.now = Math.min(atkFx.scales.max, before + Math.round(', 'atkFx.scales.now = Math.max(atkFx.scales.max, before + Math.round('],
    ['Перекування: Poison cuts it', "Перекування counts as healing, so Отруєння's cut applies",
        'before + Math.round(maxHPOf(attacker) * fxNum(reforge,', 'before + Math.round(healAmount(attacker, maxHPOf(attacker)) * fxNum(reforge,'],
    ['Перекування: rebuilds nothing', "an own damaging attack under Перекування doesn't rebuild the scales",
        'if (reforge && finalDmg > 0 && atkFx.scales) {', 'if (false) {'],
    ['Магніт: pulls nothing', "the target's new buffs stay with the target",
        "const pulled = e.kind === 'buff' && !!getFx(fx[caster.name], 'magnet');", 'const pulled = false;'],
    ['Магніт: no buff limit', 'a pulled buff goes on top of 2 buffs instead of replacing the one closest to ending',
        'if (list.length >= EFFECT_CAST.maxPerKind) {', 'if (!pulled && list.length >= EFFECT_CAST.maxPerKind) {'],
    ["the White Drake's pair in the shared pool", 'any drake can cast Перекування and Магніт',
        'const POOL_IDS = EFFECT_IDS.filter(id => !STREAMER_TYPES.includes(EFFECTS[id].element));', 'const POOL_IDS = EFFECT_IDS;'],
    ["Удар ковадла: doesn't re-forge", 'the bar stays as it was after Удар ковадла',
        'atkFx.scales.now = atkFx.scales.max;', 'atkFx.scales.now = atkFx.scales.now;'],
    ['Удар ковадла: one multiplier', 'Удар ковадла hits ×dmgMult at the top level too',
        'ultMult = attackerProg.level >= 20 ? ult.nums.topMult : ult.nums.dmgMult;', 'ultMult = ult.nums.dmgMult;'],
    ['switching back loses XP', 'the White Drake comes back from the Dragon at 0 XP',
        'd.drakeObj = r.drakeObj; d.title = r.title; d.xp = r.xp;', 'd.drakeObj = r.drakeObj; d.title = r.title; d.xp = 0;'],
    ['the Dragon below level 20', "the Dragon's XP is level 19's, so it isn't level 20 and gains XP",
        'const DRAGON_XP = (() => { let x = 0; for (let l = 1; l < 20; l++)', 'const DRAGON_XP = (() => { let x = 0; for (let l = 1; l < 19; l++)'],
    ['!дракон mid-fight', 'the streamer can switch forms on the arena',
        'const onArenaNow = user => !!arenaMatch &&', 'const onArenaNow = user => false &&'],
    ['!дракон in a tournament', 'the streamer can switch forms while signed up or playing',
        'const streamerInTourney = user => !!tourney &&', 'const streamerInTourney = user => false &&'],
    ["a viewer's !дракон", "a viewer's !дракон isn't refused",
        'if (!isStreamer(sender)) { refuseDragon(sender, senderColor); return; }', 'if (false) {}'],
    ["switching drops the queue place", "!дракон takes the streamer out of the ranked queue",
        'const dbNow = getDragonDB();\n                const d = dbNow[sender] ||', 'matchmakingQueue = matchmakingQueue.filter(u => u !== sender);\n                const dbNow = getDragonDB();\n                const d = dbNow[sender] ||'],
    ["the White Drake's fights don't count", 'a ranked fight against the White Drake gives no win or loss either',
        'const dragonFight = [p1, p2].some(f => f.drakeObj && f.drakeObj.type === DRAGON_TYPE);', 'const dragonFight = [p1, p2].some(f => f.drakeObj && STREAMER_TYPES.includes(f.drakeObj.type));'],
    ["the White Drake can't sign up", 'the White Drake gets the Dragon\'s refusal at tournament sign-up',
        "else if (d.drakeObj && d.drakeObj.type === DRAGON_TYPE) addInfo(tT('dragon', { who }), 'warn');", "else if (d.drakeObj && STREAMER_TYPES.includes(d.drakeObj.type)) addInfo(tT('dragon', { who }), 'warn');"],
    ['old Dragon save: a level-20 White Drake', "an old Dragon save's 1,000,000 XP goes to its White Drake",
        'if (!d.regular) { d.regular = { drakeObj: whiteDrakeOf(), title: titleById(WHITE_DRAKE_TITLE_ID), xp: 0 }; changed = true; }', 'if (!d.regular) { d.regular = { drakeObj: whiteDrakeOf(), title: titleById(WHITE_DRAKE_TITLE_ID), xp: d.xp }; changed = true; }'],
    ['the streamer keeps a viewer element', "an old save's regular drake isn't turned into the White Drake",
        '} else if (d.drakeObj && d.drakeObj.type !== WHITE_DRAKE_TYPE) { d.drakeObj = whiteDrakeOf(); changed = true; }', '}'],
    ['old viewer White Drakes become the White Drake', "a viewer save from when the Green Drake was the White Drake loads as the streamer's White Drake",
        "d.drakeObj = { ...d.drakeObj, type: 'green' }; changed = true; }", "d.drakeObj = { ...d.drakeObj, type: 'steel' }; changed = true; }"],
    ['no form event', "!дракон leaves nothing in the play log",
        "playLog('form', { user: sender, from, to: d.drakeObj.type, level: kept });", ''],
    ["title rolls change the White Drake", "!титул rolls a title for the White Drake (and spends a free spin)",
        'if (dragon.drakeObj && dragon.drakeObj.type === WHITE_DRAKE_TYPE) {', 'if (false) {'],
    ["«білий» is the Dragon again", "«білий» in !дрейк and !рерол gives the White Dragon, as before",
        "'білий': 'steel', white: 'steel'", "'білий': 'white', white: 'white'"],
    ["the White Drake rolls a title", "a new White Drake gets a random title instead of «Біла сталь»",
        'd.drakeObj = whiteDrakeOf(); d.title = titleById(WHITE_DRAKE_TITLE_ID); d.xp = 0; d.level = 1;', 'd.drakeObj = whiteDrakeOf(); d.title = getRandomTitle(); d.xp = 0; d.level = 1;'],
    ['Магніт: 2 attacks', "Магніт lasts the target's next 2 attacks (it's 1, as its text says: «Наступна атака цілі»)",
        "lasts: 'attacks', count: 1, nums: {},\n                        desc: { uk: 'Наступна атака цілі",
        "lasts: 'attacks', count: 2, nums: {},\n                        desc: { uk: 'Наступна атака цілі"],
    ['Магніт: «замінює» + a name', "the pulled buff's line names the buff it replaces after «замінює» again (the name would need the accusative)",
        "${gone ? ` (${fxName(gone.id)} ${fvT('lost')})` : ''}", "${gone ? ` (замінює ${fxName(gone.id)})` : ''}"],
    ['Магніт: gone before the cast', "Магніт runs down with the other attack effects, before the attack's casts again, so a buff cast on the attack it covers stays with the target",
        "const onCasts = id => id === 'magnet';", "const onCasts = id => false;"],
];

// Runs both test files (effects.js and ultimates.js) against one copy of the game; resolves with what each reported
const TESTS = ['effects.js', 'ultimates.js', 'rules.js'];
const runOne = (file, html) => new Promise(resolve => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drake-mutation-'));
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    fs.writeFileSync(path.join(dir, 'README.md'), readme);
    const p = spawn(process.execPath, [path.join(__dirname, file), '--file', path.join(dir, 'index.html')]);
    let out = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => out += d);
    p.on('close', code => {
        fs.rmSync(dir, { recursive: true, force: true });
        resolve({ file, code, failed: out.split('\n').filter(l => l.includes('✗')).map(l => l.replace(/^\s*✗\s*/, '').trim()) });
    });
});
const runTests = html => Promise.all(TESTS.map(f => runOne(f, html)));
async function pool(jobs, size) {
    const out = new Array(jobs.length); let next = 0;
    await Promise.all(Array.from({ length: Math.min(size, jobs.length) }, async () => { while (next < jobs.length) { const i = next++; out[i] = await jobs[i](); } }));
    return out;
}

(async () => {
    let missed = 0;
    const control = await runTests(src);
    const bad = control.filter(r => r.code !== 0);
    if (bad.length) {
        console.log(`✗ the unchanged game already fails ${bad.map(r => r.file).join(' and ')}, so mutations can't be judged:\n  ${bad.flatMap(r => r.failed).slice(0, 3).join('\n  ')}`);
        process.exit(1);
    }
    console.log(`✓ unchanged game: ${TESTS.join(' and ')} pass\n`);
    const runnable = MUTATIONS.filter(([name, , find]) => {
        if (src.includes(find)) return true;
        console.log(`✗ ${name}: the code to break isn't in the game any more (update this mutation): ${find}`); missed++; return false;
    });
    const results = await pool(runnable.map(([, , find, replace]) => () => runTests(src.replace(find, replace))), Math.max(1, Math.floor(os.cpus().length / 2)));
    runnable.forEach(([name, what], i) => {
        const caughtBy = results[i].filter(r => r.code !== 0);
        if (!caughtBy.length) { console.log(`✗ NOT CAUGHT: ${name} (${what})`); missed++; return; }
        const first = caughtBy[0];
        console.log(`✓ caught: ${name} (${what})\n    by ${caughtBy.map(r => `${r.file} (${r.failed.length} check(s))`).join(', ')}; first: ${(first.failed[0] || '').slice(0, 150)}`);
    });
    console.log(missed ? `\n${missed} mutation(s) not caught.` : `\nAll ${MUTATIONS.length} mutations caught.`);
    process.exit(missed ? 1 : 0);
})();
