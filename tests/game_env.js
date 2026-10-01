// Runs the game's inline <script> in Node: a stub page (getElementById returns fake elements, the battle log is
// collected in global.__LOG) and a timer queue that global.__drain() empties straight away, so a fight that takes
// minutes on stream finishes in milliseconds. Shared by balance.js and effects.js.
const fs = require('fs');
const path = require('path');

// Seeded RNG so runs are reproducible: same seed → same numbers
function mulberry32(a) {
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// The inline <script> of the game file
function gameScript(file) {
    const html = fs.readFileSync(path.resolve(file), 'utf8');
    const script = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
    if (!script) { console.error('No inline <script> found in ' + file); process.exit(1); }
    return script;
}

// Installs the stub page, storage and timers as globals. Call once, before evaluating the game script.
function setupEnv() {
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
}

module.exports = { mulberry32, gameScript, setupEnv };
