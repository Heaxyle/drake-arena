// The icon set's checks, in npm test (plain Node, no browser; the overlay itself is checked by tests/overlay_icons.js inside
// the browser tests).
//   node design/icons/test.js [--file path/to/index.html]
// 1. Every glyph is its kind's size (iconRows throws otherwise), and every icon has a label in both languages.
// 2. The emblems differ in outline, not only in colour: each emblem's silhouette (which pixels are the drake and which are
//    the tile: the frame m, the fill s, the cut corners) must differ from every other emblem's in at least MIN_DIFF pixels,
//    so a greyscale or colour-blind viewer can tell them apart by shape.
// 3. The game page's copy of the set (between its ICONS START / END markers) is design/icons/icons.js, unchanged
//    (node design/icons/embed.js puts it there).
// 4. Every icon the game asks for exists: each pxIcon('…') in the page, each drake's emblem, each effect's, ultimate's and
//    attack type's icon, the medals, the reels, every title's badge glyph, every icon in the overlay's icon lists.
// 5. The icon lists match their texts: FV_TEXT, TOURNEY_TEXT, SHOW_TEXT and METER.ready keep their emoji (the hidden text
//    record shows them); for each text drawn on the overlay its list names an icon (or none) for every emoji, in both languages.
// 6. Colour = element: every effect's and ultimate's colour is its element's (ELEMENT_COLORS), and the icons' names for them
//    are EFFECTS' / CLASS_ULTIMATES' own names.
// 7. Each title's badge shows what the inventory (inventory.md, section 5) decided: its mechanic, else its main bonus;
//    «Біла сталь» its sword.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const FILE = path.resolve(ROOT, args.includes('--file') ? args[args.indexOf('--file') + 1] : 'showcase/index.html');

require(path.join(__dirname, 'icons.js'));
const D = globalThis.DrakeIcons;
const { iconsBlock, pageBlock } = require('./embed');

const MIN_DIFF = 4;
const TILE = new Set(['.', 'm', 's']);
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

// ---- 2. Emblem silhouettes
{
    const silhouette = id => D.iconRows(id).join('').split('').map(c => TILE.has(c) ? 0 : 1);
    const ids = D.EMBLEM_IDS, bad = [];
    let closest = null;
    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            const a = silhouette(ids[i]), b = silhouette(ids[j]);
            const diff = a.filter((v, k) => v !== b[k]).length;
            if (!closest || diff < closest.diff) closest = { pair: `${ids[i]} / ${ids[j]}`, diff };
            if (diff < MIN_DIFF) bad.push(`emblems ${ids[i]} and ${ids[j]}: silhouettes differ in ${diff} pixel${diff === 1 ? '' : 's'} (at least ${MIN_DIFF})`);
        }
    }
    check(!bad.length, `emblem silhouettes: ${ids.length} emblems, closest pair ${closest.pair}, ${closest.diff} pixels apart (at least ${MIN_DIFF})`, bad.join(' | '));
}

// ---- 3. The page's copy
const html = fs.readFileSync(FILE, 'utf8');
{
    const copy = pageBlock(html);
    check(copy === iconsBlock(), `${path.relative(ROOT, FILE)} carries design/icons/icons.js between its ICONS markers, unchanged`,
        copy === null ? `${path.relative(ROOT, FILE)}: no ICONS START / END markers` : `${path.relative(ROOT, FILE)}: its icon block differs from design/icons/icons.js (run node design/icons/embed.js)`);
}

// ---- The game, in Node (the same stub page as the balance sims)
const { gameScript, setupEnv } = require(path.join(ROOT, 'tests', 'game_env'));
setupEnv();
const _warn = console.warn, _err = console.error, errors = [];
console.warn = () => {};
console.error = (...a) => errors.push(a.join(' '));
eval(gameScript(FILE) + `
;globalThis.__game = { DI: DrakeIcons, EFFECTS, CLASS_ULTIMATES, ULTIMATE_IDS, DRAKE_TYPES, TITLES_DB, FV_TEXT, FV_ICONS, TOURNEY_TEXT, TOURNEY_ICONS,
    SHOW_TEXT, SHOW_ICONS, METER, EMBLEMS, MEDAL_ICONS, REEL_ICONS, EMOJI_RE, titleGlyph, ultimateFor, WHITE_DRAKE_TITLE_ID,
    setLang: l => { currentLang = l; } };`);
console.warn = _warn;
console.error = _err;
const G = globalThis.__game;
const GI = G.DI.ICONS;

// ---- 4. Every icon the game asks for exists
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
    G.TITLES_DB.forEach(t => ask(G.titleGlyph(t), `title ${t.id}'s badge`));
    [G.FV_ICONS, G.TOURNEY_ICONS, G.SHOW_ICONS].forEach(list => Object.values(list).flat().filter(Boolean).forEach(id => ask(id, 'an icon list')));
    G.DRAKE_TYPES.forEach(d => { const u = G.ultimateFor(d.type); if (u) ask(u, `${d.type}'s «ГОТОВО»`); });
    const missing = [...asked].filter(([id]) => !GI[id]).map(([id, where]) => `${id} (${where})`);
    check(!missing.length && !errors.length, `every icon the game asks for exists (${asked.size} icons)`, `missing: ${missing.concat(errors).join(', ')}`);
}

// ---- 5. Icon lists against their texts
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

// ---- 6. Colour = element; one name per effect and ultimate
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

// ---- 7. Title badges as the inventory decided
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
