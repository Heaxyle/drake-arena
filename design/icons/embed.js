// Puts the icon set into the game page: design/icons/icons.js, as it is, between the ICONS START / END markers in
// showcase/index.html (after the sprites), so the page stays one self-contained file. Run it after any change to icons.js;
// design/icons/test.js fails while the page's copy differs.
//   node design/icons/embed.js
const fs = require('fs');
const path = require('path');

const PAGE = path.join(__dirname, '..', '..', 'showcase', 'index.html');
const START = '// ===== ICONS START =====';
const END = '// ===== ICONS END =====';
const NOTE = '// Generated from design/icons/icons.js by design/icons/embed.js: edit icons.js and run the script, never this copy.';

// The block as it goes into the page (LF line endings; the page's own endings are applied when it's written)
function iconsBlock() {
    const src = fs.readFileSync(path.join(__dirname, 'icons.js'), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
    return `${START}\n${NOTE}\n${src}\n${END}`;
}

// The page's copy of the block (LF), or null when the markers are missing
function pageBlock(html) {
    const text = html.replace(/\r\n/g, '\n'), a = text.indexOf(START), b = text.indexOf(END);
    return a === -1 || b === -1 ? null : text.slice(a, b + END.length);
}

if (require.main === module) {
    const raw = fs.readFileSync(PAGE, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    let html = raw.replace(/\r\n/g, '\n');
    const block = iconsBlock();
    const a = html.indexOf(START), b = html.indexOf(END);
    if (a !== -1 && b !== -1) html = html.slice(0, a) + block + html.slice(b + END.length);
    else {
        const anchor = '// ===== SPRITES END =====\n';
        if (!html.includes(anchor)) throw new Error('no SPRITES END marker in showcase/index.html');
        html = html.replace(anchor, anchor + block + '\n');
    }
    fs.writeFileSync(PAGE, html.replace(/\n/g, eol));
    console.log(`showcase/index.html: icons block updated (${block.split('\n').length} lines)`);
}

module.exports = { iconsBlock, pageBlock, START, END };
