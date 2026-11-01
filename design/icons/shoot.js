// Screenshots of the icon review sheet (design/icons/review.html): the page at 1080p width, and the same page shrunk to a
// phone viewer's 360p (a third), the way a stream player scales it down. Design only: not part of npm test.
//   node design/icons/shoot.js   →   tests/screenshots/icons-review.png, tests/screenshots/icons-review-phone.png
// Offline like the game: the network is blocked and the game's embedded fonts (showcase/index.html) replace the web fonts.
// The V2 icons show their stills (prefers-reduced-motion), so the screenshots don't depend on when they're taken.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'tests', 'screenshots');
const PAGE = 'file:///' + path.join(__dirname, 'review.html').replace(/\\/g, '/');

(async () => {
    const game = fs.readFileSync(path.join(ROOT, 'showcase', 'index.html'), 'utf8');
    const fonts = /<style id="embedded-fonts">([\s\S]*?)<\/style>/.exec(game);
    if (!fonts) throw new Error('no embedded fonts in showcase/index.html');
    fs.mkdirSync(OUT, { recursive: true });

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });   // the V2 stills, so the sheet is the same every run
    await page.route(url => !url.href.startsWith('file:') && !url.href.startsWith('data:'), r => r.abort());
    await page.goto(PAGE);
    await page.evaluate(css => {
        const link = document.getElementById('web-fonts');
        if (link) link.remove();
        const s = document.createElement('style');
        s.textContent = css;
        document.head.appendChild(s);
    }, fonts[1]);
    await page.evaluate(async () => {
        await Promise.all(['16px "Press Start 2P"', '600 15px Rubik', '700 15px Rubik', '800 11px Rubik', '400 13px Rubik'].map(f => document.fonts.load(f, 'Аа')));
        await document.fonts.ready;
        window.fitChips();
    });
    const full = path.join(OUT, 'icons-review.png');
    await page.screenshot({ path: full, fullPage: true });

    // Phone: the 1080p screenshot drawn at a third of its size with smooth scaling (what a 360p stream does to it)
    const phone = await browser.newPage();
    const png = fs.readFileSync(full).toString('base64');
    const data = await phone.evaluate(async src => {
        const im = new Image();
        im.src = src;
        await im.decode();
        const c = document.createElement('canvas');
        c.width = Math.round(im.width / 3); c.height = Math.round(im.height / 3);
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = 'high';
        g.drawImage(im, 0, 0, c.width, c.height);
        return c.toDataURL('image/png').split(',')[1];
    }, 'data:image/png;base64,' + png);
    fs.writeFileSync(path.join(OUT, 'icons-review-phone.png'), Buffer.from(data, 'base64'));
    await browser.close();
    console.log('tests/screenshots/icons-review.png\ntests/screenshots/icons-review-phone.png');
})().catch(e => { console.error(e); process.exit(1); });
