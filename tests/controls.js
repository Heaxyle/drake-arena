// Controls test: the test menu and the language switch, in headless Chromium with seeded fights and a paused clock.
//   3  the "next hit casts" picker shows what's armed: it goes back to "— random —" when the effect fires, and picking
//      the same effect again arms it again
//   4  a pick made with no fight running is cleared (and the picker reset) when the next fight starts
//   5  the Test Settings drop-downs follow the language whether the panel is open or closed, keeping the picks
//   6  switching language during a fight redraws both fighter cards at once (title, info line, stats, chips, POWER),
//      with HP, the meter and every card block where they were
//
// Usage: npm run test:controls   (PAGE_FILE=path/to/index.html runs it against another copy of the page)
const path = require('path');
const { chromium } = require('playwright');
const { pageInit } = require('./page_hooks');
const { settleArena } = require('./settle');

const FILE = process.env.PAGE_FILE ? path.resolve(process.env.PAGE_FILE) : path.join(__dirname, '..', 'showcase/index.html');
const PAGE = 'file:///' + FILE.replace(/\\/g, '/');
const TURN = 4500;

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);

async function open(browser, lang) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/tmi(\.min)?\.js/, r => r.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));
    await page.addInitScript(pageInit, 3);
    await page.goto(`${PAGE}?lang=${lang}`);
    await settleArena(page);
    return { page, context, errors };
}
const armed = page => page.evaluate(() => ({ armed: forcedCast, shown: document.getElementById('debug-force-cast').value }));

(async () => {
    const browser = await chromium.launch();
    try {
        for (const lang of ['uk', 'en']) {
            console.log(`\n[${lang}]`);
            const other = lang === 'uk' ? 'en' : 'uk';

            // ----- 3 + 4: the picker -----
            {
                const { page, context, errors } = await open(browser, lang);
                await page.click('button[data-i18n="btn_settings"]');
                // 4: picked with no fight running → the next fight starts without it
                await page.selectOption('#debug-force-cast', 'frost');
                const before = await armed(page);
                await page.click('button[data-i18n="btn_test"]');
                const atStart = await armed(page);
                check(before.armed === 'frost' && atStart.armed === null && atStart.shown === '',
                    '4. a pick made with no fight running is dropped when the next fight starts, and the picker shows "— random —"', `before ${JSON.stringify(before)}, at the start ${JSON.stringify(atStart)}`);
                // 3: picked during the fight → fires on the next damaging hit → the picker resets → the same pick arms again
                await page.selectOption('#debug-force-cast', 'rage');
                let fired = null;
                for (let turn = 1; turn <= 10 && !fired; turn++) {
                    await page.clock.runFor(TURN);
                    const a = await armed(page);
                    if (a.armed === null) fired = { turn, ...a };
                }
                await page.selectOption('#debug-force-cast', 'rage');
                const again = await armed(page);
                check(fired && fired.shown === '' && again.armed === 'rage' && again.shown === 'rage',
                    '3. when the pick fires the picker goes back to "— random —", and picking the same effect again arms it', `after firing ${JSON.stringify(fired)}, picked again ${JSON.stringify(again)}`);
                if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
                await context.close();
            }

            // ----- 5: the Test Settings drop-downs follow the language -----
            {
                const { page, context } = await open(browser, lang);
                const read = () => page.evaluate(() => ['debug-p1-drake', 'debug-p1-title', 'debug-p2-drake', 'debug-p2-title'].map(id => {
                    const s = document.getElementById(id); return { value: s.value, text: s.options[s.selectedIndex] ? s.options[s.selectedIndex].text : '' }; }));
                const want = page => page.evaluate(picks => {
                    const d = i => DRAKE_TYPES[i].name[currentLang], t = id => { const x = TITLES_DB.find(t => t.id === +id); return `${x.icon} ${x.name[currentLang]} (${x.rarityName[currentLang]})`; };
                    return [d(picks[0]), t(picks[1]), d(picks[2]), t(picks[3])];
                }, ['3', '170', '5', '61']);
                await page.click('button[data-i18n="btn_settings"]');   // open (filled once)
                await page.selectOption('#debug-p1-drake', '3'); await page.selectOption('#debug-p1-title', '170');
                await page.selectOption('#debug-p2-drake', '5'); await page.selectOption('#debug-p2-title', '61');
                await page.click('button[data-i18n="btn_settings"]');   // close
                await page.click('#lang-toggle-btn');                   // switch language while closed
                await page.click('button[data-i18n="btn_settings"]');   // open again
                const closedSwitch = await read(), wantOther = await want(page);
                await page.click('#lang-toggle-btn');                   // and back, with the panel open
                const openSwitch = await read(), wantBack = await want(page);
                const ok = (got, w) => got.map(g => g.text).join('|') === w.join('|') && got.map(g => g.value).join(',') === '3,170,5,61';
                check(ok(closedSwitch, wantOther) && ok(openSwitch, wantBack),
                    `5. the drake and title drop-downs switch to ${other} while the panel is closed and back while it's open, keeping the picks`,
                    `closed → ${JSON.stringify(closedSwitch)} (want ${wantOther}); open → ${JSON.stringify(openSwitch)}`);
                await context.close();
            }

            // ----- 6: the fighter cards switch language at once, without moving -----
            {
                const { page, context } = await open(browser, lang);
                await page.click('button[data-i18n="btn_settings"]');
                await page.click('button[data-i18n="btn_test"]');
                await page.selectOption('#debug-force-cast', 'weakness');   // a chip on a card
                for (let i = 0; i < 4; i++) await page.clock.runFor(TURN);
                await page.clock.runFor(700);
                await settleArena(page);
                const snap = () => page.evaluate(() => ['p1', 'p2'].map(p => {
                    const card = document.getElementById(`card-${p}`), r = el => { const b = el.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)].join(','); };
                    const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ').trim();
                    return { badge: (card.querySelector('.fighter-title-badge') || {}).textContent, info: txt(`info-${p}`), stats: txt(`stats-sub-${p}`),
                        chips: [...card.querySelectorAll('.status-item')].map(x => x.textContent), power: (card.querySelector('.pm-label') || {}).textContent || '',
                        hp: txt(`hp-text-${p}`), pips: card.querySelectorAll('.pm-pip.on').length, boxes: [...card.children].filter(c => !c.classList.contains('fx-layer')).map(r).join(' ') };
                }));
                const before = await snap();
                await page.click('#lang-toggle-btn');   // no game time passes
                const after = await snap();
                const expect = await page.evaluate(() => ['p1', 'p2'].map(p => {
                    const f = p === 'p1' ? fv.p1 : fv.p2, st = battleFx[f.name];
                    return { badge: `${f.title.icon} ${f.title.name[currentLang]}`, drake: f.drakeObj.name[currentLang].replace(/\s*\S*$/u, '').trim() || f.drakeObj.name[currentLang],
                        stat: currentLang === 'uk' ? 'КРИТ' : 'CRIT', power: METER.short[currentLang], chips: [...st.buff, ...st.debuff].map(x => effectChipText(x)) };
                }));
                const problems = [];
                after.forEach((a, i) => {
                    const e = expect[i], b = before[i];
                    if (a.badge !== e.badge) problems.push(`card ${i + 1} title "${a.badge}", want "${e.badge}"`);
                    if (!a.info.includes(e.drake)) problems.push(`card ${i + 1} info "${a.info}" lacks "${e.drake}"`);
                    if (!a.stats.startsWith(e.stat)) problems.push(`card ${i + 1} stats "${a.stats}"`);
                    if (a.power && a.power !== e.power) problems.push(`card ${i + 1} meter label "${a.power}", want "${e.power}"`);
                    if (JSON.stringify(a.chips) !== JSON.stringify(e.chips)) problems.push(`card ${i + 1} chips ${JSON.stringify(a.chips)}, want ${JSON.stringify(e.chips)}`);
                    if (a.hp !== b.hp || a.pips !== b.pips) problems.push(`card ${i + 1} HP/meter changed: ${b.hp} → ${a.hp}, pips ${b.pips} → ${a.pips}`);
                    if (a.boxes !== b.boxes) problems.push(`card ${i + 1} blocks moved: ${b.boxes} → ${a.boxes}`);
                });
                const hadChips = before.some(b => b.chips.length);
                check(!problems.length && hadChips, `6. mid-fight, switching to ${other} redraws both cards at once (title, info, stats, chips, ${expect[0].power}); HP, meter and every block stay put`,
                    problems.slice(0, 4).join(' | ') || 'no chips on the cards to check');
                await context.close();
            }
        }
    } finally {
        await browser.close();
    }
    console.log(failures ? `\n${failures} control check(s) failed.` : '\nAll control checks passed.');
    process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
