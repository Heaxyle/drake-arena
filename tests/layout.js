// Layout test for the 1920×1080 overlay (design/redesign-reference.html), in both languages. Opens the page in headless
// Chromium, kept off Twitch (tests/no_twitch.js) and on a fake clock, like ui.js, and checks:
//   - worst-case fighter cards (longest name, title, drake name and chips in that language, full meter, Ice Mirror),
//     a full leaderboard and streamer card: nothing overlaps, overflows its box or gets cut off; every card has its
//     СИЛА row between the chips and the HP bar (the White Dragon has none)
//   - at startup nothing is loaded from the network but Twitch chat (the page's own tmi.js runs, its WebSocket is held so
//     no live chat gets in), and the embedded fonts draw Latin and Ukrainian (і ї є ґ)
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
const { settleArena } = require('./settle');
const { pageInit } = require('./page_hooks');
const { offTwitch } = require('./no_twitch');
const { tourneyScreens, SIZES } = require('./tourney_layout');
const { overlayIconIssues, overlaySelfTest } = require('./overlay_icons');
// The overlay check, at every screenshot (both languages): no emoji on stream, every icon at a whole-number scale
const iconIssues = new Set();
const iconCheck = async (page, where) => (await overlayIconIssues(page)).forEach(i => iconIssues.add(`${where}: ${i}`));
const SEED = Number(process.env.UI_SEED || 3);   // seeded fights: the same every run

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PAGE = 'file:///' + path.join(ROOT, 'showcase/index.html').replace(/\\/g, '/');

// Regions that must stay empty on stream (from the reference): the camera column and the notification strip
const CAMERA = { left: 0, top: 0, right: 476, bottom: 1080 };
const NOTIFY = { left: 500, top: 0, right: 1880, bottom: 118 };

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);

async function open(browser, { lang = 'uk', obs = false, width = 1920, height = 1080, dpr = 1 } = {}) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });   // the icons' stills (prefers-reduced-motion), so the screenshots are the same on every run
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await offTwitch(page);
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));   // game time only moves when the test moves it
    await page.addInitScript(pageInit, SEED);
    await page.goto(`${PAGE}?lang=${lang}${obs ? '&obs' : ''}`);
    await page.evaluate(() => document.fonts.ready);
    await settleArena(page);
    return { page, context, errors };
}
// Every visual check first pauses the game clock and lets the arena's animations finish (one shared helper)
const settle = settleArena, settleBars = settleArena;

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
    const within = [['#arena > *:not(.plaque):not(.stud)', '#arena'], ['#card-p1 > *:not(.result-tag):not(.fx-layer)', '#card-p1'], ['#card-p2 > *:not(.result-tag):not(.fx-layer)', '#card-p2'],
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
    // 6. The chips on one card shrink together: all the same font size
    for (const p of ['p1', 'p2']) {
        const sizes = [...document.querySelectorAll(`#status-${p} .status-item`)].map(el => getComputedStyle(el).fontSize);
        if (new Set(sizes).size > 1) out.push(`#status-${p}: chips at different sizes (${sizes.join(', ')})`);
    }
    // 7. The fighters face each other near the VS badge: the left drake is mirrored (its two canvases only — .sprite-wrap
    //    and .sprite-bob animate transform), the right one isn't; each sprite is on the VS side of its card, both the same
    //    distance from the badge; the name and title stay inside their column, left-aligned on p1, right-aligned on p2
    const vs = r(document.querySelector('.vs-badge'));
    const mirrored = el => { const t = getComputedStyle(el).transform; return t !== 'none' && new DOMMatrix(t).a < 0; };
    const gaps = {};
    for (const p of ['p1', 'p2']) {
        const card = document.getElementById(`card-${p}`), wrap = card.querySelector('.sprite-wrap'), col = r(card.querySelector('.fc-id'));
        for (const el of card.querySelectorAll('.drake-sprite, .sprite-flash')) if (mirrored(el) !== (p === 'p1')) out.push(`#card-${p} .${el.classList[0]} ${p === 'p1' ? "isn't mirrored (the drake faces away from the centre)" : 'is mirrored'}`);
        for (const el of [wrap, card.querySelector('.sprite-bob')]) if (mirrored(el)) out.push(`#card-${p} .${el.classList[0]} is mirrored (only the canvases should be)`);
        const W = r(wrap);
        // Every sprite at exactly 3× its pixels: drakes 48×36 → 144×108, the White Dragon 60×42 → 180×126
        const cv = card.querySelector('.drake-sprite'), S = r(cv), want = card.classList.contains('has-dragon') ? [180, 126] : [144, 108];
        if (cv.width * 3 !== want[0] || cv.height * 3 !== want[1]) out.push(`#card-${p}: a ${cv.width}×${cv.height} sprite on a ${card.classList.contains('has-dragon') ? 'dragon' : 'drake'} card`);
        for (const [what, B] of [['sprite box', W], ['sprite', S]])
            if (Math.abs(B.width - want[0]) > 0.5 || Math.abs(B.height - want[1]) > 0.5) out.push(`#card-${p}: the ${what} is ${Math.round(B.width)}×${Math.round(B.height)}, not ${want.join('×')} (exactly 3×)`);
        if (p === 'p1' ? W.left < col.right - 0.5 : W.right > col.left + 0.5) out.push(`#card-${p}: the sprite isn't on the VS side of the name column`);
        gaps[p] = Math.round(p === 'p1' ? vs.left - W.right : W.left - vs.right);
        for (const el of [document.getElementById(`name-${p}`), card.querySelector('.fighter-title-badge')]) {
            if (!el || !visible(el)) continue;
            const box = r(el), sq = el.querySelector(':scope > .squeeze'), drawn = sq ? r(sq) : box;
            if (Math.min(box.left, drawn.left) < col.left - 1 || Math.max(box.right, drawn.right) > col.right + 1)
                out.push(`#card-${p} ${label(el)} at ${Math.round(Math.min(box.left, drawn.left))}–${Math.round(Math.max(box.right, drawn.right))}, outside its column ${Math.round(col.left)}–${Math.round(col.right)}`);
            const off = p === 'p1' ? box.left - col.left : col.right - box.right;
            if (Math.abs(off) > 1.5) out.push(`#card-${p} ${label(el)} isn't ${p === 'p1' ? 'left' : 'right'}-aligned (${Math.round(off)} px from the column edge)`);
        }
    }
    if (Math.abs(gaps.p1 - gaps.p2) > 1) out.push(`the sprites aren't the same distance from the VS badge: ${gaps.p1} and ${gaps.p2} px`);
    // 8. The bars are mirrored on the right card: the HP number sits next to the VS badge (drawn against the VS edge of
    //    its box), the HP, ghost and XP fills grow from the outer edge; the info line, stats and chips stay left-aligned on
    //    both cards; the HP rows of the two cards are level (the White Dragon's card too)
    const hpRows = {};
    for (const p of ['p1', 'p2']) {
        const card = document.getElementById(`card-${p}`), outer = p === 'p1' ? 'left' : 'right';
        const track = r(card.querySelector('.hp-bar-container')), textEl = document.getElementById(`hp-text-${p}`), T = r(textEl);
        if (p === 'p1' ? T.left < track.right - 0.5 : T.right > track.left + 0.5) out.push(`#card-${p}: the HP number isn't on the VS side of its bar`);
        const sq = textEl.querySelector(':scope > .squeeze'), range = document.createRange();
        range.selectNodeContents(sq || textEl);
        const drawn = sq ? r(sq) : range.getBoundingClientRect();
        const off = p === 'p1' ? T.right - drawn.right : drawn.left - T.left;
        if (drawn.width > 0 && Math.abs(off) > 1.5) out.push(`#card-${p}: the HP number is drawn ${Math.round(off)} px from the VS edge of its box`);
        for (const el of [document.getElementById(`bar-${p}`), document.getElementById(`ghost-${p}`), document.getElementById(`xpbar-${p}`)]) {
            const ox = parseFloat(getComputedStyle(el).transformOrigin), w = el.offsetWidth;
            if (Math.abs(ox - (outer === 'left' ? 0 : w)) > 0.5) out.push(`#card-${p} #${el.id} doesn't grow from the ${outer} (outer) edge: transform-origin x = ${ox} of ${w}`);
        }
        const line = r(card.querySelector('.fc-line'));
        for (const [el, box] of [[document.getElementById(`info-${p}`), line], [card.querySelector('.fighter-stats-sub > *'), r(card.querySelector('.fighter-stats-sub'))], [card.querySelector(`#status-${p} .status-item`), r(document.getElementById(`status-${p}`))]])
            if (el && visible(el) && Math.abs(r(el).left - box.left) > 1.5) out.push(`#card-${p} ${label(el)} isn't left-aligned (${Math.round(r(el).left - box.left)} px in)`);
        hpRows[p] = r(card.querySelector('.fc-hp'));
    }
    if (Math.abs(hpRows.p1.top - hpRows.p2.top) > 1 || Math.abs(hpRows.p1.bottom - hpRows.p2.bottom) > 1) out.push(`the HP rows aren't level: ${Math.round(hpRows.p1.top)} and ${Math.round(hpRows.p2.top)}`);
    return out;
}

// Runs in the page: where each card's bars fill from, with partial values. Sets the HP fill to 50% and its ghost to 80%
// (transitions off), the XP fill to 30%, and the СИЛА meter to 2 of 5 and then full with the game's renderPowerMeter;
// puts everything back. The fill must touch the outer edge, the ghost's visible part (lost HP) sit on the VS side of the
// fill, the lit pips sit at the outer end, the label at the outer end of the row and the count / "✦ READY" on the VS side
function barSides() {
    const out = [], R = el => el.getBoundingClientRect();
    for (const p of ['p1', 'p2']) {
        const card = document.getElementById(`card-${p}`), left = p === 'p1';
        const outerGap = (el, box) => left ? R(el).left - R(box).left : R(box).right - R(el).right;
        const bar = document.getElementById(`bar-${p}`), ghost = document.getElementById(`ghost-${p}`), xp = document.getElementById(`xpbar-${p}`);
        const saved = [bar, ghost, xp].map(el => [el.style.transition, el.style.transform]);
        [[bar, 0.5], [ghost, 0.8], [xp, 0.3]].forEach(([el, s]) => { el.style.transition = 'none'; el.style.transform = `scaleX(${s})`; });
        const track = bar.parentElement, B = R(bar), G = R(ghost), Tr = R(track);
        if (Math.abs(outerGap(bar, track)) > 1) out.push(`#card-${p}: the HP fill doesn't start at the outer edge (${Math.round(outerGap(bar, track))} px off)`);
        if (Math.abs(outerGap(xp, xp.parentElement)) > 1) out.push(`#card-${p}: the XP fill doesn't start at the outer edge (${Math.round(outerGap(xp, xp.parentElement))} px off)`);
        // the ghost's visible part: from the fill's end towards the VS side
        const lost = left ? [B.right, G.right] : [G.left, B.left];
        if (!(lost[1] - lost[0] > 0.25 * Tr.width && (left ? G.left <= B.left + 1 : G.right >= B.right - 1))) out.push(`#card-${p}: the HP ghost (lost HP) isn't on the VS side of the fill (fill ${Math.round(B.left)}–${Math.round(B.right)}, ghost ${Math.round(G.left)}–${Math.round(G.right)})`);
        [bar, ghost, xp].forEach((el, i) => { el.style.transition = 'none'; el.style.transform = saved[i][1]; void el.offsetWidth; el.style.transition = saved[i][0]; });
        if (card.classList.contains('has-dragon')) continue;   // no СИЛА row (checked in layoutProblems)
        const meter = document.getElementById(`power-${p}`), html = meter.innerHTML, cls = meter.className, title = meter.title;
        for (const v of [2, METER.max]) {
            renderPowerMeter(p, 'red', { meter: v });
            const pips = [...meter.querySelectorAll('.pm-pip')], on = pips.filter(x => x.classList.contains('on')), pipsBox = R(meter.querySelector('.pm-pips'));
            const lab = R(meter.querySelector('.pm-label')), tail = meter.querySelector(v >= METER.max ? '.pm-ready' : '.pm-count');
            const outerFirst = [...pips].sort((a, b) => left ? R(a).left - R(b).left : R(b).left - R(a).left);
            if (on.length !== v || outerFirst.slice(0, v).some(x => !x.classList.contains('on'))) out.push(`#card-${p}: with ${v} of ${METER.max} the lit СИЛА pips aren't at the outer end`);
            if (left ? lab.right > pipsBox.left + 0.5 : lab.left < pipsBox.right - 0.5) out.push(`#card-${p}: the СИЛА label isn't at the outer end of the row`);
            if (!tail || (left ? R(tail).left < pipsBox.right - 0.5 : R(tail).right > pipsBox.left + 0.5)) out.push(`#card-${p}: "${tail ? tail.textContent : '?'}" isn't on the VS side of the pips`);
            const M = R(meter);
            for (const c of meter.children) if (R(c).left < M.left - 0.5 || R(c).right > M.right + 0.5) out.push(`#card-${p}: the СИЛА row's ${c.className} sticks out of the row`);
        }
        meter.innerHTML = html; meter.className = cls; meter.title = title;
    }
    return out;
}

// Runs in the page: drops a damage number and a small "back" number on each card (the game's own fvPop) and says
// whether each one's centre lands over that card's drake; removes them again
function popPositions() {
    const out = [];
    for (const p of ['p1', 'p2']) {
        fvPop(p, '-99', 'crit');
        fvPop(p, '+9', 'small heal', 1);
        const card = document.getElementById(`card-${p}`), W = card.querySelector('.sprite-wrap').getBoundingClientRect();
        for (const pop of card.querySelectorAll('.dmg-pop')) {
            const P = pop.getBoundingClientRect(), x = (P.left + P.right) / 2, y = (P.top + P.bottom) / 2;
            out.push({ p, text: pop.textContent, over: x >= W.left && x <= W.right && y >= W.top && y <= W.bottom,
                       at: `${Math.round(x)},${Math.round(y)}`, drake: `${Math.round(W.left)}–${Math.round(W.right)} × ${Math.round(W.top)}–${Math.round(W.bottom)}` });
            pop.remove();
        }
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

// Runs in the page: does each card's HP number match its bar? "h/max" needs the bar at h/max of its track (±1%) in
// the colour for that share (green above 50%, yellow from 25%, red below); a waiting card shows "—" and an empty bar.
// Returns null while either bar is still fading (a turn landed just before the read): the caller waits and asks again.
function hpAgreement() {
    if (['bar-p1', 'bar-p2'].some(id => document.getElementById(id).getAnimations().length)) return null;
    return ['p1', 'p2'].map(p => {
        const text = document.getElementById(`hp-text-${p}`).innerText.trim(), bar = document.getElementById(`bar-${p}`);
        const share = 100 * bar.getBoundingClientRect().width / bar.parentElement.clientWidth / (document.getElementById('stage').getBoundingClientRect().width / 1920);
        const colour = getComputedStyle(bar).backgroundColor;
        if (text === '—') return { p, problem: share > 0.5 ? `"—" but the bar is ${share.toFixed(1)}% full` : '' };
        const m = /^(\d+)\/(\d+)$/.exec(text);
        if (!m) return { p, problem: `unreadable HP text "${text}"` };
        const pct = 100 * m[1] / m[2];
        const want = pct > 50 ? 'rgb(61, 220, 132)' : pct >= 25 ? 'rgb(255, 197, 61)' : 'rgb(255, 93, 82)';
        const problems = [];
        if (Math.abs(share - pct) > 1) problems.push(`"${text}" (${pct.toFixed(1)}%) but the bar is ${share.toFixed(1)}% full`);
        if (pct > 0 && colour !== want) problems.push(`"${text}" but the bar is ${colour}, expected ${want}`);
        return { p, problem: problems.join('; ') };
    });
}

// Colour helpers for the frame checks: CIEDE2000 colour difference, HSL, WCAG contrast
const rgbOf = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
function hslOf(hex) {
    const [r, g, b] = rgbOf(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    if (!d) return { h: 0, s: 0, l };
    const x = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: Math.round((x * 60 + 360) % 360), s: Math.round(100 * d / (1 - Math.abs(2 * l - 1))) / 100, l: Math.round(100 * l) / 100 };
}
const linear = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const luminance = hex => { const [r, g, b] = rgbOf(hex).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
function labOf(hex) {
    const [r, g, b] = rgbOf(hex).map(linear);
    const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
    const x = f((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047), y = f(r * 0.2126 + g * 0.7152 + b * 0.0722), z = f((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
function de2000(c1, c2) {
    const [L1, a1, b1] = labOf(c1), [L2, a2, b2] = labOf(c2), rad = Math.PI / 180;
    const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2, G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
    const a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
    const hp = (b, a) => { if (!b && !a) return 0; const h = Math.atan2(b, a) / rad; return h < 0 ? h + 360 : h; };
    const h1p = hp(b1, a1p), h2p = hp(b2, a2p);
    let dh = 0; if (C1p * C2p) { dh = h2p - h1p; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
    const dL = L2 - L1, dC = C2p - C1p, dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh / 2 * rad), Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
    let hb = h1p + h2p; if (C1p * C2p) { if (Math.abs(h1p - h2p) > 180) hb += h1p + h2p < 360 ? 360 : -360; hb /= 2; }
    const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
    const dTh = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
    const Sl = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), Sc = 1 + 0.045 * Cbp, Sh = 1 + 0.015 * Cbp * T, Rt = -Math.sin(2 * dTh * rad) * Rc;
    return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

async function layoutChecks(browser, lang) {
    const tag = `[${lang}]`;
    const { page, context, errors } = await open(browser, { lang });
    const fontsLoaded = await page.evaluate(() => document.fonts.check('16px Rubik') && [...document.fonts].some(f => f.family.includes('Rubik') && f.status === 'loaded'));
    check(fontsLoaded, `${tag} Rubik and Press Start 2P loaded (embedded in the page)`, 'Rubik did not load');
    const worst = await page.evaluate(fillWorstCase);
    await settle(page);
    const problems = await page.evaluate(layoutProblems);
    check(!problems.length, `${tag} worst case fits at 1920×1080: name "${worst.longName}", title "${worst.longTitle}", "${worst.longDrake}", 4 longest chips, full СИЛА + Ice Mirror, 7 leaderboard rows, a stats card`,
        problems.slice(0, 6).join(' | '));
    await iconCheck(page, `layout-worst-${lang}`);
    if (lang === 'uk') { const missed = await overlaySelfTest(page); check(!missed.length, "the overlay check reports a planted emoji, an icon at ×1.5, a squeezed icon, an icon over its words, an icon with another icon's art, an icon smoothed or pixelated against the display rule and a badge glyph a pixel off", `not reported: ${missed.join(', ')}`); }
    await page.screenshot({ path: path.join(SHOTS, `layout-worst-${lang}.png`) });
    const pops = await page.evaluate(popPositions);
    check(pops.length === 4 && pops.every(x => x.over), `${tag} hit numbers pop over each card's drake (a hit and a small "back" number on both cards)`, JSON.stringify(pops.filter(x => !x.over)));
    const sides = await page.evaluate(barSides);
    check(!sides.length, `${tag} the bars fill from the outer edge on both cards (lost HP and the СИЛА count / ready on the VS side)`, sides.slice(0, 5).join(' | '));
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
    // ...and on the right card, where its sprite sits on the VS side
    await page.evaluate(() => {
        const dragonTitle = TITLES_DB.find(t => t.id === DRAGON_TITLE_ID);
        const d = { name: 'wmwmwmwmwmwmwmwmwmwmwmwmw', color: '#bfe9ff', drakeObj: DRAKE_TYPES.find(x => x.type === DRAGON_TYPE), title: dragonTitle, xp: 1000000 };
        updateFighterCard('p2', d, { buff: [], debuff: [], meter: 0, halfDone: false, mirror: 0 });
        updateStatusUI(d.name, 20, DRAGON_TYPE, dragonTitle, { buff: [], debuff: [] });
    });
    await settle(page);
    const dragonRight = await page.evaluate(layoutProblems);
    check(!dragonRight.length, `${tag} the White Dragon on the right card fits, its sprite on the VS side`, dragonRight.slice(0, 5).join(' | '));
    // Both cards now show the dragon: its sprite box is exactly 3× (180×126) on either card, not the drakes' 144×108
    const dragonBoxes = await page.evaluate(() => ['p1', 'p2'].map(p => [`#card-${p} .sprite-wrap`, `#card-${p} .drake-sprite`]
        .map(s => { const R = document.querySelector(s).getBoundingClientRect(); return `${Math.round(R.width)}×${Math.round(R.height)}`; }).join(' / ')));
    check(dragonBoxes.every(s => s === '180×126 / 180×126'), `${tag} the White Dragon's sprite box is 180×126 (exactly 3×) on either card`, dragonBoxes.join(', '));
    const dragonPops = await page.evaluate(popPositions);
    check(dragonPops.length === 4 && dragonPops.every(x => x.over), `${tag} hit numbers pop over the White Dragon on either card`, JSON.stringify(dragonPops.filter(x => !x.over)));
    const dragonSides = await page.evaluate(barSides);
    check(!dragonSides.length, `${tag} the White Dragon's bars fill from the outer edge on either card`, dragonSides.slice(0, 5).join(' | '));
    if (errors.length) fail(`${tag} page errors: ${errors.slice(0, 3).join(' | ')}`);
    await context.close();
}

// At startup the overlay loads nothing from the network but Twitch chat: every request is the page itself (file:) or
// embedded (data:), and the only connection is the WebSocket to Twitch's chat. The page's own tmi.js runs here (no
// stand-in) and Playwright holds that WebSocket, so it never reaches Twitch and no live chat gets in. And the embedded
// fonts draw the page's text: Latin and Cyrillic, Ukrainian і ї є ґ included, in both fonts and Rubik's weights
async function startupNetwork(browser) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    const requests = [], sockets = [], errors = [];
    page.on('pageerror', e => errors.push(e.message));
    context.on('request', r => requests.push(r.url()));
    await page.routeWebSocket(/./, ws => sockets.push(ws.url()));   // every WebSocket is held here: none reaches a server
    await page.goto(`${PAGE}?lang=uk`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);              // tmi.js opens its connection as the page starts
    const network = requests.filter(u => !/^(file|data|blob):/.test(u));
    check(!network.length && sockets.length > 0 && sockets.every(u => /^wss:\/\/irc-ws\.chat\.twitch\.tv(:443)?\/?$/.test(u)) && !errors.length,
        `at startup nothing comes from the network but Twitch chat: ${requests.length} request(s), all the page itself or embedded; the only connection is Twitch's chat (${[...new Set(sockets)].join(', ')})`,
        JSON.stringify({ network, sockets, errors }));
    const fonts = await page.evaluate(async () => {
        const c = document.createElement('canvas').getContext('2d');
        const width = (font, text) => { c.font = font; return c.measureText(text).width; };
        const out = [];
        for (const [family, weight] of [['Press Start 2P', 400], ['Rubik', 400], ['Rubik', 600], ['Rubik', 800]]) {
            await document.fonts.load(`${weight} 32px "${family}"`, 'AZaz іїєґ');
            const own = text => width(`${weight} 32px "${family}", monospace`, text) !== width(`${weight} 32px monospace`, text);
            out.push({ font: `${family} ${weight}`, latin: own('AZaz'), ukrainian: own('іїєґ'), each: ['і', 'ї', 'є', 'ґ'].every(own) });
        }
        return out;
    });
    check(fonts.every(f => f.latin && f.ukrainian && f.each),
        `the embedded fonts draw Latin and Ukrainian (і ї є ґ, each): ${fonts.map(f => f.font).join(', ')}`, JSON.stringify(fonts));
    await context.close();
}

// The V2 icons beyond the screenshots' stills (every other check here runs under prefers-reduced-motion). On a full
// overlay (the worst-case cards with their chips and title badges, the medal after a fighter's name, the Top with medals,
// !стата, a legendary title roll with its ×3 badge, the odds card, the title plate): while motion is allowed every icon
// shows its loop; turning prefers-reduced-motion on swaps every one to its still, the medal after the name too, and turning
// it off brings the loops back; the overlay check holds in each. At devicePixelRatio 2 (a 4K canvas) the overlay check
// holds with the ×2 icons pixelated (their art 1:1) and the ×1 and ×3 ones smoothed; at 1 (1080p) every icon is smoothed.
async function iconScene(page) {
    await page.evaluate(fillWorstCase);
    await page.evaluate(() => {   // the medals: gold for the left fighter (on its card and in its !стата), silver and bronze for two of the Top
        const left = document.getElementById('name-p1').innerText.replace('@', '').trim(), top = Object.keys(getDragonDB()).filter(n => /^\d/.test(n));
        saveHonours({ ...getHonours(), holders: [left, top[0], top[1]], medals: { [left]: [1, 2, 0] } });
    });
    await page.evaluate(fillWorstCase);   // again, with the medals
    await page.evaluate(() => { showTitleRoll('goldfinch', '#ffd166', TITLES_DB.find(t => t.id === 99)); showOddsCard(); });
}
function iconTally() {
    const icons = [...document.querySelectorAll('#stage img.px-icon')].filter(i => !i.closest('#cam-col, #battle-log'));
    const shows = k => icons.filter(i => i.getAttribute('src') === ICONS_V2[i.dataset.icon][k]).length;
    const medal = document.querySelector('#stage .fighter-name[data-medal]'), art = medal && ICONS_V2[medal.dataset.medal];
    const bg = medal && getComputedStyle(medal, '::after').backgroundImage;
    const by = s => icons.filter(i => i.dataset.s === s);
    const drawn = (list, r) => list.filter(i => getComputedStyle(i).imageRendering === r).length;
    return {
        icons: icons.length, loops: shows('anim'), stills: shows('still'), badges: document.querySelectorAll('#stage .px-badge').length,
        medal: !medal ? 'none' : bg === `url("${art.anim}")` ? 'loop' : bg === `url("${art.still}")` ? 'still' : 'other',
        x1: by('1').length, x2: by('2').length, x3: by('3').length,
        x2crisp: drawn(by('2'), 'pixelated'), x13smooth: drawn([...by('1'), ...by('3')], 'auto'), smooth: drawn(icons, 'auto'),
    };
}
async function iconLoopsAndStills(browser) {
    {
        const { page, context, errors } = await open(browser, { lang: 'uk' });   // opened under prefers-reduced-motion
        await iconScene(page);
        // A media change reaches the page at its next rendering update: settle gives it that (real time), then the count
        const state = async reducedMotion => { if (reducedMotion) await page.emulateMedia({ reducedMotion }); await settle(page); return [await page.evaluate(iconTally), await overlayIconIssues(page)]; };
        const [first, firstIssues] = await state(null);
        const [moving, movingIssues] = await state('no-preference');
        const [still, stillIssues] = await state('reduce');
        const [back, backIssues] = await state('no-preference');
        check(first.stills === first.icons && first.medal === 'still' && !firstIssues.length,
            `opened under prefers-reduced-motion, every icon shows its still: ${first.icons} icons (${first.x1} at ×1, ${first.x2} at ×2, ${first.x3} at ×3, ${first.badges} title badges) and the medal after a fighter's name`,
            JSON.stringify({ first, issues: firstIssues.slice(0, 4) }));
        check(moving.icons >= 40 && moving.badges >= 3 && moving.x1 && moving.x2 && moving.x3 && moving.icons === first.icons && moving.loops === moving.icons && moving.medal === 'loop' && !movingIssues.length,
            'prefers-reduced-motion off: every one swaps to its loop, the medal too', JSON.stringify({ moving, issues: movingIssues.slice(0, 4) }));
        check(still.stills === still.icons && still.icons === first.icons && still.medal === 'still' && !stillIssues.length,
            'on again: all back to their stills', JSON.stringify({ still, issues: stillIssues.slice(0, 4) }));
        check(back.loops === back.icons && back.icons === first.icons && back.medal === 'loop' && !backIssues.length,
            'off again: the loops are back', JSON.stringify({ back, issues: backIssues.slice(0, 4) }));
        check(moving.smooth === moving.icons, `at devicePixelRatio 1 (1080p) every icon is smoothed: its art is ${await page.evaluate(() => ICON_DENSITY)}× denser than the screen`, JSON.stringify(moving));
        if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
        await context.close();
    }
    {
        const { page, context, errors } = await open(browser, { lang: 'uk', dpr: 2 });
        await iconScene(page);
        await settle(page);
        const t = await page.evaluate(iconTally), issues = await overlayIconIssues(page);
        const shot = path.join(SHOTS, 'layout-icons-4k.png');
        await page.screenshot({ path: shot, clip: { x: 500, y: 118, width: 1380, height: 520 } });
        check(t.icons === t.stills && t.x2 && t.x2crisp === t.x2 && t.x13smooth === t.x1 + t.x3 && !issues.length,
            `at devicePixelRatio 2 (a 4K canvas) the ${t.x2} icons at ×2 are pixelated (their art 1:1) and the ${t.x1 + t.x3} at ×1 and ×3 smoothed (layout-icons-4k.png)`,
            JSON.stringify({ t, issues: issues.slice(0, 4) }));
        if (errors.length) fail(`page errors at devicePixelRatio 2: ${errors.slice(0, 3).join(' | ')}`);
        await context.close();
    }
}

(async () => {
    fs.mkdirSync(SHOTS, { recursive: true });
    const browser = await chromium.launch();
    try {
        for (const lang of ['uk', 'en']) {
            console.log(`\nLayout, ${lang}`);
            await layoutChecks(browser, lang);
        }

        console.log('\nThe V2 icons: loops, stills, the display rule');
        await iconLoopsAndStills(browser);

        console.log('\nStartup: nothing from the network but Twitch chat');
        await startupNetwork(browser);

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
            await iconCheck(page, `layout-obs-${lang}`);
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
            await page.clock.runFor(1000);   // the result is drawn when the last hit lands (0.6 s)
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
                `[${lang}] the winner (${w && w.name}) is framed in gold with "${W}", the loser greyed with "${L}"`, JSON.stringify(res) + ' ' + await page.evaluate(() => JSON.stringify({ kind: arenaState.kind, turn: arenaState.turn, running: isBattleRunning, hold: !!fv.hold, log: [...document.getElementById('battle-log').children].slice(-2).map(x => x.textContent) })));
            const plate = await page.evaluate(() => document.getElementById('status-plate').innerText);
            check(plate.includes('@' + winnerName.toUpperCase()) || plate.includes('@' + winnerName), `[${lang}] the status plate names the winner ("${plate}")`, plate);
            await iconCheck(page, `layout-result-${lang}`);
            await page.screenshot({ path: path.join(SHOTS, `layout-result-${lang}.png`) });
            // A draw frames neither card as the winner or the loser (both say «Нічия»; fightview.js checks the tags)
            await page.evaluate(() => setArenaState({ kind: 'result', ranked: true, winner: null, turns: 30 }));
            const draw = await page.evaluate(() => ['p1', 'p2'].map(p => document.getElementById(`card-${p}`).className));
            check(draw.every(c => !/is-winner|is-loser/.test(c)), `[${lang}] a draw marks neither card`, draw.join(' | '));
            await context.close();
        }
        console.log('\nHP bar colour at the thresholds');
        {
            const { page, context } = await open(browser, { lang: 'uk' });
            // Green above 50%, yellow from 25% up to 50%, red below 25%: both sides of each threshold, on both cards
            const cases = [[1000, 'green'], [501, 'green'], [500, 'yellow'], [251, 'yellow'], [250, 'yellow'], [249, 'red'], [1, 'red'], [0, 'red']];
            const RGB = { green: 'rgb(61, 220, 132)', yellow: 'rgb(255, 197, 61)', red: 'rgb(255, 93, 82)' };
            const wrong = [];
            for (let i = 0; i < cases.length; i++) {
                const [hp1, want1] = cases[i], [hp2, want2] = cases[cases.length - 1 - i];
                await page.evaluate(([a, b]) => updateUIHP(a, 1000, b, 1000), [hp1, hp2]);
                await settleBars(page);   // the colour fades over 0.3 s of real time
                const got = await page.evaluate(() => ['p1', 'p2'].map(p => getComputedStyle(document.getElementById(`bar-${p}`)).backgroundColor));
                if (got[0] !== RGB[want1]) wrong.push(`p1 at ${hp1 / 10}%: ${got[0]}, expected ${want1}`);
                if (got[1] !== RGB[want2]) wrong.push(`p2 at ${hp2 / 10}%: ${got[1]}, expected ${want2}`);
            }
            check(!wrong.length, `HP bars on both cards: green at 100% and 50.1%, yellow at 50%, 25.1% and 25%, red at 24.9%, 0.1% and 0%`, wrong.join(' | '));
            await context.close();
        }

        console.log('\nFight type in the header');
        const wordEn = n => n === 1 ? 'turn' : 'turns';
        const wordUk = n => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'хід' : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'ходи' : 'ходів'); };
        const FIGHT = {
            // The fight's kind after its icon: the podium for ranked, the smile for a friendly duel (read as [id])
            uk: { idle: 'Арена чекає на бійців', ranked: '[ranked] Рейтинговий бій', friendly: '[friendly] Товариська дуель', word: wordUk },
            en: { idle: 'The arena awaits fighters', ranked: '[ranked] Ranked battle', friendly: '[friendly] Friendly duel', word: wordEn },
        };
        for (const lang of ['uk', 'en']) {
            const { page, context } = await open(browser, { lang });
            const W = FIGHT[lang], uk = lang === 'uk';
            const header = () => page.evaluate(() => ({ type: __vt(document.getElementById('fight-type')), shown: document.getElementById('fight-type').innerText.trim(),
                plate: __vt(document.getElementById('status-plate')) }));
            const words = t => t.replace(/^\[\w+\] /, '');   // what innerText shows: the words (the icon is an image)
            const idle = await header();
            check(idle.type === W.idle && idle.shown === W.idle.toUpperCase(), `[${lang}] idle: "${idle.shown}"`, JSON.stringify(idle));
            await page.evaluate(uk => {
                const say = (u, m) => handleChatMessage('#test', { username: u, color: '#ff7f50' }, m, false);
                ['alpha', 'omega', 'gamma', 'delta'].forEach((u, i) => say(u, (uk ? '!дрейк ' : '!drake ') + (uk ? ['червоний', 'синій', 'зелений', 'золотий'] : ['red', 'blue', 'green', 'gold'])[i]));
            }, uk);
            // Plays a fight started by start(), returning the header seen during it and at the end
            const play = async start => {
                await page.evaluate(start, uk);
                let during = null;
                for (let i = 0; i < 120; i++) {
                    await page.clock.runFor(1500);
                    const h = await header();
                    if (!during && /\d+ \/ 30/.test(h.plate)) during = h;
                    if (during && !(await page.evaluate('isBattleRunning'))) break;
                }
                await page.clock.runFor(1000);   // the result is drawn when the last hit lands (0.6 s)
                return { during, after: await header() };
            };
            const kinds = [
                ['ranked (!черга / !queue)', W.ranked, uk => { handleChatMessage('#test', { username: 'alpha', color: '#ff7f50' }, uk ? '!черга' : '!queue', false); handleChatMessage('#test', { username: 'omega', color: '#ff7f50' }, uk ? '!черга' : '!queue', false); }],
                ['friendly duel (!бій / !battle)', W.friendly, uk => { handleChatMessage('#test', { username: 'gamma', color: '#ff7f50' }, uk ? '!бій @delta' : '!battle @delta', false); handleChatMessage('#test', { username: 'delta', color: '#ff7f50' }, uk ? '!прийняти' : '!accept', false); }],
                ['test battle (button)', W.friendly, () => testBattle()],
            ];
            for (const [label, want, start] of kinds) {
                const { during, after } = await play(start);
                const turns = after && /· (\d+) /.exec(after.type);
                const n = turns ? +turns[1] : NaN;
                const wantAfter = `${want} · ${n} ${W.word(n)}`;
                check(during && during.type === want && during.shown === words(want).toUpperCase() && after.type === wantAfter && n >= 1 && n <= 30,
                    `[${lang}] ${label}: "${during && during.shown}" during the fight, "${after.shown}" after`, JSON.stringify({ during, after, wantAfter }));
            }
            // Every turn-count word form, straight through the header
            const forms = await page.evaluate(() => [1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 30].map(n => { setArenaState({ kind: 'result', ranked: true, winner: null, turns: n }); return [n, __vt(document.getElementById('fight-type'))]; }));
            const badForms = forms.filter(([n, t]) => t !== `${W.ranked} · ${n} ${W.word(n)}`);
            check(!badForms.length, `[${lang}] turn counts read right: ${forms.map(([, t]) => t.split(' · ')[1]).join(', ')}`, JSON.stringify(badForms));
            await context.close();
        }

        // The chat panel with six drakes in the Top (its room shrinks with the Top): !стата, a legendary title roll and the
        // odds card all stay on it, none taller than on main (a taller card makes addInfo drop the oldest so nothing is cut
        // off; with the roll's ×3 badge on a line of its own the !стата card went); a 25-letter name on the roll card fits
        console.log('\nThe chat panel: !стата, a top-rarity roll and the odds together');
        for (const lang of ['uk', 'en']) {
            const { page, context } = await open(browser, { lang });
            const r = await page.evaluate(lang => {
                const say = (u, m) => handleChatMessage('#test', { username: u, color: '#8ab4f8' }, m, false);
                const names = ['flame_rider', 'nightowl_ua', 'goldfinch', 'arcane_kit', 'leafy_ua', 'tidecaller'], colours = ['червоний', 'чорний', 'золотий', 'фіолетовий', 'зелений', 'синій'];
                names.forEach((n, i) => say(n, `!дрейк ${colours[i]}`));
                const db = getDragonDB(); db.nightowl_ua.title = TITLES_DB.find(t => t.id === 183); saveDragonDB(db);
                renderLeaderboard();
                say('nightowl_ua', lang === 'uk' ? '!стата' : '!stats');
                showTitleRoll('goldfinch', '#ffd166', TITLES_DB.find(t => t.id === 99));
                showOddsCard();
                const feed = document.getElementById('info-feed'), cards = [...feed.children];
                const kinds = cards.map(c => c.classList.contains('stat') ? 'stats' : c.classList.contains('glow-legendary') ? 'roll' : /ic-head/.test(c.innerHTML) && !c.querySelector('[data-icon="stats"]') && c.querySelector('[data-icon="roulette"]') && !c.classList.contains('ok') ? 'odds' : 'other');
                const roll = cards.find(c => c.classList.contains('glow-legendary'));
                // The longest name there can be on the same roll card
                showTitleRoll('mwmwmwmwmwmwmwmwmwmwmwmwm', '#ffd166', TITLES_DB.find(t => t.id === 99));
                const long = feed.firstElementChild, head = long.querySelector('.ic-head');
                return { room: feed.clientHeight, kinds, rows: document.querySelectorAll('#leaderboard-list .lb-row').length, rollH: roll ? roll.offsetHeight : 0,
                    longH: long.offsetHeight, longFits: head.scrollWidth <= head.clientWidth + 1 && long.scrollWidth <= long.clientWidth + 1 };
            }, lang);
            check(r.rows === 6 && ['odds', 'roll', 'stats'].every(k => r.kinds.includes(k)) && r.rollH <= 84 && r.longH <= 84 && r.longFits,
                `[${lang}] with six drakes in the Top (${r.room} px of chat), the odds card, a legendary roll (${r.rollH} px; ${r.longH} px with a 25-letter name, nothing cut off) and !стата all stay on the chat panel`, JSON.stringify(r));
            await context.close();
        }

        console.log('\nFrame colours');
        {
            const { page, context } = await open(browser, { lang: 'uk' });
            const frames = await page.evaluate(() => {
                const card = document.getElementById('card-p1'), out = {};
                const read = cls => { card.className = 'fighter-card ' + cls; const s = getComputedStyle(card); return { hi: s.getPropertyValue('--hi').trim(), lo: s.getPropertyValue('--lo').trim() }; };
                for (const t of ['red', 'green', 'blue', 'black', 'gold', 'purple', 'steel', 'white']) out[t] = read('el-' + t);
                out.winner = read('el-gold is-winner');
                out.loser = read('el-red is-loser');
                const a = getComputedStyle(document.getElementById('arena'));
                out.arena = { hi: a.getPropertyValue('--gold-hi').trim(), lo: a.getPropertyValue('--gold-lo').trim() };
                card.className = 'fighter-card';
                return out;
            });
            const PANEL = '#0d0e15';
            // Every pair of light edges (six elements, the White Drake, the White Dragon, the winner — the same gold as the arena frame — and the loser)
            const names = ['red', 'green', 'blue', 'black', 'gold', 'purple', 'steel', 'white', 'winner', 'loser'];
            const pairs = [];
            for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) pairs.push([names[i], names[j], de2000(frames[names[i]].hi, frames[names[j]].hi)]);
            pairs.sort((a, b) => a[2] - b[2]);
            const close = pairs.filter(p => p[2] < 20);
            check(!close.length && frames.winner.hi === frames.arena.hi, `every pair of frame light edges is ≥ 20 apart (CIEDE2000), ${pairs.length} pairs; closest: ${pairs.slice(0, 3).map(([a, b, d]) => `${a}/${b} ${d.toFixed(1)}`).join(', ')}`,
                close.map(([a, b, d]) => `${a} ${frames[a].hi} / ${b} ${frames[b].hi}: ${d.toFixed(1)}`).join(' | ') || 'the winner frame is not the arena gold');
            // Each frame still reads as its element: hue family for the colours, near-neutral for black and the loser, a light
            // cool steel for the White Drake, near-white for the White Dragon
            const FAMILY = {
                red: c => (c.h >= 345 || c.h <= 15) && c.s >= 0.5, gold: c => c.h >= 38 && c.h <= 55 && c.s >= 0.5, green: c => c.h >= 100 && c.h <= 160 && c.s >= 0.5,
                blue: c => c.h >= 200 && c.h <= 230 && c.s >= 0.5, purple: c => c.h >= 255 && c.h <= 290 && c.s >= 0.5, black: c => c.s <= 0.15 && c.l >= 0.45 && c.l <= 0.75,
                steel: c => c.h >= 170 && c.h <= 195 && c.s >= 0.3 && c.s <= 0.6, white: c => c.l >= 0.9, winner: c => c.h >= 38 && c.h <= 55 && c.s >= 0.5, loser: c => c.s <= 0.15 && c.l <= 0.5,
            };
            const off = names.filter(n => !FAMILY[n](hslOf(frames[n].hi)) || (n !== 'white' && n !== 'black' && n !== 'loser' && !FAMILY[n](hslOf(frames[n].lo))));
            check(!off.length, 'each frame reads as its element (red, gold, green, blue and purple hues on both edges; neutral steel for Black; a cool white steel for the White Drake; near-white for the White Dragon; grey for the loser)',
                off.map(n => `${n} ${frames[n].hi} / ${frames[n].lo}: ${JSON.stringify(hslOf(frames[n].hi))}`).join(' | '));
            const weak = names.filter(n => n !== 'loser' && contrast(frames[n].hi, PANEL) < 3);
            const blackLo = contrast(frames.black.lo, PANEL);
            check(!weak.length && blackLo >= 3, `every frame's light edge is ≥ 3:1 against the dark panel, and the Black drake's dark edge too (${blackLo.toFixed(2)}:1)`,
                weak.map(n => `${n} ${frames[n].hi}: ${contrast(frames[n].hi, PANEL).toFixed(2)}:1`).join(' | ') || `black dark edge ${blackLo.toFixed(2)}:1`);
            await context.close();
        }

        console.log('\nThe White Drake\'s scale bar');
        for (const lang of ['uk', 'en']) {
            const { page, context, errors } = await open(browser, { lang });
            // Both cards: the White Drake (scales part-gone), then a viewer drake for the HP bar's place; then broken
            const look = await page.evaluate(() => {
                const xpFor = n => { let x = 0; for (let i = 1; i < n; i++) x += getRequiredXP(i); return x; };
                const title = TITLES_DB.find(t => t.id === WHITE_DRAKE_TITLE_ID);
                const wd = { name: 'streamer', color: '#e8f6ff', drakeObj: DRAKE_TYPES.find(d => d.type === WHITE_DRAKE_TYPE), title, xp: xpFor(10) };
                const red = { name: 'viewer', color: '#ff7f50', drakeObj: DRAKE_TYPES.find(d => d.type === 'red'), title: TITLES_DB[3], xp: xpFor(10) };
                const max = scalesOf(10, getMaxHP(10, WHITE_DRAKE_TYPE, title));
                const fx = now => ({ buff: [], debuff: [], meter: 3, halfDone: false, mirror: 0, scales: { now, max } });
                const plain = { buff: [], debuff: [], meter: 3, halfDone: false, mirror: 0, scales: null };
                setArenaState({ kind: 'fight', ranked: true, turn: 5 });
                const r = el => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width }; };
                const read = p => {
                    const card = document.getElementById(`card-${p}`), row = card.querySelector('.scale-row'), track = card.querySelector('.scale-track');
                    const fill = document.getElementById(`scales-${p}`), num = document.getElementById(`scale-text-${p}`);
                    return { shown: getComputedStyle(row).display !== 'none', track: r(track), hp: r(document.getElementById(`bar-${p}`).parentElement),
                             meter: r(document.getElementById(`power-${p}`)), hpText: r(document.getElementById(`hp-text-${p}`)), num: r(num), text: num.textContent,
                             fillScale: new DOMMatrix(getComputedStyle(fill).transform).a, cracked: track.classList.contains('cracked') && num.classList.contains('cracked'),
                             fillOrigin: getComputedStyle(fill).transformOrigin.split(' ')[0] };
                };
                const out = {};
                for (const p of ['p1', 'p2']) {
                    updateFighterCard(p, red, plain); const viewer = read(p);
                    updateFighterCard(p, wd, fx(Math.round(max * 0.4))); const part = read(p);
                    updateFighterCard(p, wd, fx(0)); const broken = read(p);
                    out[p] = { viewer, part, broken, max, partNow: Math.round(max * 0.4) };
                }
                return out;
            });
            await page.waitForTimeout(400);   // the fill's transition
            const bad = [];
            for (const [p, x] of Object.entries(look)) {
                const { viewer: v, part: a, broken: b } = x;
                if (v.shown) bad.push(`${p}: a scale bar on a viewer drake's card`);
                if (!a.shown) bad.push(`${p}: no scale bar on the White Drake's card`);
                if (Math.abs(a.track.left - a.hp.left) > 0.5 || Math.abs(a.track.right - a.hp.right) > 0.5) bad.push(`${p}: the bar (${a.track.left}–${a.track.right}) isn't over the HP bar (${a.hp.left}–${a.hp.right})`);
                if (!(a.track.bottom + 1 <= a.hp.top - 2 - 1 && a.track.top - 1 >= a.meter.bottom)) bad.push(`${p}: the bar (${a.track.top}–${a.track.bottom}) isn't in the gap between the СИЛА row (${a.meter.bottom}) and the HP bar (${a.hp.top})`);
                if (a.num.bottom > a.hpText.top + 0.5 || Math.abs((p === 'p1' ? a.num.right - a.hpText.right : a.num.left - a.hpText.left)) > 0.5) bad.push(`${p}: the number isn't over the HP number`);
                if (Math.abs(a.hp.top - v.hp.top) > 0.1 || Math.abs(a.hp.left - v.hp.left) > 0.1 || Math.abs(a.hp.w - v.hp.w) > 0.1) bad.push(`${p}: the HP bar moved (${JSON.stringify(v.hp)} → ${JSON.stringify(a.hp)})`);
                if (a.text !== String(x.partNow) || a.cracked) bad.push(`${p}: part-gone shows "${a.text}"${a.cracked ? ', cracked' : ''}`);
                if (b.text !== '0' || !b.cracked) bad.push(`${p}: broken shows "${b.text}", cracked ${b.cracked}`);
                if (a.fillOrigin !== (p === 'p1' ? '0px' : `${a.track.w}px`)) bad.push(`${p}: the bar drains from the wrong side (origin ${a.fillOrigin})`);
            }
            check(!bad.length, `[${lang}] the White Drake's scales: their own bar right above the HP bar, as wide and lined up with it on both cards, in the gap under the СИЛА row, the number over the HP number; it drains from the VS side like HP, cracks at 0 («0»); the HP bar is where a viewer drake's is`,
                bad.join(' | '));
            if (errors.length) fail(`[${lang}] page errors: ${errors.join(' | ')}`);
            await context.close();
        }

        console.log('\nHP number and bar agree');
        for (const lang of ['uk', 'en']) {
            const { page, context, errors } = await open(browser, { lang });
            const seen = [], bad = [];
            let retried = 0;
            const sample = async state => {
                let rows = null;
                for (let tries = 0; tries < 20 && !rows; tries++) {
                    await settleBars(page);   // width and colour transitions run on real time
                    rows = await page.evaluate(hpAgreement);
                    if (!rows) retried++;
                }
                if (!rows) { bad.push(`${state}: the HP bars never stopped fading`); return; }
                for (const r of rows) { seen.push(state); if (r.problem) bad.push(`${state} ${r.p}: ${r.problem}`); }
            };
            await sample('waiting');
            const states = new Set(['waiting']);
            await page.evaluate(uk => {
                const say = (u, m) => handleChatMessage('#test', { username: u, color: '#ff7f50' }, m, false);
                say('alpha', uk ? '!дрейк червоний' : '!drake red'); say('omega', uk ? '!дрейк синій' : '!drake blue');
                say('alpha', uk ? '!черга' : '!queue'); say('omega', uk ? '!черга' : '!queue');
            }, lang === 'uk');
            await page.clock.runFor(1000);
            await sample('countdown'); states.add('countdown');
            for (let i = 0; i < 80 && await page.evaluate('isBattleRunning'); i++) {
                await page.clock.runFor(2250);
                if (i % 3 === 0) { await sample('fighting'); states.add('fighting'); }
            }
            await page.clock.runFor(1000);   // the result is drawn when the last hit lands (0.6 s)
            await sample('result'); states.add('result');
            await page.click('#lang-toggle-btn');
            await sample('result, language switched');
            await page.click('#lang-toggle-btn');
            await page.clock.runFor(6000);
            await page.evaluate(() => testBattle());
            await page.clock.runFor(1000);
            await sample('test battle');
            for (let i = 0; i < 80 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(4500);
            await page.clock.runFor(1000);   // the result is drawn when the last hit lands (0.6 s)
            await sample('test battle result');
            check(!bad.length && states.size === 4, `[${lang}] HP text and bar agree (width ±1%, colour, "—" with an empty bar when waiting) in ${seen.length} samples: ${[...new Set(seen)].join(', ')}${retried ? ` (${retried} read(s) retried: a turn started a new fade just before)` : ''}`, bad.slice(0, 6).join(' | '));
            if (errors.length) fail(`[${lang}] page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        console.log('\nReview sheet');
        {
            const { page, context } = await open(browser, { lang: 'uk', width: 2320, height: 1600 });
            await page.evaluate(() => {
                const sheet = document.createElement('div');
                sheet.id = 'review-sheet';
                sheet.style.cssText = 'position:absolute;left:0;top:0;width:2320px;box-sizing:border-box;padding:40px;background:#15171e;z-index:99;font-family:var(--ui);color:#d9dde8;';
                document.body.appendChild(sheet);
                const db = getDragonDB();
                let xp = 0; for (let l = 1; l < 12; l++) xp += getRequiredXP(l);
                const fx = (meter) => ({ buff: [{ id: BUFF_IDS[1], left: EFFECTS[BUFF_IDS[1]].count, power: 1 }], debuff: [{ id: DEBUFF_IDS[0], left: EFFECTS[DEBUFF_IDS[0]].count, power: 1 }], meter, halfDone: false, mirror: 0 });
                const snap = (title) => {
                    const card = document.getElementById('card-p1').cloneNode(true);
                    card.removeAttribute('id'); card.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
                    const src = document.getElementById('sprite-p1'), dst = card.querySelector('canvas');
                    dst.width = src.width; dst.height = src.height; dst.getContext('2d').drawImage(src, 0, 0);
                    // The clone has no #card-p1, so copy the left card's mirror onto its canvases, as drawn on stream
                    card.querySelectorAll('.drake-sprite, .sprite-flash').forEach(c => { c.style.transform = getComputedStyle(src).transform; });
                    card.style.height = '318px'; card.style.animation = 'none';
                    const cell = document.createElement('div');
                    cell.style.cssText = 'display:flex;flex-direction:column;gap:14px;';
                    cell.innerHTML = `<div style="font:700 15px var(--ui);color:#b99a5a;letter-spacing:1px">${title}</div>`;
                    cell.appendChild(card);
                    return cell;
                };
                for (const lang of ['uk', 'en']) {
                    currentLang = lang;
                    const head = document.createElement('div');
                    head.style.cssText = 'font:16px var(--pixel);color:#f2c14e;margin:10px 0 30px;';
                    head.textContent = lang === 'uk' ? 'УКРАЇНСЬКА' : 'ENGLISH';
                    // The cards sit on the arena's panel inside the gold arena frame, as on stream
                    const panel = document.createElement('div');
                    panel.className = 'frame-big';
                    panel.style.cssText = 'position:relative;background:var(--panel);padding:30px;margin:0 8px 60px;width:max-content;display:grid;grid-template-columns:repeat(5,404px);gap:34px 24px;';
                    sheet.append(head, panel);
                    const types = [...DRAKE_TYPES.filter(d => d.type !== DRAGON_TYPE), DRAKE_TYPES.find(d => d.type === DRAGON_TYPE)];
                    const hpPct = [1, 0.62, 0.4, 0.2, 0.75, 0.5, 0.55, 0.9];
                    types.forEach((d, i) => {
                        // The streamer's two forms: the White Drake (its title, its scales part-gone) and the White Dragon
                        const streamer = d.type === DRAGON_TYPE || d.type === WHITE_DRAKE_TYPE;
                        const name = streamer ? 'streamer' : 'viewer_' + d.type;
                        const title = d.type === DRAGON_TYPE ? TITLES_DB.find(t => t.id === DRAGON_TITLE_ID) : d.type === WHITE_DRAKE_TYPE ? TITLES_DB.find(t => t.id === WHITE_DRAKE_TITLE_ID) : TITLES_DB[(i * 29) % TITLES_DB.length];
                        const dr = { name, color: ['#ff7f50', '#5fd4ff', '#c792ea', '#000000', '#ffd166', '#7cfc00', '#e8f6ff', '#ffffff'][i], drakeObj: d, title, xp };
                        const max = d.type === WHITE_DRAKE_TYPE ? scalesOf(12, getMaxHP(12, d.type, title)) : 0;
                        const st = d.type === DRAGON_TYPE ? null : d.type === WHITE_DRAKE_TYPE ? { ...fx(i % 6), scales: { now: Math.round(max * 0.6), max } } : fx(i % 6);
                        setArenaState({ kind: 'fight', ranked: true, turn: 7 });
                        updateFighterCard('p1', dr, st);
                        updateStatusUI(name, 12, d.type, title, st || { buff: [], debuff: [] });
                        updateUIHP(Math.round(200 * hpPct[i]), 200, 1, 200);
                        panel.appendChild(snap(drakeLabel(d)));
                    });
                    // Winner (a Gold drake, to compare with the Gold drake's own frame) and loser (a Black drake)
                    const gold = { name: 'winner_gold', color: '#ffd166', drakeObj: DRAKE_TYPES.find(d => d.type === 'gold'), title: TITLES_DB[3], xp };
                    const black = { name: 'loser_black', color: '#000000', drakeObj: DRAKE_TYPES.find(d => d.type === 'black'), title: TITLES_DB[8], xp };
                    for (const [dr, won] of [[gold, true], [black, false]]) {
                        updateFighterCard('p1', dr, fx(won ? 5 : 2));
                        updateStatusUI(dr.name, 12, dr.drakeObj.type, dr.title, { buff: [], debuff: [] });
                        updateUIHP(won ? 64 : 0, 200, 1, 200);
                        setArenaState({ kind: 'result', ranked: true, winner: gold, turns: 14, ko: true });   // a knockout: «Нокаут» on the loser
                        panel.appendChild(snap((lang === 'uk' ? (won ? 'Переможець' : 'Нокаут') : (won ? 'Winner' : 'Knocked out')) + ' · ' + drakeLabel(dr.drakeObj)));
                    }
                    setArenaState({ kind: 'idle' });
                }
                document.getElementById('stage').style.display = 'none';
            });
            await settle(page);
            await page.locator('#review-sheet').screenshot({ path: path.join(SHOTS, 'layout-review-cards.png') });
            const n = await page.evaluate(() => document.querySelectorAll('#review-sheet .fighter-card').length);
            const tags = await page.evaluate(() => [...document.querySelectorAll('#review-sheet .result-tag')].filter(t => getComputedStyle(t).display !== 'none').map(t => t.innerText));
            check(n === 20 && tags.join() === 'ПЕРЕМОЖЕЦЬ,НОКАУТ,WINNER,KNOCKED OUT', `review sheet: ${n} cards (8 types + winner + loser, both languages) in tests/screenshots/layout-review-cards.png`, `${n} cards, tags ${tags.join()}`);
            await context.close();
        }

        // Tournament screens with worst-case names (tests/tourney_layout.js), 4, 8, 13, 15 and 16 players, both languages
        if (!process.env.LAYOUT_SKIP_TOURNEY) {
            console.log('\nTournament screens, worst-case names');
            for (const lang of ['uk', 'en']) {
                // Every size with the tournament effects on (the default), and 13 and 16 with them off (the plain bracket, no draw)
                for (const [n, fx] of [...SIZES.map(n => [n, true]), [13, false], [16, false]]) {
                    const { page, context, errors } = await open(browser, { lang });
                    const init = on => { localStorage.setItem('drake_arena_showcase_betting', '1'); localStorage.setItem('drake_arena_showcase_tourfx', on ? '1' : '0'); };
                    await page.evaluate(init, fx);
                    await page.addInitScript(init, fx);
                    const tag = `${n}${fx ? '' : '-plain'}`, label = `${n} players${fx ? '' : ', effects off'}`;
                    if (!fx) await page.evaluate(() => setShowFx(false));
                    const results = await tourneyScreens(page, lang, n, async name => { await iconCheck(page, `layout-tourney-${tag}-${name}-${lang}`); await page.screenshot({ path: path.join(SHOTS, `layout-tourney-${tag}-${name}-${lang}.png`) }); });
                    for (const [screen, problems] of results) {
                        const podium = /podium/.test(screen) ? '; the name, the medal (before the name), the sprite and the number never overlap, and each step holds only its number, centred inside it' : '';
                        check(!problems.length, `[${lang}] ${label}, ${screen}: every name at 12 px or more (cut in the middle, not squeezed), nothing overflowing, outside the log area or overlapping${podium}`, problems.slice(0, 4).join(' | '));
                    }
                    check(!errors.length, `[${lang}] ${label}: no page errors`, errors.join(' | '));
                    await context.close();
                }
            }
        }
        check(!iconIssues.size, 'every screen of the run, both languages (worst cases, OBS, the result, the tournament screens): no emoji on the overlay, every icon at a whole-number scale of its drawing',
            [...iconIssues].slice(0, 8).join(' | '));
    } finally {
        await browser.close();
    }
    console.log(failures ? `\n${failures} layout check(s) failed. Screenshots: tests/screenshots/` : '\nAll layout checks passed. Screenshots: tests/screenshots/');
    process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
