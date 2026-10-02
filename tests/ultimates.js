// Class ultimates test: loads the real game code in Node (same stub page as the balance sim) and plays scripted turns
// with fixed dice to check the Element Power meter and every ultimate against the numbers in CLASS_ULTIMATES.
//
// Usage (from the project folder):
//   node tests/ultimates.js                      (or: npm run test:ultimates)
//   node tests/ultimates.js --file path/to/index.html
//
// Checks:
//   - CLASS_ULTIMATES: one ultimate per viewer element, icon, both names, a description with every number filled in
//     from the table (change a number → the text changes), and the README ultimate table shows the same text
//   - the meter fills only on own attacks that deal damage, gets the below-half bonus once, fires at METER.max on the
//     next turn and resets to 0, isn't filled by the ultimate, and waits through ❄️ Frost
//   - one test per ultimate: the same turn with and without it, numbers from CLASS_ULTIMATES; every Jackpot outcome
//     (all 27 reel combinations, including the misses)
//   - effect power never scales an ultimate's own numbers; effects it applies follow the usual rules (power, immunity)
//   - debuff immunity blocks the debuff parts (Firestorm's Burn, the theft) but never the damage
//   - no effect cuts damage or healing by more than 90%, at effect power far above anything in the game
//   - the White Dragon never gets a meter or an ultimate
//   - in real fights (both languages) every ultimate fires, and no internal ultimate id appears in the log
// Exits non-zero if any check fails.
const fs = require('fs');
const path = require('path');
const { mulberry32, gameScript, setupEnv } = require('./game_env');

const args = process.argv.slice(2);
const fi = args.indexOf('--file');
const FILE = fi === -1 ? 'showcase/index.html' : args[fi + 1];

Math.random = mulberry32(4242);
setupEnv();
const _warn = console.warn; console.warn = () => {};
eval(gameScript(FILE) + `
;globalThis.__game = {
    EFFECTS, CLASS_ULTIMATES, ULTIMATE_IDS, METER, EFFECT_CAPS, TITLES_DB, DRAKE_TYPES, VIEWER_DRAKE_TYPES, DRAGON_TYPE, DRAGON_TITLE_ID,
    applyEffect: (...a) => applyEffect(...a), describeUltimate, ultLabel, ultimateFor, fxNum, getEffectMult, getMaxHP, getRequiredXP,
    getDragonDB, saveDragonDB, runBattle: (...a) => runBattle(...a), renderPowerMeter,
    get battleFx() { return battleFx; },
    setLang: l => { currentLang = l; },
    setRunning: v => { isBattleRunning = v; },
    wrapAddLog: f => { const orig = addLog; addLog = t => { orig(t); f(t); }; },
};`);
console.warn = _warn;
const G = globalThis.__game;
const { EFFECTS, CLASS_ULTIMATES: U, ULTIMATE_IDS, METER } = G;

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);
const strip = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
const xpFor = lvl => { let x = 0; for (let l = 1; l < lvl; l++) x += G.getRequiredXP(l); return x; };
const DRAKE = Object.fromEntries(G.DRAKE_TYPES.map(d => [d.type, d]));
const drake = (name, type = 'plain', level = 20, title = null) => ({ name, color: '#fff', title, xp: xpFor(level),
    drakeObj: DRAKE[type] || { name: { uk: 'Простий', en: 'Plain' }, type: 'plain' } });
const near = (got, want, m = 1) => Math.abs(got - want) <= 0.5 + 0.5 * m + 1e-9;   // both sides from the same rounded float
const titleWith = test => G.TITLES_DB.find(t => t.bonus && test(t.bonus));
const POWER_TITLE = titleWith(b => b.stats && b.stats.buffEff);
const IMMUNE_TITLE = titleWith(b => b.mechanic === 'debuff_immunity');

let capture = null;
G.wrapAddLog(t => { if (capture) capture.push(strip(t)); });

// Dice for one attack, in the order the fight rolls them: attack type, sub-type, damage, crit, ultra-block, then one
// more (Blue's reflect or Gold's 1-HP roll when that applies, otherwise the cast roll). Missing rolls are 0.99.
const dice = (o = {}) => [o.attack ?? 0.5, o.sub ?? 0.5, o.dmg ?? 0.5, o.crit ?? 0.99, o.block ?? 0.99, o.cast ?? 0.99];
// Jackpot reel rolls: 💎 under 0.5, 🪙 0.5–0.85, 💀 from 0.85 (from the table's chances)
const reelRoll = icon => { let acc = 0; for (const r of U.jackpot.reels) { if (r.icon === icon) return (acc + r.chance / 2) / 100; acc += r.chance; } };

// Plays scripted turns: A (fighter 1) attacks on odd turns. who: { A, B } fighter overrides; setup(fx) runs after the
// fight is set up. Each turn gets its own dice. Returns per-turn damage, HP, log lines and the meter afterwards.
function scripted({ A = {}, B = {}, setup = null, turns }) {
    G.setLang('en');
    const db = G.getDragonDB();
    db.A = { ...drake('A'), ...A, name: 'A' }; db.B = { ...drake('B'), ...B, name: 'B' };
    G.saveDragonDB(db);
    let tick = null, queue = [0.9];                          // 0.9: the coin flip keeps A first
    const realInterval = global.setInterval, realRandom = Math.random;
    global.setInterval = f => { tick = f; return { on: true }; };
    Math.random = () => queue.length ? queue.shift() : 0.99;
    const lines = []; capture = lines;
    try {
        G.setRunning(true);
        G.runBattle('A', '#fff', 'B', '#fff', false);
        global.setInterval = realInterval;
        const fx = G.battleFx;
        const res = setup ? setup(fx) : null;
        const hp = id => Number(document.getElementById(id).innerText.split('/')[0])   // the card shows "44/150";
        const out = turns.map(d => {
            queue = [...d]; const from = lines.length; tick();
            const l = lines.slice(from), all = l.join('\n');
            const dm = all.match(/Damage: (\d+) damage/);
            return { lines: l, text: all, dmg: dm ? Number(dm[1]) : null, hpA: hp('hp-text-p1'), hpB: hp('hp-text-p2'),
                     meterA: fx.A.meter, meterB: fx.B.meter, fx: { A: JSON.parse(JSON.stringify(fx.A)), B: JSON.parse(JSON.stringify(fx.B)) } };
        });
        return { turns: out, setup: res, fx };
    } finally {
        global.setInterval = realInterval; Math.random = realRandom; capture = null; G.setRunning(false);
    }
}
const isUltLine = (t, id) => t.text.includes(G.ultLabel(id, 'en'));
const castOn = (fx, owner, id, power = 1) => {   // put effect `id` straight on a fighter with a given power
    const kind = EFFECTS[id].kind;
    fx[owner][kind] = fx[owner][kind].filter(x => x.id !== id);
    fx[owner][kind].push({ id, left: EFFECTS[id].count, power });
};

// ---------------------------------------------------------------- 1. The table
console.log('\nCLASS_ULTIMATES table');
check(ULTIMATE_IDS.length === 6, 'there are 6 ultimates', `found ${ULTIMATE_IDS.length}`);
for (const d of G.VIEWER_DRAKE_TYPES) {
    const own = ULTIMATE_IDS.filter(id => U[id].element === d.type);
    check(own.length === 1 && G.ultimateFor(d.type) === own[0], `${d.type}: ${own.map(id => `${U[id].icon} ${U[id].name.uk} / ${U[id].name.en}`).join('')}`, `${d.type} has ${own.length} ultimates`);
}
check(G.ultimateFor(G.DRAGON_TYPE) === null, 'the White Dragon has no ultimate', `ultimateFor('white') = ${G.ultimateFor(G.DRAGON_TYPE)}`);
for (const id of ULTIMATE_IDS) {
    const u = U[id], bad = [];
    if (!u.icon || !u.name || !u.name.uk || !u.name.en) bad.push('icon or a name missing');
    for (const l of ['uk', 'en']) {
        if (!u.desc || !u.desc[l]) { bad.push(`no ${l} description`); continue; }
        const text = G.describeUltimate(id, l);
        if (/[{}]|undefined|NaN/.test(text)) bad.push(`${l} text not filled in: "${text}"`);
        if (/\d/.test(u.desc[l].replace(/\{[^}]*\}/g, ''))) bad.push(`${l} text has a number typed in instead of a {placeholder}`);
        for (const k of Object.keys(u.nums)) if (!new RegExp(`\\{(\\w+:)?${k}\\}`).test(u.desc[l])) bad.push(`${l} text never shows nums.${k}`);
        const saved = { ...u.nums };
        for (const k of Object.keys(u.nums)) u.nums[k] = u.nums[k] + 7;
        const after = G.describeUltimate(id, l);
        Object.assign(u.nums, saved);
        if (Object.keys(u.nums).length && after === text) bad.push(`${l} text didn't change when the table's numbers did`);
    }
    check(!bad.length, `${u.icon} ${u.name.en}: ${G.describeUltimate(id, 'en')}`, bad.join('; '));
}
{
    const readme = fs.readFileSync(path.join(path.dirname(FILE), 'README.md'), 'utf8');
    const missing = ULTIMATE_IDS.filter(id => !readme.includes(G.describeUltimate(id, 'en')));
    check(!missing.length, "the README ultimate table matches the game's descriptions",
        `out of date for: ${missing.map(id => `${id} ("${G.describeUltimate(id, 'en')}")`).join(' | ')}`);
}

// ---------------------------------------------------------------- 2. The meter
console.log('\nElement Power meter');
{
    // Damaging attacks fill it, blocked ones don't (B's attacks are all blocked here)
    const r = scripted({ A: drake('A', 'red'), B: drake('B', 'red'), turns: [dice(), dice({ block: 0.05 }), dice({ block: 0.05 }), dice({ block: 0.05 })] });
    const [t1, t2, t3, t4] = r.turns;
    check(t1.meterA === 1 && t2.meterB === 0 && t3.meterA === 1 && t4.meterB === 0,
        `+1 for a damaging attack (A: ${t1.meterA}), nothing for a blocked one (B: ${t2.meterB}, A after its blocked turn 3: ${t3.meterA})`,
        `meters A ${t1.meterA}/${t3.meterA}, B ${t2.meterB}/${t4.meterB}`);
}
{
    // Below-half bonus, once: a level-1 B takes A's hits; B's own attacks are blocked so only the bonus can fill it
    const turns = [];
    for (let i = 0; i < 6; i++) turns.push(dice({ crit: 0 }), dice({ block: 0.05 }));
    // A strong Regeneration on B (power ×4) lifts it back over half between hits, so it drops below half more than once
    const r = scripted({ B: drake('B', 'red', 1), setup: fx => { castOn(fx, 'B', 'regen', 4); fx.B.buff[0].left = 99; }, turns });
    const maxB = 150, seq = r.turns.map(t => `${t.hpB}:${t.meterB}`);
    const drops = r.turns.filter((t, i) => t.hpB < maxB / 2 && t.hpB > 0 && (i === 0 || r.turns[i - 1].hpB >= maxB / 2)).length;
    const firstBelow = r.turns.findIndex(t => t.hpB < maxB / 2);
    const ok = drops >= 2 && firstBelow > 0 && r.turns.slice(0, firstBelow).every(t => t.meterB === 0) && r.turns.slice(firstBelow).every(t => t.meterB === 1);
    check(ok, `below-half bonus: +1 the first time HP drops under ${maxB / 2}, and not again after healing back up (${drops} drops; HP:meter ${seq.join(' ')})`, `HP:meter per turn ${seq.join(' ')}`);
}
{
    // Full meter: the next turn is the ultimate, the meter resets to 0 and the ultimate doesn't fill it
    const r = scripted({ A: drake('A', 'red'), setup: fx => { fx.A.meter = METER.max; }, turns: [dice(), dice(), dice()] });
    const [t1, , t3] = r.turns;
    check(isUltLine(t1, 'firestorm') && t1.dmg > 0 && t1.meterA === 0 && !isUltLine(t3, 'firestorm') && t3.meterA === 1,
        `at ${METER.max} the next turn is the ultimate ("${G.ultLabel('firestorm', 'en')}", ${t1.dmg} damage); meter after it ${t1.meterA}, then +1 from the next normal attack (${t3.meterA})`,
        `ultimate on turn 1: ${isUltLine(t1, 'firestorm')}, meter after ${t1.meterA}, turn 3 meter ${t3.meterA}`);
}
{
    // Frost: a full meter waits through the skipped turn and fires on the next one the fighter acts
    const r = scripted({ A: drake('A', 'red'), setup: fx => { fx.A.meter = METER.max; castOn(fx, 'A', 'frost'); }, turns: [dice(), dice(), dice()] });
    const [t1, , t3] = r.turns;
    check(/is frozen/.test(t1.text) && !isUltLine(t1, 'firestorm') && t1.meterA === METER.max && isUltLine(t3, 'firestorm') && t3.meterA === 0,
        `❄️ Frost: turn 1 skipped with the meter still at ${t1.meterA}, the ultimate fires on turn 3`, `turn 1 "${t1.text.slice(0, 80)}", meter ${t1.meterA}; turn 3 ultimate ${isUltLine(t3, 'firestorm')}`);
}
{
    // The ultimate never shows up early: one short of full is a normal attack that fills it
    const r = scripted({ A: drake('A', 'red'), setup: fx => { fx.A.meter = METER.max - 1; }, turns: [dice(), dice(), dice()] });
    check(!isUltLine(r.turns[0], 'firestorm') && r.turns[0].meterA === METER.max && isUltLine(r.turns[2], 'firestorm'),
        `at ${METER.max - 1} the attack is normal and fills the meter; the ultimate comes on the following turn`, `turn 1 ult ${isUltLine(r.turns[0], 'firestorm')}, meter ${r.turns[0].meterA}`);
}

// ---------------------------------------------------------------- 3. Each ultimate
console.log('\nWhat each ultimate does (same turn with and without it, numbers from CLASS_ULTIMATES)');
const full = fx => { fx.A.meter = METER.max; };
// ☄️ Firestorm
{
    const base = scripted({ A: drake('A', 'red'), turns: [dice()] }).turns[0].dmg;
    const r = scripted({ A: drake('A', 'red'), setup: full, turns: [dice()] }).turns[0];
    const blockedBase = scripted({ A: drake('A', 'red'), turns: [dice({ block: 0.05 })] }).turns[0].dmg;
    const through = scripted({ A: drake('A', 'red'), setup: full, turns: [dice({ block: 0.05 })] }).turns[0];
    const m = U.firestorm.nums.dmgMult;
    const burn = r.fx.B.debuff.find(x => x.id === U.firestorm.applies);
    check(near(r.dmg, base * m, m) && blockedBase === 0 && near(through.dmg, base * m, m) && burn && burn.left === EFFECTS.burn.count,
        `☄️ Firestorm: ${base} → ${r.dmg} (×${m}); a hit that would be blocked (${blockedBase}) goes through (${through.dmg}); 🔥 Burn on the target (${burn && burn.left} turns)`,
        `expected ${(base * m).toFixed(1)}, burn ${JSON.stringify(burn)}`);
    // Its Burn follows the usual effect rules: the caster's effect power, and immunity
    const pr = scripted({ A: drake('A', 'red', 20, POWER_TITLE), setup: full, turns: [dice()] }).turns[0];
    const pb = pr.fx.B.debuff.find(x => x.id === 'burn');
    const im = scripted({ A: drake('A', 'red'), B: drake('B', 'plain', 20, IMMUNE_TITLE), setup: full, turns: [dice()] }).turns[0];
    const imBase = scripted({ A: drake('A', 'red'), B: drake('B', 'plain', 20, IMMUNE_TITLE), turns: [dice()] }).turns[0].dmg;
    check(pb && Math.abs(pb.power - G.getEffectMult('red', POWER_TITLE, 20)) < 1e-9 && im.fx.B.debuff.length === 0 && /Immunity/.test(im.text) && near(im.dmg, imBase * m, m),
        `☄️ Firestorm's 🔥 Burn uses the caster's effect power (×${pb && pb.power.toFixed(2)}); an immune target ignores the Burn but still takes the ×${m} hit (${imBase} → ${im.dmg})`,
        `burn power ${pb && pb.power}, immune debuffs ${JSON.stringify(im.fx.B.debuff)}, damage ${im.dmg}`);
}
// 💠 Ice Mirror: each of the next `hits` hits is absorbed up to cap% of Blue's max HP, the rest goes through, and back%
// of what was absorbed goes to the attacker. Checked with ordinary hits (under the cap) and with big ones (a 💢 Rage at
// power ×5 on the attacker), against the same hits without the mirror.
{
    const capHP = Math.round(G.getMaxHP(20, 'blue', null) * U.mirror.nums.cap / 100), back = U.mirror.nums.back / 100;
    const turns = [dice({ block: 0.05 }), dice(), dice({ block: 0.05 }), dice(), dice({ block: 0.05 }), dice()];
    const rows = [], bad = [];
    for (const [label, bigHits] of [['ordinary hits', false], ['big hits', true]]) {
        const rage = fx => { if (bigHits) { castOn(fx, 'B', 'rage', 5); fx.B.buff[0].left = 99; } };
        const ctl = scripted({ A: drake('A', 'blue'), setup: rage, turns });
        const r = scripted({ A: drake('A', 'blue'), setup: fx => { full(fx); rage(fx); }, turns: [dice(), ...turns.slice(1)] });
        const hits = [1, 3, 5].map(i => ({ would: ctl.turns[i].dmg, dealt: r.turns[i].dmg, lost: r.turns[i - 1].hpB - r.turns[i].hpB }));
        hits.slice(0, U.mirror.nums.hits).forEach(h => {
            const absorbed = Math.min(h.would, capHP);
            if (h.dealt !== h.would - absorbed || h.lost !== Math.round(absorbed * back)) bad.push(`${label}: ${JSON.stringify(h)}, expected dealt ${h.would - absorbed}, back ${Math.round(absorbed * back)}`);
        });
        const after = hits[U.mirror.nums.hits];
        if (after.dealt !== after.would || after.lost !== 0) bad.push(`${label}: hit after the mirror ${JSON.stringify(after)}`);
        if (!isUltLine(r.turns[0], 'mirror') || r.turns[0].dmg !== null) bad.push(`${label}: turn 1 wasn't a no-attack Ice Mirror turn`);
        if (bigHits && !hits.slice(0, U.mirror.nums.hits).every(h => h.would > capHP)) bad.push('big hits were not over the cap, so the cap was not exercised');
        if (!bigHits && !hits.slice(0, U.mirror.nums.hits).every(h => h.would <= capHP)) bad.push('ordinary hits were over the cap');
        rows.push(`${label}: ${hits.slice(0, U.mirror.nums.hits).map(h => `${h.would} → ${h.dealt}, -${h.lost} back`).join('; ')}`);
    }
    check(!bad.length, `💠 Ice Mirror: no attack on its turn; the next ${U.mirror.nums.hits} hits absorb up to ${U.mirror.nums.cap}% of max HP (${capHP}) and send ${U.mirror.nums.back}% of that back — ${rows.join(' | ')}; the 3rd hit is normal`,
        bad.slice(0, 3).join(' | '));
}
// 🦇 Shadow Theft
{
    const own = (t, who) => t.fx[who].buff.map(x => `${x.id}:${x.left}`).sort().join(',');
    // Two buffs, room for both: they move with their counts (Rage then counts down on the thief's attack, Shield doesn't)
    const r = scripted({ A: drake('A', 'black'), setup: fx => { full(fx); castOn(fx, 'B', 'rage'); castOn(fx, 'B', 'shield'); fx.B.buff[1].left = 1; }, turns: [dice()] }).turns[0];
    check(isUltLine(r, 'theft') && r.fx.B.buff.length === 0 && own(r, 'A') === 'rage:1,shield:1',
        `🦇 Shadow Theft: takes 💢 Rage (2) and 🛡️ Shield (1) with their counts — after its own attack: ${own(r, 'A')}; the target has none left`,
        `thief ${own(r, 'A')}, target ${own(r, 'B')}`);
    // Limit: the thief already has one buff, so only the first stolen one fits; the other is removed
    const lim = scripted({ A: drake('A', 'black'), setup: fx => { full(fx); castOn(fx, 'A', 'regen'); castOn(fx, 'B', 'shadow'); castOn(fx, 'B', 'shield'); }, turns: [dice()] }).turns[0];
    check(own(lim, 'A') === 'regen:2,shadow:2' && lim.fx.B.buff.length === 0 && /removes 🛡️ Shield/.test(lim.text),
        `🦇 Shadow Theft: up to the ${2}-buff limit — the thief keeps 💚 Regeneration (2 left after its turn tick), gains 🌑 Shadow, 🛡️ Shield is removed`, `thief ${own(lim, 'A')}, log "${lim.text.slice(0, 140)}"`);
    // No buffs to take: the hit is a guaranteed crit (on a crit roll that never crits)
    const base = scripted({ A: drake('A', 'black'), turns: [dice({ crit: 0.99 })] }).turns[0].dmg;
    const nc = scripted({ A: drake('A', 'black'), setup: full, turns: [dice({ crit: 0.99 })] }).turns[0];
    const withBuffs = scripted({ A: drake('A', 'black'), setup: fx => { full(fx); castOn(fx, 'B', 'regen'); }, turns: [dice({ crit: 0.99 })] }).turns[0];
    check(/CRIT/.test(nc.text) && nc.dmg > base && !/CRIT/.test(withBuffs.text),
        `🦇 Shadow Theft: no buffs on the target → guaranteed crit (${base} → ${nc.dmg}); with a buff to take, no forced crit`, `no-buff text "${nc.text.slice(0, 120)}", with-buff crit ${/CRIT/.test(withBuffs.text)}`);
    // Immunity blocks the theft (the target keeps its buffs) but not the attack
    const im = scripted({ A: drake('A', 'black'), B: drake('B', 'plain', 20, IMMUNE_TITLE), setup: fx => { full(fx); castOn(fx, 'B', 'regen'); }, turns: [dice()] }).turns[0];
    check(own(im, 'B') === 'regen:3' && own(im, 'A') === '' && im.dmg > 0 && /Immunity/.test(im.text),
        `🦇 Shadow Theft vs debuff immunity: the target keeps 💚 Regeneration, the attack still lands (${im.dmg})`, `target ${own(im, 'B')}, thief ${own(im, 'A')}, dmg ${im.dmg}`);
}
// 🎰 Jackpot: all 27 reel combinations
{
    const base = scripted({ A: drake('A', 'gold'), turns: [dice()] }).turns[0].dmg;
    const icons = U.jackpot.reels.map(r => r.icon), bad = [], outcomes = new Map();
    for (const a of icons) for (const b of icons) for (const c of icons) {
        const reels = [a, b, c];
        const gems = reels.filter(x => x === '💎').length, skulls = reels.filter(x => x === '💀').length;
        const miss = skulls >= U.jackpot.nums.missAt, m = U.jackpot.nums.base + U.jackpot.nums.perGem * gems;
        const t = scripted({ A: drake('A', 'gold'), setup: full, turns: [[...reels.map(reelRoll), ...dice()]] }).turns[0];
        const shown = t.text.includes(`[${reels.join(' ')}]`);
        const ok = shown && (miss ? t.dmg === 0 && /Miss!/.test(t.text) : near(t.dmg, base * m, m));
        if (!ok) bad.push(`${reels.join('')}: ${t.dmg} (expected ${miss ? 'miss' : (base * m).toFixed(1)}, reels shown ${shown})`);
        outcomes.set(miss ? 'miss' : `×${m}`, (outcomes.get(miss ? 'miss' : `×${m}`) || 0) + 1);
    }
    check(!bad.length, `🎰 Jackpot: all 27 reel combinations — ${[...outcomes].map(([k, n]) => `${k} (${n})`).join(', ')}; ${U.jackpot.nums.missAt}+ 💀 is a miss; the log shows the reels (base hit ${base})`, bad.slice(0, 4).join(' | '));
    // The reel chances come from the table
    const counts = {}; const N = 30000; let s = 99;
    const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const spin = new Function('roll', 'reels', 'let acc = 0; for (const r of reels) { acc += r.chance; if (roll * 100 < acc) return r; } return reels[reels.length - 1];');
    for (let i = 0; i < N; i++) { const r = spin(rnd(), U.jackpot.reels); counts[r.icon] = (counts[r.icon] || 0) + 1; }
    const live = { '💎': 0, '🪙': 0, '💀': 0 };
    for (let i = 0; i < 3000; i++) { const t = scripted({ A: drake('A', 'gold'), setup: full, turns: [[Math.random(), Math.random(), Math.random(), ...dice()]] }).turns[0];
        const m = t.text.match(/\[(\S+) (\S+) (\S+)\]/); if (m) [m[1], m[2], m[3]].forEach(x => live[x]++); }
    const tot = Object.values(live).reduce((a, b) => a + b, 0);
    check(U.jackpot.reels.every(r => Math.abs(100 * live[r.icon] / tot - r.chance) < 2.5),
        `🎰 Jackpot reels land at the table's chances (${U.jackpot.reels.map(r => `${r.icon} ${(100 * live[r.icon] / tot).toFixed(1)}% / ${r.chance}%`).join(', ')}, ${tot} reels)`, JSON.stringify(live));
    void counts;
}
// ✴️ Arcane Detonation: ×(dmgMult + perDebuff% per debuff), then those debuffs are gone; effect power doesn't change it
{
    const rows = [], bad = [];
    for (const [label, A] of [['Purple', drake('A', 'purple')], ['Purple + effect-strength title', drake('A', 'purple', 20, POWER_TITLE)]]) {
        const base = scripted({ A, turns: [dice()] }).turns[0].dmg;
        for (const debuffs of [[], ['burn'], ['burn', 'poison']]) {
            const t = scripted({ A, setup: fx => { full(fx); debuffs.forEach(id => castOn(fx, 'B', id)); }, turns: [dice()] }).turns[0];
            const m = U.detonation.nums.dmgMult + U.detonation.nums.perDebuff / 100 * debuffs.length;
            if (!near(t.dmg, base * m, m) || t.fx.B.debuff.length) bad.push(`${label}, ${debuffs.length} debuffs: ${t.dmg} (want ${(base * m).toFixed(1)}), left ${JSON.stringify(t.fx.B.debuff)}`);
            if (label === 'Purple') rows.push(`${debuffs.length}: ${base} → ${t.dmg} (×${m})`);
        }
    }
    check(!bad.length, `✴️ Arcane Detonation: ${rows.join(', ')}; the debuffs are removed; same multipliers at effect power ×${G.getEffectMult('purple', POWER_TITLE, 20).toFixed(2)}`, bad.join(' | '));
}
// 🌸 Bloom: a level-1 Green; turn 1 fills the meter, B crits on turn 2, turn 3 is Bloom
{
    // B's hit on turn 2 is a crit boosted by a 💢 Rage at power ×3, so A is missing more than Bloom heals (no max-HP cap)
    const A = drake('A', 'green', 1), maxA = G.getMaxHP(1, 'green', null);
    const r = scripted({ A, setup: fx => { fx.A.meter = METER.max - 1; castOn(fx, 'A', 'poison'); castOn(fx, 'B', 'rage', 3); fx.B.buff[0].left = 99; },
        turns: [dice(), dice({ crit: 0 }), dice(), dice()] });
    const [, t2, t3] = r.turns;
    const want = Math.round(maxA * U.bloom.nums.heal / 100);
    const tick = Math.max(1, Math.round(maxA * EFFECTS.poison.nums.hp / 100));     // turn 3 starts with a Poison tick
    const missing = maxA - (t2.hpA - tick);
    const gained = t3.fx.A.buff.length;
    check(isUltLine(t3, 'bloom') && t3.dmg === null && t3.text.includes(`+${want} HP`) && t3.hpA === t2.hpA - tick + want && t3.fx.A.debuff.length === 0 && gained === 0 && missing > want,
        `🌸 Bloom: +${want} HP (${U.bloom.nums.heal}% of ${maxA}, not halved: ☠️ Poison is removed first), own debuffs cleared, no buff gained, no attack (A was ${missing} HP down)`,
        `text "${t3.text.slice(0, 160)}", HP ${t2.hpA} → ${t3.hpA} (tick ${tick}), debuffs ${JSON.stringify(t3.fx.A.debuff)}, buffs ${JSON.stringify(t3.fx.A.buff)}, missing ${missing}`);
}

// ---------------------------------------------------------------- 3b. Interaction choices
// Every "where the rules don't say" choice listed in the PR, pinned down so a later change can't flip one silently.
console.log('\nInteraction choices');
const left = (t, who, kind, id) => { const x = t.fx[who][kind].find(e => e.id === id); return x ? x.left : null; };
const castLine = t => /receives (buff|debuff)|refreshed|replaces|loses every buff|Immunity/.test(t.text);
{
    // Attacking ultimates are attacks: they count down own "attacks" and the target's "hits" effects, and roll the usual cast
    const setup = fx => { full(fx); castOn(fx, 'A', 'rage'); castOn(fx, 'B', 'shield'); };
    const cast = scripted({ A: drake('A', 'red'), setup, turns: [dice({ cast: 0 })] }).turns[0];
    const noCast = scripted({ A: drake('A', 'red'), setup, turns: [dice({ cast: 0.99 })] }).turns[0];
    check(isUltLine(cast, 'firestorm') && left(cast, 'A', 'buff', 'rage') === 1 && left(cast, 'B', 'buff', 'shield') === 1 && castLine(cast) && !noCast.lines.some(l => /receives (buff|debuff)/.test(l) && !l.includes(EFFECTS.burn.name.en)),
        `an attacking ultimate counts as an attack: 💢 Rage 2 → ${left(cast, 'A', 'buff', 'rage')}, the target's 🛡️ Shield 2 → ${left(cast, 'B', 'buff', 'shield')}, and a low cast roll casts an effect`,
        `rage ${left(cast, 'A', 'buff', 'rage')}, shield ${left(cast, 'B', 'buff', 'shield')}, cast line ${castLine(cast)}: "${cast.text.slice(0, 200)}"`);
}
for (const [id, type] of [['mirror', 'blue'], ['bloom', 'green']]) {
    // Ice Mirror and Bloom replace the attack: only the owner's "turns" effects count down
    const t = scripted({ A: drake('A', type), setup: fx => { full(fx); castOn(fx, 'A', 'rage'); castOn(fx, 'A', 'regen'); castOn(fx, 'B', 'shield'); }, turns: [dice()] }).turns[0];
    check(isUltLine(t, id) && left(t, 'A', 'buff', 'rage') === 2 && left(t, 'A', 'buff', 'regen') === 2 && left(t, 'B', 'buff', 'shield') === 2,
        `${U[id].icon} ${U[id].name.en} makes no attack: 💢 Rage stays at 2, the target's 🛡️ Shield stays at 2, only 💚 Regeneration (turns) goes 3 → 2`,
        `rage ${left(t, 'A', 'buff', 'rage')}, regen ${left(t, 'A', 'buff', 'regen')}, shield ${left(t, 'B', 'buff', 'shield')}`);
}
{
    // Ice Mirror is not a buff: Dispel and Shadow Theft can't take it
    const d = scripted({ A: drake('A', 'blue'), setup: fx => {
        fx.A.mirror = U.mirror.nums.hits;
        G.applyEffect(drake('B'), drake('A', 'blue'), 'dispel', 20, fx);
        return fx.A.mirror;
    }, turns: [] });
    const th = scripted({ A: drake('A', 'black'), setup: fx => { full(fx); fx.B.mirror = U.mirror.nums.hits; castOn(fx, 'B', 'regen'); }, turns: [dice()] }).turns[0];
    check(d.setup === U.mirror.nums.hits && th.fx.A.mirror === 0 && th.fx.B.mirror === U.mirror.nums.hits - 1 && th.fx.B.buff.length === 0,
        `💠 Ice Mirror is not a buff: 💨 Dispel leaves it (${d.setup} hits left); 🦇 Shadow Theft takes the buff but not the mirror (the thief has ${th.fx.A.mirror}; its own hit used one, ${th.fx.B.mirror} left)`,
        `after Dispel ${d.setup}, after Theft target ${th.fx.B.mirror} / thief ${th.fx.A.mirror}, target buffs ${JSON.stringify(th.fx.B.buff)}`);
}
{
    // A blocked hit still uses up one of Ice Mirror's hits, like any "hits taken" count
    const t = scripted({ setup: fx => { fx.B.mirror = U.mirror.nums.hits; }, turns: [dice({ block: 0.05 })] }).turns[0];
    check(t.dmg === 0 && t.fx.B.mirror === U.mirror.nums.hits - 1,
        `💠 Ice Mirror: an ultra-blocked hit still uses one of its hits (${U.mirror.nums.hits} → ${t.fx.B.mirror})`, `dmg ${t.dmg}, mirror ${t.fx.B.mirror}`);
}
{
    // The White Dragon's hits go straight through Ice Mirror (and it takes nothing back)
    const dragonTitle = G.TITLES_DB.find(x => x.id === G.DRAGON_TITLE_ID);
    const t = scripted({ A: { ...drake('A', G.DRAGON_TYPE, 20, dragonTitle) }, B: drake('B', 'blue'), setup: fx => { fx.B.mirror = U.mirror.nums.hits; }, turns: [dice()] }).turns[0];
    check(t.hpB === 0 && t.fx.B.mirror === U.mirror.nums.hits && t.hpA === 99999,
        `💠 Ice Mirror doesn't stop the White Dragon: the Blue drake falls in one hit, the mirror is untouched and nothing goes back`,
        `blue HP ${t.hpB}, mirror ${t.fx.B.mirror}, dragon HP ${t.hpA}`);
}
{
    // Shadow Theft moves buffs before its attack: a stolen 💢 Rage counts for that hit (and uses up one of its attacks)
    const base = scripted({ A: drake('A', 'black'), turns: [dice({ crit: 0.99 })] }).turns[0].dmg;
    const t = scripted({ A: drake('A', 'black'), setup: fx => { full(fx); castOn(fx, 'B', 'rage'); }, turns: [dice({ crit: 0.99 })] }).turns[0];
    const m = U.theft.nums.dmgMult * (1 + EFFECTS.rage.nums.dmg / 100);
    check(near(t.dmg, base * m, m) && left(t, 'A', 'buff', 'rage') === 1 && !/CRIT/.test(t.text),
        `🦇 Shadow Theft: the stolen 💢 Rage counts for its own hit — ${base} → ${t.dmg} (×${U.theft.nums.dmgMult} × ${1 + EFFECTS.rage.nums.dmg / 100}), Rage 2 → 1; no forced crit (the target had a buff)`,
        `expected ${(base * m).toFixed(1)}, rage ${left(t, 'A', 'buff', 'rage')}`);
}
{
    // Shadow Theft merges a buff the thief already has: the one with more left stays (with its power)
    const shieldOf = (t, who) => t.fx[who].buff.find(e => e.id === 'shield');
    const longerStolen = scripted({ A: drake('A', 'black'), setup: fx => { full(fx); castOn(fx, 'A', 'shield', 1); fx.A.buff[0].left = 1; castOn(fx, 'B', 'shield', 1.4); }, turns: [dice()] }).turns[0];
    const longerOwn = scripted({ A: drake('A', 'black'), setup: fx => { full(fx); castOn(fx, 'A', 'shield', 1); castOn(fx, 'B', 'shield', 1.4); fx.B.buff[0].left = 1; }, turns: [dice()] }).turns[0];
    const a = shieldOf(longerStolen, 'A'), b = shieldOf(longerOwn, 'A');
    check(longerStolen.fx.A.buff.length === 1 && a.left === 2 && a.power === 1.4 && longerOwn.fx.A.buff.length === 1 && b.left === 2 && b.power === 1,
        `🦇 Shadow Theft merges a buff the thief already has into one: the stolen 🛡️ Shield (2 left) replaces the thief's (1 left); the thief's (2 left) beats a stolen one with 1 left`,
        `stolen longer: ${JSON.stringify(longerStolen.fx.A.buff)}; own longer: ${JSON.stringify(longerOwn.fx.A.buff)}`);
}
{
    // The forced crit depends on whether the target had buffs, even when immunity stops the theft
    const t = scripted({ A: drake('A', 'black'), B: drake('B', 'plain', 20, IMMUNE_TITLE), setup: fx => { full(fx); castOn(fx, 'B', 'regen'); }, turns: [dice({ crit: 0.99 })] }).turns[0];
    check(!/CRIT/.test(t.text) && t.fx.B.buff.length === 1,
        '🦇 Shadow Theft vs an immune target with a buff: no theft and no forced crit (the target had buffs)', `text "${t.text.slice(0, 160)}"`);
}
{
    // A Jackpot miss is an attack that deals 0: it counts down attack and hit effects, and never casts
    const t = scripted({ A: drake('A', 'gold'), setup: fx => { full(fx); castOn(fx, 'A', 'rage'); castOn(fx, 'B', 'shield'); },
        turns: [[reelRoll('💀'), reelRoll('💀'), reelRoll('💎'), ...dice({ cast: 0 })]] }).turns[0];
    check(t.dmg === 0 && /Miss!/.test(t.text) && left(t, 'A', 'buff', 'rage') === 1 && left(t, 'B', 'buff', 'shield') === 1 && !castLine(t),
        `🎰 Jackpot miss (💀💀💎): 0 damage, 💢 Rage 2 → 1 and the target's 🛡️ Shield 2 → 1, and no cast even on a cast roll of 0`,
        `dmg ${t.dmg}, rage ${left(t, 'A', 'buff', 'rage')}, shield ${left(t, 'B', 'buff', 'shield')}, cast ${castLine(t)}`);
}
{
    // Arcane Detonation removes the debuffs it counted even when its hit is blocked
    const t = scripted({ A: drake('A', 'purple'), setup: fx => { full(fx); castOn(fx, 'B', 'burn'); castOn(fx, 'B', 'poison'); }, turns: [dice({ block: 0.05 })] }).turns[0];
    check(isUltLine(t, 'detonation') && t.dmg === 0 && t.fx.B.debuff.length === 0,
        '✴️ Arcane Detonation on an ultra-blocked hit: 0 damage, but the 2 debuffs it counted are still removed', `dmg ${t.dmg}, debuffs ${JSON.stringify(t.fx.B.debuff)}`);
}
{
    // The below-half bonus is used up even when the meter is already full (it doesn't carry over to after the ultimate).
    // A level-1 Red with a full meter is frozen on turn 1; B's big hit on turn 2 takes it under half; turn 3 is its ultimate.
    const r = scripted({ A: drake('A', 'red', 1), setup: fx => { full(fx); castOn(fx, 'A', 'frost'); castOn(fx, 'B', 'rage', 2); fx.B.buff[0].left = 99; },
        turns: [dice(), dice({ crit: 0 }), dice()] });
    const [, t2, t3] = r.turns;
    check(t2.hpA < 75 && t2.hpA > 0 && t2.fx.A.halfDone && t2.meterA === METER.max && isUltLine(t3, 'firestorm') && t3.meterA === 0,
        `the below-half bonus is used even with a full meter: A drops to ${t2.hpA}/150 with the meter at ${t2.meterA} (bonus spent), and after its ultimate the meter is ${t3.meterA}`,
        `A HP ${t2.hpA}, halfDone ${t2.fx.A.halfDone}, meter ${t2.meterA} → ${t3.meterA}, ult ${isUltLine(t3, 'firestorm')}`);
}

// ---------------------------------------------------------------- 4. The 90% cap
console.log('\n90% cap on every effect reduction');
{
    const P = 25;   // far above anything in the game (the strongest is ×1.8)
    const capped = ['shield:cut', 'weakness:cut', 'poison:healCut'].map(k => { const [id, n] = k.split(':'); return [k, G.fxNum({ id, power: P }, n)]; });
    check(capped.every(([, v]) => v === 90), `at power ×${P}: ${capped.map(([k, v]) => `${k} ${v}%`).join(', ')}`, JSON.stringify(capped));
    const base = scripted({ turns: [dice()] }).turns[0].dmg;
    const sh = scripted({ setup: fx => castOn(fx, 'B', 'shield', P), turns: [dice()] }).turns[0].dmg;
    const wk = scripted({ setup: fx => castOn(fx, 'A', 'weakness', P), turns: [dice()] }).turns[0].dmg;
    const regenOf = t => Number((t.text.match(/Regeneration \(\+(\d+) HP\)/) || [])[1]);
    const rb = regenOf(scripted({ setup: fx => castOn(fx, 'B', 'regen'), turns: [dice({ crit: 0 }), dice()] }).turns[1]);
    const rp = regenOf(scripted({ setup: fx => { castOn(fx, 'B', 'regen'); castOn(fx, 'B', 'poison', P); }, turns: [dice({ crit: 0 }), dice()] }).turns[1]);
    check(near(sh, base * 0.1) && near(wk, base * 0.1) && near(rp, rb * 0.1) && sh > 0 && rp > 0,
        `in a fight at power ×${P}: 🛡️ Shield ${base} → ${sh}, 🥀 Weakness ${base} → ${wk}, ☠️ Poison on 💚 Regeneration +${rb} → +${rp} (all ×0.1, never 0)`,
        `shield ${sh}, weakness ${wk}, regen ${rb} → ${rp}`);
}

// ---------------------------------------------------------------- 5. The White Dragon, real fights, log ids
console.log('\nWhite Dragon and real fights');
const ID_RE = new RegExp(`\\b(${ULTIMATE_IDS.join('|')})\\b`);
let current = null;
const seenUlt = new Set(), idLeaks = [], dragonMeter = [];
G.wrapAddLog(raw => {
    if (!current) return;
    const line = strip(raw);
    const hit = line.match(ID_RE);
    if (hit && idLeaks.length < 5) idLeaks.push(`"${hit[1]}" in: ${line.slice(0, 120)}`);
    for (const id of ULTIMATE_IDS) if (line.includes(G.ultLabel(id, 'uk')) || line.includes(G.ultLabel(id, 'en'))) seenUlt.add(id);
    if (current.dragon && /^\[(?:Хід|Turn)/.test(line)) {
        const st = G.battleFx[current.dragon];
        if (st.meter !== 0 || ULTIMATE_IDS.some(id => line.includes(G.ultLabel(id, 'uk')) || line.includes(G.ultLabel(id, 'en')))) dragonMeter.push(`meter ${st.meter}: ${line.slice(0, 100)}`);
    }
});
const realRandom = Math.random;
for (const lang of ['uk', 'en']) {
    G.setLang(lang);
    for (let i = 0; i < 240; i++) {
        const types = G.VIEWER_DRAKE_TYPES.map(d => d.type);
        const dragonFight = i % 8 === 0;
        const a = dragonFight ? { ...drake('A', G.DRAGON_TYPE, 20, G.TITLES_DB.find(t => t.id === G.DRAGON_TITLE_ID)), name: 'A' } : drake('A', types[i % 6], [1, 10, 20][i % 3]);
        const b = drake('B', types[(i * 5 + 1) % 6], [1, 10, 20][(i + 1) % 3]);
        const db = G.getDragonDB(); db.A = a; db.B = b; G.saveDragonDB(db);
        current = { dragon: dragonFight ? 'A' : null };
        G.setRunning(true);
        G.runBattle('A', '#fff', 'B', '#fff', false);
        global.__drain();
        current = null;
        global.__LOG.length = 0;
    }
}
Math.random = realRandom;
check(!dragonMeter.length, 'the White Dragon never had a meter point or an ultimate in 60 fights', dragonMeter.slice(0, 3).join(' | '));
{
    G.renderPowerMeter('p1', G.DRAGON_TYPE, { meter: 3, mirror: 0 });
    const dragonRow = document.getElementById('power-p1').innerHTML;
    G.renderPowerMeter('p1', 'red', { meter: METER.max, mirror: 0 });
    const redRow = strip(document.getElementById('power-p1').innerHTML);
    check(dragonRow === '' && redRow.includes(METER.short.en) && redRow.includes(METER.ready.en),
        `fighter card: the White Dragon's meter row stays empty; a full meter reads "${redRow}"`, `dragon row "${dragonRow}", red row "${redRow}"`);
}
check(seenUlt.size === ULTIMATE_IDS.length, `all ${ULTIMATE_IDS.length} ultimates fired in real fights (uk and en)`, `never fired: ${ULTIMATE_IDS.filter(id => !seenUlt.has(id)).join(', ')}`);
check(!idLeaks.length, 'no internal ultimate id in the battle log', idLeaks.join(' | '));

console.log(failures ? `\n${failures} ultimate check(s) failed.` : '\nAll ultimate checks passed.');
process.exit(failures ? 1 : 0);
