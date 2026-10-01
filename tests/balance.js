// Balance simulator: runs the real game code with a fake page and instant timers,
// so thousands of fights take seconds.
//
// Usage (from the project folder):
//   node tests/balance.js elements [N]        element vs element win rates at L1/10/20
//   node tests/balance.js matrix [N] [level]  full element matchup table
//   node tests/balance.js tiers [N]           each title rarity vs Common titles
//   node tests/balance.js bonuses [N]         every title bonus / ability vs Common
//   node tests/balance.js levels [N]          how much a level gap matters
//   node tests/balance.js rolls               title roulette drop rates
//   node tests/balance.js dragon [N]          the streamer's White Dragon must win every fight (exits non-zero otherwise)
// Add --file path/to/index.html to test a different file (default: showcase/index.html).
// Add --seed N to change the random seed (default 12345). Same seed → identical results.
// Add --json out.json to also write the matrix / tiers numbers as JSON (full precision).
// Add --bounds MIN,MAX (matrix only) to exit with an error if any matchup falls outside MIN–MAX %, e.g. --bounds 40,60.
const fs = require('fs');
const path = require('path');
const { mulberry32, gameScript, setupEnv } = require('./game_env');

const args = process.argv.slice(2);
let file = 'showcase/index.html';
const fi = args.indexOf('--file');
if (fi !== -1) { file = args[fi + 1]; args.splice(fi, 2); }
// Seeded RNG so runs are reproducible: same seed → same numbers, so a real balance change isn't hidden by noise
let seed = 12345;
const si = args.indexOf('--seed');
if (si !== -1) {
    seed = Number(args[si + 1]);
    if (!Number.isInteger(seed)) { console.error('--seed needs a whole number, e.g. --seed 42'); process.exit(1); }
    args.splice(si, 2);
}
// Machine-readable results (matrix, tiers): sim_harness.js writes full-precision numbers to this file. Used by balance_check.js.
const ji = args.indexOf('--json');
if (ji !== -1) { global.__JSON_OUT = path.resolve(args[ji + 1]); args.splice(ji, 2); }
// Balance gate: sim_harness.js reads global.__BOUNDS in the matrix scenario
const bi = args.indexOf('--bounds');
if (bi !== -1) {
    const b = String(args[bi + 1]).split(',').map(Number);
    if (b.length !== 2 || b.some(isNaN) || b[0] >= b[1]) { console.error('--bounds needs MIN,MAX in percent, e.g. --bounds 40,60'); process.exit(1); }
    global.__BOUNDS = b;
    args.splice(bi, 2);
}
Math.random = mulberry32(seed);
console.log(`seed: ${seed}`);
const [scenario = 'elements', n, extra] = args;
// sim_harness.js reads process.argv[4] / [5]
process.argv = [process.argv[0], process.argv[1], file, scenario, n, extra].filter(v => v !== undefined);

const script = gameScript(file);
setupEnv();
const _warn = console.warn; console.warn = () => {};

const harness = fs.readFileSync(path.join(__dirname, 'sim_harness.js'), 'utf8');
eval(script + '\n' + harness);
console.warn = _warn;
