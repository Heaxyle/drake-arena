// The White Drake gate (npm run test:white-drake-gate, in CI): the streamer's White Drake against each viewer element at
// equal levels 1, 5, 10 and 20, with its fixed title (White Steel) against the viewers' real title odds, and with no title
// on either side. Fails (exit 1) unless, in the table with titles:
//   - each level's average is within AVG (52–57%)
//   - every matchup is within CELL (48–60%); a known counter (KNOWN_COUNTERS, below) may be up to COUNTER_SLACK points
//     outside instead, and nothing further
// The table without titles is printed, not checked.
//
// The 8 parts (each table at each level) run in parallel, one process each (tests/balance.js whitedrake), each on its own
// seed derived from --seed, so a run gives the same numbers on any machine. FIGHTS per matchup with titles is sized so
// that no seed can flip the result: the closest check sits about 4 standard errors inside its bound (TESTING.md,
// "The White Drake gate"). The table without titles only needs to be readable: PLAIN_FIGHTS.
//
// Options: --fights N (per matchup, with titles)   --plain-fights N   --seed S   --file path/to/index.html
//          --jobs N (processes at once)
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i === -1 ? def : args[i + 1]; };
const FILE = opt('--file', 'showcase/index.html');
const FIGHTS = Number(opt('--fights', 20000)), PLAIN_FIGHTS = Number(opt('--plain-fights', 3000));
const SEED = Number(opt('--seed', 12345));
const JOBS = Number(opt('--jobs', Math.max(1, Math.min(8, os.cpus().length))));
const AVG = [52, 57], CELL = [48, 60], COUNTER_SLACK = 2;
const LEVELS = [1, 5, 10, 20], MODES = ['titles', 'plain'];
// Known counters: matchups in the table with titles that sit on the edge of CELL because of how the two kits meet, not
// because the White Drake is too strong or too weak overall (see TESTING.md). Each may be up to COUNTER_SLACK points
// outside CELL instead. [level, element]
const KNOWN_COUNTERS = [
    [20, 'gold'],    // Gold's 1-HP hit (9% at level 20) slips past the bar and takes the White Drake to 1 HP
    [20, 'green'],   // Green's HP (+34% at level 20) makes the longest fights, and every Удар ковадла re-forges the bar
];

const PARTS = MODES.flatMap(mode => LEVELS.map(level => ({ mode, level })));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'white-drake-gate-'));
const run = (part, i) => new Promise(resolve => {
    const out = path.join(TMP, `part-${i}.json`);
    const p = spawn(process.execPath, [path.join(__dirname, 'balance.js'), 'whitedrake', String(part.mode === 'titles' ? FIGHTS : PLAIN_FIGHTS), `${part.mode}:${part.level}`,
        '--seed', String(SEED + i), '--json', out, '--file', FILE]);
    let log = '';
    p.stdout.on('data', d => log += d);
    p.stderr.on('data', d => log += d);
    p.on('close', code => resolve({ part, code, log, out }));
});
// Runs the parts JOBS at a time
async function pool() {
    const results = [];
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(JOBS, PARTS.length) }, async () => {
        while (next < PARTS.length) { const i = next++; results[i] = await run(PARTS[i], i); }
    }));
    return results;
}

(async () => {
    const t0 = Date.now();
    console.log(`White Drake gate: ${FIGHTS} fights per matchup with titles (${PLAIN_FIGHTS} without), seed ${SEED} (parts ${SEED}–${SEED + PARTS.length - 1}), ${FILE}`);
    const results = await pool();
    const broken = results.filter(r => r.code !== 0 || !fs.existsSync(r.out));
    if (broken.length) {
        broken.forEach(r => console.error(`\nPart ${r.part.mode} L${r.part.level} failed (exit ${r.code}):\n${r.log.slice(-2000)}`));
        process.exit(1);
    }
    const cells = { titles: {}, plain: {} };
    for (const r of results) Object.assign(cells[r.part.mode], JSON.parse(fs.readFileSync(r.out, 'utf8')).cells[r.part.mode]);
    fs.rmSync(TMP, { recursive: true, force: true });

    const types = Object.keys(cells.titles[LEVELS[0]]);
    const bad = [], counters = [], averages = {};
    for (const [mode, label] of [['titles', 'with titles (its White Steel against the roulette titles), gated'], ['plain', 'without titles, printed, not gated']]) {
        console.log(`\nWhite Drake against each element, ${label}: win %`);
        console.log('level ' + types.map(t => t.padStart(8)).join('') + '     avg');
        for (const lvl of LEVELS) {
            const row = types.map(t => cells[mode][lvl][t]);
            const avg = row.reduce((a, b) => a + b, 0) / row.length;
            console.log(`L${lvl}`.padEnd(6) + row.map(x => x.toFixed(1).padStart(8)).join('') + avg.toFixed(1).padStart(8));
            if (mode !== 'titles') continue;
            averages[lvl] = avg;
            if (avg < AVG[0] || avg > AVG[1]) bad.push(`level ${lvl}: the average ${avg.toFixed(1)}% is outside ${AVG[0]}–${AVG[1]}%`);
            types.forEach((t, i) => {
                const x = row[i], counter = KNOWN_COUNTERS.some(([l, e]) => l === lvl && e === t);
                const [lo, hi] = counter ? [CELL[0] - COUNTER_SLACK, CELL[1] + COUNTER_SLACK] : CELL;
                if (x < lo || x > hi) bad.push(`level ${lvl} vs ${t}: ${x.toFixed(1)}% is outside ${lo}–${hi}%${counter ? ' (a known counter, with its slack)' : ''}`);
                else if (counter && (x < CELL[0] || x > CELL[1])) counters.push(`level ${lvl} vs ${t} ${x.toFixed(1)}%`);
            });
        }
    }
    const secs = Math.round((Date.now() - t0) / 1000);
    if (bad.length) {
        console.error(`\nWhite Drake gate failed (${secs} s):\n  ` + bad.join('\n  '));
        process.exit(1);
    }
    console.log(`\nWhite Drake gate passed (${secs} s): every level's average within ${AVG[0]}–${AVG[1]}% ` +
        `(${LEVELS.map(l => `L${l} ${averages[l].toFixed(1)}`).join(', ')}), every matchup within ${CELL[0]}–${CELL[1]}%` +
        (counters.length ? ` but ${counters.length} known counter(s) within ${COUNTER_SLACK} points (${counters.join(', ')})` : '') + '.');
})().catch(e => { console.error(e); process.exit(1); });
