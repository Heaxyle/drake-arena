// Tournament screens with worst-case Twitch names, for the layout test (tests/layout.js). Names can be 25 characters:
// 25 wide letters, a mixed one, two that differ only at the end, and more 25-letter ones to fill the bracket.
// For each size (4, 8, 16 players; 13 and 15 with a qualifier) it plays through the game's own sign-up, then fast-
// forwards the saved tournament (results filled in, then a reload: the game resumes from it) to reach each screen:
//   board      the show's sign-up board, one place short of full (effects on)
//   draw       the show's draw, every name in its slot (effects on)
//   intro      the show's versus splash before game 1 of the first match: the two names in full (effects on)
//   qualifier  the first qualifier game's countdown, with the bracket (13 and 15 players)
//   bracket    the betting window of a round-1 match, with finished matches (a winner, a loser) and the live one
//   plate      that match being fought: the plate shows the cut names in full on a second line
//   podium     the podium with three worst-case names
//   hall       the Hall of Fame on the arena: five tournaments with worst-case podiums, two players tied for most wins
//              (both on its most-wins line)
//   hall card  the same as the !зала card in the chat panel
// and checks each the same way (tourneyScreenProblems): every name at 12 px or more, cut in the middle rather than
// squeezed, never wider than its box; different names never drawn the same; nothing outside the log area, no two
// blocks overlapping; the plate inside the header, clear of the fight type, nothing in it overflowing.
const WORST = ['wwwwwwwwwwwwwwwwwwwwwwwww', 'xX_SuperLongNickname_Xx', 'the_real_slim_shady_123', 'the_real_slim_shady_456'];
const tourneyNames = n => Array.from({ length: n }, (_, i) => WORST[i] || ('w'.repeat(22) + String(i).padStart(3, '0')).slice(-25));
const SIZES = [4, 8, 13, 15, 16];

// In the page: what is wrong with the tournament screen on show (the log area and the arena header)
function tourneyScreenProblems() {
    const out = [];
    const R = e => e.getBoundingClientRect();
    const inside = (a, b) => a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;
    const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    const label = e => `${String(e.className).split(' ')[0] || e.tagName} «${(e.dataset.full || e.textContent).trim().slice(0, 32)}»`;
    const shown = e => { const b = R(e), s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    // Wider than its box: a squeezed text (fitText's last resort) counts as drawn
    const tooWide = e => { const sq = e.querySelector(':scope > .squeeze'); return sq ? R(sq).width > e.clientWidth + 0.5 : e.scrollWidth > e.clientWidth + 0.5; };
    const box = document.getElementById('log-countdown'), panel = R(document.getElementById('log-panel'));
    // Names: 12 px at least, cut rather than squeezed, inside their box; different names never drawn the same
    const drawn = new Map();
    document.querySelectorAll('#log-countdown .tb-n[data-full], #log-countdown .pd-name, #log-countdown [data-name], #log-countdown .hf-n, #info-feed .hall-card .hf-n, #log-countdown .ts-slot-name, #log-panel .ts-over .ti-name').forEach(e => {
        if (!shown(e)) return;
        const px = parseFloat(getComputedStyle(e).fontSize), full = e.dataset.full || e.dataset.name || e.textContent;
        if (px < 12) out.push(`${label(e)} at ${px} px`);
        if (e.querySelector('.squeeze')) out.push(`${label(e)} squeezed instead of cut`);
        if (tooWide(e)) out.push(`${label(e)} wider than its box`);
        const text = e.textContent.trim(), was = drawn.get(text);
        if (was && was !== full) out.push(`${full} and ${was} both drawn as ${text}`);
        drawn.set(text, full);
    });
    if (box && getComputedStyle(box).opacity !== '0') {
        // Text boxes in the log area: none wider than its box
        box.querySelectorAll('.tb-h, .tb-none, .cd-title, .cd-sub, .cd-label, .pd-title').forEach(e => { if (shown(e) && tooWide(e)) out.push(`${label(e)} wider than its box`); });
        // Everything inside the log area
        // (the falling confetti is clipped by its own layer, which is checked)
        box.querySelectorAll('*').forEach(e => { if (shown(e) && !e.closest('svg') && !e.closest('.ts-confetti > *') && !inside(R(e), panel)) out.push(`${label(e)} outside the log area`); });
        // No two blocks overlapping (one inside the other doesn't count)
        const blocks = [...box.querySelectorAll('.tb-m, .tb-h, .tb-timer, .tb-trophy, .cd-row, .cd-sub, .pd-col, .pd-title, .hf-title, .hf-row, .hf-p, .hf-best, .hf-best > *, .ts-slot, .tsb-head, .tsb-bar, .tsb-join, .ts-slam')].filter(shown);
        for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
            const a = blocks[i], b = blocks[j];
            if (!a.contains(b) && !b.contains(a) && overlap(R(a), R(b))) out.push(`${label(a)} overlaps ${label(b)}`);
        }
    }
    // The show's overlays in the log area (the versus splash): inside it, the two sides apart
    document.querySelectorAll('#log-panel .ts-over').forEach(over => {
        over.querySelectorAll('*').forEach(e => { if (shown(e) && !inside(R(e), panel)) out.push(`${label(e)} outside the log area`); });
        const sides = [...over.querySelectorAll('.ti-side, .ti-vs, .ti-stage')].filter(shown);
        for (let i = 0; i < sides.length; i++) for (let j = i + 1; j < sides.length; j++) if (overlap(R(sides[i]), R(sides[j]))) out.push(`${label(sides[i])} overlaps ${label(sides[j])}`);
    });
    // The !зала card: inside the chat panel, everything in it inside the card, its places not overlapping
    document.querySelectorAll('#info-feed .hall-card').forEach(card => {
        const c = R(card), feed = R(document.getElementById('info-feed'));
        if (!inside(c, feed)) out.push('the !зала card sticks out of the chat panel');
        card.querySelectorAll('*').forEach(e => { if (shown(e) && !inside(R(e), c)) out.push(`${label(e)} outside the !зала card`); });
        const cells = [...card.querySelectorAll('.hf-card-row > *, .hf-best > *')].filter(shown);
        for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) if (overlap(R(cells[i]), R(cells[j]))) out.push(`${label(cells[i])} overlaps ${label(cells[j])}`);
    });
    // The arena header: the plate inside it and clear of the fight type, nothing in either wider than its box
    const plate = document.getElementById('status-plate'), type = document.getElementById('fight-type'), head = plate.parentElement;
    if (!inside(R(plate), R(head))) out.push('the plate sticks out of the header');
    if (overlap(R(plate), R(type))) out.push('the plate overlaps the fight type');
    [plate, type, ...plate.querySelectorAll('.pl-label, .pl-names')].forEach(e => { if (shown(e) && tooWide(e)) out.push(`${label(e)} wider than its box`); });
    plate.querySelectorAll('.pl-names').forEach(e => { if (parseFloat(getComputedStyle(e).fontSize) < 12) out.push(`${label(e)} under 12 px`); });
    return [...new Set(out)];
}

// Plays the sign-up through chat: n drakes with the worst-case names (levels 1–6), sign-up, everyone joins, the
// sign-up closed (it closes itself at 4, 8 and 16). beforeLast() runs with one player still to join
async function signUp(page, lang, n, beforeLast) {
    const uk = lang === 'uk', names = tourneyNames(n);
    const say = (u, m, extra) => page.evaluate(([u, m, e]) => window.__chat(u, m, e), [u, m, extra]);
    const colours = uk ? ['червоний', 'синій', 'чорний', 'золотий', 'фіолетовий', 'зелений'] : ['red', 'blue', 'black', 'gold', 'purple', 'green'];
    for (const [i, nm] of names.entries()) await say(nm, `${uk ? '!дрейк' : '!drake'} ${colours[i % 6]}`);
    await page.evaluate(ns => { const db = getDragonDB(); ns.forEach((n, i) => { db[n].xp = [0, 150, 400, 900, 1600, 2600][i % 6]; }); saveDragonDB(db); }, names);
    const size = n > 8 ? 16 : n > 4 ? 8 : 4;
    await say('mod_anna', uk ? `!турнір ${size}` : `!tournament ${size}`, { mod: true });
    for (const nm of names.slice(0, -1)) await say(nm, uk ? '!учасник' : '!join');
    if (beforeLast) await beforeLast();
    await say(names[n - 1], uk ? '!учасник' : '!join');
    if (n !== size) await say('mod_anna', uk ? '!турнір старт' : '!tournament start', { mod: true });
    return names;
}
const until = async (page, fn, steps = 400) => {
    for (let i = 0; i < steps; i++) { if (await page.evaluate(fn)) return true; await page.clock.runFor(500); }
    return false;
};
// Changes the saved tournament (fn runs in the page on `tourney`), then reloads: the game resumes from it. The changed
// storage goes to the new page by an init script, not by localStorage itself: Chromium writes localStorage
// asynchronously, so a page reloaded at once can still read the old state (on a slow machine it did). The script is
// tied to a one-time token in the URL, so it applies exactly once, before the game's own script runs
let resumes = 0;
async function resumeWith(page, fn, arg) {
    await page.evaluate(fn, arg);
    const snap = await page.evaluate(() => { tourneySave(); return Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])); });
    const token = `r${++resumes}`;
    await page.addInitScript(([s, tok]) => {
        if (new URLSearchParams(location.search).get('resume') !== tok) return;
        localStorage.clear();
        Object.entries(s).forEach(([k, v]) => localStorage.setItem(k, v));
    }, [snap, token]);
    const url = new URL(page.url());
    url.searchParams.set('resume', token);
    await page.goto(url.toString());
    await page.evaluate(() => document.fonts.ready);
}

// Every core screen for one size and language; shot(name) takes a screenshot. Returns [[screen, problems]]
async function tourneyScreens(page, lang, n, shot) {
    // wait: real time for the fit and for the screen's entrance animations (CSS runs on real time, not the game clock)
    const results = [], look = async (name, wait = 300) => {
        await page.waitForTimeout(wait);
        results.push([name, await page.evaluate(tourneyScreenProblems)]);
        if (shot) await shot(name);
    };
    const show = await page.evaluate(() => typeof showOn === 'function' && showOn());
    const names = await signUp(page, lang, n, show ? async () => { await page.clock.runFor(1000); await look('board', 800); } : null);
    if (show) {
        // The draw: every name landed in its slot (the names fly in from 2.9 s; 7.5 s in all)
        if (await until(page, () => arenaState.kind === 'draw', 20)) { await page.clock.runFor(6500); await look('draw'); }
        else results.push(['draw', ['no draw']]);
    }
    if (await page.evaluate(() => tourney.qual.length)) {
        if (await until(page, () => arenaState.kind === 'countdown' && !!arenaState.bracket && tourGame && tourGame.q !== undefined && !document.querySelector('#log-panel .ts-over'))) await look('qualifier');
        else results.push(['qualifier', ['no qualifier countdown with the bracket']]);
    }
    // The qualifier and the first half of round 1 decided (the earlier name wins), the rest still to play
    await resumeWith(page, () => {
        const t = tourney, win = (id, m, a, b) => { m.w = id.q !== undefined ? [1, 0] : [2, 1]; m.winner = a; tourneyAdvance(id, a, b); };
        t.qual.forEach((m, q) => win({ q }, m, m.a, m.b));
        t.rounds[0].slice(0, t.rounds[0].length / 2).forEach((m, i) => win({ r: 0, m: i }, m, m.a, m.b));
        t.phase = 'running'; t.game = 1; t.replay = false;
    });
    if (show) {
        // The versus splash before game 1: the names in full (it covers the log area for 2.6 s)
        if (await until(page, () => !!document.querySelector('#log-panel .ts-intro'))) {
            await page.clock.runFor(1200);
            await look('intro', 1000);
            const full = await page.evaluate(() => [...document.querySelectorAll('#log-panel .ts-intro .ti-name')].map(e => [e.textContent, e.dataset.full]));
            const last = results[results.length - 1][1];
            full.forEach(([text, f]) => { if (text !== f) last.push(`the versus splash cut ${f} to ${text}`); });
            if (full.length !== 2) last.push(`${full.length} names on the versus splash`);
        } else results.push(['intro', ['no versus splash']]);
    }
    if (await until(page, () => arenaState.kind === 'countdown' && arenaState.betting && !!arenaState.bracket && !document.querySelector('#log-panel .ts-over'))) await look('bracket');
    else results.push(['bracket', ['no betting window with the bracket']]);
    // The match on the arena: the plate, with the names in full when the bracket had to cut them
    await page.evaluate(() => skipBettingWindow());
    await until(page, () => arenaState.kind === 'fight');
    const plate = await page.evaluate(() => ({ cut: (tourney.cut || []).filter(n => n === tourGame.a || n === tourGame.b), names: (document.querySelector('#status-plate .pl-names') || {}).textContent || '', a: tourGame.a, b: tourGame.b }));
    await look('plate');
    const last = results[results.length - 1][1];
    if (plate.cut.length && !(plate.names.includes('@' + plate.a) && plate.names.includes('@' + plate.b))) last.push(`the bracket cut ${plate.cut.join(', ')}, but the plate's names read «${plate.names}»`);
    if (!plate.cut.length && plate.names) last.push(`no name of this match was cut, yet the plate lists them («${plate.names}»)`);
    results[results.length - 1][0] = plate.cut.length ? 'plate (the cut names in full)' : 'plate (no name cut: one line)';
    // The podium with three worst-case names
    await resumeWith(page, ns => { tourney.phase = 'podium'; tourney.podium = ns; }, names.slice(0, 3));
    if (await until(page, () => arenaState.kind === 'podium', 20)) await look('podium', show ? 3000 : 300);   // the show's champion: the jump and the crown drop take 2.5 s
    else results.push(['podium', ['no podium']]);
    // The Hall of Fame: five tournaments with the worst-case names on every podium; two of them tied for most wins
    await resumeWith(page, ns => {
        const [a, b, c, d] = ns, h = getHonours();
        h.hall = [[a, b, c], [b, a, d], [a, c, b], [b, d, a], [c, a, b]].map((podium, i) => ({ date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(), players: 16, size: 16, podium }));
        h.medals = { [a]: [2, 1, 0], [b]: [2, 1, 0], [c]: [1, 1, 1], [d]: [0, 2, 1] };   // @a and @b tied: both on the most-wins line
        saveHonours(h);
        tourney.phase = 'hall';
    }, names.slice(0, 4));
    // Both tied players on the most-wins line
    const bestOn = async (sel, at) => { const k = await page.evaluate(q => document.querySelectorAll(q).length, sel); if (k !== 2) results[results.length - 1][1].push(`${k} name(s) on the ${at} most-wins line, not the 2 tied`); };
    if (await until(page, () => arenaState.kind === 'hall', 20)) { await look('hall'); await bestOn('#log-countdown .hf-best .hf-n', 'arena'); }
    else results.push(['hall', ['no Hall of Fame']]);
    await page.evaluate(lang => window.__chat('viewer_x', lang === 'uk' ? '!зала' : '!hall'), lang);
    await look('hall card');
    await bestOn('#info-feed .hall-card .hf-best .hf-n', 'card');
    return results;
}

module.exports = { tourneyScreens, tourneyScreenProblems, tourneyNames, WORST, SIZES, signUp, until, resumeWith };
