// The biggest-hit report (npm run balance:bighit): per element, the 99th percentile of the biggest single hit per fight, at levels
// 1, 10 and 20, every matchup, no titles. A spike looks overpowered on stream even when the win rates are fair, so it flags any of
// Season 2's elements more than LIMIT above the highest of the six older ones at that level, and exits 1 if there is one.
//
// Each level and seed runs in its own process (tests/balance.js bighit), so a run gives the same numbers on any machine.
//
// Options: --file path/to/index.html   --fights N (per pairing and seed)   --seeds 12345,42,777   --limit 15
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i === -1 ? def : args[i + 1]; };
const FILE = opt('--file', 'showcase/index.html');
const FIGHTS = Number(opt('--fights', 300));
const SEEDS = opt('--seeds', '12345,42,777').split(',').map(Number);
const LIMIT = Number(opt('--limit', 15));
const LEVELS = [1, 10, 20];
const OLD = ['red', 'blue', 'black', 'gold', 'purple', 'green'];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drake-bighit-'));
const run = (level, seed) => () => new Promise((resolve, reject) => {
    const out = path.join(tmp, `${level}-${seed}.json`);
    const p = spawn(process.execPath, [path.join(__dirname, 'balance.js'), 'bighit', String(FIGHTS), String(level), '--seed', String(seed), '--file', FILE, '--json', out]);
    let err = '';
    p.stdout.resume();
    p.stderr.on('data', d => err += d);
    p.on('close', code => code || !fs.existsSync(out) ? reject(new Error(`level ${level} seed ${seed}: exit ${code}: ${err.slice(0, 300)}`)) : resolve(JSON.parse(fs.readFileSync(out, 'utf8'))));
});

(async () => {
    const t0 = Date.now();
    console.log(`Biggest hit per fight, 99th percentile: ${FILE}, ${FIGHTS} fights per pairing on seeds ${SEEDS.join(', ')}, no titles`);
    const results = await Promise.all(LEVELS.flatMap(l => SEEDS.map(s => run(l, s)())));
    fs.rmSync(tmp, { recursive: true, force: true });
    // Every seed's hits together, then the percentile
    const hits = {};
    for (const r of results) for (const [t, list] of Object.entries(r.hits)) ((hits[r.level] = hits[r.level] || {})[t] = hits[r.level][t] || []).push(...list);
    const p99 = list => { const a = [...list].sort((x, y) => x - y); return a[Math.floor(0.99 * (a.length - 1))]; };
    const types = Object.keys(hits[LEVELS[0]]);
    console.log('\nelement   ' + LEVELS.map(l => `L${l}`.padStart(8)).join(''));
    const top = {}, flags = [];
    for (const l of LEVELS) top[l] = Math.max(...OLD.map(t => p99(hits[l][t])));
    for (const t of types) {
        const cells = LEVELS.map(l => {
            const v = p99(hits[l][t]), over = !OLD.includes(t) && v > top[l] * (1 + LIMIT / 100);
            if (over) flags.push(`L${l} ${t}: ${v}, ${(100 * (v / top[l] - 1)).toFixed(0)}% above the highest of the six (${top[l]})`);
            return ((over ? '!' : '') + v).padStart(8);
        });
        console.log(t.padEnd(10) + cells.join(''));
    }
    console.log(`\nThe six's highest: ${LEVELS.map(l => `L${l} ${top[l]}`).join(', ')}; a new element is flagged above ${LEVELS.map(l => Math.floor(top[l] * (1 + LIMIT / 100))).join(' / ')}`);
    console.log(`(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    if (flags.length) { console.error(`\nFlagged (${flags.length}):\n  ` + flags.join('\n  ')); process.exit(1); }
    console.log('\nNo new element is more than ' + LIMIT + '% above the highest of the six.');
})().catch(e => { console.error(e); process.exit(1); });
