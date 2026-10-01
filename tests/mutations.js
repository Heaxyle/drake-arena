// Tests the tests: breaks a copy of the game in specific ways and checks that tests/effects.js catches every one.
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
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const fi = args.indexOf('--file');
const FILE = fi === -1 ? 'showcase/index.html' : args[fi + 1];
const src = fs.readFileSync(FILE, 'utf8');
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
    ['effect power stretches counts', 'a stronger caster makes the effect last longer',
        'list.push({ id, left: e.count, power });', 'list.push({ id, left: Math.round(e.count * power), power });'],
];

const runEffects = html => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drake-mutation-'));
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    fs.writeFileSync(path.join(dir, 'README.md'), readme);
    const r = spawnSync(process.execPath, [path.join(__dirname, 'effects.js'), '--file', path.join(dir, 'index.html')], { encoding: 'utf8' });
    fs.rmSync(dir, { recursive: true, force: true });
    const failed = (r.stdout || '').split('\n').filter(l => l.includes('✗')).map(l => l.replace(/^\s*✗\s*/, '').trim());
    return { code: r.status, failed };
};

let missed = 0;
const control = runEffects(src);
if (control.code !== 0) {
    console.log(`✗ the unchanged game already fails effects.js, so mutations can't be judged:\n  ${control.failed.slice(0, 3).join('\n  ')}`);
    process.exit(1);
}
console.log('✓ unchanged game: effects.js passes\n');
for (const [name, what, find, replace] of MUTATIONS) {
    if (!src.includes(find)) { console.log(`✗ ${name}: the code to break isn't in the game any more (update this mutation): ${find}`); missed++; continue; }
    const { code, failed } = runEffects(src.replace(find, replace));
    if (code === 0) { console.log(`✗ NOT CAUGHT: ${name} (${what})`); missed++; continue; }
    console.log(`✓ caught: ${name} (${what})\n    ${failed.length} check(s) failed, first: ${failed[0].slice(0, 160)}`);
}
console.log(missed ? `\n${missed} mutation(s) not caught.` : `\nAll ${MUTATIONS.length} mutations caught.`);
process.exit(missed ? 1 : 0);
