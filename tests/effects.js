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
//   - descriptions take every number from the table (change a number → the text changes); README lists them as the game does
//   - a Dispel that would find no buffs is cast as a different effect; on an immune target it still counts (and is logged)
//   - casting an active effect refreshes it; a third buff/debuff replaces the one closest to ending; both are logged
//   - debuff immunity (title and White Dragon) still stops every debuff, Dispel included
//   - card chips say what's left in words, in both languages; effect power scales percentages, never counts
//   - no effect name or icon anywhere in the game file outside EFFECTS (comments excepted; unrelated uses allowlisted)
//   - cast chance with fixed dice: 30% + element + title bonus, only after a hit that dealt damage
//   - what each effect does: scripted turns of the real fight with fixed dice, with vs without the effect, against the
//     EFFECTS numbers, at power ×1 and ×1.8 (Shield on every kind of hit, Poison cutting healing included)
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
    EFFECTS, EFFECT_IDS, BUFF_IDS, DEBUFF_IDS, EFFECT_CAST, CLASS_ULTIMATES, ULTIMATE_IDS, ultLabel, TITLES_DB, DRAKE_TYPES, VIEWER_DRAKE_TYPES, DRAGON_TYPE, DRAGON_TITLE_ID,
    applyEffect: (...a) => applyEffect(...a), pickEffect, countDownEffects, newFxState, describeEffect, effectLeftText, effectChipText,
    fxNum, getEffectMult, ELEMENT_BASE, getTierMultiplier, getRequiredXP, getDragonDB, saveDragonDB,
    runBattle: (...a) => runBattle(...a),
    get battleFx() { return battleFx; },
    setLang: l => { currentLang = l; },
    setRunning: v => { isBattleRunning = v; },
    wrapAddLog: f => { const orig = addLog; addLog = t => { orig(t); f(t); }; },
    wrapApplyEffect: f => { const orig = applyEffect; applyEffect = (...a) => {
        const st = a[4] && a[1] && a[4][a[1].name], targetBuffs = st ? st.buff.length : 0;
        const r = orig(...a); f(r, a, targetBuffs); return r; }; },
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

console.log('\nDescriptions come from the table');
for (const id of EFFECT_IDS) {
    const e = EFFECTS[id], bad = [];
    for (const l of ['uk', 'en']) {
        for (const k of Object.keys(e.nums)) if (!e.desc[l].includes(`{${k}}`) && !e.desc[l].includes(`{x:${k}}`)) bad.push(`${l} text never shows nums.${k}`);
        if (/\d/.test(e.desc[l].replace(/\{[^}]*\}/g, ''))) bad.push(`${l} text has a number typed in instead of a {placeholder}: "${e.desc[l]}"`);
        // Change every number in the table: the text must follow
        const before = G.describeEffect(id, l), saved = { ...e.nums }, savedCount = e.count;
        for (const k of Object.keys(e.nums)) e.nums[k] = e.nums[k] + 7;
        if (e.lasts !== 'instant') e.count = e.count + 1;
        const after = G.describeEffect(id, l);
        Object.assign(e.nums, saved); e.count = savedCount;
        if ((Object.keys(e.nums).length || /\{count\}/.test(e.desc[l])) && after === before) bad.push(`${l} text didn't change when the table's numbers did`);
    }
    check(!bad.length, `${e.icon} ${e.name.en}: every number comes from EFFECTS`, `${id}: ${bad.join('; ')}`);
}
{
    const readme = fs.readFileSync(path.join(path.dirname(FILE), 'README.md'), 'utf8');
    const missing = EFFECT_IDS.filter(id => !readme.includes(G.describeEffect(id, 'en')));
    check(!missing.length, "the README effect table matches the game's descriptions (same numbers)",
        `README is out of date for: ${missing.map(id => `${id} ("${G.describeEffect(id, 'en')}")`).join(' | ')}`);
}

// Effect names and icons only live in EFFECTS: scan the whole file (HTML, CSS, script) outside the EFFECTS block,
// with comments stripped. A line that uses one of the icons or words for something unrelated must be listed here,
// with the reason. An allowlist entry that no longer matches any line fails too, so the list can't go stale.
const EFFECT_TEXT_ALLOWLIST = [
    { line: 'id="stats-sub-p1">', terms: ['🛡'], why: 'fighter card defence label (🛡️ Захист), HTML default' },
    { line: 'id="stats-sub-p2">', terms: ['🛡'], why: 'fighter card defence label (🛡️ Захист), HTML default' },
    { line: "let defText = currentLang === 'uk' ? '🛡️ Захист", terms: ['🛡'], why: 'fighter card defence label (two copies: card and status update)' },
    { line: '· 🛡️ ${defs.physDef}%', terms: ['🛡'], why: '!stats card defence figure' },
    { line: '`🛡️ Ультраблок (0 шкоди)!`', terms: ['🛡'], why: 'Ultra Block label in the attack log' },
    { line: '${loseXpText} 🛡️`', terms: ['🛡'], why: "loser's line in the fight result" },
    { line: 'id: 128, rarity:', terms: ['🎯'], why: 'title icon: Missed the Button' },
    { line: 'id: 76, rarity:', terms: ['🛡'], why: 'title icon: Chat Patrol' },
    { line: 'id: 151, rarity:', terms: ['🛡', 'Щит', 'Shield'], why: 'title: Щит від спойлерів / Spoiler Shield' },
    { line: 'id: 152, rarity:', terms: ['🔥'], why: 'title icon: Hot Take' },
    { line: 'id: 160, rarity:', terms: ['🍀'], why: 'title icon: Four-Leaf Clover' },
    { line: 'id: 176, rarity:', terms: ['🛡'], why: 'title icon: Unbreakable Moderator' },
    { line: 'id: 153, rarity:', terms: ['🎰'], why: 'title icon: Roulette Lucky Charm (not the Jackpot ultimate)' },
    { line: 'id: 175, rarity:', terms: ['🦇'], why: 'title icon: Stream Night Vampire (not the Shadow Theft ultimate)' },
    { line: "'🎰 Шанси рулетки титулів'", terms: ['🎰'], why: '!odds card heading (title roulette), both languages' },
    { line: "legendary: '🌟 ", terms: ['🌟', '🔥'], why: 'title-roll rarity banners (legendary 🌟, mythic 🔥), both languages' },
    { line: 'ПЕРЕРОДИВСЯ!', terms: ['🔥'], why: '!reroll announcement (uk)' },
    { line: 'REBORN!', terms: ['🔥'], why: '!reroll announcement (en)' },
    { line: 'активує Щит надії', terms: ['Щит'], why: "Guardian Angel title ability: Щит надії (not the Shield effect)" },
    { line: 'activates Shield of Hope', terms: ['Shield'], why: 'Guardian Angel title ability: Shield of Hope (not the Shield effect)' },
];
console.log('\nEffect and ultimate names and icons only in their tables (EFFECTS, CLASS_ULTIMATES)');
{
    const lines = html.split(/\r?\n/);
    const tableLines = name => { const s = lines.findIndex(l => l.includes(`const ${name} = {`)); return [s, lines.findIndex((l, i) => i > s && l.trim() === '};')]; };
    const [start, end] = tableLines('EFFECTS'), [uStart, uEnd] = tableLines('CLASS_ULTIMATES');
    const bare = s => s.replace(/️/g, '');                       // 🛡️ and 🛡 are the same icon
    const terms = [...new Set([...EFFECT_IDS.map(id => EFFECTS[id]), ...G.ULTIMATE_IDS.map(id => G.CLASS_ULTIMATES[id])]
        .flatMap(x => [x.name.uk, x.name.en, bare(x.icon)]))];
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Whole words only (so "blockedByShadow" or "Розвіювання" inside another word don't count); icons anywhere
    const words = terms.filter(t => /\p{L}/u.test(t));
    const wordRe = new RegExp(`(?<![\\p{L}\\p{N}_])(${words.map(esc).join('|')})(?![\\p{L}\\p{N}_])`, 'gu');
    const iconTerms = terms.filter(t => !/\p{L}/u.test(t));
    const used = new Set(), bad = [];
    let hits = 0;
    lines.forEach((raw, i) => {
        if ((start !== -1 && i >= start && i <= end) || (uStart !== -1 && i >= uStart && i <= uEnd)) return;
        const l = bare(raw.replace(/<!--.*?-->/g, '').replace(/\/\*.*?\*\//g, '').replace(/(^|[\s;{}),])\/\/.*$/, '$1'));
        const found = [...new Set([...(l.match(wordRe) || []), ...iconTerms.filter(t => l.includes(t))])];
        if (!found.length) return;
        hits++;
        const entry = EFFECT_TEXT_ALLOWLIST.find(e => raw.includes(e.line));
        const unlisted = found.filter(t => !entry || !entry.terms.map(bare).includes(t));
        if (entry) used.add(entry);
        if (unlisted.length) bad.push(`line ${i + 1}: ${unlisted.join(', ')} in "${raw.trim().slice(0, 110)}"`);
    });
    const stale = EFFECT_TEXT_ALLOWLIST.filter(e => !used.has(e));
    check(start !== -1 && uStart !== -1 && !bad.length, `no effect or ultimate name or icon outside their tables (${hits} unrelated uses, all on the allowlist with a reason)`,
        `effect/ultimate name or icon outside EFFECTS / CLASS_ULTIMATES — use fxName()/ultName(), or allowlist the line with a reason: ${bad.slice(0, 5).join(' | ')}`);
    check(!stale.length, `every allowlist entry still matches a line (${EFFECT_TEXT_ALLOWLIST.length} entries)`,
        `allowlist entries that match nothing any more (remove them): ${stale.map(e => e.line).join(' | ')}`);
}

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

    // Dispel on a target with no buffs: something else is cast instead (from the pool when one is given)
    {
        const fx3 = { A: G.newFxState(), B: G.newFxState() };
        const outcomes = new Set(); let dispelled = 0, debuffOnly = true;
        for (let i = 0; i < 200; i++) {
            fx3.A = G.newFxState(); fx3.B = G.newFxState();
            const [res] = logged(() => G.applyEffect(A, B, 'dispel', 20, fx3));
            outcomes.add(res); if (res === 'dispelled') dispelled++;
            fx3.A = G.newFxState(); fx3.B = G.newFxState();
            logged(() => G.applyEffect(A, B, 'dispel', 20, fx3, { pool: G.DEBUFF_IDS }));
            if (fx3.A.buff.length || !fx3.B.debuff.length) debuffOnly = false;
        }
        check(dispelled === 0 && outcomes.size > 0, `[${lang}] Dispel with no buffs to remove is cast as a different effect (${[...outcomes].join(', ')})`,
            `[${lang}] Dispel on a buffless target: ${dispelled} of 200 still "dispelled"`);
        check(debuffOnly, `[${lang}] ...and from the caller's pool when it has one (Chaotic charge → another debuff)`, `[${lang}] pooled recast produced a non-debuff`);
    }
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
        // With no buffs at all, a Dispel still counts as cast: immunity is checked first and logged
        const fx4 = { A: G.newFxState(), [target.name]: G.newFxState() };
        const [res4, l4] = logged(() => G.applyEffect(A, target, 'dispel', 20, fx4));
        check(res4 === 'immune' && l4.length === 1 && l4[0].includes(EFFECTS.dispel.name[lang]),
            `[${lang}] ${label}: a Dispel on it with no buffs still counts as cast and is logged as ignored`,
            `[${lang}] ${label}: Dispel with no buffs → ${res4}, log ${JSON.stringify(l4)}`);
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

// ---------------------------------------------------------------- 4. What each effect does
// Scripted turns of the real fight loop: two plain level-20 drakes (no element, no title), fixed dice, A attacks on odd
// turns. Each test runs the same turns with and without the effect (cast with the game's own applyEffect) and checks
// the difference against the numbers in EFFECTS. Every numeric effect is checked at power ×1 and again cast by a
// Purple drake with an effect-strength title (power ×1.8): the numbers must scale, the count must not.
console.log('\nWhat each effect does (scripted turns, numbers from EFFECTS)');
const plainDrake = name => ({ name, color: '#fff', drakeObj: { name: { uk: 'Простий', en: 'Plain' }, type: 'plain' }, title: null, xp: xpFor(20) });
const POWER_TITLE = G.TITLES_DB.find(t => t.bonus && t.bonus.stats && t.bonus.stats.buffEff);
const POWERS = [['power ×1', null], [`power ×${G.getEffectMult('purple', POWER_TITLE, 20).toFixed(2)}`, { drakeObj: { type: 'purple' }, title: POWER_TITLE, xp: xpFor(20) }]];
// Dice for one attack, in the order the fight rolls them: attack type, sub-type, damage, crit, ultra-block, cast
const dice = (o = {}) => [o.attack ?? 0.5, o.sub ?? 0.5, o.dmg ?? 0.5, o.crit ?? 0.99, o.block ?? 0.99, o.cast ?? 0.99];
const VAMPIRE = { attack: 0.95, sub: 0.3 }, SNEAKY = { attack: 0.3, sub: 0.9 }, MAGIC = {};
// Puts effect `id` on fighter `on` ('A' or 'B') of the running fight, cast with the given power profile.
// Returns { id, left, power } as cast (a copy: the live effect counts down during the turns), or null for Dispel.
// A buff's caster is its owner; a debuff's caster is the other fighter.
const castOn = (on, id, powerCaster) => {
    const other = on === 'A' ? 'B' : 'A', kind = EFFECTS[id].kind;
    const casterName = kind === 'buff' ? on : other;
    const caster = { ...plainDrake(casterName), ...(powerCaster || {}) };
    G.applyEffect(caster, plainDrake(kind === 'buff' ? other : on), id, 20, G.battleFx);
    const inst = G.battleFx[on][kind].find(x => x.id === id);
    return inst ? { ...inst } : null;
};
// Runs a fight for `turns.length` turns with fixed dice; setup() runs after the fight is set up, before turn 1
function scripted(setup, turns, who = {}) {   // who: { A: {...}, B: {...} } overrides for the fighters
    G.setLang('en');
    const db = G.getDragonDB(); db.A = { ...plainDrake('A'), ...(who.A || {}) }; db.B = { ...plainDrake('B'), ...(who.B || {}) }; G.saveDragonDB(db);
    let tick = null, queue = [0.9];                    // 0.9: the coin flip keeps A as fighter 1 (attacks first)
    const realInterval = global.setInterval, realRandom = Math.random;
    global.setInterval = f => { tick = f; return { on: true }; };
    Math.random = () => queue.length ? queue.shift() : 0.99;
    const lines = []; capture = lines;
    let res = null;
    try {
        G.setRunning(true);
        G.runBattle('A', '#fff', 'B', '#fff', false);
        global.setInterval = realInterval;
        res = setup ? setup() : null;
        const hp = id => Number(document.getElementById(id).innerText.split(' / ')[0]);
        const out = turns.map(d => { queue = [...d]; const from = lines.length; tick(); const l = lines.slice(from);
            const dm = l.join('\n').match(/Damage: (\d+) damage/);
            return { lines: l, dmg: dm ? Number(dm[1]) : null, hpA: hp('hp-text-p1'), hpB: hp('hp-text-p2') }; });
        return { turns: out, setup: res };
    } finally {
        global.setInterval = realInterval; Math.random = realRandom; capture = null; G.setRunning(false);
    }
}
const MAXHP = 150 + 19 * 10;                           // plain level-20 drake
const near = (got, want, m = 1) => Math.abs(got - want) <= 0.5 + 0.5 * m + 1e-9;   // both sides come from the same rounded float
const pct = (inst, k) => G.fxNum(inst, k);
const behaviour = (label, ok, detail) => check(ok, label, `${label} — ${detail}`);

for (const [pLabel, pCaster] of POWERS) {
    // 💢 Rage: own attacks ×(1 + dmg%), damage taken ×(1 + taken%)
    {
        const base = scripted(null, [dice(MAGIC)]).turns[0].dmg;
        const r = scripted(() => castOn('A', 'rage', pCaster), [dice(MAGIC)]);
        const m = 1 + pct(r.setup, 'dmg') / 100;
        const t = scripted(() => castOn('B', 'rage', pCaster), [dice(MAGIC)]);
        const mt = 1 + pct(t.setup, 'taken') / 100;
        behaviour(`💢 Rage (${pLabel}): attack ${base} → ${r.turns[0].dmg} (×${m.toFixed(2)}), raging target takes ${base} → ${t.turns[0].dmg} (×${mt.toFixed(2)}), count ${r.setup.left}`,
            near(r.turns[0].dmg, base * m, m) && near(t.turns[0].dmg, base * mt, mt) && r.setup.left === EFFECTS.rage.count,
            `expected ${(base * m).toFixed(1)} and ${(base * mt).toFixed(1)}, count ${EFFECTS.rage.count}`);
    }
    // 🔥 Burn: hp% of max HP at the start of each of the target's turns
    {
        const r = scripted(() => castOn('B', 'burn', pCaster), [dice(), dice()]);
        const want = Math.max(1, Math.round(MAXHP * pct(r.setup, 'hp') / 100));
        const got = Number((r.turns[1].lines.join('\n').match(/Burn \(-(\d+) HP\)/) || [])[1]);
        behaviour(`🔥 Burn (${pLabel}): -${got} HP at the start of the target's turn (${+pct(r.setup, 'hp').toFixed(2)}% of ${MAXHP}), count ${r.setup.left}`,
            got === want && r.setup.left === EFFECTS.burn.count && r.turns[0].lines.every(l => !/Burn \(-/.test(l)),
            `expected -${want} on the target's own turn only, count ${EFFECTS.burn.count}`);
    }
    // 🛡️ Shield: −cut% on every hit taken, armour-piercing (sneaky) and vampire included
    {
        const parts = [];
        let ok = true, count = null;
        for (const [kind, d] of [['magic', MAGIC], ['armour-piercing', SNEAKY], ['vampire', VAMPIRE]]) {
            const base = scripted(null, [dice(d)]).turns[0].dmg;
            const r = scripted(() => castOn('B', 'shield', pCaster), [dice(d)]);
            const m = 1 - pct(r.setup, 'cut') / 100;
            count = r.setup.left;
            ok = ok && near(r.turns[0].dmg, base * m, 1);
            parts.push(`${kind} ${base} → ${r.turns[0].dmg}`);
        }
        behaviour(`🛡️ Shield (${pLabel}): ${parts.join(', ')} (×${(1 - pct({ id: 'shield', power: pCaster ? G.getEffectMult('purple', POWER_TITLE, 20) : 1 }, 'cut') / 100).toFixed(2)}), count ${count}`,
            ok && count === EFFECTS.shield.count, `every kind of hit should be cut by the same factor, count ${EFFECTS.shield.count}`);
    }
    // 🌑 Shadow: +block% ultra-block chance (a roll between 10% and 10% + block% is blocked only with Shadow)
    {
        const roll = (10 + Math.min(pct({ id: 'shadow', power: pCaster ? G.getEffectMult('purple', POWER_TITLE, 20) : 1 }, 'block'), 80) / 2) / 100;
        const base = scripted(null, [dice({ block: roll })]).turns[0].dmg;
        const r = scripted(() => castOn('B', 'shadow', pCaster), [dice({ block: roll })]);
        const edge = scripted(() => castOn('B', 'shadow', pCaster), [dice({ block: (10 + pct(r.setup, 'block') + 1) / 100 })]).turns[0].dmg;
        behaviour(`🌑 Shadow (${pLabel}): block roll ${(roll * 100).toFixed(1)} → ${base} without, ${r.turns[0].dmg} with; just past ${10 + pct(r.setup, 'block')}% still hits (${edge}), count ${r.setup.left}`,
            base > 0 && r.turns[0].dmg === 0 && edge > 0 && r.setup.left === EFFECTS.shadow.count, `blocked only inside the extra ${pct(r.setup, 'block')}%`);
    }
    // 🥀 Weakness: the target's attacks ×(1 − cut%)
    {
        const base = scripted(null, [dice(MAGIC)]).turns[0].dmg;
        const r = scripted(() => castOn('A', 'weakness', pCaster), [dice(MAGIC)]);
        const m = 1 - pct(r.setup, 'cut') / 100;
        behaviour(`🥀 Weakness (${pLabel}): attack ${base} → ${r.turns[0].dmg} (×${m.toFixed(2)}), count ${r.setup.left}`,
            near(r.turns[0].dmg, base * m, 1) && r.setup.left === EFFECTS.weakness.count, `expected ${(base * m).toFixed(1)}`);
    }
    // 🍀 Blessing: +crit% crit chance (a crit roll just above the plain chance crits only with Blessing)
    {
        const plainCrit = 15 + 19;
        const r0 = scripted(() => castOn('A', 'blessing', pCaster), []);
        const bonus = Math.min(pct(r0.setup, 'crit'), 100 - plainCrit);
        const roll = (plainCrit + bonus / 2) / 100;
        const base = scripted(null, [dice({ crit: roll })]).turns[0];
        const r = scripted(() => castOn('A', 'blessing', pCaster), [dice({ crit: roll })]);
        behaviour(`🍀 Blessing (${pLabel}): crit chance ${plainCrit}% → ${Math.min(100, plainCrit + Math.round(pct(r.setup, 'crit')))}%; roll ${(roll * 100).toFixed(0)}: ${base.dmg} (no crit) → ${r.turns[0].dmg} (crit ×1.5), count ${r.setup.left}`,
            !base.lines.some(l => /CRIT/.test(l)) && r.turns[0].lines.some(l => /CRIT/.test(l)) && near(r.turns[0].dmg, base.dmg * 1.5, 1.5) && r.setup.left === EFFECTS.blessing.count,
            'the crit should happen only with Blessing');
    }
    // 🌟 Divine Might: ×(1 + dmg%), and a hit that would be ultra-blocked isn't
    {
        const base = scripted(null, [dice(MAGIC)]).turns[0].dmg;
        const r = scripted(() => castOn('A', 'divine', pCaster), [dice(MAGIC)]);
        const m = 1 + pct(r.setup, 'dmg') / 100;
        const blockedBase = scripted(null, [dice({ block: 0.05 })]).turns[0].dmg;
        const unblock = scripted(() => castOn('A', 'divine', pCaster), [dice({ block: 0.05 })]).turns[0].dmg;
        behaviour(`🌟 Divine Might (${pLabel}): attack ${base} → ${r.turns[0].dmg} (×${m.toFixed(2)}); a blocked hit (${blockedBase}) goes through (${unblock}), count ${r.setup.left}`,
            near(r.turns[0].dmg, base * m, m) && blockedBase === 0 && near(unblock, base * m, m) && r.setup.left === EFFECTS.divine.count, `expected ${(base * m).toFixed(1)} both times`);
    }
    // 💚 Regeneration: heals hp% of max HP at the start of the owner's turn
    {
        const r = scripted(() => castOn('B', 'regen', pCaster), [dice({ crit: 0 }), dice()]);   // a crit first, so the heal isn't capped at max HP
        const want = Math.max(1, Math.round(MAXHP * pct(r.setup, 'hp') / 100));
        const got = Number((r.turns[1].lines.join('\n').match(/Regeneration \(\+(\d+) HP\)/) || [])[1]);
        behaviour(`💚 Regeneration (${pLabel}): +${got} HP at the start of the owner's turn (${+pct(r.setup, 'hp').toFixed(2)}% of ${MAXHP}), count ${r.setup.left}`,
            got === want && r.setup.left === EFFECTS.regen.count, `expected +${want}`);
    }
    // ☠️ Poison: hp% of max HP per turn, and the target's healing (Regeneration, vampire hits) cut by healCut%
    {
        const r = scripted(() => castOn('B', 'poison', pCaster), [dice(), dice()]);
        const want = Math.max(1, Math.round(MAXHP * pct(r.setup, 'hp') / 100));
        const got = Number((r.turns[1].lines.join('\n').match(/Poison \(-(\d+) HP\)/) || [])[1]);
        const keep = 1 - pct(r.setup, 'healCut') / 100;
        // Regeneration while poisoned
        const regen = n => Number((n.turns[1].lines.join('\n').match(/Regeneration \(\+(\d+) HP\)/) || [])[1]);
        const regenBase = regen(scripted(() => castOn('B', 'regen', null), [dice(), dice()]));
        const regenPois = regen(scripted(() => { castOn('B', 'regen', null); return castOn('B', 'poison', pCaster); }, [dice(), dice()]));
        // A vampire hit while poisoned (B hits A first so A has HP to heal)
        const vamp = n => Number((n.turns[2].lines.join('\n').match(/🩸 \+(\d+) HP/) || [])[1]);
        const vampBase = vamp(scripted(null, [dice(), dice(), dice(VAMPIRE)]));
        const vampPois = vamp(scripted(() => castOn('A', 'poison', pCaster), [dice(), dice(), dice(VAMPIRE)]));
        behaviour(`☠️ Poison (${pLabel}): -${got} HP per turn; healing ×${keep.toFixed(2)}: Regeneration +${regenBase} → +${regenPois}, vampire +${vampBase} → +${vampPois}, count ${r.setup.left}`,
            got === want && near(regenPois, regenBase * keep, 1) && near(vampPois, vampBase * keep, 1) && r.setup.left === EFFECTS.poison.count,
            `expected -${want}, Regeneration ≈${(regenBase * keep).toFixed(1)}, vampire ≈${(vampBase * keep).toFixed(1)}`);
    }
}
// Cast chance, with fixed dice. The line is worked out here from the rule (30% + element bonus + title bonus), not
// read from the game: a hit that deals no damage never casts; a damaging hit casts when the roll is under the line
// and not when it's at or just over it. Checked for a plain drake, a Purple drake and a drake with an effect-chance title.
{
    let castProbe = null;
    G.wrapApplyEffect((r, a) => { if (castProbe) castProbe.push(a[2]); });
    const effectTitle = G.TITLES_DB.find(t => t.bonus && t.bonus.stats && t.bonus.stats.effect && !t.bonus.mechanic && !t.bonus.stats.buffEff);
    const purpleBonus = G.ELEMENT_BASE.purpleChance + G.getTierMultiplier(20).purpleChance;
    const cases = [
        ['plain drake', {}, G.EFFECT_CAST.castBase],
        ['Purple drake (level 20)', { drakeObj: DRAKE_TYPES_BY.purple }, G.EFFECT_CAST.castBase + purpleBonus],
        [`plain drake with "${effectTitle.name.en}" (+${effectTitle.bonus.stats.effect}% effect chance)`, { title: effectTitle }, G.EFFECT_CAST.castBase + effectTitle.bonus.stats.effect],
    ];
    const casts = (who, d) => { castProbe = []; const r = scripted(null, [dice(d)], { A: who }); const n = castProbe.length; castProbe = null; return { n, dmg: r.turns[0].dmg }; };
    for (const [label, who, line] of cases) {
        const under = casts(who, { cast: (line - 0.5) / 100 });
        const at = casts(who, { cast: line / 100 });
        const over = casts(who, { cast: (line + 0.5) / 100 });
        const blocked = casts(who, { block: 0.05, cast: 0 });            // ultra-blocked: 0 damage, cast roll 0 (the luckiest roll)
        behaviour(`cast chance, ${label}: line ${line}% — roll ${line - 0.5} casts (${under.n}), ${line} and ${line + 0.5} don't (${at.n}, ${over.n}); a 0-damage hit with roll 0 doesn't (${blocked.n})`,
            under.dmg > 0 && under.n === 1 && at.n === 0 && over.n === 0 && blocked.dmg === 0 && blocked.n === 0,
            `expected a cast only under ${line}%: under ${under.n} (dmg ${under.dmg}), at ${at.n}, over ${over.n}, blocked ${blocked.n} (dmg ${blocked.dmg})`);
    }
}

// Effects without numbers (power can't change them)
{
    // ❄️ Frost: the target skips its next attack, then attacks normally
    const r = scripted(() => castOn('A', 'frost', null), [dice(), dice(), dice()]);
    const [t1, t2, t3] = r.turns;
    behaviour(`❄️ Frost: turn 1 skipped (B stays at ${t1.hpB}/${MAXHP}), B attacks on turn 2, A attacks again on turn 3 (${t3.dmg} damage)`,
        t1.dmg === null && t1.hpB === MAXHP && t1.lines.some(l => /is frozen/.test(l)) && t2.dmg > 0 && t3.dmg > 0, 'the frozen attack should be skipped once');
    // 🎯 Mark: the next hit on the target is a guaranteed crit (even on a roll that never crits), then it's gone
    const m = scripted(() => castOn('B', 'mark', null), [dice({ crit: 0.99 }), dice(), dice({ crit: 0.99 })]);
    const base = scripted(null, [dice({ crit: 0.99 })]).turns[0].dmg;
    behaviour(`🎯 Mark: hit on a no-crit roll ${base} → ${m.turns[0].dmg} (crit ×1.5); the next hit is normal again (${m.turns[2].dmg})`,
        m.turns[0].lines.some(l => /CRIT/.test(l)) && near(m.turns[0].dmg, base * 1.5, 1.5) && !m.turns[2].lines.some(l => /CRIT/.test(l)), 'one guaranteed crit, then none');
    // 💨 Dispel: removes all the target's buffs at once
    const d = scripted(() => { castOn('B', 'shield', null); castOn('B', 'regen', null);
        const before = G.battleFx.B.buff.map(x => x.id).join(', ');
        castOn('B', 'dispel', null); return before; }, []);
    behaviour(`💨 Dispel: the target's buffs (${d.setup}) are all removed at once`, G.battleFx.B.buff.length === 0, `left: ${G.battleFx.B.buff.map(x => x.id)}`);
}
// Effect power changes numbers, never counts: every effect, cast at ×1 and at the highest power
{
    const bad = [];
    for (const id of EFFECT_IDS.filter(i => EFFECTS[i].lasts !== 'instant')) {
        for (const [, pc] of POWERS) {
            const r = scripted(() => castOn(EFFECTS[id].kind === 'buff' ? 'A' : 'B', id, pc), []);
            if (r.setup.left !== EFFECTS[id].count) bad.push(`${id} at power ${r.setup.power}: ${r.setup.left} left, expected ${EFFECTS[id].count}`);
        }
    }
    behaviour(`effect power never changes a count (all ${EFFECT_IDS.length - 1} lasting effects at ×1 and ×${G.getEffectMult('purple', POWER_TITLE, 20).toFixed(2)})`, !bad.length, bad.join('; '));
}

// ---------------------------------------------------------------- 5. Real fights
// Before every "[Хід N]" / "[Turn N]" line the state is compared with the state after the previous line (or the last
// cast). Between the two, the only things allowed to change counts are: the attacker's turn starting ('turns' −1),
// the attacker attacking ('attacks' −1), the defender being attacked ('hits' −1) — or, on a frozen turn, only the
// attacker's 'turns' effects and Frost itself. An effect may only vanish when its count reached 0.
console.log(`\nReal fights (${FIGHTS} per language, all elements, ability titles, the White Dragon)`);
const ID_RE = new RegExp(`\\b(${[...EFFECT_IDS, ...G.ULTIMATE_IDS].join('|')}|stoneskin|armorbreak|divinepower)\\b`);
const types = G.VIEWER_DRAKE_TYPES.map(d => d.type);
const mechTitles = ['opening_buff', 'chaotic_charge', 'cat_keyboard', 'debuff_immunity', 'thorns', 'lifesteal'].map(titleWith).filter(Boolean);
const effectTitle = G.TITLES_DB.find(t => t.bonus && t.bonus.stats && t.bonus.stats.buffEff);
const pick = a => a[Math.floor(Math.random() * a.length)];

let baseline = null;     // Map(inst → {owner, id, left}) after the last [Turn] line or cast
const snap = () => { const m = new Map(); const fx = G.battleFx; if (!fx) return m; for (const owner of Object.keys(fx)) for (const kind of ['buff', 'debuff']) for (const x of fx[owner][kind]) m.set(x, { owner, id: x.id, left: x.left }); return m; };
const dispel = { cast: 0, recast: 0, wasted: 0, immune: 0 };
G.wrapApplyEffect((r, a, targetBuffs) => {
    baseline = snap();
    if (!current || a[2] !== 'dispel') return;
    dispel.cast++;
    if (r === 'immune') dispel.immune++;
    else if (!targetBuffs) { if (r === 'dispelled') dispel.wasted++; else dispel.recast++; }
});

const stats = { turns: 0, checked: 0, frozen: 0, wrong: [], idLeaks: [], seen: new Set(), ultimates: new Set(), immuneHad: [], unitsSeen: { attacks: 0, hits: 0, turns: 0 } };
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
    // Ultimate turns: Ice Mirror and Bloom make no attack (only the owner's turn effects go down, as on a frozen turn);
    // Shadow Theft moves buffs between fighters, Arcane Detonation removes the defender's debuffs, Bloom the owner's
    const ult = G.ULTIMATE_IDS.find(id => line.includes(G.ultLabel(id, 'uk')) || line.includes(G.ultLabel(id, 'en')));
    if (ult) stats.ultimates.add(ult);
    const noAttack = frozen || (ult && !G.CLASS_ULTIMATES[ult].attacks);
    const now = snap();
    for (const [inst, before] of baseline) {
        const e = EFFECTS[before.id];
        const own = before.owner === attacker;
        if (ult === 'theft' && e.kind === 'buff') continue;
        const mayVanish = (ult === 'detonation' && !own && e.kind === 'debuff') || (ult === 'bloom' && own && e.kind === 'debuff');
        const d = noAttack ? (own && (e.lasts === 'turns' || (frozen && before.id === 'frost')) ? 1 : 0)
                           : (own ? (e.lasts === 'turns' || e.lasts === 'attacks' ? 1 : 0) : (e.lasts === 'hits' ? 1 : 0));
        const want = before.left - d;
        const after = now.get(inst);
        if (mayVanish && after === undefined) continue;
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
check(dispel.wasted === 0 && dispel.recast > 0,
    `Dispel in fights: ${dispel.cast} cast, ${dispel.recast} recast as another effect (no buffs to remove), ${dispel.immune} stopped by immunity, 0 wasted`,
    `Dispel landed on a target with no buffs ${dispel.wasted} time(s) (recast ${dispel.recast})`);
check(!stats.immuneHad.length, 'immune fighters never carried a debuff in a fight', `immune fighter with a debuff: ${stats.immuneHad.slice(0, 3).join(' | ')}`);

console.log(failures ? `\n${failures} effect check(s) failed.` : '\nAll effect checks passed.');
process.exit(failures ? 1 : 0);
