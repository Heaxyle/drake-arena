// The icon set's checks, in npm test (plain Node, no browser; the overlay itself is checked by tests/overlay_icons.js inside
// the browser tests). The set is the glyphs (design/icons/icons.js: sizes, names, colours, chips) and the V2 art the
// overlay draws (design/icons/v2/: each glyph four times denser, a still and an idle loop).
//   node design/icons/test.js [--file path/to/index.html]
// 1. Every glyph is its kind's size (iconRows throws otherwise), and every icon has a label in both languages.
// 2. The V2 set is the glyphs' set: every icon of icons.js and every rarity's title frame, each its glyph's size × the one
//    density, with the same kind and names. Every V2 image is its item's size; every loop is an APNG that loops forever,
//    with the manifest's frame count and frame time, and its first frame is the still.
// 3. The emblems differ in shape, not only in colour: every emblem is one tile (the same for every drake, colour aside) with
//    its element's symbol on it, and each symbol (which pixels inside the tile aren't the tile's) must differ from every
//    other's in at least MIN_DIFF pixels, so a greyscale or colour-blind viewer can tell them apart by shape.
// 4. The game page's copies (node design/icons/embed.js puts them there): design/icons/icons.js between its ICONS START /
//    END markers and the V2 set (design/icons/v2/) between its ICONS V2 START / END markers, both unchanged.
// 5. Every icon the game asks for exists, with its V2 still and loop: each pxIcon('…') in the page, each drake's emblem,
//    each effect's, ultimate's and attack type's icon, the medals, the reels, every title's badge glyph and rarity frame,
//    every icon in the overlay's icon lists.
// 6. The icon lists match their texts: FV_TEXT, TOURNEY_TEXT, SHOW_TEXT and METER.ready keep their emoji (the hidden text
//    record shows them); for each text drawn on the overlay its list names an icon (or none) for every emoji, in both languages.
// 7. Colour = element: every effect's and ultimate's colour is its element's (ELEMENT_COLORS), and the icons' names for them
//    are EFFECTS' / CLASS_ULTIMATES' own names.
// 8. Each title's badge shows what the inventory (inventory.md, section 5) decided: its mechanic, else its main bonus;
//    «Біла сталь» its sword.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const FILE = path.resolve(ROOT, args.includes('--file') ? args[args.indexOf('--file') + 1] : 'showcase/index.html');

require(path.join(__dirname, 'icons.js'));
const D = globalThis.DrakeIcons;
const { iconsBlock, pageBlock, v2Block, v2Manifest, V2_START, V2_END, V2_DIR } = require('./embed');
const png = require('./png');

const M = v2Manifest();
// The density: how many V2 art pixels a glyph pixel is, across and down (40 / 10); check 2 holds every item to it
const DENSITY = M.emRed.size / D.SIZES.emblem;
// Two emblems' symbols must differ in at least 4 glyph pixels: 4 × DENSITY² art pixels (64 at ×4)
const MIN_DIFF = 4 * DENSITY ** 2;
// The V2 emblem tile (40×40): its frame is the outer 6 art pixels at the top and left and 5 at the bottom and right (lit
// from the top left); inside it (TILE_IN) a dark fill holds a round disc, a shade lighter, where the symbol sits
const TILE_IN = { x0: 6, y0: 6, x1: 34, y1: 34 };
const RARITY_IDS = Object.keys(D.TITLE_FRAMES);
const read = file => fs.readFileSync(path.join(V2_DIR, file));
let failed = 0;
const fail = msg => { failed++; console.log('  ✗ ' + msg); };
const check = (ok, good, bad) => { if (ok) console.log('  ✓ ' + good); else fail(bad); };

// ---- 1. Sizes and labels
{
    const bad = [];
    for (const id of Object.keys(D.ICONS)) {
        try { D.iconRows(id); } catch (e) { bad.push(e.message); }
        const n = D.ICONS[id].name || {};
        if (!n.uk || !n.en) bad.push(`${id}: no label in ${!n.uk ? 'Ukrainian' : 'English'}`);
    }
    check(!bad.length, `${Object.keys(D.ICONS).length} icons: each its kind's size, each labelled in Ukrainian and English`, bad.join(' | '));
}

// ---- The game, in Node (the same stub page as the balance sims)
const html = fs.readFileSync(FILE, 'utf8');
const { gameScript, setupEnv } = require(path.join(ROOT, 'tests', 'game_env'));
setupEnv();
const _warn = console.warn, _err = console.error, errors = [];
console.warn = () => {};
console.error = (...a) => errors.push(a.join(' '));
eval(gameScript(FILE) + `
;globalThis.__game = { DI: DrakeIcons, EFFECTS, CLASS_ULTIMATES, ULTIMATE_IDS, DRAKE_TYPES, TITLES_DB, FV_TEXT, FV_ICONS, TOURNEY_TEXT, TOURNEY_ICONS,
    SHOW_TEXT, SHOW_ICONS, METER, EMBLEMS, MEDAL_ICONS, REEL_ICONS, EMOJI_RE, RARITIES, titleGlyph, ultimateFor, WHITE_DRAKE_TITLE_ID,
    setLang: l => { currentLang = l; } };`);
console.warn = _warn;
console.error = _err;
const G = globalThis.__game;
const GI = G.DI.ICONS;

// ---- 2. The V2 set and its files
{
    const glyphOf = id => id.startsWith('frame-') ? { kind: 'frame', n: D.TITLE_FRAMES[id.slice(6)].length, name: G.RARITIES[id.slice(6)].name }
        : { kind: D.ICONS[id].kind, n: D.iconRows(id).length, name: D.ICONS[id].name };
    const want = [...Object.keys(D.ICONS), ...RARITY_IDS.map(r => `frame-${r}`)];
    const bad = [], badFiles = [];
    const missing = want.filter(id => !M[id]), extra = Object.keys(M).filter(id => !want.includes(id));
    if (missing.length) bad.push(`not in design/icons/v2/manifest.json: ${missing.join(', ')}`);
    if (extra.length) bad.push(`in the manifest but not in the set (icons.js's icons, the rarities' frames): ${extra.join(', ')}`);
    for (const id of want.filter(id => M[id])) {
        const it = M[id], g = glyphOf(id);
        if (it.kind !== g.kind) bad.push(`${id}: a ${it.kind} in the manifest, a ${g.kind} in the set`);
        if (it.size !== g.n * DENSITY) bad.push(`${id}: ${it.size} px art for its ${g.n}×${g.n} glyph (×${DENSITY}: ${g.n * DENSITY})`);
        if (it.name.uk !== g.name.uk || it.name.en !== g.name.en) bad.push(`${id}: «${it.name.uk}» / "${it.name.en}" in the manifest, «${g.name.uk}» / "${g.name.en}" in the set`);
        // Where review.html looks for them (it can't read the manifest from a file: page)
        const at = g.kind === 'frame' ? `frames/${id}` : `icons/${g.kind}/${id}`;
        if (it.still !== `${at}.png` || it.anim !== `${at}-anim.png`) bad.push(`${id}: its files are ${it.still} and ${it.anim}, not ${at}.png and ${at}-anim.png`);
        try {
            const s = png.info(read(it.still)), a = png.info(read(it.anim));
            if (s.width !== it.size || s.height !== it.size) badFiles.push(`${it.still}: ${s.width}×${s.height}, not ${it.size}×${it.size}`);
            if (s.apng) badFiles.push(`${it.still}: animated (a still is one image)`);
            if (a.width !== it.size || a.height !== it.size) badFiles.push(`${it.anim}: ${a.width}×${a.height}, not ${it.size}×${it.size}`);
            if (!a.apng) { badFiles.push(`${it.anim}: not an APNG`); continue; }
            if (a.apng.plays !== 0) badFiles.push(`${it.anim}: plays ${a.apng.plays} time${a.apng.plays === 1 ? '' : 's'}, not forever`);
            if (a.apng.frames !== it.frames || a.apng.fctl.length !== it.frames) badFiles.push(`${it.anim}: ${a.apng.frames} frames (${a.apng.fctl.length} drawn), the manifest says ${it.frames}`);
            const off = [...new Set(a.apng.fctl.filter(f => Math.abs(f.ms - it.ms) > 0.5).map(f => f.ms))];
            if (off.length) badFiles.push(`${it.anim}: frames of ${off.join(', ')} ms, the manifest says ${it.ms}`);
            if (a.apng.fctl.some(f => f.x + f.width > a.width || f.y + f.height > a.height)) badFiles.push(`${it.anim}: a frame outside its ${a.width}×${a.height}`);
            if (!a.apng.firstFrameIsImage) badFiles.push(`${it.anim}: its first frame isn't its image`);
            else if (!png.decode(read(it.still)).data.equals(png.decode(read(it.anim)).data)) badFiles.push(`${it.still}: not the loop's first frame`);
        } catch (e) { badFiles.push(`${id}: ${e.message}`); }
    }
    const nIcons = Object.keys(D.ICONS).length;
    check(!bad.length, `the V2 set: ${Object.keys(M).length} items, icons.js's ${nIcons} icons and the ${RARITY_IDS.length} rarities' title frames, each its glyph × ${DENSITY} with the same kind and names`, bad.join(' | '));
    check(!badFiles.length, `every V2 still and loop is its item's size; every loop an APNG that loops forever, with the manifest's frame count and frame time, its first frame the still`, badFiles.slice(0, 8).join(' | '));
}

// ---- 3. Emblem symbols
{
    const ids = D.EMBLEM_IDS, bad = [];
    const E = ids.map(id => png.decode(read(M[id].still)));
    const W = E[0].width, H = E[0].height, at = (e, x, y) => e.data.readUInt32BE((y * W + x) * 4);
    if (E.some(e => e.width !== W || e.height !== H)) bad.push(`the emblems aren't all ${W}×${H}`);
    const inside = (x, y) => x >= TILE_IN.x0 && x <= TILE_IN.x1 && y >= TILE_IN.y0 && y <= TILE_IN.y1;
    // One tile: the frame (everything outside TILE_IN) is the same in every emblem, colour aside: two of its pixels share
    // a colour in one emblem exactly when they do in all of them
    const frameOf = e => { const seen = new Map(), out = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!inside(x, y)) { const c = at(e, x, y); if (!seen.has(c)) seen.set(c, seen.size); out.push(seen.get(c)); } return out.join(','); };
    const odd = ids.filter((id, i) => frameOf(E[i]) !== frameOf(E[0]));
    if (odd.length) bad.push(`not on ${ids[0]}'s tile (its frame differs): ${odd.join(', ')}`);
    // The fill: where most emblems show the colour of the inside's top-left corner (a symbol covers a little of it in some);
    // the disc is the rest of the inside, and its colour in an emblem is the one its rim shows most
    const IN = [];
    for (let y = TILE_IN.y0; y <= TILE_IN.y1; y++) for (let x = TILE_IN.x0; x <= TILE_IN.x1; x++) IN.push([x, y]);
    const fillColour = e => at(e, TILE_IN.x0, TILE_IN.y0);
    const fill = new Set(IN.filter(([x, y]) => E.filter(e => at(e, x, y) === fillColour(e)).length * 2 >= E.length).map(([x, y]) => y * W + x));
    const rim = IN.filter(([x, y]) => !fill.has(y * W + x) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => fill.has((y + dy) * W + x + dx)));
    const discColour = e => { const n = new Map(); rim.forEach(([x, y]) => n.set(at(e, x, y), (n.get(at(e, x, y)) || 0) + 1)); return [...n].sort((a, b) => b[1] - a[1])[0][0]; };
    // An emblem's symbol: the pixels inside the tile that aren't the tile's (colour ignored)
    const symbol = e => { const F = fillColour(e), C = discColour(e); return IN.map(([x, y]) => at(e, x, y) !== (fill.has(y * W + x) ? F : C)); };
    const S = E.map(symbol);
    let closest = null;
    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            const diff = S[i].filter((v, k) => v !== S[j][k]).length;
            if (!closest || diff < closest.diff) closest = { pair: `${ids[i]} / ${ids[j]}`, diff };
            if (diff < MIN_DIFF) bad.push(`emblems ${ids[i]} and ${ids[j]}: symbols differ in ${diff} pixel${diff === 1 ? '' : 's'} (at least ${MIN_DIFF})`);
        }
    }
    check(!bad.length, `emblem symbols: ${ids.length} emblems on one tile, closest pair ${closest.pair}, ${closest.diff} pixels apart (at least ${MIN_DIFF}: 4 glyph pixels at ×${DENSITY})`, bad.join(' | '));
}

// ---- 4. The page's copies
{
    const rel = path.relative(ROOT, FILE), copy = pageBlock(html), v2 = pageBlock(html, V2_START, V2_END);
    check(copy === iconsBlock(), `${rel} carries design/icons/icons.js between its ICONS markers, unchanged`,
        copy === null ? `${rel}: no ICONS START / END markers` : `${rel}: its icon block differs from design/icons/icons.js (run node design/icons/embed.js)`);
    check(v2 === v2Block(), `${rel} carries design/icons/v2/ (${Object.keys(M).length} items) between its ICONS V2 markers, unchanged`,
        v2 === null ? `${rel}: no ICONS V2 START / END markers` : `${rel}: its V2 block differs from design/icons/v2/ (run node design/icons/embed.js)`);
}

// ---- 5. Every icon the game asks for exists, with its V2 still and loop (check 2 holds those to their size)
{
    const asked = new Map();   // id → where
    const ask = (id, where) => { if (!asked.has(id)) asked.set(id, where); };
    const script = gameScript(FILE);
    for (const m of script.matchAll(/(?:pxIcon|fvNum)\('(\w+)'/g)) ask(m[1], 'pxIcon in the page');
    for (const m of script.matchAll(/\{ i: '(\w+)'/g)) ask(m[1], 'a compact chip');
    Object.keys(G.EFFECTS).forEach(id => ask(id, 'an effect'));
    G.ULTIMATE_IDS.forEach(id => ask(id, 'an ultimate'));
    ['physical', 'magical', 'vampire'].forEach(id => ask(id, 'an attack type'));
    G.DRAKE_TYPES.forEach(d => { if (!G.EMBLEMS[d.type]) ask(`(no emblem for ${d.type})`, 'a drake'); else ask(G.EMBLEMS[d.type], `${d.type}'s emblem`); });
    G.MEDAL_ICONS.forEach(id => ask(id, 'a medal'));
    G.REEL_ICONS.forEach(id => ask(id, "Jackpot's reels"));
    G.TITLES_DB.forEach(t => { ask(G.titleGlyph(t), `title ${t.id}'s badge`); ask(`frame-${t.rarity}`, `title ${t.id}'s frame`); });
    [G.FV_ICONS, G.TOURNEY_ICONS, G.SHOW_ICONS].forEach(list => Object.values(list).flat().filter(Boolean).forEach(id => ask(id, 'an icon list')));
    G.DRAKE_TYPES.forEach(d => { const u = G.ultimateFor(d.type); if (u) ask(u, `${d.type}'s «ГОТОВО»`); });
    // A frame is V2 art only; every other icon is a glyph (its size and names) and its V2 art
    const missing = [...asked].filter(([id]) => !M[id] || (!id.startsWith('frame-') && !GI[id])).map(([id, where]) => `${id} (${where}${M[id] ? ', no glyph' : GI[id] ? ', no V2 art' : ''})`);
    check(!missing.length && !errors.length, `every icon the game asks for exists, with its V2 still and loop (${asked.size} icons and frames)`, `missing: ${missing.concat(errors).join(', ')}`);
}

// ---- 6. Icon lists against their texts
{
    const count = t => (t.match(G.EMOJI_RE) || []).length;
    const bad = [];
    const lists = [['FV_TEXT', G.FV_TEXT, G.FV_ICONS], ['TOURNEY_TEXT', G.TOURNEY_TEXT, G.TOURNEY_ICONS], ['SHOW_TEXT', G.SHOW_TEXT, G.SHOW_ICONS]];
    for (const [name, text, icons] of lists) {
        for (const lang of ['uk', 'en']) for (const [key, t] of Object.entries(text[lang])) {
            if (typeof t !== 'string') continue;
            const n = count(t);
            if (icons[key] && icons[key].length !== n) bad.push(`${name}.${lang}.${key}: ${n} emoji, ${icons[key].length} listed`);
            if (!icons[key] && n) bad.push(`${name}.${lang}.${key}: ${n} emoji and no icon list (the overlay would drop them silently)`);
        }
        Object.keys(icons).forEach(k => { if (!(k in text.uk)) bad.push(`${name}: a list for "${k}", which isn't a text`); });
    }
    ['uk', 'en'].forEach(l => { if (count(G.METER.ready[l]) !== 1) bad.push(`METER.ready.${l}: one emoji expected (the ultimate's icon takes its place)`); });
    check(!bad.length, 'every overlay text with emoji has an icon (or none) listed for each of them, in both languages', bad.join(' | '));
}

// ---- 7. Colour = element; one name per effect and ultimate
{
    const bad = [];
    for (const [table, rows] of [['EFFECTS', G.EFFECTS], ['CLASS_ULTIMATES', G.CLASS_ULTIMATES]]) {
        for (const [id, e] of Object.entries(rows)) {
            if (e.color !== G.DI.ELEMENT_COLORS[e.element]) bad.push(`${table}.${id}: colour ${e.color}, its element ${e.element} is ${G.DI.ELEMENT_COLORS[e.element]}`);
            if (!GI[id]) continue;
            if (GI[id].name.uk !== e.name.uk || GI[id].name.en !== e.name.en) bad.push(`${id}: the icon is «${GI[id].name.uk}» / "${GI[id].name.en}", ${table} says «${e.name.uk}» / "${e.name.en}"`);
            if (GI[id].element !== e.element) bad.push(`${id}: the icon's element is ${GI[id].element}, ${table}'s ${e.element}`);
        }
    }
    check(!bad.length, "every effect's and ultimate's colour is its element's, and its icon carries its own names", bad.join(' | '));
}

// ---- 8. Title badges as the inventory decided
{
    const inv = fs.readFileSync(path.join(__dirname, 'inventory.md'), 'utf8');
    const WORD = { 'HP': 'hp', 'crit': 'crit', 'defence': 'defence', 'effect chance': 'effect', 'buff power': 'buffpower', 'guardian': 'guardian', 'pierce': 'pierce',
        'immune': 'immune', 'dodge': 'dodge', 'chaos': 'chaos', 'opening buff': 'opening', 'thorns': 'thorns', 'lifesteal': 'lifesteal', 'execute': 'execute',
        'coin flip': 'coin', 'sleep': 'sleep', 'cat': 'cat' };
    const want = {};
    for (const m of inv.matchAll(/^\| (\d+) \| \w+ \| [^|]+ \| [^|]+ \| [^|]+ \| (?:bonus|mechanic): ([a-zA-Z ]+?)(?: \(.*\))? \|$/gm)) want[m[1]] = WORD[m[2]];
    for (const m of inv.matchAll(/^\| (\d+) \| divine \| [^|]+ \| [^|]+ \| [^|]+ \| own icon/gm)) want[m[1]] = 'sovereign';
    want[G.WHITE_DRAKE_TITLE_ID] = 'whiteSteel';
    const bad = G.TITLES_DB.filter(t => want[t.id] !== G.titleGlyph(t)).map(t => `${t.id}: ${G.titleGlyph(t)}, the inventory says ${want[t.id]}`);
    check(!bad.length && Object.keys(want).length === G.TITLES_DB.length, `all ${G.TITLES_DB.length} titles' badges show what the inventory decided (mechanic, else main bonus)`, bad.slice(0, 6).join(' | ') || `${Object.keys(want).length} of ${G.TITLES_DB.length} titles found in inventory.md`);
}

if (failed) { console.log(`${failed} icon check${failed === 1 ? '' : 's'} failed`); process.exit(1); }
console.log('icon checks passed');
