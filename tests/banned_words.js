// Banned words: Ukrainian text in the repo (the game, the tests, the docs) must not use these. Each entry is a word stem,
// matched case-insensitively anywhere in a word, with the reason it is banned. Add to the list as needed.
//
// Usage: npm run test:banned-words   (also the first step of npm test)
//
// Scans every file git tracks except binaries and this file (the only place the stems may appear), and lists each
// hit with its file and line. Exits non-zero if there is any.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BANNED = [
    { stem: 'решк', why: '«орел чи решка» comes from Russian imperial coins; the Ukrainian coin sides are «герб» and «число»' },
];

const ROOT = path.join(__dirname, '..');
const SELF = path.relative(ROOT, __filename).replace(/\\/g, '/');
const BINARY = /\.(png|jpe?g|gif|webp|ico|zip|woff2?|ttf|otf|mp3|wav|ogg|mp4|webm|pdf)$/i;

// The matcher first checks itself on text it must catch (any case) and text it must leave alone
const find = text => {
    const low = text.toLowerCase();
    return BANNED.filter(b => low.includes(b.stem));
};
const selfTest = [['Р' + 'ЕШКА', true], ['Орел чи р' + 'ешка', true], ['р' + 'ешкою', true], ['Герб чи число', false], ['Орел з вайфаєм', false]];
const broken = selfTest.filter(([text, hit]) => !!find(text).length !== hit);
if (broken.length) {
    console.log(`✗ the matcher is wrong on: ${broken.map(([t]) => JSON.stringify(t)).join(', ')}`);
    process.exit(1);
}

const files = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0')
    .filter(f => f && f !== SELF && !BINARY.test(f) && fs.existsSync(path.join(ROOT, f)));
const hits = [];
for (const f of files) {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => find(line).forEach(b => hits.push(`${f}:${i + 1}: «${b.stem}» (${b.why}): ${line.trim().slice(0, 160)}`)));
}

if (hits.length) {
    hits.forEach(h => console.log(`✗ ${h}`));
    console.log(`\n${hits.length} banned word(s) in ${files.length} files.`);
    process.exit(1);
}
console.log(`✓ no banned words (${BANNED.map(b => `«${b.stem}»`).join(', ')}) in ${files.length} tracked files`);
