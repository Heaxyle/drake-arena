// The drake sprites, copied out of the game for the review page's mocks (the streamer card in section 15, the Top in 16), at 1×.
// They are the game's own pixels (DRAKE_SPRITES in showcase/index.html), not part of the icon set.
//   node design/icons/ref-sprites.js   →   design/icons/ref/<type>.png (red … green), white-drake.png, white-dragon.png
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'showcase', 'index.html'), 'utf8');
const block = html.slice(html.indexOf('// ===== SPRITES START ====='), html.indexOf('// ===== SPRITES END ====='));
const OUT = path.join(__dirname, 'ref');

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent('<!DOCTYPE html><body></body>');
    await page.addScriptTag({ content: block + '\nwindow.__sprite = t => makeDrakeCanvas(t).toDataURL("image/png").split(",")[1];' });
    for (const [file, type] of [['red', 'red'], ['blue', 'blue'], ['black', 'black'], ['gold', 'gold'], ['purple', 'purple'], ['green', 'green'], ['white-drake', 'steel'], ['white-dragon', 'white']]) {
        const data = await page.evaluate(t => window.__sprite(t), type);
        fs.writeFileSync(path.join(OUT, `${file}.png`), Buffer.from(data, 'base64'));
        console.log(`design/icons/ref/${file}.png  (${type})`);
    }
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
