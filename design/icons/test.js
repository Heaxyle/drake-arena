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
// 8. Each title's badge shows what the inventory (inventory.md, section 5) decided: its own icon (a row's "own icon: <id>"), else
//    its mechanic, else its main bonus. A title's own icon (an ICONS record with `title`) names a title that exists, at most
//    one per title; no other title's badge shows it; it's kind note and carries the title's names in both languages.
// 9. The notes a title's ability fires, on real cards (fvCardHtml) in both languages: the fighter whose title fired the note
//    gets the title's own icon, in the full chip and the compact one, with the ability's words (194: «баг» / "bug"); the pair
//    title's holder gets the ability's glyph, whatever the other fighter holds. A sneaky attack keeps the spear, 97's holder's
//    too; the White Dragon's immunity keeps the immune glyph; the opening banner shows the title's badge. The notes of the
//    abilities of titles 205–294 show the badge of the title that fired them, with the ability's words: a stand-in keeps
//    its words when compact, an own icon (lent to the title here) shows the icon and the number, with no code change; two
//    stand-ins on a card stay apart; «404», «…», «:(» and «AFK» on line 1; the accusative after a verb.
// 10. The Top: each row's title in its rarity's colour, its badge in its rarity frame (the browser tests check that rows fit).
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
    SHOW_TEXT, SHOW_ICONS, METER, EMBLEMS, MEDAL_ICONS, REEL_ICONS, EMOJI_RE, RARITIES, titleGlyph, ultimateFor, fvCardHtml, fvBannerHtml, renderLeaderboard,
    getDragonDB, saveDragonDB, setLang: l => { currentLang = l; } };`);
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
    for (const m of script.matchAll(/(?:pxIcon|fvNum|fvNoteGlyph|fvTitleNote)\('(\w+)'/g)) ask(m[1], 'pxIcon in the page');
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

// ---- 8. Title badges as the inventory decided; the titles' own icons
{
    const inv = fs.readFileSync(path.join(__dirname, 'inventory.md'), 'utf8');
    const WORD = { 'HP': 'hp', 'crit': 'crit', 'defence': 'defence', 'effect chance': 'effect', 'buff power': 'buffpower', 'guardian': 'guardian', 'pierce': 'pierce',
        'immune': 'immune', 'dodge': 'dodge', 'chaos': 'chaos', 'opening buff': 'opening', 'thorns': 'thorns', 'lifesteal': 'lifesteal', 'execute': 'execute',
        'coin flip': 'coin', 'sleep': 'sleep', 'cat': 'cat', 'sovereign': 'sovereign' };
    const want = {};
    for (const m of inv.matchAll(/^\| (\d+) \| \w+ \| [^|]+ \| [^|]+ \| [^|]+ \| (?:bonus|mechanic): ([a-zA-Z ]+?)(?: \(.*\))? \|$/gm)) want[m[1]] = WORD[m[2]];
    const ownRows = [...inv.matchAll(/^\| (\d+) \| \w+ \| [^|]+ \| [^|]+ \| [^|]+ \| own icon: (\w+) \(.+\) \|$/gm)];
    for (const m of ownRows) want[m[1]] = m[2];
    const bad = G.TITLES_DB.filter(t => want[t.id] !== G.titleGlyph(t)).map(t => `${t.id}: ${G.titleGlyph(t)}, the inventory says ${want[t.id]}`);
    check(!bad.length && Object.keys(want).length === G.TITLES_DB.length, `all ${G.TITLES_DB.length} titles' badges show what the inventory decided (${ownRows.length} own icons, else mechanic, else main bonus)`, bad.slice(0, 6).join(' | ') || `${Object.keys(want).length} of ${G.TITLES_DB.length} titles found in inventory.md`);
    // A title's own icon belongs to that title alone, and says so: its kind and its names, as effects carry theirs
    const own = Object.keys(GI).filter(id => GI[id].title !== undefined), badOwn = [], holder = new Map();
    for (const id of own) {
        const title = G.TITLES_DB.find(x => x.id === GI[id].title);
        if (!title) { badOwn.push(`${id}: its title ${GI[id].title} doesn't exist`); continue; }
        if (holder.has(title.id)) badOwn.push(`title ${title.id} has two own icons: ${holder.get(title.id)} and ${id}`);
        holder.set(title.id, id);
        if (GI[id].kind !== 'note') badOwn.push(`${id}: kind ${GI[id].kind}, not note`);
        if (GI[id].name.uk !== title.name.uk || GI[id].name.en !== title.name.en) badOwn.push(`${id}: the icon is «${GI[id].name.uk}» / "${GI[id].name.en}", title ${title.id} is «${title.name.uk}» / "${title.name.en}"`);
        const others = G.TITLES_DB.filter(x => x.id !== title.id && G.titleGlyph(x) === id).map(x => x.id);
        if (others.length) badOwn.push(`${id} is title ${title.id}'s, and the badge of ${others.join(', ')} too`);
        // By id: a saved drake carries a copy of its title (an old name, say)
        if (G.titleGlyph({ ...title, name: { uk: '?', en: '?' } }) !== id) badOwn.push(`a saved copy of title ${title.id} doesn't find ${id}`);
    }
    if (G.titleGlyph({ rarity: 'common', bonus: { type: 'stats', stats: { hp: 1 } } }) !== 'hp') badOwn.push('a title copy with no id takes some icon, not its bonus');
    check(!badOwn.length && own.length === ownRows.length, `${own.length} titles' own icons: each its title's alone, kind note, with its names in both languages`, badOwn.slice(0, 6).join(' | ') || `${own.length} ICONS records with a title, ${ownRows.length} "own icon" rows in inventory.md`);
}

// ---- 9. The notes a title fires, on the cards
{
    const T = id => G.TITLES_DB.find(x => x.id === id);
    const fighter = (name, id, type = 'red') => ({ name, color: '#8ab4f8', drakeObj: G.DRAKE_TYPES.find(d => d.type === type), title: T(id) });
    const hit = more => ({ type: 'physical', sub: 'light', dmg: 20, crit: false, block: false, shadow: false, miss: false, pierce: false, sd: 0, ...more });
    const card = (atk, def, extra) => G.fvCardHtml({ turn: 1, atk, def, side: 'left', ticks: [], notes: {}, casts: [], used: [], ult: null, attack: hit(), frozen: false, ...extra }, 'left');
    const shows = (html, icon) => html.includes(`data-icon="${icon}"`);
    const chips = (html, icon) => html.includes(`data-ci="${icon}"`);
    const said = (html, words) => html.includes(`> ${words}`);   // the words right after the icon (not its alt text)
    // The note, its ability's own-icon title and pair, whose title fires it, and the turn that shows it (fired: that fighter)
    const NOTES = [
        ['guardian', 176, 96, 'atk', () => ({ notes: { guardian: 12 } })],
        ['immune', 178, 98, 'def', fired => ({ casts: [{ owner: fired, id: 'burn', result: 'immune' }] })],   // the cast's owner
        ['immune', 178, 98, 'atk', fired => ({ casts: [{ owner: fired, id: 'poison', result: 'immune' }] })],   // the cat's debuff on its own attacker
        ['immune', 178, 98, 'def', () => ({ ult: { id: 'theft', immune: true } })],   // an ultimate can't take the defender's buffs
        ['dodge', 179, 99, 'def', () => ({ notes: { dodge: true }, attack: hit({ dmg: 0, block: true }) })],
        ['chaos', 180, 100, 'atk', () => ({ notes: { chaos: true } })],
        ['thorns', 184, 183, 'def', () => ({ notes: { thorns: 6 } })],
        ['lifesteal', 185, 186, 'atk', () => ({ notes: { lifesteal: 9 } })],
        ['execute', 188, 187, 'atk', () => ({ notes: { execute: true } })],
        ['coin', 190, 189, 'atk', () => ({ notes: { coin: 1.5 } })],
        ['sleep', 192, 191, 'atk', () => ({ notes: { sleep: true } })],
        ['cat', 194, 193, 'atk', () => ({ notes: { cat: true } })],
    ];
    const bad = [];
    for (const lang of ['uk', 'en']) {
        G.setLang(lang);
        for (const [note, ownId, pairId, side, turn] of NOTES) {
            const icon = G.titleGlyph(T(ownId)), compact = note !== 'coin';   // the coin's chip is compact already: a glyph and a number
            // Each title on the side that fires, the other on the other side, so the wrong fighter's title shows
            const draw = (firing, other) => { const a = fighter('a', side === 'atk' ? firing : other), d = fighter('d', side === 'atk' ? other : firing, 'blue'); return card(a, d, turn(side === 'atk' ? a : d)); };
            const mine = draw(ownId, pairId), theirs = draw(pairId, ownId), where = `${lang} ${note}`;
            if (icon === note) bad.push(`${where}: title ${ownId} has no own icon`);
            if (!shows(mine, icon) || shows(mine, note)) bad.push(`${where}: title ${ownId}'s holder fires it, its card doesn't show ${icon}`);
            if (compact && !chips(mine, icon)) bad.push(`${where}: title ${ownId}'s compact chip isn't ${icon}`);
            if (!shows(theirs, note) || shows(theirs, icon)) bad.push(`${where}: title ${pairId}'s holder fires it, its card doesn't show ${note}`);
            if (compact && !chips(theirs, note)) bad.push(`${where}: title ${pairId}'s compact chip isn't ${note}`);
            // The ability's words stay, whichever icon they go with; 194 has words of its own
            if (compact && note !== 'cat') {
                const words = G.FV_TEXT[lang][note].replace(G.EMOJI_RE, '').trim();
                if (!said(mine, words) || !said(theirs, words)) bad.push(`${where}: the card doesn't say «${words}»`);
            }
        }
        const cat = fighter('a', 193), bug = fighter('a', 194), foe = fighter('d', 96, 'blue');
        const catWord = lang === 'uk' ? 'кіт' : 'cat', bugWord = lang === 'uk' ? 'баг' : 'bug';
        if (!said(card(bug, foe, { notes: { cat: true } }), bugWord) || said(card(bug, foe, { notes: { cat: true } }), catWord)) bad.push(`${lang}: title 194's note doesn't say «${bugWord}»`);
        if (!said(card(cat, foe, { notes: { cat: true } }), catWord)) bad.push(`${lang}: title 193's note doesn't say «${catWord}»`);
        const sneaky = card(fighter('a', 97), foe, { attack: hit({ sub: 'sneaky', pierce: true }) });
        if (!shows(sneaky, 'pierce') || shows(sneaky, 'bigBrain')) bad.push(`${lang}: a sneaky attack by title 97's holder doesn't keep the spear`);
        // Only its ability's notes: another ability's note keeps its glyph, whatever title the fighter holds
        const notMine = card(fighter('a', 185), foe, { notes: { chaos: true } });
        if (!shows(notMine, 'chaos') || shows(notMine, 'energyVampire')) bad.push(`${lang}: title 185's holder shows its own icon on another ability's note`);
        const dragon = fighter('w', 999, 'white'), dragonCard = card(foe, dragon, { casts: [{ owner: dragon, id: 'burn', result: 'immune' }] });
        if (!shows(dragonCard, 'immune')) bad.push(`${lang}: the White Dragon's immunity doesn't keep the immune glyph`);
        for (const id of [182, 181]) if (!shows(G.fvBannerHtml({ kind: 'opening', data: { f: fighter('a', id), id: 'rage' } }), G.titleGlyph(T(id)))) bad.push(`${lang}: the opening banner for title ${id} doesn't show its badge`);
    }
    check(!bad.length, 'the notes a title fires: its own icon for its holder, full and compact, with the ability\'s words (194: «баг» / "bug"); the ability\'s glyph for the pair title\'s; the spear and the White Dragon\'s immunity as they are', bad.slice(0, 6).join(' | '));

    // The notes of the abilities of titles 205–294. They have no glyph of their own: each shows the badge of the title that
    // fired it. Until that's the title's own icon it's a stand-in, one of a few shared glyphs, so the compact form keeps the
    // words; with its own icon (one lent to the title here) it's the icon and the number, like any note, with no code change
    const ABILITY_NOTES = [
        // the note's words, a title of its ability, whose title fires it, the turn that shows it, what follows the words
        ['combo', 205, 'atk', () => ({ notes: { combo: true } }), ''],
        ['firstBlood', 208, 'atk', () => ({ notes: { firstBlood: true } }), ''],
        ['ironHide', 211, 'def', () => ({ notes: { ironHide: true } }), ''],
        ['lastStand', 214, 'atk', () => ({ notes: { lastStand: true } }), ''],
        ['counter', 217, 'def', () => ({ notes: { counter: 9 } }), ' -9'],
        ['eats', 220, 'atk', () => ({ notes: { eaten: { id: 'divine', healed: 12 } } }), ''],
        ['meterRush', 223, 'atk', () => ({ ult: { id: 'firestorm', boost: 1.5 } }), ' ×1.5'],
        ['momentum', 226, 'atk', () => ({ notes: { momentum: 12 } }), ' +12%'],
        ['cleanse', 229, 'atk', () => ({ notes: { cleanse: ['mark'] } }), ''],
        ['longBuffs', 232, 'atk', f => ({ casts: [{ owner: f, id: 'shield', result: 'applied' }] }), ' ×2'],
        ['phoenix', 245, 'def', f => ({ notes: { phoenix: { f, hp: 1 } } }), ' · 1 HP'],
        ['phoenix', 245, 'atk', f => ({ notes: { phoenix: { f, hp: 1 } } }), ' · 1 HP'],
        ['twin', 249, 'atk', () => ({ notes: { twin: 14 } }), ' -14'],
        ['storm', 253, 'atk', () => ({ notes: { storm: 1.5 } }), ' ×1.5'],
        ['rewind', 257, 'atk', () => ({ notes: { rewind: { from: 40, to: 180 } } }), ' 40 → 180'],
        ['tempered', 260, 'atk', () => ({ notes: { tempered: 15 } }), ' +15%'],
        ['returned', 264, 'def', f => ({ casts: [{ owner: f, id: 'mark', result: 'returned' }] }), ''],
        ['overcharge', 268, 'atk', () => ({ ult: { id: 'firestorm', boost: 1.6 } }), ' ×1.6'],
        ['sentenced', 271, 'atk', () => ({ notes: { sentenced: true } }), ''],
        ['sentenceDone', 271, 'atk', () => ({ notes: { sentenceDone: 2 } }), ' ×2'],
        ['notFound', 275, 'def', f => ({ notes: { notFound: f }, attack: hit({ dmg: 0, vanish: true }) }), ''],
        ['notFound', 275, 'atk', f => ({ notes: { notFound: f }, attack: hit({ dmg: 0, vanish: true }) }), ''],
        ['crashed', 278, 'def', f => ({ crash: f, attack: null }), ''],
        ['crashed', 278, 'atk', f => ({ crash: f, attack: null }), ''],
        ['chat', 281, 'atk', () => ({ notes: { chat: true } }), ''],
        ['away', 284, 'atk', () => ({ away: true, attack: null }), ''],
        ['afkBack', 284, 'atk', () => ({ notes: { afkBack: 3 } }), ' ×3'],
        ['lagHang', 287, 'atk', () => ({ notes: { lagHang: true }, attack: hit({ dmg: 0, stuck: true }) }), ''],
        ['lagLand', 287, 'atk', () => ({ notes: { lagLand: 50 } }), ' -50'],
        ['copy', 292, 'atk', () => ({ notes: { copy: 31 } }), ' -31'],
    ];
    const ct = (html, ci) => [...html.matchAll(new RegExp(`data-ci="${ci}" data-ct="([^"]*)"`, 'g'))].map(m => m[1]);
    const LENT = 'zenLotus', lentFrom = GI[LENT].title, bad2 = [];
    for (const lang of ['uk', 'en']) {
        G.setLang(lang);
        for (const [key, id, side, turn, after] of ABILITY_NOTES) {
            const words = G.FV_TEXT[lang][key], where = `${lang} ${key} (${side})`, glyph = G.titleGlyph(T(id));
            const draw = () => { const f = fighter('f', id), o = fighter('o', 96, 'blue'); return side === 'atk' ? card(f, o, turn(f)) : card(o, f, turn(f)); };
            if (!['hp', 'crit'].includes(glyph)) bad2.push(`${where}: title ${id}'s stand-in is ${glyph}, not its main bonus's`);
            const stand = draw();
            if (!said(stand, `${words}${after}`) || !shows(stand, glyph)) bad2.push(`${where}: the card doesn't show ${glyph} and «${words}${after}»`);
            if (!ct(stand, glyph).includes(`${words}${after}`)) bad2.push(`${where}: the stand-in's compact form lost its words: ${JSON.stringify(ct(stand, glyph))}`);
            G.DI.ICONS[LENT].title = id;   // the page's own DrakeIcons: titleOwnIcon reads this record
            const own = draw();
            G.DI.ICONS[LENT].title = lentFrom;
            if (!said(own, `${words}${after}`) || !shows(own, LENT)) bad2.push(`${where}: with its own icon the card doesn't show ${LENT} and «${words}${after}»`);
            if (!ct(own, LENT).includes(after.trim())) bad2.push(`${where}: with its own icon the compact form isn't the icon and «${after.trim()}»: ${JSON.stringify(ct(own, LENT))}`);
        }
        // Two stand-ins on one card: the same heart, so only the words keep them apart, compact too
        const both = card(fighter('a', 208), fighter('d', 211, 'blue'), { notes: { firstBlood: true, ironHide: true } }), hearts = ct(both, 'hp');
        if (hearts.length !== 2 || hearts[0] === hearts[1]) bad2.push(`${lang}: two stand-in notes on a card look alike: ${JSON.stringify(hearts)}`);
        // The crit «!» as a stand-in never stands alone: Комбо's compact chip says what it is
        if (!ct(card(fighter('a', 205), fighter('d', 96, 'blue'), { notes: { combo: true } }), 'crit').includes(G.FV_TEXT[lang].combo)) bad2.push(`${lang}: Комбо's compact chip is a bare «!»`);
        // What the Meme abilities show instead of the number; a name after a verb in the accusative
        const a = fighter('a', 96), d = fighter('d', 275, 'blue'), line1 = html => (html.match(/<div class="lc-l1">(.*?)<\/div>/s) || [])[1] || '';
        const vanished = line1(card(a, d, { attack: hit({ dmg: 0, vanish: true }), notes: { notFound: d } }));
        if (!/>404<\/span>/.test(vanished) || />0<\/span>/.test(vanished)) bad2.push(`${lang}: a vanished hit's card doesn't show «404» in place of the number`);
        if (!/>…<\/span>/.test(line1(card(a, d, { attack: hit({ dmg: 0, stuck: true }), notes: { lagHang: true } })))) bad2.push(`${lang}: a stuck hit's card still shows a number`);
        if (!line1(card(a, d, { attack: null, crash: d })).includes('>:(<')) bad2.push(`${lang}: the blue screen's card has no «:(» on line 1`);
        if (!line1(card(a, d, { attack: null, away: true })).includes('>AFK<')) bad2.push(`${lang}: the AFK card has no «AFK» on line 1`);
        const landed = line1(card(a, d, { attack: null, notes: { lagLand: 50 } }));
        if (!landed.includes('>-50<') || !landed.includes(G.FV_TEXT[lang].lagLand)) bad2.push(`${lang}: a stuck hit that knocks out, with no attack after it, doesn't show its number: ${landed}`);
        const acc = lang === 'uk' ? ['Божественну міць', 'Мітку'] : ['Divine Might', 'Mark'];
        if (!card(fighter('a', 220), d, { notes: { eaten: { id: 'divine', healed: 12 } } }).includes(`>${acc[0]}<`)) bad2.push(`${lang}: «${G.FV_TEXT[lang].eats}» isn't followed by the accusative`);
        for (const [what, extra] of [['cleanse', { notes: { cleanse: ['mark'] } }], ['returned', { casts: [{ owner: d, id: 'mark', result: 'returned' }] }]])
            if (!card(fighter('a', 229), fighter('d', 264, 'blue'), extra).includes(`>${acc[1]}<`)) bad2.push(`${lang}: ${what}: the debuff's name after the verb isn't in the accusative`);
        // Перша кров and Око бурі beating a block say so, with the same words and glyph as Вогняний шторм; Підзарядка's banner
        if (!shows(card(fighter('a', 208), fighter('d', 96, 'blue'), { notes: { unblock: 'first_blood', firstBlood: true } }), 'unblockable')) bad2.push(`${lang}: Перша кров beating a block doesn't say so`);
        const banner = G.fvBannerHtml({ kind: 'meterStart', data: { f: fighter('a', 223) } });
        if (!banner.includes('2/5') || !shows(banner, G.titleGlyph(T(223)))) bad2.push(`${lang}: Підзарядка's banner doesn't show its badge and 2/5: ${banner.slice(0, 120)}`);
    }
    check(!bad2.length, `the notes of titles 205–294 (${ABILITY_NOTES.length} cases, both languages): the badge's glyph with the ability's words; a stand-in's compact form keeps them, an own icon's doesn't; two stand-ins on a card stay apart; «404», «…», «:(», «AFK» on line 1; the accusative after a verb`, bad2.slice(0, 6).join(' | '));
}

// ---- 10. The Top: each title in its rarity's colour, its badge in its frame
{
    const db = G.getDragonDB(), red = G.DRAKE_TYPES.find(d => d.type === 'red');
    const rows = [['ann', 1], ['bob', 171], ['cid', 176], ['dee', 183], ['eve', 194]];   // common, epic, a legendary with its own icon, a mythic, a meme
    rows.forEach(([name, id]) => { db[name] = { name, color: '#8ab4f8', drakeObj: red, title: G.TITLES_DB.find(x => x.id === id), xp: 0, level: 1 }; });
    G.saveDragonDB(db);
    G.setLang('uk');
    G.renderLeaderboard();
    const html = document.getElementById('leaderboard-list').innerHTML, bad = [], rarities = new Set();
    for (const [name, id] of rows) {
        const title = G.TITLES_DB.find(x => x.id === id), glyph = G.titleGlyph(title), row = (html.match(new RegExp(`data-key="${name}".*?</li>`, 's')) || [''])[0];
        rarities.add(title.rarity);
        const span = row.match(/<span class="lb-title" style="color:(#[0-9a-f]+)">(.*?)<\/span>\s*<\/span>/s) || [];
        if (span[1] !== G.RARITIES[title.rarity].color) bad.push(`@${name}: title in ${span[1]}, its rarity's colour is ${G.RARITIES[title.rarity].color}`);
        if (!(span[2] || '').includes(`class="px-badge" data-frame="${title.rarity}"`)) bad.push(`@${name}: no ${title.rarity} frame on its badge`);
        if (!(span[2] || '').includes(`px-glyph" data-icon="${glyph}"`)) bad.push(`@${name}: its badge isn't ${glyph}`);
        if (!(span[2] || '').includes(title.name.uk)) bad.push(`@${name}: «${title.name.uk}» isn't in its rarity's colour`);
    }
    check(!bad.length && rarities.size === rows.length, `the Top: each title in its rarity's colour, its badge in its frame (${[...rarities].join(', ')})`, bad.slice(0, 6).join(' | '));
}

if (failed) { console.log(`${failed} icon check${failed === 1 ? '' : 's'} failed`); process.exit(1); }
console.log('icon checks passed');
