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
    { stem: 'задрот', why: 'Russian gamer slang; «трайхардер»' },
    { stem: 'душніл', why: 'the Russian slang «душнила» in Ukrainian letters; «буквоїд»' },
    { stem: 'душнил', why: 'Russian slang; «буквоїд»' },
    // «прикол» (a joke, slang) shares its letters with «приколоти» (to pin): its own forms only. The bare «прикол»,
    // «приколи» and «приколі» can't be told from the verb («приколи», «приколіть») by letters alone
    ...['прикола', 'приколу', 'приколом', 'приколів', 'приколам', 'приколах', 'прикольн'].map(stem =>
        ({ stem, why: 'Russian slang «прикол»; «жарт»' })),
    // «катка» (a match, slang) has nearly every form in common with «каток» (a roller, a skating rink): only the two
    // that «каток» lacks
    ...['катці', 'каткою'].map(stem => ({ stem, why: 'Russian gamer slang «катка»; «матч», «гра»' })),
];

const ROOT = path.join(__dirname, '..');
const SELF = path.relative(ROOT, __filename).replace(/\\/g, '/');
const BINARY = /\.(png|jpe?g|gif|webp|ico|zip|woff2?|ttf|otf|mp3|wav|ogg|mp4|webm|pdf)$/i;

// The matcher first checks itself on text it must catch (any case) and text it must leave alone
const find = text => {
    const low = text.toLowerCase();
    return BANNED.filter(b => low.includes(b.stem));
};
const MUST_CATCH = ['РЕШКА', 'Орел чи решка', 'решкою', 'Сесійний задрот', 'задротом', 'Задротський', 'душніла', 'ДУШНІЛОЮ', 'душнилы',
    'Директор з приколів', 'для приколу', 'приколом', 'без прикола', 'приколами', 'у приколах', 'прикольний', 'Прикольно',
    'у катці', 'новою каткою'];
const MUST_PASS = ['Герб чи число', 'Орел з вайфаєм', 'Сесійний трайхардер', 'буквоїд', 'душ', 'задушливий', 'задушила', 'душно',
    'приколоти', 'приколов', 'приколола', 'прикололи', 'приколю', 'приколеш', 'приколіть', 'приколювати', 'приколотий',
    'каток', 'біля катка', 'на катку', 'катком', 'катків', 'дорожні катки', 'ще один матч', 'Директор жартів'];
const selfTest = [...MUST_CATCH.map(t => [t, true]), ...MUST_PASS.map(t => [t, false])];
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
