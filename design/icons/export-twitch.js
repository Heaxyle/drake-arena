// Twitch channel-point reward icons: the game's rewards (REWARD_ID_TITLE: the title roulette, REWARD_ID_REROLL: the reroll) as
// the same pixel icons the overlay shows, at Twitch's three sizes (28, 56, 112 px), transparent, at whole-number scales, centred.
//   node design/icons/export-twitch.js   →   design/icons/twitch-rewards/<reward>-<size>.png
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, 'twitch-rewards');
const REWARDS = { 'title-roulette': 'roulette', reroll: 'reroll' };
const SIZES = [28, 56, 112];

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent('<!DOCTYPE html><body></body>');
    await page.addScriptTag({ path: path.join(__dirname, 'icons.js') });
    for (const [file, id] of Object.entries(REWARDS)) {
        for (const size of SIZES) {
            const { data, scale } = await page.evaluate(([id, size]) => {
                const icon = DrakeIcons.makeIconCanvas(id);
                const scale = Math.floor(size / Math.max(icon.width, icon.height));   // the largest whole-number scale that fits
                const c = document.createElement('canvas');
                c.width = c.height = size;
                const g = c.getContext('2d');
                g.imageSmoothingEnabled = false;
                const w = icon.width * scale, h = icon.height * scale;
                g.drawImage(icon, Math.floor((size - w) / 2), Math.floor((size - h) / 2), w, h);
                return { data: c.toDataURL('image/png').split(',')[1], scale };
            }, [id, size]);
            fs.writeFileSync(path.join(OUT, `${file}-${size}.png`), Buffer.from(data, 'base64'));
            console.log(`design/icons/twitch-rewards/${file}-${size}.png  (${id} ×${scale})`);
        }
    }
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
