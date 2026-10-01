// Effect rules test: loads the real game code in Node (same stub page as the balance sim) and checks the buffs/debuffs.
//
// Usage (from the project folder):
//   node tests/effects.js                        (or: npm run test:effects)
//   node tests/effects.js --fights 600           more simulated fights for the in-fight checks (default 300 per language)
//   node tests/effects.js --file path/to/index.html
//
// Checks:
//   - EFFECTS: 12 effects, one buff + one debuff per viewer element, each with an icon, both names and a description
//   - no internal effect id (or a removed effect) ever shows up in the battle log, in either language
//   - in real fights, every count goes down on the event it names (own attacks, hits taken, the owner's turns), by exactly 1
//   - casting an active effect refreshes it; a third buff/debuff replaces the one closest to ending; both are logged
//   - debuff immunity (title and White Dragon) still stops every debuff, Dispel included
//   - card chips say what's left in words, in both languages; effect power scales percentages, never counts
//   - casts pick the caster's own element pair about 70% + 30%/6 of the time; the White Dragon picks from all 12
// Exits non-zero if any check fails.
const fs = require('fs');
const path = require('path');
const { mulberry32, gameScript, setupEnv } = require('./game_env');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i === -1 ? def : args[i + 1]; };
const FILE = opt('--file', 'showcase/index.html');
const FIGHTS = Number(opt('--fights', 300));

Math.random = mulberry32(777);
setupEnv();
const _warn = console.warn; console.warn = () => {};
// Expose the game's own bindings to this file (a function declaration can be swapped, which is how addLog and
// applyEffect get wrapped below; runBattle calls them by name)
eval(gameScript(FILE) + `
;globalThis.__game = {
    EFFECTS, EFFECT_IDS, BUFF_IDS, DEBUFF_IDS, EFFECT_CAST, TITLES_DB, DRAKE_TYPES, VIEWER_DRAKE_TYPES, DRAGON_TYPE, DRAGON_TITLE_ID,
    applyEffect: (...a) => applyEffect(...a), pickEffect, countDownEffects, newFxState, describeEffect, effectLeftText, effectChipText,
    fxNum, getEffectMult, getRequiredXP, getDragonDB, saveDragonDB,
    runBattle: (...a) => runBattle(...a),
    get battleFx() { return battleFx; },
    setLang: l => { currentLang = l; },
    setRunning: v => { isBattleRunning = v; },
    wrapAddLog: f => { const orig = addLog; addLog = t => { orig(t); f(t); }; },
    wrapApplyEffect: f => { const orig = applyEffect; applyEffect = (...a) => { const r = orig(...a); f(r, a); return r; }; },
};`);
console.warn = _warn;
const G = globalThis.__game;
const { EFFECTS, EFFECT_IDS } = G;

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(bad);
const strip = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
const fighter = (name, type, title = null, level = 20) => ({ name, color: '#fff', drakeObj: DRAKE_TYPES_BY[type], title, xp: xpFor(level) });
const DRAKE_TYPES_BY = Object.fromEntries(G.DRAKE_TYPES.map(d => [d.type, d]));
const xpFor = lvl => { let x = 0; for (let l = 1; l < lvl; l++) x += G.getRequiredXP(l); return x; };
const titleWith = mech => G.TITLES_DB.find(t => t.bonus && t.bonus.mechanic === mech);

// Captures what addLog writes while `fn` runs
let capture = null;
G.wrapAddLog(t => { if (capture) capture.push(strip(t)); });
const logged = fn => { capture = []; const r = fn(); const lines = capture; capture = null; return [r, lines]; };

// ---------------------------------------------------------------- 1. The table
console.log('\nEFFECTS table');
const UNITS = ['attacks', 'hits', 'turns', 'instant'];
check(EFFECT_IDS.length === 12, 'there are 12 effects', `expected 12 effects, found ${EFFECT_IDS.length}: ${EFFECT_IDS.join(', ')}`);
for (const id of EFFECT_IDS) {
    const e = EFFECTS[id], bad = [];
    if (!e.icon || !e.icon.trim()) bad.push('no icon');
    for (const l of ['uk', 'en']) {
        if (!e.name || !e.name[l] || !e.name[l].trim()) bad.push(`no ${l} name`);
        if (!e.desc || !e.desc[l] || !e.desc[l].trim()) bad.push(`no ${l} description`);
        else { const d = G.describeEffect(id, l); if (/[{}]|undefined|NaN/.test(d)) bad.push(`${l} description not filled in: "${d}"`); }
    }
    if (!['buff', 'debuff'].includes(e.kind)) bad.push(`kind "${e.kind}"`);
    if (!UNITS.includes(e.lasts)) bad.push(`lasts "${e.lasts}"`);
    if (e.lasts === 'instant' ? e.count !== 0 : !(Number.isInteger(e.count) && e.count > 0)) bad.push(`count ${e.count}`);
    if (!e.color) bad.push('no chip color');
    check(!bad.length, `${e.icon} ${e.name.uk} / ${e.name.en}: ${G.describeEffect(id, 'en')}`, `${id}: ${bad.join(', ')}`);
}
for (const d of G.VIEWER_DRAKE_TYPES) {
    const own = EFFECT_IDS.filter(id => EFFECTS[id].element === d.type).map(id => EFFECTS[id].kind).sort().join('+');
    check(own === 'buff+debuff', `${d.type}: one buff and one debuff`, `${d.type} element pair is "${own}", expected one buff and one debuff`);
}
const html = fs.readFileSync(FILE, 'utf8');
const removed = ["Кам'яна шкіра", 'Кам’яна шкіра', 'Пролом броні', 'Stoneskin', 'Armor Break', 'stoneskin', 'armorbreak', 'divinepower'];
const leftovers = removed.filter(w => html.includes(w));
check(!leftovers.length, 'removed effects (Stoneskin, Armor Break) are gone from the game file', `removed effects still in the game file: ${leftovers.join(', ')}`);

// ---------------------------------------------------------------- 2. Words on the cards
console.log('\nChips and counts');
const chipCases = [
    [{ id: 'rage', left: 2 }, 'uk', '💢 Лють · ще 2 атаки'], [{ id: 'rage', left: 1 }, 'uk', '💢 Лють · ще 1 атака'],
    [{ id: 'rage', left: 2 }, 'en', '💢 Rage · 2 attacks left'], [{ id: 'divine', left: 1 }, 'en', '🌟 Divine Might · 1 attack left'],
    [{ id: 'shield', left: 2 }, 'uk', '🛡️ Щит · ще 2 удари'], [{ id: 'mark', left: 1 }, 'en', '🎯 Mark · 1 hit left'],
    [{ id: 'burn', left: 3 }, 'uk', '🔥 Підпал · ще 3 ходи'], [{ id: 'regen', left: 1 }, 'uk', '💚 Регенерація · ще 1 хід'],
    [{ id: 'poison', left: 3 }, 'en', '☠️ Poison · 3 turns left'],
];
for (const [inst, lang, want] of chipCases) {
    const got = G.effectChipText(inst, lang);
    check(got === want, `"${got}"`, `chip ${inst.id} ${inst.left} (${lang}): got "${got}", want "${want}"`);
}
const plural = [[5, 'ще 5 атак'], [11, 'ще 11 атак'], [21, 'ще 21 атака'], [22, 'ще 22 атаки'], [12, 'ще 12 атак']];
const badPlural = plural.filter(([n, w]) => G.effectLeftText('rage', n, 'uk') !== w);
check(!badPlural.length, 'Ukrainian plurals (1 атака / 2 атаки / 5 атак / 11 атак / 21 атака)', `wrong plurals: ${badPlural.map(([n]) => G.effectLeftText('rage', n, 'uk')).join(', ')}`);
// Effect power scales percentages, never counts
{
    G.setLang('en');
    const purple = fighter('P', 'purple', G.TITLES_DB.find(t => t.bonus && t.bonus.stats && t.bonus.stats.buffEff), 20);
    const other = fighter('Q', 'red');
    const fx = { P: G.newFxState(), Q: G.newFxState() };
    const power = G.getEffectMult('purple', purple.title, 20);
    logged(() => G.applyEffect(purple, other, 'rage', 20, fx));
    const r = fx.P.buff[0];
    check(power > 1 && r.left === EFFECTS.rage.count && Math.abs(G.fxNum(r, 'dmg') - EFFECTS.rage.nums.dmg * power) < 1e-9,
        `Purple + effect-strength title (power ×${power.toFixed(2)}): Rage +${G.fxNum(r, 'dmg').toFixed(0)}% damage, still ${r.left} attacks`,
        `power scaling wrong: power ${power}, left ${r.left}, dmg ${G.fxNum(r, 'dmg')}`);
}

// ---------------------------------------------------------------- 3. Refresh, replacement, immunity, Dispel
console.log('\nRefresh, replacement, immunity, Dispel');
for (const lang of ['uk', 'en']) {
    G.setLang(lang);
    const A = fighter('A', 'red'), B = fighter('B', 'blue');
    const fx = { A: G.newFxState(), B: G.newFxState() };
    const name = id => EFFECTS[id].name[lang];

    let [r, lines] = logged(() => G.applyEffect(A, B, 'rage', 20, fx));
    check(r === 'applied' && fx.A.buff.length === 1 && fx.A.buff[0].left === 2 && lines.some(l => l.includes(name('rage'))),
        `[${lang}] a buff goes on the caster with its full count and is logged`, `[${lang}] first Rage: ${r}, ${JSON.stringify(fx.A.buff)}, log ${JSON.stringify(lines)}`);
    G.countDownEffects(fx.A, 'attacks');
    [r, lines] = logged(() => G.applyEffect(A, B, 'rage', 20, fx));
    check(r === 'refreshed' && fx.A.buff.length === 1 && fx.A.buff[0].left === 2 && lines.some(l => l.includes(name('rage')) && /оновлено|refreshed/.test(l)),
        `[${lang}] casting an active effect again refreshes it (1 → 2 attacks left) and logs it: "${lines[0]}"`,
        `[${lang}] Rage refresh: ${r}, ${JSON.stringify(fx.A.buff)}, log ${JSON.stringify(lines)}`);

    logged(() => G.applyEffect(A, B, 'shield', 20, fx));
    G.countDownEffects(fx.A, 'hits');                     // Shield 2 → 1, Rage stays at 2
    [r, lines] = logged(() => G.applyEffect(A, B, 'regen', 20, fx));
    const ids = fx.A.buff.map(x => x.id).sort().join(',');
    check(r === 'replaced' && ids === 'rage,regen' && lines.some(l => l.includes(name('regen')) && l.includes(name('shield'))),
        `[${lang}] a 3rd buff replaces the one closest to ending (Shield, 1 left) and logs both: "${lines[0]}"`,
        `[${lang}] replacement: ${r}, buffs now ${ids}, log ${JSON.stringify(lines)}`);
    // Tie: both have 2 left → the older one goes
    [r, lines] = logged(() => G.applyEffect(A, B, 'blessing', 20, fx));
    check(r === 'replaced' && fx.A.buff.map(x => x.id).join(',') === 'regen,blessing',
        `[${lang}] on a tie the older buff is replaced (Rage, cast first)`, `[${lang}] tie: ${r}, buffs ${fx.A.buff.map(x => x.id)}`);

    // Debuffs go on the opponent, same slot rules
    logged(() => { G.applyEffect(A, B, 'burn', 20, fx); G.applyEffect(A, B, 'weakness', 20, fx); });
    G.countDownEffects(fx.B, 'turns');                    // Burn 3 → 2, Weakness 2 → 2
    G.countDownEffects(fx.B, 'attacks');                  // Weakness 2 → 1
    [r, lines] = logged(() => G.applyEffect(A, B, 'mark', 20, fx));
    check(r === 'replaced' && fx.B.debuff.map(x => x.id).sort().join(',') === 'burn,mark' && lines.some(l => l.includes(name('mark')) && l.includes(name('weakness'))),
        `[${lang}] debuffs land on the opponent; a 3rd replaces the one closest to ending (Weakness): "${lines[0]}"`,
        `[${lang}] debuff replacement: ${r}, debuffs ${fx.B.debuff.map(x => x.id + ':' + x.left)}`);

    // Dispel: removes every buff the target has, takes no slot
    logged(() => { G.applyEffect(B, A, 'shield', 20, fx); G.applyEffect(B, A, 'shadow', 20, fx); });
    [r, lines] = logged(() => G.applyEffect(A, B, 'dispel', 20, fx));
    check(r === 'dispelled' && fx.B.buff.length === 0 && fx.B.debuff.length === 2 && lines.some(l => l.includes(name('shield')) && l.includes(name('shadow'))),
        `[${lang}] Dispel removes all the target's buffs at once and names them: "${lines[0]}"`,
        `[${lang}] dispel: ${r}, B buffs ${fx.B.buff.map(x => x.id)}, debuffs ${fx.B.debuff.map(x => x.id)}`);

    // Immunity: the title and the White Dragon ignore every debuff, Dispel included; buffs still work
    for (const [label, target] of [['debuff-immunity title', fighter('I', 'black', titleWith('debuff_immunity'))],
                                   ['White Dragon', fighter('W', G.DRAGON_TYPE, G.TITLES_DB.find(t => t.id === G.DRAGON_TITLE_ID))]]) {
        const fx2 = { A: G.newFxState(), [target.name]: G.newFxState() };
        logged(() => G.applyEffect(target, A, 'shield', 20, fx2));
        const results = []; let immuneLines = [];
        for (const id of G.DEBUFF_IDS) { const [res, l] = logged(() => G.applyEffect(A, target, id, 20, fx2)); results.push(res); immuneLines = immuneLines.concat(l); }
        check(results.every(x => x === 'immune') && fx2[target.name].debuff.length === 0 && fx2[target.name].buff.length === 1 && immuneLines.length === G.DEBUFF_IDS.length,
            `[${lang}] ${label}: all ${G.DEBUFF_IDS.length} debuffs (Dispel too) are ignored and logged, its buff stays`,
            `[${lang}] ${label}: results ${results.join(',')}, debuffs ${fx2[target.name].debuff.map(x => x.id)}, buffs ${fx2[target.name].buff.map(x => x.id)}`);
    }
}

// Casting picks: own element pair 70% (+ the 30% random hitting it 2/12 of the time), the dragon picks uniformly
{
    const N = 24000, red = fighter('R', 'red'), dragon = fighter('W', G.DRAGON_TYPE);
    let own = 0, buffs = 0; const dragonHits = {};
    for (let i = 0; i < N; i++) {
        const id = G.pickEffect(red);
        if (EFFECTS[id].element === 'red') { own++; if (EFFECTS[id].kind === 'buff') buffs++; }
        const d = G.pickEffect(dragon); dragonHits[d] = (dragonHits[d] || 0) + 1;
    }
    const expectOwn = G.EFFECT_CAST.ownElement / 100 + (1 - G.EFFECT_CAST.ownElement / 100) * 2 / 12;
    check(Math.abs(own / N - expectOwn) < 0.015 && Math.abs(buffs / own - 0.5) < 0.02,
        `Red picks its own pair ${(100 * own / N).toFixed(1)}% of the time (expected ${(100 * expectOwn).toFixed(1)}%), ${(100 * buffs / own).toFixed(1)}% of those the buff`,
        `Red own-pair rate ${(own / N).toFixed(3)} (expected ${expectOwn.toFixed(3)}), buff share ${(buffs / own).toFixed(3)}`);
    const dr = EFFECT_IDS.map(id => (dragonHits[id] || 0) / N);
    check(dr.every(x => Math.abs(x - 1 / 12) < 0.012), 'the White Dragon picks evenly from all 12', `White Dragon pick rates: ${dr.map(x => x.toFixed(3)).join(' ')}`);
}

// ---------------------------------------------------------------- 4. Real fights
// Before every "[Хід N]" / "[Turn N]" line the state is compared with the state after the previous line (or the last
// cast). Between the two, the only things allowed to change counts are: the attacker's turn starting ('turns' −1),
// the attacker attacking ('attacks' −1), the defender being attacked ('hits' −1) — or, on a frozen turn, only the
// attacker's 'turns' effects and Frost itself. An effect may only vanish when its count reached 0.
console.log(`\nReal fights (${FIGHTS} per language, all elements, ability titles, the White Dragon)`);
const ID_RE = new RegExp(`\\b(${EFFECT_IDS.join('|')}|stoneskin|armorbreak|divinepower)\\b`);
const types = G.VIEWER_DRAKE_TYPES.map(d => d.type);
const mechTitles = ['opening_buff', 'chaotic_charge', 'cat_keyboard', 'debuff_immunity', 'thorns', 'lifesteal'].map(titleWith).filter(Boolean);
const effectTitle = G.TITLES_DB.find(t => t.bonus && t.bonus.stats && t.bonus.stats.buffEff);
const pick = a => a[Math.floor(Math.random() * a.length)];

let baseline = null;     // Map(inst → {owner, id, left}) after the last [Turn] line or cast
const snap = () => { const m = new Map(); const fx = G.battleFx; if (!fx) return m; for (const owner of Object.keys(fx)) for (const kind of ['buff', 'debuff']) for (const x of fx[owner][kind]) m.set(x, { owner, id: x.id, left: x.left }); return m; };
G.wrapApplyEffect(() => { baseline = snap(); });

const stats = { turns: 0, checked: 0, frozen: 0, wrong: [], idLeaks: [], seen: new Set(), immuneHad: [], unitsSeen: { attacks: 0, hits: 0, turns: 0 } };
let current = null;      // { A, B, immune: Set(names) }
G.wrapAddLog(raw => {
    if (!current) return;
    const line = strip(raw);
    const idHit = line.match(ID_RE);
    if (idHit && stats.idLeaks.length < 5) stats.idLeaks.push(`"${idHit[1]}" in: ${line.slice(0, 140)}`);
    for (const id of EFFECT_IDS) if (line.includes(EFFECTS[id].name.uk) || line.includes(EFFECTS[id].name.en)) stats.seen.add(id);
    const m = line.match(/^\[(?:Хід|Turn) (\d+)\] @(\S+)/);
    if (!m || !baseline) return;
    stats.turns++;
    const attacker = m[2];
    const frozen = line.includes(EFFECTS.frost.name.uk + ' —') || line.includes(EFFECTS.frost.name.en + ' —');
    if (frozen) stats.frozen++;
    const now = snap();
    for (const [inst, before] of baseline) {
        const e = EFFECTS[before.id];
        const own = before.owner === attacker;
        const d = frozen ? (own && (e.lasts === 'turns' || before.id === 'frost') ? 1 : 0)
                         : (own ? (e.lasts === 'turns' || e.lasts === 'attacks' ? 1 : 0) : (e.lasts === 'hits' ? 1 : 0));
        const want = before.left - d;
        const after = now.get(inst);
        stats.checked++;
        if (d) stats.unitsSeen[e.lasts]++;
        if (after === undefined ? want > 0 : after.left !== want)
            stats.wrong.push(`turn ${m[1]} (attacker @${attacker}${frozen ? ', frozen' : ''}): @${before.owner}'s ${before.id} (${e.lasts}) went ${before.left} → ${after ? after.left : 'gone'}, expected ${want <= 0 ? 'gone' : want}`);
    }
    for (const name of current.immune) if (G.battleFx[name] && G.battleFx[name].debuff.length) stats.immuneHad.push(`@${name} has ${G.battleFx[name].debuff.map(x => x.id)}`);
    baseline = now;
});

for (const lang of ['uk', 'en']) {
    G.setLang(lang);
    for (let i = 0; i < FIGHTS; i++) {
        const level = pick([1, 10, 20]);
        const mk = (name) => {
            const type = i % 25 === 0 && name === 'A' ? G.DRAGON_TYPE : pick(types);
            const title = type === G.DRAGON_TYPE ? G.TITLES_DB.find(t => t.id === G.DRAGON_TITLE_ID) : (Math.random() < 0.6 ? pick(mechTitles) : (Math.random() < 0.5 ? effectTitle : null));
            return { name, color: '#fff', drakeObj: DRAKE_TYPES_BY[type], title, xp: xpFor(type === G.DRAGON_TYPE ? 20 : level) };
        };
        const A = mk('A'), B = mk('B');
        const db = G.getDragonDB(); db.A = A; db.B = B; G.saveDragonDB(db);
        current = { immune: new Set([A, B].filter(f => f.title && ['debuff_immunity', 'streamer_god'].includes(f.title.bonus.mechanic)).map(f => f.name)) };
        baseline = null;
        G.setRunning(true);
        G.runBattle('A', '#fff', 'B', '#fff', false);
        // runBattle sets up the fight synchronously; take the baseline before the first turn runs
        baseline = snap();
        global.__drain();
        current = null;
        global.__LOG.length = 0;
    }
}
check(stats.wrong.length === 0, `${stats.checked} effect counts checked over ${stats.turns} turns (${stats.frozen} frozen): every one went down on the right event` +
    ` (attacks ${stats.unitsSeen.attacks}, hits ${stats.unitsSeen.hits}, turns ${stats.unitsSeen.turns} decrements seen)`,
    `${stats.wrong.length} wrong count change(s), first: ${stats.wrong.slice(0, 5).join(' | ')}`);
check(stats.unitsSeen.attacks > 0 && stats.unitsSeen.hits > 0 && stats.unitsSeen.turns > 0 && stats.frozen > 0,
    'every kind of countdown (and a frozen turn) actually happened', `some countdown never happened: ${JSON.stringify(stats.unitsSeen)}, frozen ${stats.frozen}`);
check(stats.idLeaks.length === 0, 'no internal effect id appears in the battle log (uk and en)', `effect ids in the log: ${stats.idLeaks.join(' | ')}`);
const unseen = EFFECT_IDS.filter(id => !stats.seen.has(id));
check(!unseen.length, `all 12 effects showed up in fight logs by name`, `never seen in a fight log: ${unseen.join(', ')}`);
check(!stats.immuneHad.length, 'immune fighters never carried a debuff in a fight', `immune fighter with a debuff: ${stats.immuneHad.slice(0, 3).join(' | ')}`);

console.log(failures ? `\n${failures} effect check(s) failed.` : '\nAll effect checks passed.');
process.exit(failures ? 1 : 0);
