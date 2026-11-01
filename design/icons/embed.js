// Puts the icon set into the game page, so the page stays one self-contained file. Two blocks, after the sprites:
//   - design/icons/icons.js, as it is, between the ICONS START / END markers (the glyphs: sizes, names, colours, chips);
//   - the V2 set, design/icons/v2/ (manifest.json and its PNGs), between the ICONS V2 START / END markers: the manifest's
//     data for each item with its still and its loop as data: URIs (ICONS_V2, what the overlay draws).
// Run it after any change to icons.js or the files in v2/; design/icons/test.js fails while the page's copy differs.
//   node design/icons/embed.js
const fs = require('fs');
const path = require('path');

const PAGE = path.join(__dirname, '..', '..', 'showcase', 'index.html');
const START = '// ===== ICONS START =====';
const END = '// ===== ICONS END =====';
const NOTE = '// Generated from design/icons/icons.js by design/icons/embed.js: edit icons.js and run the script, never this copy.';
const V2_DIR = path.join(__dirname, 'v2');
const V2_START = '// ===== ICONS V2 START =====';
const V2_END = '// ===== ICONS V2 END =====';
const V2_NOTE = [
    '// Generated from design/icons/v2/ (manifest.json and its PNGs) by design/icons/embed.js: change the files there and run the',
    "// script, never this copy. Each item: the manifest's kind, art size (px), frame count, frame time (ms) and names, then its",
    "// still (the loop's first frame) and its loop (an APNG that loops forever) as data: URIs.",
];

// The block as it goes into the page (LF line endings; the page's own endings are applied when it's written)
function iconsBlock() {
    const src = fs.readFileSync(path.join(__dirname, 'icons.js'), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
    return `${START}\n${NOTE}\n${src}\n${END}`;
}

// The V2 manifest, as the files say (design/icons/v2/manifest.json)
const v2Manifest = () => JSON.parse(fs.readFileSync(path.join(V2_DIR, 'manifest.json'), 'utf8'));

// The V2 block: one item per three lines (its data, its still, its loop), in the manifest's order
function v2Block() {
    const uri = file => 'data:image/png;base64,' + fs.readFileSync(path.join(V2_DIR, file)).toString('base64');
    const items = Object.entries(v2Manifest()).map(([id, it]) => {
        const { kind, size, frames, ms, name } = it, j = JSON.stringify;
        return `    ${j(id)}: { "kind": ${j(kind)}, "size": ${j(size)}, "frames": ${j(frames)}, "ms": ${j(ms)}, "name": { "uk": ${j(name.uk)}, "en": ${j(name.en)} },\n`
            + `        "still": ${j(uri(it.still))},\n`
            + `        "anim": ${j(uri(it.anim))} },`;
    });
    return [V2_START, ...V2_NOTE, 'const ICONS_V2 = {', ...items, '};', V2_END].join('\n');
}

// The page's copy of a block (LF), or null when its markers are missing
function pageBlock(html, start = START, end = END) {
    const text = html.replace(/\r\n/g, '\n'), a = text.indexOf(start), b = text.indexOf(end);
    return a === -1 || b === -1 ? null : text.slice(a, b + end.length);
}

// Puts a block between its markers, or, the first time, after the anchor line
function putBlock(html, block, start, end, anchor) {
    const a = html.indexOf(start), b = html.indexOf(end);
    if (a !== -1 && b !== -1) return html.slice(0, a) + block + html.slice(b + end.length);
    if (!html.includes(anchor)) throw new Error(`no "${anchor.trim()}" line in showcase/index.html`);
    return html.replace(anchor, anchor + block + '\n');
}

if (require.main === module) {
    const raw = fs.readFileSync(PAGE, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    let html = raw.replace(/\r\n/g, '\n');
    const block = iconsBlock(), v2 = v2Block();
    html = putBlock(html, block, START, END, '// ===== SPRITES END =====\n');
    html = putBlock(html, v2, V2_START, V2_END, END + '\n');
    fs.writeFileSync(PAGE, html.replace(/\n/g, eol));
    console.log(`showcase/index.html: icons block updated (${block.split('\n').length} lines)`);
    console.log(`showcase/index.html: V2 block updated (${Object.keys(v2Manifest()).length} items, ${Math.round(v2.length / 1024)} KB)`);
}

module.exports = { iconsBlock, pageBlock, v2Block, v2Manifest, START, END, V2_START, V2_END, V2_DIR };
