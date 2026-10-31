// The icon set's own checks (design only: not part of npm test yet). Plain Node, no browser.
//   node design/icons/test.js
// 1. Every glyph is its kind's size (iconRows throws otherwise).
// 2. The emblems differ in outline, not only in colour: each emblem's silhouette (which pixels are the drake and which are
//    the tile: the frame m, the fill s, the cut corners) must differ from every other emblem's in at least MIN_DIFF pixels,
//    so a greyscale or colour-blind viewer can tell them apart by shape.
const path = require('path');
require(path.join(__dirname, 'icons.js'));
const D = globalThis.DrakeIcons;

const MIN_DIFF = 4;
const TILE = new Set(['.', 'm', 's']);
let failed = 0;
const fail = msg => { failed++; console.log('FAIL ' + msg); };

for (const id of Object.keys(D.ICONS)) {
    try { D.iconRows(id); } catch (e) { fail(e.message); }
}

const silhouette = id => D.iconRows(id).join('').split('').map(c => TILE.has(c) ? 0 : 1);
const ids = D.EMBLEM_IDS;
let closest = null;
for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
        const a = silhouette(ids[i]), b = silhouette(ids[j]);
        const diff = a.filter((v, k) => v !== b[k]).length;
        if (!closest || diff < closest.diff) closest = { pair: `${ids[i]} / ${ids[j]}`, diff };
        if (diff < MIN_DIFF) fail(`emblems ${ids[i]} and ${ids[j]}: silhouettes differ in ${diff} pixel${diff === 1 ? '' : 's'} (at least ${MIN_DIFF})`);
    }
}
console.log(`emblem silhouettes: ${ids.length} emblems, closest pair ${closest.pair}, ${closest.diff} pixels apart (at least ${MIN_DIFF})`);
if (failed) { console.log(`${failed} check${failed === 1 ? '' : 's'} failed`); process.exit(1); }
console.log('icon checks passed');
