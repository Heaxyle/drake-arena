// Layout test for the 1920×1080 overlay (design/redesign-reference.html), in both languages. Opens the page in headless
// Chromium with a fake tmi.js and a fake clock, like ui.js, and checks:
//   - worst-case fighter cards (longest name, title, drake name and chips in that language, full meter, Ice Mirror),
//     a full leaderboard and streamer card: nothing overlaps, overflows its box or gets cut off; every card has its
//     СИЛА row between the chips and the HP bar (the White Dragon has none)
//   - the same with Google Fonts blocked, so the fallback font (Segoe UI / system) still fits
//   - ?obs: nothing visible in the camera column or the notification strip, transparent background
//   - without ?obs: the demo controls work and stay inside the camera column; at 1366×768 the whole stage is visible
//   - the "Як грати" / "How to play" card shows exactly when the chat panel is empty, and lists real commands
//   - every player name has at least 4.5:1 contrast against its background, even with very dark Twitch colours
//   - after a fight the winner's card says "ПЕРЕМОЖЕЦЬ" / "WINNER" and the loser's "НОКАУТ" / "KNOCKED OUT"
// Screenshots go to tests/screenshots/ (layout-*.png).
//
// Usage: npm run test:layout   (or node tests/layout.js)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PAGE = 'file:///' + path.join(ROOT, 'showcase/index.html').replace(/\\/g, '/');
const FAKE_TMI = 'window.tmi = undefined;';   // the page works without Twitch; the chat simulator feeds the same handler
const FONTS = /fonts\.(googleapis|gstatic)\.com/;
// Regions that must stay empty on stream (from the reference): the camera column and the notification strip
const CAMERA = { left: 0, top: 0, right: 476, bottom: 1080 };
const NOTIFY = { left: 500, top: 0, right: 1880, bottom: 118 };

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);

async function open(browser, { lang = 'uk', obs = false, width = 1920, height = 1080, blockFonts = false } = {}) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.route(/tmi(\.min)?\.js/, r => r.fulfill({ contentType: 'application/javascript', body: FAKE_TMI }));
    if (blockFonts) await page.route(FONTS, r => r.abort());
    await page.clock.install({ time: new Date('2026-01-01T12:00:00') });
    await page.goto(`${PAGE}?lang=${lang}${obs ? '&obs' : ''}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    return { page, context, errors };
}
const settle = page => page.waitForTimeout(450);   // CSS transitions and the info-card fade-in run on real time

// Fills the overlay with its worst case for the current language: the longest everything, on both cards, plus a full
// leaderboard, a streamer with a long name and a tall chat card
function fillWorstCase() {
    const lang = currentLang;
    const longName = 'mwmwmwmwmwmwmwmwmwmwmwmwm';   // 25 characters, Twitch's maximum, wide letters
    const longTitle = TITLES_DB.filter(t => t.id !== DRAGON_TITLE_ID).sort((a, b) => (b.icon + b.name[lang]).length - (a.icon + a.name[lang]).length)[0];
    const longDrake = DRAKE_TYPES.filter(d => d.type !== DRAGON_TYPE).sort((a, b) => b.name[lang].length - a.name[lang].length)[0];
    const chipLen = id => effectChipText({ id, left: EFFECTS[id].count }, lang).length;
    const longest = ids => [...ids].filter(id => EFFECTS[id].lasts !== 'instant').sort((a, b) => chipLen(b) - chipLen(a)).slice(0, EFFECT_CAST.maxPerKind);
    const fx = { buff: longest(BUFF_IDS).map(id => ({ id, left: EFFECTS[id].count, power: 1 })),
                 debuff: longest(DEBUFF_IDS).map(id => ({ id, left: EFFECTS[id].count, power: 1 })),
                 meter: METER.max, halfDone: true, mirror: CLASS_ULTIMATES.mirror.nums.hits };
    let xpTo19 = 0; for (let l = 1; l < 19; l++) xpTo19 += getRequiredXP(l);
    const db = getDragonDB();
    const mk = (name, type, color) => ({ name, color, drakeObj: DRAKE_TYPES.find(d => d.type === type), title: longTitle, xp: xpTo19 + 1234, level: 19 });
    db[longName] = mk(longName, longDrake.type, '#8c8cff');
    db['w' + longName.slice(1)] = mk('w' + longName.slice(1), 'purple', '#ff7f50');
    for (let i = 0; i < 9; i++) { const n = (i + 'w' + longName).slice(0, 25); db[n] = mk(n, VIEWER_DRAKE_TYPES[i % 6].type, '#5fd4ff'); playerLeaderboardStats[n] = { wins: 999 - i, losses: 888 }; }
    saveDragonDB(db);
    updateFighterCard('p1', db[longName], fx);
    updateStatusUI(longName, 19, longDrake.type, longTitle, fx);
    updateFighterCard('p2', db['w' + longName.slice(1)], fx);
    updateStatusUI('w' + longName.slice(1), 19, 'purple', longTitle, fx);
    updateUIHP(9999, 9999, 1, 9999);
    setArenaState({ kind: 'fight', ranked: true, turn: 29 });
    matchmakingQueue = Object.keys(db).slice(0, 6);
    updateQueueUI();
    renderLeaderboard();
    showStatsCard(longName, '#8c8cff');
    return { longName, longTitle: longTitle.name[lang], longDrake: longDrake.name[lang] };
}

// Runs in the page: every way the overlay breaks — boxes that overlap their siblings, content wider or taller than its
// box (cut off), and boxes sticking out of their panel or the stage
function layoutProblems() {
    const out = [];
    const r = el => el.getBoundingClientRect();
    const k = document.getElementById('stage').getBoundingClientRect().width / 1920;
    const label = el => el.id ? '#' + el.id : (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName.toLowerCase());
    const visible = el => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && r(el).width > 0 && r(el).height > 0; };
    const overlap = (a, b) => { const A = r(a), B = r(b); return Math.min(A.right, B.right) - Math.max(A.left, B.left) > 0.5 && Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) > 0.5; };
    const inside = (a, b, pad = 0.5) => { const A = r(a), B = r(b); return A.left >= B.left - pad && A.right <= B.right + pad && A.top >= B.top - pad && A.bottom <= B.bottom + pad; };
    // 1. Siblings that must not overlap
    const groups = [
        ['#stage > #arena', '#stage > #side'],
        ['#arena > .arena-head', '#arena > .fighters-box', '#arena > .log-panel', '#arena > .queue-display-box'],
        ['#card-p1', '#card-p2', '.vs-badge'],
        ['#side > *'],
        ...['p1', 'p2'].map(p => [`#card-${p} > .fc-top`, `#card-${p} > .fc-line`, `#card-${p} > .fc-xpbar`, `#card-${p} > .fighter-stats-sub`, `#card-${p} > .fc-chips`, `#card-${p} > .power-meter`, `#card-${p} > .fc-hp`]),
        ...['p1', 'p2'].map(p => [`#card-${p} .fc-id`, `#card-${p} .sprite-wrap`]),
        ['.arena-head > #fight-type', '.arena-head > #status-plate'],
        ['#leaderboard-list > li'], ['#info-feed > li'], ['#queue-list-ui > *', '.queue-title', '#queue-hint'],
    ];
    if (!document.body.classList.contains('obs')) groups.push(['#stage > #cam-col', '#stage > #arena', '#stage > #side']);
    for (const sels of groups) {
        const els = sels.flatMap(s => [...document.querySelectorAll(s)]).filter(visible);
        for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (overlap(els[i], els[j])) out.push(`overlap: ${label(els[i])} and ${label(els[j])}`);
    }
    // 2. Content wider or taller than its box (anything with hidden overflow that holds text)
    const clipped = ['.fighter-name', '.fighter-title-badge', '.fighter-info', '.fc-xp', '.fighter-stats-sub', '.fc-chips', '.status-item', '.power-meter', '.hp-text',
        '#fight-type', '#status-plate', '.queue-display-box', '.queue-badge', '.queue-hint', '.lb-name', '.lb-sub', '.lb-row .wl', '.sc-title', '.sc-name', '.sc-sub', '#streamer-card .wl', '#info-feed', '.info-card', '.plaque', '.tab', '.panel-note'];
    for (const s of clipped) for (const el of document.querySelectorAll(s)) {
        if (!visible(el)) continue;
        // Text the game squeezed sideways (fitText's last resort) is measured as drawn: scrollWidth ignores transforms
        const sq = el.querySelector(':scope > .squeeze'), cs = getComputedStyle(el);
        const width = sq ? Math.ceil(sq.getBoundingClientRect().width / k + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) : el.scrollWidth;
        if (width > el.clientWidth + 1) out.push(`cut off (too wide): ${label(el)} "${el.innerText.slice(0, 40)}" ${width} > ${el.clientWidth}`);
        if (el.scrollHeight > el.clientHeight + 1) out.push(`cut off (too tall): ${label(el)} "${el.innerText.slice(0, 40)}" ${el.scrollHeight} > ${el.clientHeight}`);
    }
    // 3. Boxes inside their containers
    const within = [['#arena > *:not(.plaque):not(.stud)', '#arena'], ['#card-p1 > *:not(.result-tag)', '#card-p1'], ['#card-p2 > *:not(.result-tag)', '#card-p2'],
        ['#side > *', '#side'], ['#leaderboard-list > li', '#top-panel'], ['#info-feed > li', '#info-feed'], ['#arena', '#stage'], ['#side', '#stage']];
    for (const [s, c] of within) {
        const box = document.querySelector(c);
        for (const el of document.querySelectorAll(s)) if (visible(el) && !inside(el, box)) out.push(`outside its box: ${label(el)} sticks out of ${c}`);
    }
    // 4. Arena and side column where the reference puts them (stage pixels)
    const st = r(document.getElementById('stage'));
    const at = el => ({ x: Math.round((r(el).left - st.left) / k), y: Math.round((r(el).top - st.top) / k), w: Math.round(r(el).width / k) });
    const a = at(document.getElementById('arena')), s = at(document.getElementById('side'));
    if (a.x !== 500 || a.y !== 150 || a.w !== 920) out.push(`arena at ${a.x},${a.y} width ${a.w}, expected 500,150 width 920`);
    if (s.x !== 1452 || s.y !== 150 || s.w !== 428) out.push(`side column at ${s.x},${s.y} width ${s.w}, expected 1452,150 width 428`);
    // 5. The СИЛА row: on every card, between the chips and the HP bar; none on the White Dragon's card
    for (const p of ['p1', 'p2']) {
        const card = document.getElementById(`card-${p}`), meter = card.querySelector('.power-meter');
        const chips = card.querySelector('.fc-chips'), hp = card.querySelector('.fc-hp');
        if (card.classList.contains('has-dragon')) { if (visible(meter)) out.push(`#card-${p}: the White Dragon shows a СИЛА row`); continue; }
        if (!visible(meter) || !meter.querySelector('.pm-pips')) out.push(`#card-${p}: no СИЛА row`);
        else if (!(r(chips).bottom <= r(meter).top + 0.5 && r(meter).bottom <= r(hp).top + 0.5)) out.push(`#card-${p}: the СИЛА row isn't between the chips and the HP bar`);
    }
    return out;
}

// Runs in the page: elements drawn inside a region of the stage (stage pixels), with their text
function visibleIn(region) {
    const st = document.getElementById('stage').getBoundingClientRect(), k = st.width / 1920;
    const hits = [];
    for (const el of document.querySelectorAll('#stage *')) {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        const x1 = (b.left - st.left) / k, y1 = (b.top - st.top) / k, x2 = (b.right - st.left) / k, y2 = (b.bottom - st.top) / k;
        // Box shadows (frames) stick out up to 8 px plus the soft shadow: only count the element's own box
        if (Math.min(x2, region.right) - Math.max(x1, region.left) > 1 && Math.min(y2, region.bottom) - Math.max(y1, region.top) > 1) {
            if (el.closest('#cam-col') || el.id === 'cam-col') hits.push(`${el.id || el.className || el.tagName} "${(el.innerText || '').slice(0, 30)}"`);
            else hits.push(`${el.id || el.className || el.tagName}`);
        }
    }
    return [...new Set(hits)];
}

// Runs in the page: contrast of every player name against what's behind it (backgrounds blended up the tree)
function nameContrasts() {
    const parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const v = m[1].split(',').map(x => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const lum = ({ r, g, b }) => { const l = [r, g, b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; };
    const bgOf = el => {
        const layers = [];
        for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) layers.push(c); }
        let col = { r: 21, g: 23, b: 30 };   // the stage colour (#15171e); in OBS whatever is under the overlay, but every name sits on a panel
        for (const c of layers.reverse()) col = { r: c.r * c.a + col.r * (1 - c.a), g: c.g * c.a + col.g * (1 - c.a), b: c.b * c.a + col.b * (1 - c.a) };
        return col;
    };
    const names = [...document.querySelectorAll('#stage .pname, #battle-log span[style*="color"], #info-feed span[style*="color"], #info-feed b[style*="color"]')]
        .filter(el => /^@/.test((el.innerText || '').trim()) && el.getBoundingClientRect().width > 0);
    return names.map(el => {
        const fg = parse(getComputedStyle(el).color), bg = bgOf(el);
        const ratio = (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05);
        return { text: el.innerText.trim().slice(0, 30), where: el.closest('[id]') ? el.closest('[id]').id : '', ratio: Math.round(ratio * 100) / 100 };
    });
}

async function layoutChecks(browser, lang, blockFonts) {
    const tag = `[${lang}${blockFonts ? ', Google Fonts blocked' : ''}]`;
    const { page, context, errors } = await open(browser, { lang, blockFonts });
    const fontsLoaded = await page.evaluate(() => document.fonts.check('16px Rubik') && [...document.fonts].some(f => f.family.includes('Rubik') && f.status === 'loaded'));
    if (blockFonts) check(!fontsLoaded, `${tag} Rubik really isn't loaded (fallback font in use)`, 'Rubik loaded anyway');
    else check(fontsLoaded, `${tag} Rubik and Press Start 2P loaded from Google Fonts`, 'Rubik did not load (no network?)');
    const worst = await page.evaluate(fillWorstCase);
    await settle(page);
    const problems = await page.evaluate(layoutProblems);
    check(!problems.length, `${tag} worst case fits at 1920×1080: name "${worst.longName}", title "${worst.longTitle}", "${worst.longDrake}", 4 longest chips, full СИЛА + Ice Mirror, 7 leaderboard rows, a stats card`,
        problems.slice(0, 6).join(' | '));
    await page.screenshot({ path: path.join(SHOTS, `layout-worst-${lang}${blockFonts ? '-nofonts' : ''}.png`) });
    // The White Dragon's card: no СИЛА row, taller sprite, still fits
    await page.evaluate(() => {
        const dragonTitle = TITLES_DB.find(t => t.id === DRAGON_TITLE_ID);
        const d = { name: 'mwmwmwmwmwmwmwmwmwmwmwmwm', color: '#bfe9ff', drakeObj: DRAKE_TYPES.find(x => x.type === DRAGON_TYPE), title: dragonTitle, xp: 1000000 };
        updateFighterCard('p1', d, { buff: [{ id: 'divine', left: 1, power: 1 }, { id: 'blessing', left: 2, power: 1 }], debuff: [], meter: 0, halfDone: false, mirror: 0 });
        updateStatusUI(d.name, 20, DRAGON_TYPE, dragonTitle, { buff: [{ id: 'divine', left: 1, power: 1 }, { id: 'blessing', left: 2, power: 1 }], debuff: [] });
    });
    await settle(page);
    const dragonProblems = await page.evaluate(layoutProblems);
    check(!dragonProblems.length, `${tag} the White Dragon's card (3× sprite, no СИЛА row, two chips) fits`, dragonProblems.slice(0, 5).join(' | '));
    if (errors.length) fail(`${tag} page errors: ${errors.slice(0, 3).join(' | ')}`);
    await context.close();
}

(async () => {
    fs.mkdirSync(SHOTS, { recursive: true });
    const browser = await chromium.launch();
    try {
        for (const lang of ['uk', 'en']) {
            console.log(`\nLayout, ${lang}`);
            await layoutChecks(browser, lang, false);
            await layoutChecks(browser, lang, true);
        }

        console.log('\nOBS mode (?obs)');
        for (const lang of ['uk', 'en']) {
            const { page, context } = await open(browser, { lang, obs: true });
            await page.evaluate(fillWorstCase);
            await settle(page);
            const bg = await page.evaluate(() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).backgroundColor, getComputedStyle(document.getElementById('stage')).backgroundColor]);
            check(bg.every(c => c === 'rgba(0, 0, 0, 0)'), `[${lang}] transparent background (body, html, stage)`, bg.join(' / '));
            const cam = await page.evaluate(visibleIn, CAMERA), note = await page.evaluate(visibleIn, NOTIFY);
            check(!cam.length && !note.length, `[${lang}] nothing visible in the camera column or the notification strip`, `camera: ${cam.slice(0, 4).join(', ')} | notifications: ${note.slice(0, 4).join(', ')}`);
            const problems = await page.evaluate(layoutProblems);
            check(!problems.length, `[${lang}] worst case also fits in OBS mode`, problems.slice(0, 4).join(' | '));
            await page.screenshot({ path: path.join(SHOTS, `layout-obs-${lang}.png`), omitBackground: true });
            await context.close();
        }

        console.log('\nDemo controls (without ?obs)');
        {
            const { page, context, errors } = await open(browser, { lang: 'uk' });
            const where = await page.evaluate(() => {
                const cam = document.getElementById('cam-col').getBoundingClientRect();
                const menu = document.getElementById('debug-menu');
                toggleDebugMenu();   // checked open
                const ids = ['lang-toggle-btn', 'sim-msg', 'sim-chips', 'debug-menu'];
                const res = ids.map(id => { const b = document.getElementById(id).getBoundingClientRect(); return [id, b.height > 0 && b.left >= cam.left && b.right <= cam.right && b.top >= cam.top && b.bottom <= cam.bottom]; });
                toggleDebugMenu();
                return res.concat([['menu closed again', getComputedStyle(menu).display === 'none']]);
            });
            check(where.every(([, ok]) => ok), 'the language button, test menu and chat simulator sit inside the camera column', JSON.stringify(where));
            // The demo chip: 4 viewers register and queue, and a ranked fight starts
            await page.click('#sim-chips .sim-chip.demo');
            await page.clock.runFor(4000);
            const afterDemo = await page.evaluate(() => ({ drakes: Object.keys(getDragonDB()).length, running: isBattleRunning }));
            check(afterDemo.drakes >= 4 && afterDemo.running, `the demo chip works: ${afterDemo.drakes} drakes registered and a fight started`, JSON.stringify(afterDemo));
            for (let i = 0; i < 80 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(4500);
            // Typing in the simulator
            await page.fill('#sim-user', 'tester');
            await page.fill('#sim-msg', '!дрейк синій');
            await page.click('.chat-sim-row button[type=submit]');
            const typed = await page.evaluate(() => !!getDragonDB().tester);
            check(typed, 'typing a command into the chat simulator and pressing send registers a drake', 'no save for @tester');
            // The test menu opens and the test battle runs
            await page.click('button[data-i18n="btn_settings"]');
            const menuOpen = await page.evaluate(() => getComputedStyle(document.getElementById('debug-menu')).display !== 'none');
            await page.click('button[data-i18n="btn_settings"]');
            await page.clock.runFor(6000);
            await page.click('button[data-i18n="btn_test"]');
            await page.clock.runFor(500);
            const testRunning = await page.evaluate('isBattleRunning');
            check(menuOpen && testRunning, 'the test menu opens and "Run test battle" starts a fight', `menu ${menuOpen}, fight ${testRunning}`);
            for (let i = 0; i < 80 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(4500);
            await page.click('#lang-toggle-btn');
            await settle(page);
            const lang = await page.evaluate('currentLang');
            check(lang === 'en', 'the language button switches the overlay to English', `language ${lang}`);
            const problems = await page.evaluate(layoutProblems);
            check(!problems.length, 'the demo controls never cover the overlay (camera column, arena and side column don\'t overlap)', problems.slice(0, 4).join(' | '));
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }
        for (const [w, h] of [[1366, 768], [1280, 720]]) {
            const { page, context } = await open(browser, { lang: 'uk', width: w, height: h });
            const box = await page.evaluate(() => { const b = document.getElementById('stage').getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; });
            check(box.left >= 0 && box.top >= 0 && box.right <= w + 0.5 && box.bottom <= h + 0.5 && box.right > w * 0.9,
                `at ${w}×${h} the whole stage is visible (scaled to ${Math.round(box.right - box.left)}×${Math.round(box.bottom - box.top)})`, JSON.stringify(box));
            if (w === 1366) await page.screenshot({ path: path.join(SHOTS, 'layout-1366x768.png') });
            await context.close();
        }

        console.log('\n"Як грати" / "How to play"');
        for (const lang of ['uk', 'en']) {
            const { page, context } = await open(browser, { lang });
            const state = () => page.evaluate(() => ({ howto: document.querySelectorAll('#info-feed .howto').length, cards: document.querySelectorAll('#info-feed .info-card:not(.howto)').length,
                rows: [...document.querySelectorAll('#info-feed .howto .howto-cmd')].map(e => e.innerText) }));
            const s0 = await state();
            await page.evaluate(() => handleChatMessage('#test', { username: 'reader', color: '#ff7f50' }, currentLang === 'uk' ? '!дрейк червоний' : '!drake red', false));
            await page.clock.runFor(500);
            const s1 = await state();
            await page.clock.runFor(60000);   // every reply has faded out by now
            const s2 = await state();
            check(s0.howto === 1 && s0.cards === 0 && s1.howto === 0 && s1.cards >= 1 && s2.howto === 1 && s2.cards === 0,
                `[${lang}] shown on an empty chat panel (${s0.rows.join(', ')}), gone while a reply is there, back once it fades`, JSON.stringify([s0, s1, s2]));
            // Every command on the card is a real one: sent through the chat handler, each gets a reply or changes the game
            const results = await page.evaluate(rows => {
                const out = [];
                let replies = 0;
                const realAddInfo = addInfo;
                addInfo = (...a) => { replies++; return realAddInfo(...a); };
                for (const row of rows) for (const cmd of row.split(' · ')) {
                    const msg = cmd.replace('@нік', '@reader').replace('@name', '@reader');
                    const before = replies + JSON.stringify(getDragonDB()) + matchmakingQueue.length;
                    handleChatMessage('#test', { username: 'newbie' + out.length, color: '#7cc4ff', 'custom-reward-id': 'x' }, msg.startsWith('!дрейк') || msg.startsWith('!drake') ? msg : msg, false);
                    if (!msg.startsWith('!дрейк') && !msg.startsWith('!drake')) handleChatMessage('#test', { username: 'reader', color: '#7cc4ff', 'custom-reward-id': 'x' }, msg, false);
                    const after = replies + JSON.stringify(getDragonDB()) + matchmakingQueue.length;
                    out.push([msg, before !== after]);
                }
                addInfo = realAddInfo;
                return out;
            }, s0.rows);
            const dead = results.filter(([, ok]) => !ok).map(([m]) => m);
            check(!dead.length, `[${lang}] every command on the card is handled by the game: ${results.map(([m]) => m).join(', ')}`, `no effect: ${dead.join(', ')}`);
            await context.close();
        }

        console.log('\nPlayer name contrast');
        for (const lang of ['uk', 'en']) {
            const { page, context } = await open(browser, { lang });
            // Very dark Twitch colours everywhere a name appears: cards, leaderboard, streamer card, queue, chat, log, header
            await page.evaluate(() => {
                const dark = ['#000000', '#0000ff', '#1b1b1b', '#3a0000', '#2e1a47', '#003300'];
                setStreamerUser('darkstreamer');
                const say = (u, m, c) => handleChatMessage('#test', { username: u, color: c }, m, false);
                say('darkstreamer', currentLang === 'uk' ? '!дрейк білий' : '!drake white', '#000000');
                ['nightowl', 'bluebird', 'charcoal', 'oxblood', 'plum', 'forest'].forEach((u, i) => say(u, currentLang === 'uk' ? '!дрейк червоний' : '!drake red', dark[i]));
                ['nightowl', 'bluebird', 'charcoal'].forEach((u, i) => say(u, currentLang === 'uk' ? '!черга' : '!queue', dark[i]));
                say('plum', currentLang === 'uk' ? '!стата' : '!stats', '#2e1a47');
            });
            await page.clock.runFor(4500 * 4);
            const during = await page.evaluate(nameContrasts);
            for (let i = 0; i < 80 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(4500);
            await settle(page);
            const after = await page.evaluate(nameContrasts);
            const all = [...during, ...after], low = all.filter(n => n.ratio < 4.5);
            const where = [...new Set(all.map(n => n.where))].join(', ');
            check(all.length > 15 && !low.length, `[${lang}] ${all.length} player names (in ${where}) all at ≥ 4.5:1 contrast with dark Twitch colours (lowest ${Math.min(...all.map(n => n.ratio))}:1)`,
                low.slice(0, 5).map(n => `${n.text} in #${n.where}: ${n.ratio}:1`).join(' | ') || `only ${all.length} names found`);
            await context.close();
        }

        console.log('\nWinner and loser cards');
        for (const lang of ['uk', 'en']) {
            const { page, context } = await open(browser, { lang });
            await page.evaluate(() => {
                const say = (u, m) => handleChatMessage('#test', { username: u, color: '#ff7f50' }, m, false);
                say('alpha', currentLang === 'uk' ? '!дрейк червоний' : '!drake red'); say('omega', currentLang === 'uk' ? '!дрейк синій' : '!drake blue');
                say('alpha', currentLang === 'uk' ? '!черга' : '!queue'); say('omega', currentLang === 'uk' ? '!черга' : '!queue');
            });
            for (let i = 0; i < 80 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(4500);
            await page.clock.runFor(300);
            await settle(page);
            const res = await page.evaluate(() => ['p1', 'p2'].map(p => {
                const card = document.getElementById(`card-${p}`), tag = document.getElementById(`result-${p}`);
                return { name: document.getElementById(`name-${p}`).innerText, winner: card.classList.contains('is-winner'), loser: card.classList.contains('is-loser'),
                         tag: getComputedStyle(tag).display !== 'none' ? tag.innerText : '', gray: getComputedStyle(card.querySelector('.drake-sprite')).filter };
            }));
            const winnerName = await page.evaluate(() => (arenaState.winner || {}).name);
            const [W, L] = lang === 'uk' ? ['ПЕРЕМОЖЕЦЬ', 'НОКАУТ'] : ['WINNER', 'KNOCKED OUT'];
            const w = res.find(c => c.winner), l = res.find(c => c.loser);
            check(w && l && w.tag === W && l.tag === L && w.name === '@' + winnerName && /grayscale/.test(l.gray),
                `[${lang}] the winner (${w && w.name}) is framed in gold with "${W}", the loser greyed with "${L}"`, JSON.stringify(res));
            const plate = await page.evaluate(() => document.getElementById('status-plate').innerText);
            check(plate.includes('@' + winnerName.toUpperCase()) || plate.includes('@' + winnerName), `[${lang}] the status plate names the winner ("${plate}")`, plate);
            await page.screenshot({ path: path.join(SHOTS, `layout-result-${lang}.png`) });
            // A draw shows neither label
            await page.evaluate(() => setArenaState({ kind: 'result', ranked: true, winner: null, turns: 30 }));
            const draw = await page.evaluate(() => ['p1', 'p2'].map(p => document.getElementById(`card-${p}`).className));
            check(draw.every(c => !/is-winner|is-loser/.test(c)), `[${lang}] a draw marks neither card`, draw.join(' | '));
            await context.close();
        }
    } finally {
        await browser.close();
    }
    console.log(failures ? `\n${failures} layout check(s) failed. Screenshots: tests/screenshots/` : '\nAll layout checks passed. Screenshots: tests/screenshots/');
    process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
