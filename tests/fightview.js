// Fight view test: the battle log cards, the turn animation, ultimates, the countdown and the result card
// (design/redesign-reference.html), in both languages, with seeded fights and the game clock under the test's control.
//   - Countdown: default (the existing 4.5 s before turn 1, "БІЙ ПОЧИНАЄТЬСЯ") and with the betting window on (30 s,
//     "СТАВКИ ВІДКРИТО"; test battles keep the short wait): the timer, the plate and that turn 1 comes at zero
//   - Every turn of several real fights: one card per attack in the attacker's column, the highlight on the attacker,
//     the damage number on the target's card, the whole turn animation finished inside the turn, no card past 2 lines
//   - Every effect from the test menu's "next hit casts" picker, every ultimate from its СИЛА button, every Jackpot
//     outcome (including a miss): the card text and the fighter-card chip
//   - The result card's numbers against the fight's own cards; level-up messages against the game's numbers
//   - After several fights the log holds only the current fight; no internal ids anywhere; worst-case cards fit
//   - Review screenshots: tests/screenshots/fightview-cards.png (log cards of every kind, both languages) and
//     tests/screenshots/fightview-turn.png (countdowns, the turn steps, an ultimate, the result, both languages)
//
// Usage: npm run test:fightview   (or node tests/fightview.js)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { pageInit } = require('./page_hooks');
const { settleArena } = require('./settle');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PAGE = 'file:///' + path.join(ROOT, 'showcase/index.html').replace(/\\/g, '/');
const SEED = Number(process.env.UI_SEED || 3);
const TURN = 4500, HIT = 600;
// FV_ONLY=2,4 runs only those sections (0–8, numbered below); the review sheet of the arena (8) needs 1, 2, 3 and 5
const ONLY = (process.env.FV_ONLY || '').split(',').filter(Boolean);
const run = n => !ONLY.length || ONLY.includes(String(n));

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);

async function open(browser, { lang = 'uk', betting = false, width = 1920, height = 1080 } = {}) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
    await page.route(/tmi(\.min)?\.js/, r => r.fulfill({ contentType: 'application/javascript', body: '' }));
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));
    await page.addInitScript(pageInit, SEED);
    if (betting) await page.addInitScript(() => localStorage.setItem('drake_arena_showcase_betting', '1'));
    await page.goto(`${PAGE}?lang=${lang}`);
    await page.evaluate(() => document.fonts.ready);
    await settleArena(page);
    return { page, context, errors };
}
const say = (page, user, msg, color = '#ff7f50') => page.evaluate(([u, m, c]) => handleChatMessage('#test', { username: u, color: c }, m, false), [user, msg, color]);
const cmd = (lang, uk, en) => lang === 'uk' ? uk : en;
const COLOR_WORD = { uk: { red: 'червоний', blue: 'синій', black: 'чорний', gold: 'золотий', purple: 'фіолетовий', green: 'зелений', white: 'білий' },
                     en: { red: 'red', blue: 'blue', black: 'black', gold: 'gold', purple: 'purple', green: 'green', white: 'white' } };
async function register(page, lang, users) {
    for (const [u, type, color] of users) await say(page, u, `${cmd(lang, '!дрейк', '!drake')} ${COLOR_WORD[lang][type]}`, color || '#ff7f50');
}
// Moves the game clock to an exact time after the current fight started
async function toFightTime(page, ms) {
    const [start, now] = await page.evaluate(() => [window.__fights[window.__fights.length - 1].t, Date.now()]);
    if (start + ms > now) await page.clock.runFor(start + ms - now);
}

// ---- In the page: what the arena shows right now ----
function arenaNow() {
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const cards = [...document.querySelectorAll('#log-feed .lc')].map(c => ({
        turn: +txt(c.querySelector('.lc-turn')), side: c.classList.contains('left') ? 'left' : 'right', lit: c.classList.contains('lit'),
        crit: c.classList.contains('crit'), ult: txt(c.querySelector('.lc-ult')), l1: txt(c.querySelector('.lc-l1')), l2: [...c.querySelectorAll('.lc-l2 .lk, .lc-l2 .lx')].map(txt).join(' '),
        num: txt(c.querySelector('.lc-num')), move: txt(c.querySelector('.lc-move')),
    }));
    const cells = [...document.querySelectorAll('#log-feed .lc-cell:not(.empty)')].map(c => ({ kind: [...c.classList].find(k => ['wait', 'pending', 'ko'].includes(k)), text: txt(c) }));
    const card = p => { const c = document.getElementById(`card-${p}`); return { attacking: c.classList.contains('attacking'), ult: c.classList.contains('ult-turn'), tab: txt(document.getElementById(`tab-${p}`)),
        tabShown: getComputedStyle(document.getElementById(`tab-${p}`)).opacity > 0.5, pops: [...c.querySelectorAll('.dmg-pop')].map(x => x.textContent), name: txt(document.getElementById(`name-${p}`)).replace('@', ''),
        chips: [...c.querySelectorAll('.status-item')].map(txt) }; };
    return { turn: arenaState.turn, kind: arenaState.kind, running: isBattleRunning, plate: txt(document.getElementById('status-plate')), cards, cells, p1: card('p1'), p2: card('p2'),
        banners: [...document.querySelectorAll('#log-feed .log-banner')].map(txt), result: txt(document.querySelector('#log-feed .log-result')),
        counting: document.getElementById('log-panel').classList.contains('counting'), timer: txt(document.getElementById('cd-time')),
        textLog: window.__fightLog.slice() };
}

// Cards that wrap past two lines, or text cut off inside them (squeezed text measured as drawn)
function cardFitProblems() {
    const out = [];
    const sw = document.getElementById('stage').getBoundingClientRect().width, k = sw ? sw / 1920 : 1;   // the review sheet hides the stage
    const width = el => { const sq = el.querySelector(':scope > .squeeze'), cs = getComputedStyle(el);
        return sq ? Math.ceil(sq.getBoundingClientRect().width / k + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) : el.scrollWidth; };
    document.querySelectorAll('#log-feed .lc, #review-sheet .lc').forEach(c => {
        const lines = [...c.children].filter(x => !x.classList.contains('lc-glow'));
        const want = c.classList.contains('has-ult') ? 3 : 2;
        if (lines.length !== want) out.push(`card ${c.textContent.slice(0, 40)}: ${lines.length} lines`);
        const h = c.getBoundingClientRect().height / k;
        if (Math.abs(h - (want === 3 ? 76 : 58)) > 0.5) out.push(`card "${c.textContent.slice(0, 40)}" is ${h}px tall`);
        lines.forEach(l => {
            if (width(l) > l.clientWidth + 1) out.push(`cut off: "${l.textContent.slice(0, 60)}" ${width(l)} > ${l.clientWidth}`);
            if (l.scrollHeight > l.clientHeight + 1) out.push(`wraps: "${l.textContent.slice(0, 60)}"`);
        });
        // Second lines are never drawn below 90% of their normal size (font size × any sideways squeeze)
        const l2 = c.querySelector('.lc-l2');
        if (l2) {
            const sq = l2.querySelector(':scope > .squeeze');
            const squeeze = sq ? +(/scaleX\(([\d.]+)\)/.exec(sq.style.transform) || [0, 1])[1] : 1;
            const scale = parseFloat(getComputedStyle(l2).fontSize) / 12 * squeeze;
            if (scale < 0.9 - 1e-6) out.push(`second line at ${Math.round(scale * 100)}%: "${l2.textContent.slice(0, 60)}"`);
            const more = l2.querySelector('.lk.more');
            if (more && (!/^\+\d+$/.test(more.textContent) || [...l2.querySelectorAll('.lk')].pop() !== more)) out.push(`"+N" isn't the last chip: "${l2.textContent.slice(0, 60)}"`);
        }
        c.querySelectorAll('.lc-move').forEach(m => { if (width(m) > m.clientWidth + 1) out.push(`move name cut off: "${m.textContent}"`); });
    });
    document.querySelectorAll('#log-feed .lc-cell:not(.empty), #review-sheet .lc-cell:not(.empty), #log-feed .log-banner, #review-sheet .log-banner').forEach(c => {
        if (width(c) > c.clientWidth + 1) out.push(`cut off: "${c.textContent.slice(0, 60)}"`);
    });
    return out;
}

// Animations in the arena that are still running, and how long until the last one ends (ms)
function animationTail() {
    const stage = document.getElementById('stage');
    let tail = 0;
    document.getAnimations().forEach(a => {
        const t = a.effect && a.effect.target;
        if (!t || !stage.contains(t) || a.effect.getTiming().iterations === Infinity) return;
        const ct = a.effect.getComputedTiming();
        tail = Math.max(tail, ct.endTime - (ct.localTime || 0));
    });
    return tail;
}

// No internal ids, placeholders or broken values anywhere on screen
function idProblems() {
    const text = (document.getElementById('stage').innerText + '\n' + document.getElementById('info-feed').innerText);
    const ids = [...EFFECT_IDS, ...ULTIMATE_IDS];
    const found = ids.filter(id => new RegExp(`(?<![\\p{L}_])${id}(?![\\p{L}_])`, 'u').test(text));
    ['undefined', 'NaN', 'null', '[object', '{', '}'].forEach(w => { if (text.includes(w)) found.push(w); });
    return [...new Set(found)];
}

// ---- Playing a fight turn by turn, checking each step ----
// Returns what was seen: per turn the attacker side, the card number, crit, and every problem found
async function playChecked(page, label, { onStep1, onStep2, maxTurns = 31 } = {}) {
    const seen = { turns: [], problems: [], tails: [], fitProblems: [], ids: new Set() };
    for (let turn = 1; turn <= maxTurns; turn++) {
        if (!(await page.evaluate('isBattleRunning'))) break;
        await toFightTime(page, turn * TURN + 1);
        await settleArena(page);
        const s1 = await page.evaluate(arenaNow);
        if (!s1.running && s1.kind === 'result') break;
        if (s1.turn !== turn) continue;
        const atkSide = turn % 2 ? 'p1' : 'p2', defSide = turn % 2 ? 'p2' : 'p1';
        // Step 1: the attacker lights up with its tab, the log shows "⚔ @x атакує…" in its column
        if (!s1[atkSide].attacking || s1[defSide].attacking) seen.problems.push(`${label} turn ${turn} step 1: highlight on ${s1.p1.attacking ? 'p1' : ''}${s1.p2.attacking ? 'p2' : ''}, attacker is ${atkSide}`);
        if (!s1[atkSide].tabShown) seen.problems.push(`${label} turn ${turn} step 1: no attack tab`);
        const pending = s1.cells.find(c => c.kind === 'pending');
        if (!pending || !pending.text.includes('@' + s1[atkSide].name)) {
            const ko = s1.cells.find(c => c.kind === 'ko');
            if (!ko) seen.problems.push(`${label} turn ${turn} step 1: no "атакує…" cell (${JSON.stringify(s1.cells)})`);
        }
        if (onStep1) await onStep1(s1, turn);
        // Step 2: the hit lands
        await toFightTime(page, turn * TURN + HIT + 1);
        const tail = await page.evaluate(animationTail);
        seen.tails.push(tail);
        if (HIT + tail > TURN) seen.problems.push(`${label} turn ${turn}: the animation runs ${HIT + tail} ms, longer than the turn`);
        await settleArena(page);
        const s2 = await page.evaluate(arenaNow);
        const mine = s2.cards.filter(c => c.turn === turn);
        if (mine.length > 1) seen.problems.push(`${label} turn ${turn}: ${mine.length} cards`);
        const c = mine[0];
        const koNow = s2.cells.some(x => x.kind === 'ko');
        if (!c && !koNow) seen.problems.push(`${label} turn ${turn}: no card`);
        if (c) {
            if (c.side !== (turn % 2 ? 'left' : 'right')) seen.problems.push(`${label} turn ${turn}: card in the ${c.side} column`);
            if (!c.lit) seen.problems.push(`${label} turn ${turn}: the new card isn't lit`);
            if (s2.cards.filter(x => x.lit).length !== 1) seen.problems.push(`${label} turn ${turn}: ${s2.cards.filter(x => x.lit).length} lit cards`);
            const isAttack = /^-?\d+$/.test(c.num) && !c.num.startsWith('+');
            if (isAttack) {
                // The pop has faded by now (settled); the number was checked when it appeared, see onStep2 below
            }
            seen.turns.push({ turn, side: c.side, num: c.num, crit: c.crit, ult: c.ult, l2: c.l2 });
        }
        (await page.evaluate(cardFitProblems)).forEach(p => seen.fitProblems.push(`${label} turn ${turn}: ${p}`));
        (await page.evaluate(idProblems)).forEach(p => seen.ids.add(p));
        if (onStep2) await onStep2(s2, turn, c);
    }
    // Let the fight finish (the result is drawn when the last hit lands)
    for (let i = 0; i < 10 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN);
    await page.clock.runFor(HIT + 100);
    await settleArena(page);
    return seen;
}

// Damage pops: the step-2 number on the target's card, caught right when it appears (before it fades)
async function popAtStep2(page, turn) {
    await toFightTime(page, turn * TURN + HIT + 1);
    return page.evaluate(() => ({ p1: [...document.querySelectorAll('#card-p1 .dmg-pop')].map(x => x.textContent), p2: [...document.querySelectorAll('#card-p2 .dmg-pop')].map(x => x.textContent) }));
}

(async () => {
    fs.mkdirSync(SHOTS, { recursive: true });
    const browser = await chromium.launch();
    const turnShots = {};   // review sheet 2: arena crops per state and language
    const crop = { x: 486, y: 118, width: 948, height: 932 };
    try {
        // ===== 0. Only transform and opacity are animated (no shadows, sizes or colours), so OBS doesn't drop frames =====
        console.log('\nAnimated properties');
        if (run(0)) {
            const { page, context } = await open(browser, { lang: 'uk' });
            const bad = await page.evaluate(() => {
                const out = [], ok = p => ['transform', 'opacity'].includes(p);
                for (const sheet of document.styleSheets) {
                    let rules; try { rules = sheet.cssRules; } catch (e) { continue; }   // Google Fonts: cross-origin, no animations
                    for (const r of rules) {
                        if (r.type === CSSRule.KEYFRAMES_RULE) for (const k of r.cssRules) for (const p of k.style) { if (!ok(p)) out.push(`@keyframes ${r.name}: ${p}`); }
                        if (r.style && r.style.transitionProperty) r.style.transitionProperty.split(',').map(x => x.trim()).forEach(p => { if (!ok(p)) out.push(`${r.selectorText}: transition of ${p}`); });
                    }
                }
                return out;
            });
            check(!bad.length, 'every @keyframes and transition in the page animates only transform or opacity (glows are pre-drawn and faded)', bad.slice(0, 5).join(' | '));
            await context.close();
        }

        // ===== 1. Countdown, both modes, both languages =====
        console.log('\nCountdown');
        if (run(1)) for (const lang of ['uk', 'en']) for (const betting of [false, true]) {
            const tag = `[${lang}, betting window ${betting ? 'on' : 'off'}]`;
            const { page, context, errors } = await open(browser, { lang, betting });
            await register(page, lang, [['alpha', 'red'], ['omega', 'green']]);
            await say(page, 'alpha', cmd(lang, '!черга', '!queue')); await say(page, 'omega', cmd(lang, '!черга', '!queue'));
            const W = betting ? 30000 : TURN;
            const t0 = await page.evaluate(() => Date.now());
            const plateWant = betting ? (lang === 'uk' ? 'СТАВКИ ВІДКРИТО' : 'BETS OPEN') : (lang === 'uk' ? 'БІЙ ПОЧИНАЄТЬСЯ' : 'FIGHT STARTING');
            const samples = [];
            for (let e = 0; e < W; e += 500) {
                const now = await page.evaluate(() => Date.now());
                if (t0 + e > now) await page.clock.runFor(t0 + e - now);
                const s = await page.evaluate(() => ({ kind: arenaState.kind, plate: document.getElementById('status-plate').textContent, shown: document.getElementById('status-plate').innerText,
                    timer: (document.getElementById('cd-time') || {}).textContent, counting: document.getElementById('log-panel').classList.contains('counting'), turn1: window.__fightLog.some(l => /^\[(Хід|Turn) 1\]/.test(l)) }));
                samples.push({ e, ...s });
            }
            const bad = samples.filter(s => {
                const want = Math.ceil((W - s.e) / 1000);
                const timerOk = s.timer === `${Math.floor(want / 60)}:${String(want % 60).padStart(2, '0')}`;
                return s.kind !== 'countdown' || !s.plate.toUpperCase().includes(plateWant) || !s.counting || !timerOk || s.turn1;
            });
            if (lang === 'uk' && !betting) { await settleArena(page); turnShots['uk-0'] = await page.screenshot({ clip: crop }); }
            if (betting) { await settleArena(page); turnShots[`${lang}-b`] = await page.screenshot({ clip: crop }); }
            if (lang === 'en' && !betting) { await settleArena(page); turnShots['en-0'] = await page.screenshot({ clip: crop }); }
            // Turn 1 exactly when the timer reaches zero, not a millisecond earlier
            let now = await page.evaluate(() => Date.now());
            await page.clock.runFor(t0 + W - 1 - now);
            const before = await page.evaluate(() => window.__fightLog.some(l => /^\[(Хід|Turn) 1\]/.test(l)));
            await page.clock.runFor(1);
            const after = await page.evaluate(() => ({ t1: window.__fightLog.some(l => /^\[(Хід|Turn) 1\]/.test(l)), kind: arenaState.kind, counting: document.getElementById('log-panel').classList.contains('counting') }));
            check(!bad.length && !before && after.t1 && after.kind === 'fight' && !after.counting,
                `${tag} "${samples[0].shown}" and the timer from ${samples[0].timer} down every second; turn 1 lands at exactly ${W / 1000} s and the log replaces the countdown`,
                JSON.stringify({ bad: bad.slice(0, 3), before, after }));
            // Later turns keep the old rhythm: one every 4.5 s
            const starts = [];
            for (let t = 2; t <= 4; t++) {
                now = await page.evaluate(() => Date.now());
                await page.clock.runFor(t0 + W + (t - 1) * TURN - 1 - now);
                const early = await page.evaluate(n => window.__fightLog.some(l => new RegExp(`^\\[(Хід|Turn) ${n}\\]`).test(l)), t);
                await page.clock.runFor(1);
                const on = await page.evaluate(n => window.__fightLog.some(l => new RegExp(`^\\[(Хід|Turn) ${n}\\]`).test(l)) || !isBattleRunning, t);
                starts.push(!early && on);
            }
            check(starts.every(Boolean), `${tag} turns 2–4 land every 4.5 s after it`, JSON.stringify(starts));
            if (betting) {
                // Test battles keep the short wait even with the betting window on
                for (let i = 0; i < 40 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN);
                await page.clock.runFor(6000);
                await page.evaluate(() => testBattle());
                const tb = await page.evaluate(() => Date.now());
                await page.clock.runFor(TURN - 1);
                const s = await page.evaluate(() => ({ plate: document.getElementById('status-plate').textContent, t1: window.__fightLog.filter(l => /^\[(Хід|Turn) 1\]/.test(l)).length }));
                await page.clock.runFor(1);
                const t1 = await page.evaluate(() => window.__fightLog.filter(l => /^\[(Хід|Turn) 1\]/.test(l)).length);
                check(s.plate.toUpperCase().includes(lang === 'uk' ? 'БІЙ ПОЧИНАЄТЬСЯ' : 'FIGHT STARTING') && t1 === s.t1 + 1,
                    `${tag} a test battle still starts after 4.5 s ("${s.plate}")`, JSON.stringify({ s, t1 }));
            }
            if (errors.length) fail(`${tag} page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 2. Real fights, turn by turn, both languages =====
        console.log('\nFights, turn by turn');
        if (run(2)) for (const lang of ['uk', 'en']) {
            const { page, context, errors } = await open(browser, { lang });
            // Every element, the streamer's White Dragon (its huge hits are the worst case for the damage number) and long names
            await page.evaluate(() => setStreamerUser('streamer_with_long_name'));
            await register(page, lang, [['kotyk_ua', 'red', '#ff7f50'], ['jade', 'green', '#8c8cff'], ['mwmwmwmwmwmwmwmwmwmwmwmwm', 'black', '#000000'],
                ['sapphire', 'blue', '#5fd4ff'], ['ruby', 'gold', '#ffd166'], ['mira', 'purple', '#c792ea'], ['streamer_with_long_name', 'white', '#bfe9ff']]);
            const fights = [['kotyk_ua', 'jade', true], ['mwmwmwmwmwmwmwmwmwmwmwmwm', 'sapphire', false], ['ruby', 'mira', true], ['streamer_with_long_name', 'kotyk_ua', false]];
            const allProblems = [], fit = [], ids = new Set(), tails = [];
            let resultChecks = [], onlyCurrent = [], xpChecks = [];
            for (const [a, b, ranked] of fights) {
                await page.clock.runFor(4 * 60000);   // past the fighters' 3-minute cooldown
                const xpBefore = await page.evaluate(([a, b]) => ({ [a]: getDragonStrict(a).xp, [b]: getDragonStrict(b).xp }), [a, b]);
                if (ranked) { await say(page, a, cmd(lang, '!черга', '!queue')); await say(page, b, cmd(lang, '!черга', '!queue')); }
                else { await say(page, a, `${cmd(lang, '!бій', '!battle')} @${b}`); await say(page, b, cmd(lang, '!прийняти', '!accept')); }
                const sides = await page.evaluate(() => { const f = window.__fights[window.__fights.length - 1]; return f; });
                const pops = [];
                const seen = await playChecked(page, `[${lang}] ${a} vs ${b}`, {
                    onStep1: async (s1, turn) => {
                        // Only the current fight's cards: after its first turn, no card from an earlier fight
                        if (turn === 1) {
                            // The visible log and the hidden text record (#battle-log) hold only this fight
                            const record = await page.evaluate(() => [...document.getElementById('battle-log').children].map(x => x.textContent));
                            const names = [...new Set(record.join(' ').match(/@[\w-]+/g) || [])];
                            const turns = record.map(l => (/^\[(?:Хід|Turn) (\d+)\]/.exec(l) || [])[1]).filter(Boolean);
                            onlyCurrent.push(s1.cards.length === 0 && s1.banners.some(t => t.includes('@' + a)) && s1.banners.some(t => t.includes('@' + b))
                                && names.every(n => n === '@' + a || n === '@' + b) && turns.every(n => n === '1') && turns.length === 1);
                        }
                        if (turn === 1 && lang === 'uk' && a === 'kotyk_ua') turnShots['uk-1'] = await page.screenshot({ clip: crop });
                        if (turn === 1 && lang === 'en' && a === 'kotyk_ua') turnShots['en-1'] = await page.screenshot({ clip: crop });
                    },
                });
                seen.problems.forEach(p => allProblems.push(p));
                seen.fitProblems.forEach(p => fit.push(p));
                seen.ids.forEach(i => ids.add(i));
                tails.push(...seen.tails);
                // The result card against the fight's own cards
                const res = await page.evaluate(arenaNow);
                const leftName = res.p1.name, rightName = res.p2.name;
                const sum = side => seen.turns.filter(t => t.side === side && /^-\d+$|^0$/.test(t.num)).reduce((x, t) => x + Math.abs(+t.num), 0);
                const max = side => Math.max(0, ...seen.turns.filter(t => t.side === side && /^-\d+$|^0$/.test(t.num)).map(t => Math.abs(+t.num)));
                const crits = side => seen.turns.filter(t => t.side === side && t.crit).length;
                const table = await page.evaluate(() => [...document.querySelectorAll('#log-feed .log-result .lr-grid > span')].map(x => x.textContent.trim()));
                const want = [`@${leftName}`, '', `@${rightName}`, String(sum('left')), table[4], String(sum('right')), String(max('left')), table[7], String(max('right')),
                    String(crits('left')), table[10], String(crits('right'))];
                const xpAfter = await page.evaluate(([a, b]) => ({ [a]: getDragonStrict(a).xp, [b]: getDragonStrict(b).xp }), [a, b]);
                const xpGot = n => xpAfter[n] - xpBefore[n];
                const xpCell = n => !ranked ? (lang === 'uk' ? 'без досвіду' : 'no XP') : (xpGot(n) ? `+${xpGot(n)} XP` : (lang === 'uk' ? 'макс. рівень' : 'max level'));
                want.push(xpCell(leftName), table[13], xpCell(rightName));
                resultChecks.push({ fight: `${a} vs ${b}`, ok: JSON.stringify(table) === JSON.stringify(want), table, want, turns: seen.turns.length });
                if (lang === 'uk' && a === 'kotyk_ua') turnShots['uk-4'] = await page.screenshot({ clip: crop });
                if (lang === 'en' && a === 'kotyk_ua') turnShots['en-4'] = await page.screenshot({ clip: crop });
                if (!ranked) xpChecks.push(xpGot(a) === 0 && xpGot(b) === 0);
            }
            check(!allProblems.length, `[${lang}] ${fights.length} fights, every turn: one card per attack in the attacker's column, lit; the highlight and its tab on the attacker; "атакує…" in the log first`,
                allProblems.slice(0, 5).join(' | '));
            check(tails.length && Math.max(...tails) + HIT <= TURN, `[${lang}] the whole turn animation ends inside the 4.5 s turn (longest: ${HIT + Math.round(Math.max(...tails))} ms)`, `${Math.max(...tails)} ms`);
            check(!fit.length, `[${lang}] no card wraps past two lines or is cut off (long names, the White Dragon's damage, effect lines)`, fit.slice(0, 5).join(' | '));
            check(resultChecks.every(r => r.ok), `[${lang}] result cards match the fights' cards: damage, biggest hit, crits per fighter, XP as saved (${resultChecks.map(r => `${r.turns} turns`).join(', ')})`,
                JSON.stringify(resultChecks.filter(r => !r.ok).slice(0, 1)));
            check(onlyCurrent.every(Boolean) && onlyCurrent.length === fights.length, `[${lang}] each new fight starts with an empty log and an empty text record (#battle-log): only its own cards, names and turns`, JSON.stringify(onlyCurrent));
            check(!ids.size, `[${lang}] no internal ids, placeholders or broken values on screen`, [...ids].join(', '));
            if (errors.length) fail(`[${lang}] page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 3. The hit lands: damage number on the target's card =====
        console.log('\nDamage numbers');
        if (run(3)) for (const lang of ['uk', 'en']) {
            const { page, context } = await open(browser, { lang });
            await register(page, lang, [['alpha', 'red'], ['omega', 'blue']]);
            await say(page, 'alpha', cmd(lang, '!черга', '!queue')); await say(page, 'omega', cmd(lang, '!черга', '!queue'));
            const bad = []; let checked = 0;
            for (let turn = 1; turn <= 12 && await page.evaluate('isBattleRunning'); turn++) {
                const pops = await popAtStep2(page, turn);
                // Review frame: the hit mid-animation (number popping, target flashing), in real time
                if (turn === 3) { await page.waitForTimeout(380); turnShots[`${lang}-2`] = await page.screenshot({ clip: crop }); }
                await settleArena(page);
                const s = await page.evaluate(arenaNow);
                const c = s.cards.find(x => x.turn === turn);
                if (!c || !/^-?\d+$/.test(c.num)) continue;
                const target = turn % 2 ? 'p2' : 'p1';
                checked++;
                if (!pops[target].includes(c.num === '0' ? '0' : c.num)) bad.push(`turn ${turn}: card ${c.num}, pops ${JSON.stringify(pops)}`);
            }
            check(checked >= 4 && !bad.length, `[${lang}] on ${checked} hits the card's damage number pops on the target's card`, bad.slice(0, 3).join(' | '));
            await context.close();
        }

        // ===== 4. Every effect from the test menu =====
        console.log('\nEffects from the test menu');
        if (run(4)) for (const lang of ['uk', 'en']) {
            const { page, context, errors } = await open(browser, { lang });
            await page.click('button[data-i18n="btn_settings"]');
            const ids = await page.evaluate(() => EFFECT_IDS.slice());
            const results = [];
            const ensureFight = async () => {
                if (await page.evaluate('isBattleRunning')) return;
                await page.clock.runFor(6000);
                await page.click('button[data-i18n="btn_test"]');
            };
            // Dispel needs buffs to remove: it goes right after a buff
            const order = ids.filter(id => id !== 'dispel'); order.splice(order.indexOf('regen') + 1, 0, 'dispel');
            const pick = async id => { await page.selectOption('#debug-force-cast', ''); await page.selectOption('#debug-force-cast', id); };
            for (const id of order) {
                await ensureFight();
                await pick(id);
                let found = null;
                for (let i = 0; i < 12 && !found; i++) {
                    if (!(await page.evaluate('isBattleRunning'))) { await ensureFight(); await pick(id); }
                    // A cast that was used up without showing (e.g. Dispel on a target with no buffs is recast as
                    // another effect, by the game's rule): pick it again. Dispel's target gets a buff to remove first.
                    if (!(await page.evaluate('forcedCast'))) await pick(id);
                    if (id === 'dispel') await page.evaluate(() => Object.values(battleFx).forEach(st => { if (!st.buff.length) st.buff.push({ id: 'regen', left: 3, power: 1 }); }));
                    const t = await page.evaluate(() => arenaState.turn || 0);
                    await toFightTime(page, (t + 1) * TURN + HIT + 1);
                    await settleArena(page);
                    found = await page.evaluate(id => {
                        const name = fxName(id), c = [...document.querySelectorAll('#log-feed .lc')].pop();
                        if (!c || !c.textContent.includes(name)) return null;
                        const ownerChips = ['p1', 'p2'].flatMap(p => [...document.querySelectorAll(`#status-${p} .status-item`)].map(x => x.textContent));
                        return { l2: [...c.querySelectorAll('.lc-l2 .lk, .lc-l2 .lx')].map(x => x.textContent.trim()).join(' '), chip: EFFECTS[id].lasts === 'instant' ? '' : effectChipText({ id, left: EFFECTS[id].count }), ownerChips, forced: forcedCast };
                    }, id);
                }
                if (!found) { results.push({ id, ok: false, why: 'never cast' }); continue; }
                const e = await page.evaluate(id => ({ kind: EFFECTS[id].kind, lasts: EFFECTS[id].lasts, name: fxName(id) }), id);
                const label = { uk: e.kind === 'buff' ? 'отримує' : 'накладає', en: e.kind === 'buff' ? 'gets' : 'applies' }[lang];
                const refresh = { uk: 'оновлює', en: 'refreshes' }[lang], replace = { uk: 'замінює', en: 'replaces' }[lang], removes = { uk: 'знімає', en: 'removes' }[lang];
                const textOk = e.lasts === 'instant' ? found.l2.includes(`${e.name} ${removes}`)
                    : found.l2.includes(`${label} ${e.name}`) || found.l2.includes(`${refresh} ${e.name}`) || found.l2.includes(`${e.name} ${replace}`);
                const chipOk = e.lasts === 'instant' || found.ownerChips.some(c => c.startsWith(e.name));
                results.push({ id, ok: textOk && chipOk && found.forced === null, why: JSON.stringify(found) });
            }
            await page.selectOption('#debug-force-cast', '');
            const bad = results.filter(r => !r.ok);
            check(!bad.length && results.length === 12, `[${lang}] all 12 effects cast from "next hit casts": the card says it ("накладає 🔥 Підпал", refresh / replace / Dispel in words) and the fighter card shows the chip`,
                bad.slice(0, 3).map(r => `${r.id}: ${r.why}`).join(' | '));
            if (errors.length) fail(`[${lang}] page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 5. Every ultimate from the СИЛА button, every Jackpot outcome =====
        console.log('\nUltimates from the test menu');
        if (run(5)) for (const lang of ['uk', 'en']) {
            const { page, context, errors } = await open(browser, { lang });
            await page.click('button[data-i18n="btn_settings"]');
            const ults = await page.evaluate(() => ULTIMATE_IDS.map(id => ({ id, element: CLASS_ULTIMATES[id].element, label: ultLabel(id), name: ultName(id), icon: CLASS_ULTIMATES[id].icon })));
            const jackpotCases = [['💎', '💎', '💎'], ['💎', '🪙', '💀'], ['🪙', '💀', '💀'], ['💀', '💀', '💀']];
            const runs = [...ults.map(u => ({ u })), ...jackpotCases.map(reels => ({ u: ults.find(x => x.id === 'jackpot'), reels }))];
            const results = [];
            let n = 0;
            for (const run of runs) {
                const u = run.u, me = `ult_${n}`, foe = `foe_${n}`; n++;
                const foeType = u.element === 'purple' ? 'red' : 'purple';
                await register(page, lang, [[me, u.element], [foe, foeType]]);
                if (u.id === 'theft') { /* the foe gets a buff first, so there is something to take */ await page.selectOption('#debug-force-cast', 'rage'); }
                if (run.reels) await page.evaluate(icons => { let i = 0; window.spinReel = () => { const icon = icons[i++ % 3]; return CLASS_ULTIMATES.jackpot.reels.find(r => r.icon === icon); }; }, run.reels);
                else await page.evaluate(() => { if (window.__realSpin) window.spinReel = window.__realSpin; else window.__realSpin = window.spinReel; });
                await page.clock.runFor(4 * 60000);
                await say(page, me, `${cmd(lang, '!бій', '!battle')} @${foe}`); await say(page, foe, cmd(lang, '!прийняти', '!accept'));
                const side = await page.evaluate(me => document.getElementById('name-p1').textContent.includes(me) ? 'p1' : 'p2', me);
                // Fill this fighter's meter after the foe's first hit (Theft needs the foe's forced buff first)
                let filled = false, step1 = null, card = null;
                for (let turn = 1; turn <= 8 && !card; turn++) {
                    const mine = (turn % 2 === 1) === (side === 'p1');
                    if (!filled && (mine ? turn > (u.id === 'theft' ? 2 : 0) : false)) {
                        await toFightTime(page, turn * TURN - 50);
                        await page.click(`#debug-meter-${side}`);
                        filled = true;
                    }
                    if (!(await page.evaluate('isBattleRunning'))) break;
                    await toFightTime(page, turn * TURN + 1);
                    await settleArena(page);
                    const s1 = await page.evaluate(arenaNow);
                    if (filled && mine && !step1) step1 = { tab: s1[side].tab, ult: s1[side].ult };
                    await toFightTime(page, turn * TURN + HIT + 1);
                    if (filled && mine && u.id === 'firestorm') { await page.waitForTimeout(380); turnShots[`${lang}-3`] = await page.screenshot({ clip: crop }); }
                    await settleArena(page);
                    const s2 = await page.evaluate(arenaNow);
                    const c = s2.cards.find(x => x.turn === turn);
                    if (c && c.ult) card = c;
                }
                for (let i = 0; i < 40 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN);
                await page.clock.runFor(HIT + 100);
                const want = await page.evaluate(([id, lang]) => ({
                    unblockable: { uk: 'не блокується', en: 'unblockable' }[lang], miss: { uk: 'промах', en: 'miss' }[lang],
                    burn: fxName('burn'), hits: `${CLASS_ULTIMATES.mirror.icon} ${unitLeftText('hits', CLASS_ULTIMATES.mirror.nums.hits)}`,
                    takes: { uk: 'забирає', en: 'takes' }[lang], forced: { uk: 'гарантований крит', en: 'guaranteed crit' }[lang], rage: fxName('rage'),
                }), [u.id, lang]);
                let detail = false;
                if (card) {
                    const l2 = card.l2;
                    if (u.id === 'firestorm') detail = l2.includes(want.unblockable);
                    if (u.id === 'mirror') detail = l2.includes(want.hits);
                    if (u.id === 'theft') detail = (l2.includes(want.takes) && l2.includes(want.rage)) || l2.includes(want.forced);
                    if (u.id === 'jackpot') {
                        const reels = run.reels || null, miss = reels ? reels.filter(r => r === '💀').length >= 2 : null;
                        const gems = reels ? reels.filter(r => r === '💎').length : 0;
                        detail = reels ? l2.includes(reels.join(' ')) && (miss ? l2.includes(want.miss) && card.num === '0' : l2.includes(`×${1 + gems}`)) : /💎|🪙|💀/.test(l2);
                    }
                    if (u.id === 'detonation') detail = /×\d/.test(l2);
                    if (u.id === 'bloom') detail = card.num.startsWith('+');
                }
                const ok = !!card && card.ult === u.label && !!step1 && step1.ult && step1.tab === u.name && detail;
                results.push({ id: u.id + (run.reels ? ` [${run.reels.join('')}]` : ''), ok, why: JSON.stringify({ step1, card }) });
            }
            await page.evaluate(() => { if (window.__realSpin) window.spinReel = window.__realSpin; });
            const bad = results.filter(r => !r.ok);
            check(!bad.length, `[${lang}] every ultimate from the СИЛА button: the tab shows its icon and name with the stronger glow, the card's header strip says "${lang === 'uk' ? '☄️ УЛЬТИМЕЙТ · …' : '☄️ ULTIMATE · …'}" and lists what it did; Jackpot shows its reels for 💎💎💎, 💎🪙💀 and both misses`,
                bad.slice(0, 3).map(r => `${r.id}: ${r.why}`).join(' | '));
            if (errors.length) fail(`[${lang}] page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 6. Level-ups in the chat panel =====
        console.log('\nLevel-ups');
        if (run(6)) for (const lang of ['uk', 'en']) {
            const { page, context } = await open(browser, { lang });
            await register(page, lang, [['leveller', 'gold'], ['other', 'red']]);
            // Both a few XP short of level 5 (Gold gets its XP bonus; the tier changes at 5)
            await page.evaluate(() => { const db = getDragonDB(); let x = 0; for (let l = 1; l < 5; l++) x += getRequiredXP(l); ['leveller', 'other'].forEach(n => { db[n].xp = x - 5; db[n].level = 4; }); saveDragonDB(db); });
            await say(page, 'leveller', cmd(lang, '!черга', '!queue')); await say(page, 'other', cmd(lang, '!черга', '!queue'));
            for (let i = 0; i < 40 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN);
            await page.clock.runFor(HIT + 100);
            await settleArena(page);
            const got = await page.evaluate(() => [...document.querySelectorAll('#info-feed .info-card.levelup')].map(c => c.textContent.replace(/\s+/g, ' ').trim()));
            const want = await page.evaluate(lang => ['leveller', 'other'].map(n => {
                const d = getDragonStrict(n), after = calculateLevelAndProgress(d.xp).level, before = 4;
                if (after <= before) return null;
                const hp = getMaxHP(after, d.drakeObj.type, d.title) - getMaxHP(before, d.drakeObj.type, d.title);
                const atk = Math.floor(after * 0.8) - Math.floor(before * 0.8);
                return { n, after, hp, atk, text: lang === 'uk' ? `@${n} досягає ${after}-го рівня` : `@${n} reaches level ${after}` };
            }).filter(Boolean), lang);
            const ok = want.length >= 1 && want.length === got.length && want.every(w => got.some(g => g.includes(w.text) && g.includes(`+${w.hp} HP`) && (!w.atk || g.includes(`+${w.atk}`))));
            check(ok, `[${lang}] level-ups announced in the chat panel with the game's numbers: ${got.join(' | ')}`, JSON.stringify({ got, want }));
            await context.close();
        }

        // ===== 7. Worst-case cards and the review sheet of every kind =====
        console.log('\nEvery kind of log card (review sheet)');
        if (run(7)) {
            const { page, context, errors } = await open(browser, { lang: 'uk', width: 2000, height: 1600 });
            await page.evaluate(() => {
                const sheet = document.createElement('div');
                sheet.id = 'review-sheet';
                sheet.style.cssText = 'position:absolute;left:0;top:0;width:2000px;box-sizing:border-box;padding:30px;background:#15171e;z-index:99;display:grid;grid-template-columns:920px 920px;gap:40px;font-family:var(--ui);color:var(--text)';
                document.body.appendChild(sheet);
                document.getElementById('stage').style.display = 'none';
                const longName = 'mwmwmwmwmwmwmwmwmwmwmwmwm';
                const mk = (name, type, color) => ({ name, color, drakeObj: DRAKE_TYPES.find(d => d.type === type), title: TITLES_DB[3] });
                for (const lang of ['uk', 'en']) {
                    currentLang = lang;
                    const col = document.createElement('div');
                    col.innerHTML = `<div style="font:16px var(--pixel);color:#f2c14e;margin:0 0 18px">${lang === 'uk' ? 'УКРАЇНСЬКА' : 'ENGLISH'}</div>`;
                    const box = document.createElement('div');
                    box.className = 'log-panel frame-sm';
                    box.style.cssText = 'display:flex;flex-direction:column;gap:6px;padding:14px 22px 18px;';
                    col.appendChild(box); sheet.appendChild(col);
                    const A = mk('kotyk_ua', 'red', '#ff7f50'), B = mk(longName, 'black', '#a9a9ff'), G = mk('jade', 'green', '#8c8cff'), W = mk('streamer', 'white', '#bfe9ff');
                    fv = { on: true, p1: A, p2: B, ranked: true, betting: false, items: [], stats: { [A.name]: { dmg: 228, max: 61, crits: 3 }, [B.name]: { dmg: 148, max: 38, crits: 1 } }, rec: null, hold: null, lit: null };
                    const rec = (turn, atk, def, extra) => Object.assign({ turn, atk, def, side: turn % 2 ? 'left' : 'right', ticks: [], notes: {}, casts: [], used: [], ult: null, attack: null, frozen: false }, extra);
                    const atk = (type, sub, dmg, more = {}) => Object.assign({ type, sub, dmg, crit: false, block: false, shadow: false, miss: false, pierce: false, sd: 0 }, more);
                    const add = (item) => { item.el = document.createElement('div'); box.appendChild(item.el); fvPaint(item); };
                    const row = (l, r) => add({ type: 'row', cells: { left: l, right: r } });
                    const card = r => ({ k: 'card', rec: r });
                    add({ type: 'banner', kind: 'intro', data: {} });
                    add({ type: 'banner', kind: 'start', data: {} });
                    add({ type: 'banner', kind: 'opening', data: { f: { ...A, title: TITLES_DB.find(t => t.mechanic === 'opening_buff') || TITLES_DB[3] }, id: 'rage' } });
                    row(card(rec(1, A, B, { attack: atk('physical', 'heavy', 24), casts: [{ owner: B, id: 'burn', result: 'applied' }] })),
                        card(rec(2, B, A, { attack: atk('magical', 'light', 12), ticks: [{ id: 'burn', v: -9 }], casts: [{ owner: B, id: 'regen', result: 'applied' }] })));
                    row(card(rec(3, A, B, { attack: atk('magical', 'sneaky', 57, { crit: true, pierce: true }) })),
                        card(rec(4, B, A, { attack: atk('vampire', 'heavy', 38), notes: { vamp: 19 }, ticks: [{ id: 'burn', v: -9 }, { id: 'regen', v: 14 }] })));
                    row(card(rec(5, A, B, { attack: atk('physical', 'light', 0, { block: true }) })),
                        card(rec(6, B, A, { attack: atk('physical', 'light', 0, { block: true, shadow: true }), used: ['shadow'] })));
                    row(card(rec(7, A, B, { frozen: true })),
                        card(rec(8, B, A, { attack: atk('magical', 'heavy', 31), used: ['rage', 'mark'], casts: [{ owner: A, id: 'weakness', result: 'refreshed' }] })));
                    row(card(rec(9, A, B, { attack: atk('physical', 'sneaky', 22, { pierce: true }), casts: [{ owner: A, id: 'divine', result: 'replaced', extra: 'blessing' }] })),
                        card(rec(10, B, A, { attack: atk('magical', 'light', 17), casts: [{ owner: A, id: 'dispel', result: 'dispelled', extra: ['rage', 'shield'] }] })));
                    row(card(rec(11, A, B, { attack: atk('vampire', 'light', 26), notes: { reflect: 13, thorns: 3 }, casts: [{ owner: B, id: 'poison', result: 'immune' }] })),
                        card(rec(12, B, A, { attack: atk('magical', 'heavy', 0), notes: { mirror: { would: 44, absorbed: 19, back: 11 } } })));
                    row(card(rec(13, A, B, { attack: atk('physical', 'heavy', 40), notes: { execute: true, coin: 1.5, fortune: true } })),
                        card(rec(14, B, A, { attack: atk('magical', 'light', 0), notes: { sleep: true, guardian: 12 } })));
                    // Every ultimate
                    const U = (turn, at, df, id, a, info) => card(rec(turn, at, df, { ult: Object.assign({ id }, info), attack: a }));
                    const Bl = mk('sapphire', 'blue', '#5fd4ff'), Go = mk('ruby', 'gold', '#ffd166'), Pu = mk('mira', 'purple', '#c792ea');
                    const fire = rec(15, A, B, { ult: { id: 'firestorm' }, attack: atk('magical', 'heavy', 68, { sd: 0 }), used: ['burn'],
                        casts: [{ owner: B, id: 'burn', result: 'applied' }, { owner: B, id: 'burn', result: 'refreshed' }] });
                    row(card(fire), U(16, Bl, A, 'mirror', null, { hits: 2 }));
                    row(U(17, B, A, 'theft', atk('physical', 'heavy', 61, { crit: true, sd: 1.6 }), { forced: true }), U(18, B, A, 'theft', atk('physical', 'sneaky', 44, { pierce: true, sd: 1.9 }), { taken: ['rage', 'shield'], lost: ['blessing'] }));
                    row(U(19, Go, A, 'jackpot', atk('magical', 'light', 96, { sd: 2.2 }), { reels: ['💎', '💎', '🪙'], miss: false, mult: 3 }), U(20, Go, A, 'jackpot', atk('magical', 'light', 0, { miss: true, sd: 2.5 }), { reels: ['💀', '🪙', '💀'], miss: true, mult: 1 }));
                    row(U(21, Pu, A, 'detonation', atk('magical', 'sneaky', 112, { pierce: true, sd: 2.8 }), { mult: 3.2, removed: ['burn', 'weakness'] }), U(22, G, A, 'bloom', null, { healed: 45, removed: ['poison', 'burn'] }));
                    // Sudden death, the White Dragon's damage, a knock-out by start-of-turn effects, and the other cells
                    add({ type: 'banner', kind: 'sd', data: {} });
                    row(card(rec(23, W, B, { attack: atk('physical', 'heavy', 1949998, { crit: true, sd: 3.4 }), notes: { wrath: true } })),
                        card(rec(24, B, W, { attack: atk('vampire', 'heavy', 0, { block: true, sd: 3.7 }), notes: { sovereign: true }, ticks: [{ id: 'burn', v: -12 }, { id: 'poison', v: -7 }, { id: 'regen', v: 19 }],
                            used: ['weakness', 'blessing'], casts: [{ owner: B, id: 'shadow', result: 'replaced', extra: 'divine' }] })));
                    fv.lit = null;
                    row({ k: 'pending', f: A }, { k: 'wait', f: B });
                    row({ k: 'pending', f: Go, ult: 'jackpot' }, { k: 'ko', f: B, rec: rec(26, B, A, { ticks: [{ id: 'burn', v: -12 }, { id: 'poison', v: -7 }] }) });
                    const lit = rec(27, A, B, { attack: atk('magical', 'heavy', 41), casts: [{ owner: B, id: 'frost', result: 'applied' }] });
                    fv.lit = lit;
                    row(card(lit), { k: 'ko', f: B });
                    add({ type: 'banner', kind: 'timeout', data: {} });
                    add({ type: 'result', data: { winner: A, loser: B, ranked: true, turns: 17, timeout: false, xp: { [A.name]: 40, [B.name]: 10 }, stats: fv.stats } });
                    add({ type: 'result', data: { winner: null, loser: null, ranked: false, turns: 30, timeout: false, xp: null, stats: fv.stats } });
                }
                currentLang = 'uk';
                fv = { on: false, items: [], stats: {}, rec: null, hold: null, lit: null };
            });
            await settleArena(page);
            const fitIssues = await page.evaluate(cardFitProblems);
            const n = await page.evaluate(() => document.querySelectorAll('#review-sheet .lc').length);
            const burnOnce = await page.evaluate(() => [...document.querySelectorAll('#review-sheet .lc')].filter(c => (c.querySelector('.lc-turn') || {}).textContent === '15')
                .map(c => [...c.querySelectorAll('.lc-l2 .lk')].filter(x => x.textContent.includes(EFFECTS.burn.icon)).length));
            check(burnOnce.length === 2 && burnOnce.every(k => k === 1), 'one attack touching the same effect twice (Firestorm applies 🔥 Burn, its cast refreshes it) shows it once', JSON.stringify(burnOnce));
            const crowded = await page.evaluate(() => [...document.querySelectorAll('#review-sheet .lc')].filter(c => (c.querySelector('.lc-turn') || {}).textContent === '24').map(c => {
                const chips = [...c.querySelectorAll('.lc-l2 .lk')].map(x => x.textContent);
                return { more: (c.querySelector('.lc-l2 .lk.more') || {}).textContent || '', kept: ['uk', 'en'].some(l => ['shadow', 'divine'].every(id => chips.includes(`${EFFECTS[id].icon} ${EFFECTS[id].name[l]}`))), chips };
            }));
            check(crowded.length === 2 && crowded.every(c => /^\+\d+$/.test(c.more) && c.kept),
                `the most crowded card keeps what the attack did (${crowded.length ? crowded[0].chips.filter(x => !x.startsWith('+')).slice(-3).join(' ') : ''}) and ends with "${crowded.length ? crowded[0].more : ''}" for what it dropped`, JSON.stringify(crowded));
            check(!fitIssues.length, `worst cases fit in two lines (${n} cards, both languages): 25-letter names, the White Dragon's -1949998, the longest effect line, every ultimate`, fitIssues.slice(0, 5).join(' | '));
            const idsLeft = await page.evaluate(() => { const t = document.getElementById('review-sheet').innerText; return [...EFFECT_IDS, ...ULTIMATE_IDS].filter(id => new RegExp(`(?<![\\p{L}_])${id}(?![\\p{L}_])`, 'u').test(t)).concat(['undefined', 'NaN', '{'].filter(w => t.includes(w))); });
            check(!idsLeft.length, 'no internal ids on any kind of card', idsLeft.join(', '));
            await page.waitForTimeout(500);   // the sheet sits outside the stage, so let its cells' fade-in finish too
            await page.locator('#review-sheet').screenshot({ path: path.join(SHOTS, 'fightview-cards.png') });
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== Review sheet 2: the arena through a fight, both languages =====
        if (run(8)) {
            const order = [['0', { uk: 'Відлік', en: 'Countdown' }], ['b', { uk: 'Вікно ставок', en: 'Betting window' }], ['1', { uk: 'Хід, крок 1', en: 'Turn, step 1' }],
                ['2', { uk: 'Хід, крок 2', en: 'Turn, step 2' }], ['3', { uk: 'Ультимейт', en: 'Ultimate' }], ['4', { uk: 'Результат', en: 'Result' }]];
            const missing = ['uk', 'en'].flatMap(l => order.map(([k]) => `${l}-${k}`)).filter(k => !turnShots[k]);
            check(!missing.length, 'review sheet of the arena: countdown, betting window, turn steps 1 and 2, an ultimate turn and the result, both languages', `missing: ${missing.join(', ')}`);
            const context = await browser.newContext({ viewport: { width: 2900, height: 1000 } });
            const page = await context.newPage();
            const cells = ['uk', 'en'].map(l => order.map(([k, t]) => turnShots[`${l}-${k}`]
                ? `<figure><figcaption>${t[l]}</figcaption><img src="data:image/png;base64,${turnShots[`${l}-${k}`].toString('base64')}"></figure>` : '<figure></figure>').join('')).join('');
            await page.setContent(`<html><body style="margin:0;background:#0e0f14;font:600 18px Segoe UI,sans-serif;color:#f2c14e">
                <div style="display:grid;grid-template-columns:repeat(6,474px);gap:10px;padding:16px">${cells}</div>
                <style>figure{margin:0}figcaption{margin:0 0 6px}img{width:474px;display:block}</style></body></html>`);
            await page.screenshot({ path: path.join(SHOTS, 'fightview-turn.png'), fullPage: true });
            await context.close();
        }
    } finally {
        await browser.close();
    }
    console.log(failures ? `\n${failures} fight view check(s) failed. Screenshots: tests/screenshots/` : '\nAll fight view checks passed. Screenshots: tests/screenshots/');
    process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
