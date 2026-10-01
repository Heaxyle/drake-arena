
// ---- appended to the game script ----
const __xpFor = lvl => { let x = 0; for (let l = 1; l < lvl; l++) x += getRequiredXP(l); return x; };
// Viewer elements only: the streamer's White Dragon (DRAGON_TYPE) is a one-shot god mode and is never balanced against.
const __TYPES = VIEWER_DRAKE_TYPES.map(d => d.type);
const __NEUTRAL = { id: 0, name: 'neutral', icon: '', color: '#fff', rarity: 'none', bonus: { type: 'none', value: 0 } };
const __stripe = s => s.replace(/<[^>]+>/g, '');
// Per-effect numbers: the game adds to effectTally (lands, damage added, damage prevented, HP healed, buffs removed)
effectTally = {};
ultimateTally = {};
let __fights = 0;

// How often each effect lands per fight and what it does, averaged over every fight played so far
function __effectReport() {
    const f = Math.max(1, __fights), n = x => (x / f).toFixed(1).padStart(8), per = (x, l) => (l ? x / l : 0).toFixed(1).padStart(8);
    console.log(`\nEffects, per fight (${__fights} fights): lands = casts that took hold (refreshes count, immunity doesn't);`);
    console.log('+dmg = extra damage dealt, prevented = damage avoided, healed = HP restored; "each" = per landing.');
    console.log('effect'.padEnd(26) + 'kind'.padEnd(8) + 'lands'.padStart(8) + '+dmg'.padStart(8) + 'prevent'.padStart(8) + 'healed'.padStart(8) + '  each:' + '+dmg'.padStart(7) + 'prevent'.padStart(8) + 'healed'.padStart(8) + '  note');
    for (const id of EFFECT_IDS) {
        const e = EFFECTS[id], t = effectTally[id] || { lands: 0, dmg: 0, prevented: 0, healed: 0, removed: 0 };
        const note = { rage: 'prevent < 0: extra damage the raging drake takes', frost: 'prevent: estimated from the frozen drake\'s average hit',
            poison: 'prevent: healing it blocked', dispel: `${per(t.removed, t.lands).trim()} buffs removed each` }[id] || '';
        console.log(`${e.icon} ${e.name.en}`.padEnd(25) + e.kind.padEnd(8) + n(t.lands) + n(t.dmg) + n(t.prevented) + n(t.healed) + '      ' +
            per(t.dmg, t.lands).slice(1) + per(t.prevented, t.lands) + per(t.healed, t.lands) + '  ' + note);
    }
    // Ultimates: per fight = per fighter of that element (a red-vs-red fight counts twice); per use = per firing
    console.log(`\nUltimates: fires = per fight with a drake of that element; per use: +dmg = damage it dealt (Ice Mirror: what it sent back),`);
    console.log('prevent = damage it stopped, healed = HP restored; final blow = share of uses that killed the opponent.');
    console.log('ultimate'.padEnd(26) + 'fires'.padStart(8) + '  per use:' + '+dmg'.padStart(7) + 'prevent'.padStart(8) + 'healed'.padStart(8) + 'final blow'.padStart(12));
    for (const id of ULTIMATE_IDS) {
        const u = CLASS_ULTIMATES[id], t = ultimateTally[id] || { fires: 0, dmg: 0, prevented: 0, healed: 0, kills: 0 };
        const fights = __elementFights[u.element] || 0;
        console.log(`${u.icon} ${u.name.en}`.padEnd(25) + (fights ? t.fires / fights : 0).toFixed(2).padStart(8) + '          ' +
            per(t.dmg, t.fires).slice(1) + per(t.prevented, t.fires) + per(t.healed, t.fires) + ((t.fires ? 100 * t.kills / t.fires : 0).toFixed(1) + '%').padStart(12));
    }
    console.log(`Average fight length: ${(__turnsTotal / Math.max(1, __fights)).toFixed(1)} turns`);
}
const __elementFights = {};
let __turnsTotal = 0;

function __fight(a, b) {
    const db = getDragonDB();
    db.A = { name: 'A', color: '#fff', drakeObj: DRAKE_TYPES.find(d => d.type === a.type) || { name: 'Plain', type: a.type }, title: a.title, xp: __xpFor(a.level), level: a.level };
    db.B = { name: 'B', color: '#fff', drakeObj: DRAKE_TYPES.find(d => d.type === b.type) || { name: 'Plain', type: b.type }, title: b.title, xp: __xpFor(b.level), level: b.level };
    saveDragonDB(db);
    const start = __LOG.length;
    isBattleRunning = true;
    runBattle('A', '#fff', 'B', '#fff', false);
    __drain();
    __fights++;
    for (const t of [a.type, b.type]) __elementFights[t] = (__elementFights[t] || 0) + 1;
    const lines = __LOG.slice(start).map(__stripe);
    if (__LOG.length > 20000) __LOG.length = 0;
    const err = lines.find(l => /помилка симуляції|simulation error/i.test(l));
    if (err) throw new Error('battle error: ' + err);
    const turns = lines.filter(l => l.startsWith('[Хід') || l.startsWith('[Turn')).length;
    __turnsTotal += turns;
    const end = lines.find(l => /Переміг|Переможець|нічиєю|Winner|Draw between/.test(l)) || '';
    const winner = /(Переміг|Переможець|Winner):? @A\b/.test(end) ? 'A' : /(Переміг|Переможець|Winner):? @B\b/.test(end) ? 'B' : 'draw';
    return { winner, turns, timeout: lines.some(l => /Час вийшов|Time out/.test(l)) };
}
const __rand = arr => arr[Math.floor(Math.random() * arr.length)];
const __pct = x => (100 * x).toFixed(1) + '%';
// --json: write results for tests/balance_check.js
const __writeJson = obj => { if (global.__JSON_OUT) require('fs').writeFileSync(global.__JSON_OUT, JSON.stringify(obj)); };

function __tierList() {
    const tiers = {};
    TITLES_DB.filter(t => t.id !== 999).forEach(t => (tiers[t.rarity] = tiers[t.rarity] || []).push(t));
    return tiers;
}

if (scenario === 'elements') {
    const N = +(process.argv[4] || 300);
    for (const lvl of [1, 10, 20]) {
        const wins = {}; __TYPES.forEach(t => wins[t] = [0, 0]);
        let turns = 0, fights = 0, timeouts = 0;
        for (const x of __TYPES) for (const y of __TYPES) { if (x === y) continue;
            for (let i = 0; i < N; i++) {
                const r = __fight({ type: x, level: lvl, title: __NEUTRAL }, { type: y, level: lvl, title: __NEUTRAL });
                wins[x][1]++; if (r.winner === 'A') wins[x][0]++; else if (r.winner === 'draw') wins[x][0] += 0.5;
                turns += r.turns; fights++; if (r.timeout) timeouts++;
            } }
        console.log(`Level ${lvl}: ` + __TYPES.map(t => `${t} ${__pct(wins[t][0] / wins[t][1])}`).join(' | ') + ` | avg turns ${(turns / fights).toFixed(1)} | timeouts ${__pct(timeouts / fights)}`);
    }
    __effectReport();
}

if (scenario === 'tiers') {
    const N = +(process.argv[4] || 2000);
    const tiers = __tierList();
    const base = tiers[process.argv[5] || 'common'];
    const __tierOut = {};
    console.log('tier sizes:', Object.entries(tiers).map(([k, v]) => `${k}:${v.length}`).join(' '));
    for (const lvl of [1, 10, 20]) {
        const row = [];
        for (const [tier, list] of Object.entries(tiers)) {
            let w = 0;
            for (let i = 0; i < N; i++) {
                const r = __fight({ type: __rand(__TYPES), level: lvl, title: __rand(list) }, { type: __rand(__TYPES), level: lvl, title: __rand(base) });
                if (r.winner === 'A') w++; else if (r.winner === 'draw') w += 0.5;
            }
            row.push(`${tier} ${__pct(w / N)}`);
            (__tierOut[lvl] = __tierOut[lvl] || {})[tier] = 100 * w / N;
        }
        console.log(`L${lvl} vs ${process.argv[5] || 'common'}: ` + row.join(' | '));
    }
    __writeJson({ scenario: 'tiers', fights: N, tiers: __tierOut });
}

if (scenario === 'bonuses') {
    // every distinct bonus/mechanic vs the common pool, mixed levels
    const N = +(process.argv[4] || 1500);
    const tiers = __tierList();
    const base = tiers.common;
    const groups = {};
    TITLES_DB.filter(t => t.id !== 999).forEach(t => {
        const key = t.rarity + ':' + (t.bonus.mechanic || JSON.stringify(t.bonus.stats || t.bonus.value));
        (groups[key] = groups[key] || []).push(t);
    });
    for (const [key, list] of Object.entries(groups)) {
        let w = 0;
        for (let i = 0; i < N; i++) {
            const lvl = __rand([1, 5, 10, 15, 20]);
            const r = __fight({ type: __rand(__TYPES), level: lvl, title: __rand(list) }, { type: __rand(__TYPES), level: lvl, title: __rand(base) });
            if (r.winner === 'A') w++; else if (r.winner === 'draw') w += 0.5;
        }
        console.log(key.padEnd(46), __pct(w / N));
    }
}

if (scenario === 'levels') {
    const N = +(process.argv[4] || 1500);
    const base = __tierList().common;
    for (const [a, b] of [[2, 1], [5, 1], [10, 5], [20, 15], [20, 10], [20, 1]]) {
        let w = 0;
        for (let i = 0; i < N; i++) {
            const r = __fight({ type: __rand(__TYPES), level: a, title: __rand(base) }, { type: __rand(__TYPES), level: b, title: __rand(base) });
            if (r.winner === 'A') w++; else if (r.winner === 'draw') w += 0.5;
        }
        console.log(`L${a} vs L${b}: higher level wins ${__pct(w / N)}`);
    }
}

if (scenario === 'rolls') {
    const counts = {}; const N = 200000;
    for (let i = 0; i < N; i++) { const t = getRandomTitle(); counts[t.rarity] = (counts[t.rarity] || 0) + 1; }
    console.log(Object.entries(counts).map(([k, v]) => `${k} ${__pct(v / N)}`).join(' | '));
}

if (scenario === 'matrix') {
    const N = +(process.argv[4] || 400), lvl = +(process.argv[5] || 20);
    const outOfBounds = [], __cells = {};
    console.log('row beats column, level ' + lvl);
    console.log('       ' + __TYPES.map(t => t.padStart(7)).join(''));
    for (const x of __TYPES) {
        let row = x.padEnd(7);
        for (const y of __TYPES) {
            if (x === y) { row += '     - '; continue; }
            let w = 0; for (let i = 0; i < N; i++) { const r = __fight({ type: x, level: lvl, title: __NEUTRAL }, { type: y, level: lvl, title: __NEUTRAL }); if (r.winner === 'A') w++; else if (r.winner === 'draw') w += .5; }
            const pct = 100 * w / N;
            (__cells[x] = __cells[x] || {})[y] = pct;
            if (global.__BOUNDS && (pct < __BOUNDS[0] || pct > __BOUNDS[1])) outOfBounds.push(`${x} vs ${y}: ${pct.toFixed(1)}%`);
            row += pct.toFixed(0).padStart(6) + '%';
        }
        console.log(row);
    }
    __effectReport();
    __writeJson({ scenario: 'matrix', fights: N, level: lvl, matrix: __cells, effects: effectTally, totalFights: __fights });
    if (global.__BOUNDS) {
        if (outOfBounds.length) {
            console.error(`\n${outOfBounds.length} matchup(s) outside ${__BOUNDS[0]}–${__BOUNDS[1]}%:\n  ` + outOfBounds.join('\n  '));
            process.exitCode = 1;
        } else console.log(`\nAll matchups within ${__BOUNDS[0]}–${__BOUNDS[1]}%.`);
    }
}

if (scenario === 'vsplain') {
    const N = +(process.argv[4] || 1500);
    for (const lvl of [1, 10, 20]) {
        console.log(`L${lvl} vs plain: ` + __TYPES.map(x => { let w = 0; for (let i = 0; i < N; i++) { const r = __fight({ type: x, level: lvl, title: __NEUTRAL }, { type: 'plain', level: lvl, title: __NEUTRAL }); if (r.winner === 'A') w++; else if (r.winner === 'draw') w += .5; } return x + ' ' + __pct(w / N); }).join(' | '));
    }
}

if (scenario === 'sweep') {
    const N = +(process.argv[4] || 2500);
    const base = __tierList().common;
    const configs = JSON.parse(process.argv[5]);
    for (const bonus of configs) {
        const title = { id: -1, name: 'x', rarity: 'x', bonus };
        let w = 0;
        for (let i = 0; i < N; i++) {
            const lvl = __rand([1, 5, 10, 15, 20]);
            const r = __fight({ type: __rand(__TYPES), level: lvl, title }, { type: __rand(__TYPES), level: lvl, title: __rand(base) });
            if (r.winner === 'A') w++; else if (r.winner === 'draw') w += 0.5;
        }
        console.log(JSON.stringify(bonus).padEnd(52), __pct(w / N));
    }
}

// The streamer's White Dragon is deliberately unbeatable: it must win every fight against every viewer element,
// whatever title and level the viewer has. Fails (non-zero exit) if it ever loses, draws or a fight crashes.
if (scenario === 'dragon') {
    const N = +(process.argv[4] || 100);
    const dragonTitle = TITLES_DB.find(t => t.id === DRAGON_TITLE_ID);
    const titles = TITLES_DB.filter(t => t.id !== DRAGON_TITLE_ID);
    const bad = [];
    for (const x of __TYPES) {
        let w = 0;
        for (let i = 0; i < N; i++) {
            const r = __fight({ type: DRAGON_TYPE, level: 20, title: dragonTitle }, { type: x, level: __rand([1, 10, 20]), title: __rand(titles) });
            if (r.winner === 'A') w++;
        }
        if (w < N) bad.push(`${x}: dragon won ${w}/${N}`);
        console.log(`White Dragon vs ${x}: ${__pct(w / N)}`);
    }
    if (bad.length) { console.error('White Dragon should win every fight: ' + bad.join(', ')); process.exit(1); }
}
