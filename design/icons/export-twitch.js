// Twitch channel-point reward icons: the game's rewards (REWARD_ID_TITLE: the title roulette, REWARD_ID_REROLL: the reroll) as
// the V2 icons' stills (design/icons/v2/: the 44×44 wheel, the 40×40 arrows), at Twitch's three sizes (28, 56, 112 px),
// transparent and centred: at the largest whole-number scale that fits and leaves the same margin on both sides (pixel for
// pixel, nothing smoothed), and where none fits (28 px) at half size, smoothed (each pixel the average of the 2×2 it
// covers, weighted by their alpha).
//   node design/icons/export-twitch.js   →   design/icons/twitch-rewards/<reward>-<size>.png
const fs = require('fs');
const path = require('path');
const png = require('./png');
const { v2Manifest, V2_DIR } = require('./embed');

const OUT = path.join(__dirname, 'twitch-rewards');
const REWARDS = { 'title-roulette': 'roulette', reroll: 'reroll' };
const SIZES = [28, 56, 112];

// The art at a whole-number scale: each pixel a scale × scale block
function scaled(art, s) {
    const w = art.width * s, out = Buffer.alloc(w * art.height * s * 4);
    for (let y = 0; y < art.height * s; y++) for (let x = 0; x < w; x++) art.data.copy(out, (y * w + x) * 4, (Math.floor(y / s) * art.width + Math.floor(x / s)) * 4, (Math.floor(y / s) * art.width + Math.floor(x / s)) * 4 + 4);
    return { width: w, height: art.height * s, data: out };
}

// The art at half size, smoothed: each pixel the alpha-weighted average of the 2×2 it covers
function halved(art) {
    if (art.width % 2 || art.height % 2) throw new Error(`${art.width}×${art.height} doesn't halve`);
    const w = art.width / 2, h = art.height / 2, out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let a = 0;
        const rgb = [0, 0, 0];
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
            const i = ((2 * y + dy) * art.width + 2 * x + dx) * 4, pa = art.data[i + 3];
            a += pa;
            for (let c = 0; c < 3; c++) rgb[c] += art.data[i + c] * pa;
        }
        const o = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) out[o + c] = a ? Math.round(rgb[c] / a) : 0;
        out[o + 3] = Math.round(a / 4);
    }
    return { width: w, height: h, data: out };
}

// The image centred on a transparent size × size square (the margins even, so exactly centred)
function centred(img, size) {
    const dx = (size - img.width) / 2, dy = (size - img.height) / 2;
    if (!Number.isInteger(dx) || !Number.isInteger(dy) || dx < 0 || dy < 0) throw new Error(`${img.width}×${img.height} doesn't centre in ${size}×${size}`);
    const out = Buffer.alloc(size * size * 4);
    for (let y = 0; y < img.height; y++) img.data.copy(out, ((y + dy) * size + dx) * 4, y * img.width * 4, (y + 1) * img.width * 4);
    return out;
}

fs.mkdirSync(OUT, { recursive: true });
const M = v2Manifest();
for (const [file, id] of Object.entries(REWARDS)) {
    const art = png.decode(fs.readFileSync(path.join(V2_DIR, M[id].still)));
    for (const size of SIZES) {
        let s = Math.floor(size / Math.max(art.width, art.height));   // the largest whole-number scale that fits…
        while (s > 0 && (size - art.width * s) % 2) s--;                // …and centres exactly
        const img = s > 0 ? scaled(art, s) : halved(art);
        fs.writeFileSync(path.join(OUT, `${file}-${size}.png`), png.encode(size, size, centred(img, size)));
        console.log(`design/icons/twitch-rewards/${file}-${size}.png  (${id}'s ${art.width}×${art.width} still ${s > 0 ? `×${s}` : 'at half size, smoothed'}: ${img.width} px)`);
    }
}
