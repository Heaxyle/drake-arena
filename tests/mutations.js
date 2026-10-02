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
        "countDownEffects(atkFx, 'attacks');", "if (!ult) countDownEffects(atkFx, 'attacks');"],
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
        "countDownEffects(atkFx, 'attacks');", "if (!ultMiss) countDownEffects(atkFx, 'attacks');"],
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
    ['White Dragon reroll says level 1', 'rerolling into the White Dragon says "Level reset to 1!"',
        "chosen.type === DRAGON_TYPE ? `Level ${calculateLevelAndProgress(dragon.xp).level}!` : 'Level reset to 1!'", "'Level reset to 1!'"],
    ['turn 30 not played', 'the time-out comes before turn 30 (fights stop after turn 29)',
        'if (turn > MAX_TURNS) {', 'if (turn >= MAX_TURNS) {'],
    ['ranked draw counts as a loss', 'a ranked draw adds a loss to both records',
        '                // A draw is neither a win nor a loss: the record stays as it was', '                recordStats(p1.name, false); recordStats(p2.name, false);'],
    ['a challenge costs the cooldown', 'sending a challenge puts the challenger on the cooldown',
        'pendingChallenges[targetUser] = sender;   // a challenge on its own costs nothing', 'pendingChallenges[targetUser] = sender; cooldowns[sender] = Date.now();   // a challenge on its own costs nothing'],
    ['many open challenges', 'a viewer can send a second challenge while the first is open',
        'if (Object.values(pendingChallenges).includes(sender)) {', 'if (false) {'],
    ['duel fight charges one player', "a duel starts without putting the challenger on the cooldown",
        '            cooldowns[challenger] = Date.now();\n            cooldowns[accepter] = Date.now();', '            cooldowns[accepter] = Date.now();'],
    ['waiting duel goes last', 'after a fight the ranked queue goes before the waiting duel',
        'if (waitingDuel) { const d = waitingDuel; waitingDuel = null;', 'if (false) { const d = waitingDuel; waitingDuel = null;'],
    ['accept ignores a resting player', 'a duel can be accepted while a player is still on the cooldown',
        'const resting = [challenger, sender].filter(', 'const resting = [].filter('],
    ['busy duellists can queue', 'players whose duel is waiting can still !queue, !battle and !accept',
        "].includes(command) && inWaitingDuel(sender)) {", "].includes(command) && false) {"],
    ['silent !battle', '"!battle" with no name gets no explanation',
        "if ((command === '!бій' || command === '!battle') && !args[1]) {", 'if (false) {'],
    ['two icons in the opening banner', 'the opening banner template adds its own 🌅 before the title icon',
        "opening: '{title}: {who} starts with {fx}'", "opening: '🌅 {title}: {who} starts with {fx}'"],
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
