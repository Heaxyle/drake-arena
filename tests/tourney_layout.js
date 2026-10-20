// Tournament screens with worst-case Twitch names, for the layout test (tests/layout.js). Names can be 25 characters:
// 25 wide letters, a mixed one, two that differ only at the end, and more 25-letter ones to fill the bracket.
// For each size (4, 8, 16 players; 13 and 15 with a qualifier) it plays through the game's own sign-up, then fast-
// forwards the saved tournament (results filled in, then a reload: the game resumes from it) to reach each screen:
//   qualifier  the first qualifier game's countdown, with the bracket (13 and 15 players)
//   bracket    the betting window of a round-1 match, with finished matches (a winner, a loser) and the live one
//   plate      that match being fought: the plate shows the cut names in full on a second line
//   podium     the podium with three worst-case names
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
    document.querySelectorAll('#log-countdown .tb-n[data-full], #log-countdown .pd-name, #log-countdown [data-name]').forEach(e => {
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
        box.querySelectorAll('*').forEach(e => { if (shown(e) && !e.closest('svg') && !inside(R(e), panel)) out.push(`${label(e)} outside the log area`); });
        // No two blocks overlapping (one inside the other doesn't count)
        const blocks = [...box.querySelectorAll('.tb-m, .tb-h, .tb-timer, .cd-row, .cd-sub, .pd-col, .pd-title')].filter(shown);
        for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
            const a = blocks[i], b = blocks[j];
            if (!a.contains(b) && !b.contains(a) && overlap(R(a), R(b))) out.push(`${label(a)} overlaps ${label(b)}`);
        }
    }
    // The arena header: the plate inside it and clear of the fight type, nothing in either wider than its box
    const plate = document.getElementById('status-plate'), type = document.getElementById('fight-type'), head = plate.parentElement;
    if (!inside(R(plate), R(head))) out.push('the plate sticks out of the header');
    if (overlap(R(plate), R(type))) out.push('the plate overlaps the fight type');
    [plate, type, ...plate.querySelectorAll('.pl-label, .pl-names')].forEach(e => { if (shown(e) && tooWide(e)) out.push(`${label(e)} wider than its box`); });
    plate.querySelectorAll('.pl-names').forEach(e => { if (parseFloat(getComputedStyle(e).fontSize) < 12) out.push(`${label(e)} under 12 px`); });
    return [...new Set(out)];
}

// Plays the sign-up through chat: n drakes with the worst-case names (levels 1–6), sign-up, everyone joins, the
// sign-up closed (it closes itself at 4, 8 and 16)
async function signUp(page, lang, n) {
    const uk = lang === 'uk', names = tourneyNames(n);
    const say = (u, m, extra) => page.evaluate(([u, m, e]) => window.__chat(u, m, e), [u, m, extra]);
    const colours = uk ? ['червоний', 'синій', 'чорний', 'золотий', 'фіолетовий', 'зелений'] : ['red', 'blue', 'black', 'gold', 'purple', 'green'];
    for (const [i, nm] of names.entries()) await say(nm, `${uk ? '!дрейк' : '!drake'} ${colours[i % 6]}`);
    await page.evaluate(ns => { const db = getDragonDB(); ns.forEach((n, i) => { db[n].xp = [0, 150, 400, 900, 1600, 2600][i % 6]; }); saveDragonDB(db); }, names);
    const size = n > 8 ? 16 : n > 4 ? 8 : 4;
    await say('mod_anna', uk ? `!турнір ${size}` : `!tournament ${size}`, { mod: true });
    for (const nm of names) await say(nm, uk ? '!учасник' : '!join');
    if (n !== size) await say('mod_anna', uk ? '!турнір старт' : '!tournament start', { mod: true });
    return names;
}
const until = async (page, fn, steps = 400) => {
    for (let i = 0; i < steps; i++) { if (await page.evaluate(fn)) return true; await page.clock.runFor(500); }
    return false;
};
// Changes the saved tournament (fn runs in the page on `tourney`), then reloads: the game resumes from it
async function resumeWith(page, fn, arg) {
    await page.evaluate(fn, arg);
    await page.evaluate(() => tourneySave());
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
}

// Every core screen for one size and language; shot(name) takes a screenshot. Returns [[screen, problems]]
async function tourneyScreens(page, lang, n, shot) {
    const results = [], look = async name => {
        await page.waitForTimeout(300);   // fitName runs on layout; let the fonts and the fit settle
        results.push([name, await page.evaluate(tourneyScreenProblems)]);
        if (shot) await shot(name);
    };
    const names = await signUp(page, lang, n);
    if (await page.evaluate(() => tourney.qual.length)) {
        if (await until(page, () => arenaState.kind === 'countdown' && !!arenaState.bracket && tourGame && tourGame.q !== undefined)) await look('qualifier');
        else results.push(['qualifier', ['no qualifier countdown with the bracket']]);
    }
    // The qualifier and the first half of round 1 decided (the earlier name wins), the rest still to play
    await resumeWith(page, () => {
        const t = tourney, win = (id, m, a, b) => { m.w = id.q !== undefined ? [1, 0] : [2, 1]; m.winner = a; tourneyAdvance(id, a, b); };
        t.qual.forEach((m, q) => win({ q }, m, m.a, m.b));
        t.rounds[0].slice(0, t.rounds[0].length / 2).forEach((m, i) => win({ r: 0, m: i }, m, m.a, m.b));
        t.phase = 'running'; t.game = 1; t.replay = false;
    });
    if (await until(page, () => arenaState.kind === 'countdown' && arenaState.betting && !!arenaState.bracket)) await look('bracket');
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
    if (await until(page, () => arenaState.kind === 'podium', 20)) await look('podium');
    else results.push(['podium', ['no podium']]);
    return results;
}

module.exports = { tourneyScreens, tourneyScreenProblems, tourneyNames, WORST, SIZES, signUp, until, resumeWith };
