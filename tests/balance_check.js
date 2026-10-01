// Pre-merge balance check: run before merging ANY balance change (npm run balance:check).
//
// Plays the element matrix at levels 1, 10 and 20 and the title-tier report, each on three seeds, averages the seeds
// and fails (exit 1) if:
//   - any element matchup, at any of the three levels, is outside 45–57%
//   - any rarity in the ladder Common < Uncommon < Rare < Epic < Legendary < Mythic doesn't beat the one below it
//     (its win rate against Common titles must be at least MIN_GAP points higher), at any of the three levels.
//     Meme is printed but not part of the ladder: it's the chaotic joke tier, not a strength tier.
// The runs go in parallel (one process each), so it takes a couple of minutes on a multi-core machine.
//
// Options: --file path/to/index.html   --seeds 12345,42,777   --fights 1500 (per matchup)   --tier-fights 2000 (per rarity
//          and level)   --bounds 45,57   --min-gap 1   --skip-tiers / --skip-elements (one half only, for quick tuning runs)
const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i === -1 ? def : args[i + 1]; };
const FILE = opt('--file', 'showcase/index.html');
const SEEDS = opt('--seeds', '12345,42,777').split(',').map(Number);
const FIGHTS = Number(opt('--fights', 1500));
const TIER_FIGHTS = Number(opt('--tier-fights', 2000));
const [LO, HI] = opt('--bounds', '45,57').split(',').map(Number);
const MIN_GAP = Number(opt('--min-gap', 1));
// Known counters: element pairings at a level that sit just outside LO–HI because of how the two kits interact (see
// TESTING.md, "Known counters"). Each may be up to COUNTER_SLACK points outside instead; anything further still fails,
// and every other cell must stay inside LO–HI. [level, element, element]: a pairing, so it covers both cells of the matrix
// (A vs B and B vs A are the same matchup measured from each side). --no-counters checks them strictly.
const KNOWN_COUNTERS = [
    [10, 'blue', 'green'],   // Bloom's heal outlasts Blue, the lowest-damage element
    [20, 'blue', 'green'],
    [10, 'black', 'red'],    // Firestorm can't be blocked, which is Black's main defence
    [20, 'purple', 'blue'],  // Ice Mirror blunts Purple's burst hits (Divine Might, Arcane Detonation)
    [20, 'green', 'gold'],   // Gold's 1-HP proc takes a share of Green's large HP pool
];
const COUNTER_SLACK = 2;
const SKIP_TIERS = args.includes('--skip-tiers');
const NO_COUNTERS = args.includes('--no-counters');
const SKIP_ELEMENTS = args.includes('--skip-elements');
const LEVELS = [1, 10, 20];
const LADDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
const TYPES = ['red', 'blue', 'black', 'gold', 'purple', 'green'];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drake-balance-'));
const balance = path.join(__dirname, 'balance.js');

// Runs one balance.js job and resolves with its JSON results
const run = (scenario, seed, extra) => () => new Promise((resolve, reject) => {
    const out = path.join(tmp, `${scenario}-${extra.join('-')}-${seed}.json`);
    const p = spawn(process.execPath, [balance, scenario, ...extra, '--seed', String(seed), '--file', FILE, '--json', out]);
    let err = '';
    p.stdout.resume();
    p.stderr.on('data', d => err += d);
    p.on('close', code => {
        if (code !== 0 || !fs.existsSync(out)) return reject(new Error(`${scenario} ${extra.join(' ')} seed ${seed} failed (exit ${code}): ${err.slice(0, 400)}`));
        resolve(JSON.parse(fs.readFileSync(out, 'utf8')));
    });
});
// A small pool so a machine with few cores isn't swamped
async function pool(jobs, size) {
    const results = new Array(jobs.length);
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(size, jobs.length) }, async () => {
        while (next < jobs.length) { const i = next++; results[i] = await jobs[i](); }
    }));
    return results;
}

(async () => {
    const t0 = Date.now();
    console.log(`Balance check: ${FILE}, seeds ${SEEDS.join(', ')}, ${FIGHTS} fights per matchup, ${TIER_FIGHTS} per rarity and level`);
    const matrixJobs = [], tierJobs = [];
    for (const seed of SEEDS) {
        if (!SKIP_ELEMENTS) for (const lvl of LEVELS) matrixJobs.push(run('matrix', seed, [String(FIGHTS), String(lvl)]));
        if (!SKIP_TIERS) tierJobs.push(run('tiers', seed, [String(TIER_FIGHTS)]));
    }
    const results = await pool([...matrixJobs, ...tierJobs], Math.max(1, os.cpus().length - 1));
    const matrices = results.slice(0, matrixJobs.length), tiers = results.slice(matrixJobs.length);
    const problems = [], counters = [];
    const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

    for (const lvl of SKIP_ELEMENTS ? [] : LEVELS) {
        const runs = matrices.filter(m => m.level === lvl);
        console.log(`\nElements, level ${lvl} (row beats column, average of ${runs.length} seeds; ! = outside ${LO}–${HI}%, ~ = known counter within ${COUNTER_SLACK} points, per-seed values listed at the end)`);
        console.log('        ' + TYPES.map(t => t.padStart(7)).join(''));
        for (const x of TYPES) {
            let row = x.padEnd(8);
            for (const y of TYPES) {
                if (x === y) { row += '      -'; continue; }
                const v = runs.map(m => m.matrix[x][y]), a = avg(v);
                const counter = !NO_COUNTERS && KNOWN_COUNTERS.some(([l, p, q]) => l === lvl && ((p === x && q === y) || (p === y && q === x)));
                const outside = a < LO || a > HI;
                const bad = outside && !(counter && a >= LO - COUNTER_SLACK && a <= HI + COUNTER_SLACK);
                if (bad) problems.push(`L${lvl} ${x} vs ${y}: ${a.toFixed(1)}% (seeds ${v.map(n => n.toFixed(1)).join(' / ')})${counter ? ` — a known counter, but more than ${COUNTER_SLACK} points outside` : ''}`);
                else if (outside) counters.push(`L${lvl} ${x} vs ${y}: ${a.toFixed(1)}% (known counter, within ${COUNTER_SLACK} points)`);
                row += ((bad ? '!' : outside ? '~' : '') + a.toFixed(1)).padStart(7);
            }
            console.log(row);
        }
    }

    if (tiers.length) {
        console.log(`\nTitle rarities vs Common titles (average of ${tiers.length} seeds). Ladder must rise by ≥ ${MIN_GAP} point(s) per step:`);
        console.log('       ' + [...LADDER, 'meme'].map(t => t.padStart(10)).join(''));
    }
    for (const lvl of tiers.length ? LEVELS : []) {
        const val = t => avg(tiers.map(r => r.tiers[lvl][t]));
        console.log(`L${String(lvl).padEnd(5)}` + [...LADDER, 'meme'].map(t => val(t).toFixed(1).padStart(10)).join(''));
        for (let i = 1; i < LADDER.length; i++) {
            const gap = val(LADDER[i]) - val(LADDER[i - 1]);
            if (gap < MIN_GAP) problems.push(`L${lvl} ${LADDER[i]} ${val(LADDER[i]).toFixed(1)}% vs ${LADDER[i - 1]} ${val(LADDER[i - 1]).toFixed(1)}%: gap ${gap.toFixed(1)} < ${MIN_GAP}`);
        }
    }

    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    if (problems.length) {
        console.error(`\nBalance check FAILED (${problems.length}):\n  ` + problems.join('\n  '));
        process.exit(1);
    }
    if (counters.length) console.log(`\nKnown counters (allowed ${COUNTER_SLACK} points outside ${LO}–${HI}%):\n  ` + counters.join('\n  '));
    console.log(`\nBalance check passed: every matchup at levels ${LEVELS.join('/')} within ${LO}–${HI}%` +
        (counters.length ? ` (${counters.length} known counter(s) within ${COUNTER_SLACK} points)` : '') + `, every rarity beats the one below it by ≥ ${MIN_GAP}.`);
})().catch(e => { console.error(e); process.exit(1); });
