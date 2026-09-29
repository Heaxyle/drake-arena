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
// Add --file path/to/index.html to test a different file (default: showcase/index.html).
// Add --seed N to change the random seed (default 12345). Same seed → identical results.
// Add --bounds MIN,MAX (matrix only) to exit with an error if any matchup falls outside MIN–MAX %, e.g. --bounds 40,60.
const fs = require('fs');
const path = require('path');

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
// Balance gate: sim_harness.js reads global.__BOUNDS in the matrix scenario
const bi = args.indexOf('--bounds');
if (bi !== -1) {
    const b = String(args[bi + 1]).split(',').map(Number);
    if (b.length !== 2 || b.some(isNaN) || b[0] >= b[1]) { console.error('--bounds needs MIN,MAX in percent, e.g. --bounds 40,60'); process.exit(1); }
    global.__BOUNDS = b;
    args.splice(bi, 2);
}
function mulberry32(a) {
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
Math.random = mulberry32(seed);
console.log(`seed: ${seed}`);
const [scenario = 'elements', n, extra] = args;
// sim_harness.js reads process.argv[4] / [5]
process.argv = [process.argv[0], process.argv[1], file, scenario, n, extra].filter(v => v !== undefined);

const html = fs.readFileSync(path.resolve(file), 'utf8');
const script = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
if (!script) { console.error('No inline <script> found in ' + file); process.exit(1); }

const noop = () => {};
const mkEl = () => ({ style: {}, innerHTML: '', innerText: '', children: [], classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild(c) { this.children.push(c); if (this.children.length > 50) this.children.shift(); global.__LOG.push(c.innerHTML || ''); },
    prepend(c) { this.children.unshift(c); global.__LOG.push(c.innerHTML || ''); }, removeChild() { this.children.shift(); }, remove: noop,
    querySelector: () => null, querySelectorAll: () => [], setAttribute: noop, removeAttribute: noop,
    get firstChild() { return this.children[0]; }, get lastChild() { return this.children[this.children.length - 1]; } });
const els = {};
global.__LOG = [];
global.document = { getElementById: id => els[id] || (els[id] = mkEl()), createElement: () => mkEl(), addEventListener: noop, querySelectorAll: () => [] };
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
global.window = global;
global.tmi = undefined;
global.location = { search: '' };
let q = [], iv = [];
global.setTimeout = f => { q.push(f); return 0; };
global.clearTimeout = noop;
global.setInterval = f => { const o = { f, on: true }; iv.push(o); return o; };
global.clearInterval = o => { if (o) o.on = false; };
global.__drain = () => { for (let i = 0; i < 100000; i++) { if (q.length) q.shift()(); else { const a = iv.find(o => o.on); if (!a) break; a.f(); } } iv = iv.filter(o => o.on); };
const _warn = console.warn; console.warn = () => {};

const harness = fs.readFileSync(path.join(__dirname, 'sim_harness.js'), 'utf8');
eval(script + '\n' + harness);
console.warn = _warn;
