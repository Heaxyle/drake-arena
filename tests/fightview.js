// Fight view test: the battle log cards, the turn animation, ultimates, the countdown and the result card
// (design/redesign-reference.html), in both languages, with seeded fights and the game clock under the test's control.
//   - Countdown: default (the existing 4.5 s before turn 1, "БІЙ ПОЧИНАЄТЬСЯ") and with the betting window on (2 min,
//     "СТАВКИ ВІДКРИТО"; test battles keep the short wait): the timer, the plate and that turn 1 comes at zero
//   - !старт / !start: the channel owner or a moderator ends the betting window early (anyone else's is ignored), and
//     so does the test panel's Skip button; the fight then starts the normal way (coin flip, 4.5 s "першим б'є …"), once
//   - The result screen holds the arena for RESULT_HOLD_MS after every fight (ranked, duel, draw): !черга only queues and
//     an accepted duel waits until it ends; the owner's or a moderator's !старт ends it early (anyone else's is ignored),
//     and further !старт are ignored for 5 s; the result tags: «Нокаут» after a KO, «Поразка» after a time-out, «Нічия»
//   - Ranked play, through the chat simulator: the queue's longest wait fights first, against the closest level (a tie to
//     whoever waited longer), in the order the "Далі в черзі" strip shows; an underdog's bonus XP on the result card;
//     the Top by wins (then fewer losses, then level); a ranked fight against the streamer's White Dragon: no win or
//     loss for either side, +10 XP for the viewer, and its result card says so
//   - Every turn of several real fights: one card per attack in the attacker's column, the highlight on the attacker,
//     the damage number on the target's card, the whole turn animation finished inside the turn, nothing cut off
//   - Every effect from the test menu's "next hit casts" picker, every ultimate from its СИЛА button, every Jackpot
//     outcome (including a miss): the card text and the fighter-card chip
//   - The result card's numbers against the fight's own cards; level-up messages against the game's numbers
//   - After several fights the log holds only the current fight; no internal ids anywhere; worst-case cards fit
//   - Nothing on a card is ever hidden (nobody can hover or scroll on stream): a second line that doesn't fit at 90% shows
//     its lower-priority items compact (icon and number), after what the attack did, and only then grows to a third line;
//     never "+N". The busiest turn there can be shows every item in both languages, nothing cut off, on the review sheet
//     and as the newest card in the live log at 1920×1080
//   - The log scrolls: a 30-turn fight keeps every row and its top is reachable; scrolled up, the view stays still while
//     turns arrive and "↓ нові ходи (N)" counts them; back at the bottom (or the pill) it follows again; 15 s untouched
//     during a fight brings it back; the result screen scrolls from the intro banner to the result card and stays put
//   - Review screenshots: tests/screenshots/fightview-cards.png (log cards of every kind, both languages) and
//     tests/screenshots/fightview-turn.png (countdowns, the turn steps, an ultimate, the result, both languages)
//
// Usage: npm run test:fightview   (or node tests/fightview.js)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { pageInit } = require('./page_hooks');
const { offTwitch } = require('./no_twitch');
const { settleArena } = require('./settle');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PAGE = 'file:///' + path.join(ROOT, 'showcase/index.html').replace(/\\/g, '/');
const SEED = Number(process.env.UI_SEED || 3);
const TURN = 4500, HIT = 600;
// FV_ONLY=2,4 runs only those sections (0–11, numbered below); the review sheet of the arena (8) needs 1, 2, 3 and 5
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
    await offTwitch(page);
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));
    await page.addInitScript(pageInit, SEED);
    await page.addInitScript({ content: [busiestRecs, cardShowsAll].map(f => `window.${f.name} = ${f};`).join('\n') });   // page-side helpers (below)
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

// Cards with anything hidden or cut off (squeezed text measured as drawn). A card is 58 px (76 with an ultimate's
// header) with a one-line second line; one whose second line wraps (.wrap) grows (.l3), and so does its row (.tall),
// every card of the row as tall as the row. Every chip and word of a second line lies inside it, so nothing is clipped;
// it is never drawn below 90%; there is no "+N"
function cardFitProblems() {
    const out = [];
    const sw = document.getElementById('stage').getBoundingClientRect().width, k = sw ? sw / 1920 : 1;   // the review sheet hides the stage
    const width = el => { const sq = el.querySelector(':scope > .squeeze'), cs = getComputedStyle(el);
        return sq ? Math.ceil(sq.getBoundingClientRect().width / k + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)) : el.scrollWidth; };
    const inside = (l2, what) => {
        const b = l2.getBoundingClientRect();
        l2.querySelectorAll('.lk, .lx').forEach(x => { const r = x.getBoundingClientRect();
            if (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1) out.push(`hidden: "${x.textContent}" on ${what}`); });
        if (l2.querySelector('.lk.more') || [...l2.querySelectorAll('.lk')].some(x => /^\+\d+$/.test(x.textContent.trim()))) out.push(`"+N" on ${what}`);
    };
    document.querySelectorAll('#log-feed .lc, #review-sheet .lc').forEach(c => {
        const what = `card "${c.textContent.slice(0, 40)}"`;
        const lines = [...c.children].filter(x => !x.classList.contains('lc-glow'));
        const want = c.classList.contains('has-ult') ? 3 : 2, base = want === 3 ? 76 : 58;
        if (lines.length !== want) out.push(`${what}: ${lines.length} lines`);
        const h = c.getBoundingClientRect().height / k, row = c.closest('.log-row'), tall = !!row && row.classList.contains('tall');
        if (!tall && Math.abs(h - base) > 0.5) out.push(`${what} is ${h}px tall`);
        if (tall && (h < base - 0.5 || Math.abs(h - row.getBoundingClientRect().height / k) > 0.5)) out.push(`${what} is ${h}px tall in a ${row.getBoundingClientRect().height / k}px row`);
        const l2 = c.querySelector('.lc-l2'), wrapped = !!l2 && l2.classList.contains('wrap');
        if (wrapped !== c.classList.contains('l3') || (wrapped && !tall)) out.push(`${what}: a wrapped second line without .l3 and .tall`);
        lines.forEach(l => {
            if (width(l) > l.clientWidth + 1) out.push(`cut off: "${l.textContent.slice(0, 60)}" ${width(l)} > ${l.clientWidth}`);
            if (!(l === l2 && wrapped) && l.scrollHeight > l.clientHeight + 1) out.push(`wraps: "${l.textContent.slice(0, 60)}"`);
        });
        // Second lines are never drawn below 90% of their normal size (font size × any sideways squeeze)
        if (l2) {
            const sq = l2.querySelector(':scope > .squeeze');
            const squeeze = sq ? +(/scaleX\(([\d.]+)\)/.exec(sq.style.transform) || [0, 1])[1] : 1;
            const scale = parseFloat(getComputedStyle(l2).fontSize) / 12 * squeeze;
            if (scale < 0.9 - 1e-6) out.push(`second line at ${Math.round(scale * 100)}%: "${l2.textContent.slice(0, 60)}"`);
            inside(l2, what);
        }
        c.querySelectorAll('.lc-move').forEach(m => { if (width(m) > m.clientWidth + 1) out.push(`move name cut off: "${m.textContent}"`); });
    });
    document.querySelectorAll('#log-feed .lc-cell:not(.empty), #review-sheet .lc-cell:not(.empty), #log-feed .log-banner, #review-sheet .log-banner').forEach(c => {
        if (width(c) > c.clientWidth + 1) out.push(`cut off: "${c.textContent.slice(0, 60)}"`);
        const l2 = c.querySelector('.lc-l2');
        if (l2) {
            inside(l2, `"${c.textContent.slice(0, 40)}"`);
            const b = c.getBoundingClientRect(), r = l2.getBoundingClientRect();
            if (r.top < b.top - 1 || r.bottom > b.bottom + 1) out.push(`cut off by its cell: "${l2.textContent.slice(0, 60)}"`);
        }
    });
    return out;
}

// The busiest turn there can be, as a turn record (page side: atk, def, the defender's colour for the arrow). Left: an
// ultimate (Shadow Theft taking two buffs and losing one of its own), a crit in sudden death, armour-piercing, a vampire
// heal, the defender's Blue reflect and Thorns title, the attacker's Chaotic charge title with its extra debuff, three
// start-of-turn ticks, two effects counted down and a cast replacing a debuff. Right: a crowded card without an ultimate
// (Gold's fortune, the coin flip, Thorns, two ticks, two counted down, two casts)
function busiestRecs(A, B) {
    const rec = (turn, atk, def, extra) => Object.assign({ turn, atk, def, side: turn % 2 ? 'left' : 'right', ticks: [], notes: {}, casts: [], used: [], ult: null, attack: null, frozen: false }, extra);
    const atk = (type, sub, dmg, more = {}) => Object.assign({ type, sub, dmg, crit: false, block: false, shadow: false, miss: false, pierce: false, sd: 0 }, more);
    return {
        left: (turn) => rec(turn, A, B, { ult: { id: 'theft', taken: ['shield', 'blessing'], lost: ['regen'] }, attack: atk('vampire', 'sneaky', 87, { crit: true, pierce: true, sd: 2.8 }),
            notes: { vamp: 43, reflect: 13, thorns: 4, chaos: true }, ticks: [{ id: 'burn', v: -12 }, { id: 'poison', v: -7 }, { id: 'regen', v: 19 }], used: ['rage', 'mark'],
            casts: [{ owner: B, id: 'frost', result: 'replaced', extra: 'weakness' }, { owner: B, id: 'poison', result: 'applied' }] }),
        right: (turn) => rec(turn, B, A, { attack: atk('physical', 'heavy', 64, { crit: true, sd: 3.1 }), notes: { fortune: true, coin: 1.5, thorns: 6 },
            ticks: [{ id: 'burn', v: -9 }, { id: 'regen', v: 14 }], used: ['blessing', 'shield'],
            casts: [{ owner: A, id: 'mark', result: 'applied' }, { owner: B, id: 'rage', result: 'refreshed' }] }),
    };
}
// What a painted card shows against what it has (page side): every chip of the card as fvCardHtml writes it must be on
// the card, in full or in its compact form (data-c), and no two different chips may be shown alike (a bare ⚡ for both
// armour-piercing and Chaotic charge); a card whose line didn't fit (compact chips, or wrapped) shows what the attack did
// (the chips outside a priority group) first, in full and in order. Returns the problems, the second line's chips, how
// many are compact and how many lines the second line takes (the game's own fvLineCount)
function cardShowsAll(el, rec, side, lang) {
    const keep = currentLang; currentLang = lang;
    const box = document.createElement('div'); box.innerHTML = fvCardHtml(rec, side);
    currentLang = keep;
    const want = [...box.querySelectorAll('.lc-l2 .lk')].map(k => ({ text: k.textContent, c: k.dataset.c, first: !k.closest('.lg') }));
    const got = [...el.querySelectorAll('.lc-l2 .lk')].map(k => k.textContent);
    const out = [], left = [...got];
    const alike = {};
    want.forEach(w => {
        const i = left.findIndex(g => g === w.text || (w.c !== undefined && g === w.c));
        if (i === -1) { out.push(`missing "${w.text}"`); return; }
        (alike[left[i]] = alike[left[i]] || new Set()).add(w.text);
        left.splice(i, 1);
    });
    if (left.length) out.push(`extra ${JSON.stringify(left)}`);
    Object.entries(alike).filter(([, s]) => s.size > 1).forEach(([shown, s]) => out.push(`"${shown}" stands for ${[...s].map(t => `"${t}"`).join(' and ')}`));
    const l2 = el.querySelector('.lc-l2'), compact = el.querySelectorAll('.lc-l2 .lk.compact').length, wrap = l2.classList.contains('wrap');
    const firsts = want.filter(w => w.first).map(w => w.text);
    if ((compact || wrap) && got.slice(0, firsts.length).join('|') !== firsts.join('|')) out.push(`what the attack did isn't first and in full: ${JSON.stringify(got.slice(0, firsts.length))} vs ${JSON.stringify(firsts)}`);
    return { out, got, lines: fvLineCount(l2), compact, wrap };
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
            const W = betting ? 120000 : TURN;
            const t0 = await page.evaluate(() => Date.now());
            const plateWant = betting ? (lang === 'uk' ? 'СТАВКИ ВІДКРИТО' : 'BETS OPEN') : (lang === 'uk' ? 'БІЙ ПОЧИНАЄТЬСЯ' : 'FIGHT STARTING');
            const samples = [];
            for (let e = 0; e < W; e += betting ? 1000 : 500) {
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

        // ===== 1b. !старт / !start and the test panel's Skip end the betting window early =====
        if (run(1)) for (const lang of ['uk', 'en']) {
            const tag = `[${lang}, ${cmd(lang, '!старт', '!start')}]`;
            const { page, context, errors } = await open(browser, { lang, betting: true });
            await register(page, lang, [['alpha', 'red'], ['omega', 'green']]);
            const START = cmd(lang, '!старт', '!start');
            // The chat handler as tmi.js calls it on channel #test: the owner is "test"; moderators come with mod / badges
            const chat = (user, extra = {}) => page.evaluate(([u, m, x]) => handleChatMessage('#test', { username: u, color: '#7fd1ff', ...x }, m, false), [user, START, extra]);
            const state = () => page.evaluate(() => ({ fights: window.__fights.length, kind: arenaState.kind, betting: !!arenaState.betting, flipped: !!arenaState.flipped,
                timer: (document.getElementById('cd-time') || {}).textContent, sub: (document.querySelector('#log-countdown .cd-sub') || {}).textContent || '',
                plate: document.getElementById('status-plate').textContent, turn1: window.__fightLog.filter(l => /^\[(Хід|Turn) 1\]/.test(l)).length, running: isBattleRunning }));
            const openWindow = async () => { await say(page, 'alpha', cmd(lang, '!черга', '!queue')); await say(page, 'omega', cmd(lang, '!черга', '!queue')); return page.evaluate(() => Date.now()); };
            // A fight to its end, then past its result screen's hold
            const finish = async () => { for (let i = 0; i < 60 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN); await page.clock.runFor(await page.evaluate('RESULT_HOLD_MS') + 1000); };
            const firstWord = lang === 'uk' ? 'першим б’є' : 'strikes first';

            // With no fight waiting: nothing happens
            await chat('test');
            const idle = await state(), idleSkip = await page.evaluate(() => skipBettingWindow());
            check(idle.fights === 0 && idle.kind === 'idle' && idleSkip === false && (await state()).fights === 0, `${tag} with no fight waiting, the owner's ${START} and Skip do nothing`, JSON.stringify(idle));

            // Window 1: viewers, a fighter and a VIP are ignored; a moderator ends it at 10 s
            const t1 = await openWindow();
            await page.clock.runFor(10000);
            await chat('random_viewer'); await chat('alpha'); await chat('vip_viewer', { badges: { vip: '1' } }); await chat('sub_viewer', { subscriber: true, badges: { subscriber: '12' } });
            const ignored = await state();
            check(ignored.fights === 0 && ignored.kind === 'countdown' && ignored.betting && !ignored.flipped && ignored.timer === '1:50',
                `${tag} a viewer's, a fighter's, a VIP's and a subscriber's ${START} are ignored: the window keeps counting (${ignored.timer})`, JSON.stringify(ignored));
            await chat('mod_one', { mod: true, badges: { moderator: '1' } });
            const skipped = await state();
            await chat('mod_one', { mod: true, badges: { moderator: '1' } }); await chat('test');   // a second !старт, then the owner's
            const twice = await state();
            check(skipped.fights === 1 && skipped.kind === 'countdown' && skipped.flipped && skipped.timer === '0:05' && skipped.sub.includes(firstWord) && !skipped.turn1,
                `${tag} a moderator's ${START} at 0:10 starts the fight the normal way: the coin flip and the 4.5 s "${skipped.sub}" countdown (${skipped.timer})`, JSON.stringify(skipped));
            check(twice.fights === 1, `${tag} two more ${START} right after the skip (moderator, owner) start no second fight`, JSON.stringify(twice));
            await page.clock.runFor(TURN - 1);
            const early = await state();
            await page.clock.runFor(1);
            const onTime = await state();
            check(!early.turn1 && onTime.turn1 === 1 && onTime.kind === 'fight', `${tag} turn 1 lands exactly 4.5 s after the skip`, JSON.stringify({ early, onTime }));
            await chat('test'); await chat('mod_one', { mod: true });   // during the fight
            const now1 = await page.evaluate(() => Date.now());
            await page.clock.runFor(t1 + 120000 + 1000 - now1);         // past where the window would have ended
            const during = await state();
            check(during.fights === 1, `${tag} ${START} during the fight, and the window's own timer running out, start no second fight`, JSON.stringify(during));
            await finish();

            // Window 2: the channel owner; window 3: a moderator known only by the badge (no mod flag)
            await openWindow();
            await page.clock.runFor(3000);
            await chat('test');
            const owner = await state();
            check(owner.fights === 2 && owner.flipped && owner.timer === '0:05', `${tag} the channel owner's ${START} ends the window too (the fighters queued again straight after their fight)`, JSON.stringify(owner));
            await finish();
            await openWindow();
            await chat('badge_mod', { badges: { moderator: '1' } });
            check((await state()).fights === 3, `${tag} a moderator known only by the badge can skip`, JSON.stringify(await state()));
            await finish();

            // Window 4: a skip 1 ms before the window's own start, then the timer; window 5: the timer, then a skip at the same moment
            let t = await openWindow();
            await page.clock.runFor(120000 - TURN - 1);
            await chat('test');
            let n = await page.evaluate(() => Date.now());
            await page.clock.runFor(t + 120000 - n);
            const edgeA = await state();
            await finish();
            t = await openWindow();
            await page.clock.runFor(120000 - TURN);   // the window's own timer starts the fight now …
            const atEnd = (await state()).fights;
            await chat('test');                        // … and the skip arrives at the same moment
            const edgeB = await state();
            check(edgeA.fights === 4 && atEnd === 5 && edgeB.fights === 5,
                `${tag} a skip right as the window ends starts one fight, whichever comes first (skip 1 ms before the timer, or the timer then the skip)`, JSON.stringify({ edgeA: edgeA.fights, atEnd, edgeB: edgeB.fights }));
            await finish();

            // Window 6: the test panel's Skip button
            await page.evaluate(() => toggleDebugMenu());
            const btn = page.locator('#debug-skip-bets');
            const label = (await btn.innerText()).trim();
            await openWindow();
            await page.clock.runFor(2000);
            await btn.click();
            const viaButton = await state();
            check(viaButton.fights === 6 && viaButton.flipped && viaButton.timer === '0:05' && label === cmd(lang, '⏭ Пропустити вікно ставок', '⏭ Skip the betting window'),
                `${tag} the test panel's "${label}" button ends the window the same way`, JSON.stringify({ viaButton, label }));
            await finish();
            if (errors.length) fail(`${tag} page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 1c. The result screen holds the arena =====
        console.log('\nResult screen hold');
        if (run(1)) for (const lang of ['uk', 'en']) {
            const tag = `[${lang}, hold]`;
            const { page, context, errors } = await open(browser, { lang });
            await register(page, lang, [['h1', 'red'], ['h2', 'green'], ['h3', 'blue'], ['h4', 'gold']]);
            const HOLD = await page.evaluate('RESULT_HOLD_MS');
            // When each fight's result came (finishBattle is looked up by name, so the wrapper sees every fight)
            await page.evaluate(() => { const orig = finishBattle; window.finishBattle = function (...a) { window.__endedAt = Date.now(); return orig.apply(this, a); }; });
            const Q = cmd(lang, '!черга', '!queue'), START = cmd(lang, '!старт', '!start');
            const chat = (user, msg, extra = {}) => page.evaluate(([u, m, x]) => handleChatMessage('#test', { username: u, color: '#7fd1ff', ...x }, m, false), [user, msg, extra]);
            const state = () => page.evaluate(() => { const f = window.__fights[window.__fights.length - 1];
                return { fights: window.__fights.length, last: f ? `${f.p1}-${f.p2}${f.ranked ? ' ranked' : ''}` : '', kind: arenaState.kind, betting: !!arenaState.betting, flipped: !!arenaState.flipped,
                    hold: !!resultHold, running: isBattleRunning, timer: (document.getElementById('cd-time') || {}).textContent, queue: matchmakingQueue.join() }; });
            const finish = async () => { for (let i = 0; i < 60 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN); await page.clock.runFor(HIT + 100); };
            const tags = () => page.evaluate(() => ['p1', 'p2'].map(p => { const t = document.getElementById(`result-${p}`), c = document.getElementById(`card-${p}`);
                return { name: document.getElementById(`name-${p}`).textContent.replace('@', ''), text: getComputedStyle(t).display === 'none' ? '' : t.innerText.trim(),
                    won: c.classList.contains('is-winner'), lost: c.classList.contains('is-loser'), draw: c.classList.contains('is-draw') }; }));
            const [WIN, KO, DEFEAT, DRAW] = lang === 'uk' ? ['ПЕРЕМОЖЕЦЬ', 'НОКАУТ', 'ПОРАЗКА', 'НІЧИЯ'] : ['WINNER', 'KNOCKED OUT', 'DEFEAT', 'DRAW'];
            // Ends a fight between the two fighters on the cards with the given HP, through the game's own finishBattle
            const endWith = (hp1, hp2, ranked) => page.evaluate(([a, b, r]) => {
                const n = p => document.getElementById(`name-${p}`).textContent.replace('@', '');
                isBattleRunning = true;
                finishBattle({ ...getDragonStrict(n('p1')) }, { ...getDragonStrict(n('p2')) }, a, b, r);
            }, [hp1, hp2, ranked]);
            // Moves the clock to `ms` after the last result
            const sinceResult = async ms => { const [end, now] = await page.evaluate(() => [window.__endedAt, Date.now()]); if (end + ms > now) await page.clock.runFor(end + ms - now); };

            // Ranked fight h1–h2; during its result two !черга only queue, and the fight starts when the hold ends
            await chat('h1', Q); await chat('h2', Q);
            await finish();
            const r0 = await state();
            const koTags = await tags();
            check(koTags.some(t => t.won && t.text === WIN) && koTags.some(t => t.lost && t.text === KO) && !koTags.some(t => t.draw),
                `${tag} a knockout: "${WIN}" on the winner, "${KO}" on the loser`, JSON.stringify(koTags));
            await sinceResult(1000);
            await chat('h3', Q); await chat('h4', Q);
            await sinceResult(HOLD - 1);
            const r1 = await state();
            await sinceResult(HOLD);
            const r2 = await state();
            check(HOLD === 20000 && r0.kind === 'result' && r0.hold && !r0.running && r1.fights === 1 && r1.kind === 'result' && r1.hold && r1.queue === 'h3,h4' && r2.fights === 2 && /h3/.test(r2.last) && /h4/.test(r2.last) && r2.last.includes('ranked') && !r2.hold,
                `${tag} two ${Q} during the result screen only queue: the result stays until ${HOLD / 1000} s (not at ${HOLD - 1} ms), then their fight starts`, JSON.stringify({ r0, r1, r2 }));

            // A duel accepted during the hold starts after it, before the queue; the hold also follows a duel
            await finish();
            await sinceResult(2000);
            await chat('h1', Q); await chat('h2', Q);
            await chat('h3', `${cmd(lang, '!бій', '!battle')} @h4`); await chat('h4', cmd(lang, '!прийняти', '!accept'));
            const d0 = await page.evaluate(() => ({ waiting: waitingDuel && `${waitingDuel.challenger}-${waitingDuel.accepter}`, reply: document.querySelector('#info-feed .info-card').innerText }));
            await sinceResult(HOLD - 1);
            const d1 = await state();
            await sinceResult(HOLD);
            const d2 = await state();
            check(d0.waiting === 'h3-h4' && /після поточного бою|after the current fight/.test(d0.reply) && d1.fights === 2 && d2.fights === 3 && d2.last === 'h3-h4' && d2.queue === 'h1,h2',
                `${tag} a duel accepted during the result screen waits ("${d0.reply.trim().slice(0, 60)}…"), then starts when the hold ends, before the queue`, JSON.stringify({ d0, d1, d2 }));
            await finish();
            await sinceResult(HOLD - 1);
            const d3 = await state();
            await sinceResult(HOLD);
            const d4 = await state();
            check(d3.kind === 'result' && d3.hold && d3.fights === 3 && d4.fights === 4 && d4.last.includes('ranked') && /h1/.test(d4.last) && /h2/.test(d4.last),
                `${tag} after the duel the result screen holds too: the queued fight starts only at ${HOLD / 1000} s`, JSON.stringify({ d3, d4 }));

            // Betting window on: a viewer's !старт during the hold is ignored; a moderator's opens the next betting window at once
            await finish();
            await page.evaluate(() => setBettingWindow(true));
            await sinceResult(3000);
            await chat('h3', Q); await chat('h4', Q);
            await chat('random_viewer', START); await chat('vip_viewer', START, { badges: { vip: '1' } });
            const b0 = await state();
            await chat('mod_one', START, { mod: true, badges: { moderator: '1' } });
            const b1 = await state();
            check(b0.kind === 'result' && b0.hold && b0.fights === 4 && b1.kind === 'countdown' && b1.betting && !b1.flipped && b1.timer === '2:00' && !b1.hold && b1.fights === 4,
                `${tag} during the result screen a viewer's and a VIP's ${START} are ignored; a moderator's opens the next betting window at once (${b1.timer})`, JSON.stringify({ b0, b1 }));
            // Two more right after (the owner, another moderator) and one at 4.999 s are ignored: the window keeps counting
            await chat('test', START); await chat('mod_two', START, { mod: true });
            const g0 = await state();
            await page.clock.runFor(5000 - 1);
            await chat('mod_two', START, { mod: true });
            const g1 = await state();
            await page.clock.runFor(1);
            await chat('mod_two', START, { mod: true });
            const g2 = await state();
            check(g0.kind === 'countdown' && g0.betting && !g0.flipped && g0.timer === '2:00' && g1.kind === 'countdown' && !g1.flipped && g1.fights === 4 && g2.flipped && g2.fights === 5 && g2.timer === '0:05',
                `${tag} after the moderator's ${START} further ones are ignored for 5 s (the owner's and another moderator's at once, one at 4.999 s): the window keeps counting (${g1.timer}); at 5 s one starts the fight`,
                JSON.stringify({ g0, g1, g2 }));
            await finish();
            await page.evaluate(() => setBettingWindow(false));
            // The owner's !старт with nobody waiting: the hold ends, the result stays; the next two !черга start at once
            await sinceResult(2000);
            await chat('test', START);
            const o0 = await state();
            await chat('h1', Q); await chat('h2', Q);
            const o1 = await state();
            check(o0.kind === 'result' && !o0.hold && o0.fights === 5 && o1.fights === 6 && o1.kind === 'countdown',
                `${tag} the channel owner's ${START} ends the hold; with nobody waiting the result stays, and the next two ${Q} start at once`, JSON.stringify({ o0, o1 }));
            await finish();
            await sinceResult(HOLD);

            // Draws (friendly and ranked) hold the arena too: the fight ends with equal HP through finishBattle
            for (const ranked of [false, true]) {
                await endWith(80, 30, ranked);   // time ran out: both still standing, p1 ahead on HP
                const tTags = await tags();
                check(tTags[0].won && tTags[0].text === WIN && tTags[1].lost && tTags[1].text === DEFEAT,
                    `${tag} a time-out (${ranked ? 'ranked' : 'friendly'}): "${WIN}" on the winner, "${DEFEAT}" (not "${KO}") on the loser`, JSON.stringify(tTags));
                await sinceResult(HOLD);
                await endWith(50, 50, ranked);
                const dTags = await tags();
                check(dTags.every(t => t.draw && !t.won && !t.lost && t.text === DRAW),
                    `${tag} a ${ranked ? 'ranked' : 'friendly'} draw: "${DRAW}" on both cards`, JSON.stringify(dTags));
                await chat('h3', Q); await chat('h4', Q);
                const w0 = await state();
                await sinceResult(HOLD - 1);
                const w1 = await state();
                await sinceResult(HOLD);
                const w2 = await state();
                check(w0.kind === 'result' && w0.hold && w1.fights === w0.fights && w2.fights === w0.fights + 1 && w2.last.includes('ranked'),
                    `${tag} after a ${ranked ? 'ranked' : 'friendly'} draw the result screen holds for ${HOLD / 1000} s too`, JSON.stringify({ w0, w1, w2 }));
                await finish();
                await sinceResult(HOLD);
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
                await page.clock.runFor(4 * 60000);   // a pause between fights (there is no rest now; kept so the seeded fights stay the same)
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
                    const add = (item) => { item.el = document.createElement('div'); box.appendChild(item.el); fvPaint(item); (window.__sheet = window.__sheet || []).push({ item, lang }); };
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
                    // The busiest turn there can be (busiestRecs), and a crowded one without an ultimate on the right
                    const busy = busiestRecs(B, Bl);
                    row(card(busy.left(25)), card(busy.right(26)));
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
            // Every card on the sheet shows every item it has; the crowded ones (24, and the busiest turn 25 with 26 beside it)
            // keep what the attack did first and in full, the rest compact, no "+N"
            const shown = await page.evaluate(() => window.__sheet.flatMap(({ item, lang }) => item.type !== 'row' ? [] : ['left', 'right']
                .filter(s => item.cells[s].k === 'card').map(s => {
                    const el = item.el.querySelector(`.lc.${s}`), r = cardShowsAll(el, item.cells[s].rec, s, lang);
                    return { lang, turn: item.cells[s].rec.turn, ...r };
                })));
            const missing = shown.filter(x => x.out.length);
            check(shown.length >= 50 && !missing.length, `every card on the review sheet shows every item it has (${shown.length} cards, both languages): nothing left out, no "+N", what the attack did first`,
                JSON.stringify(missing.slice(0, 3)));
            const crowded = shown.filter(x => [24, 25, 26].includes(x.turn));
            check(crowded.length === 6 && crowded.every(x => !x.out.length && x.compact > 0),
                `the crowded cards (turns 24–26, both languages) show all their items, the lower-priority ones compact: ${crowded.map(x => `[${x.lang}] ${x.turn}: ${x.got.length} chips, ${x.compact} compact, ${x.lines} line${x.lines > 1 ? 's' : ''}`).join(' · ')}`,
                JSON.stringify(crowded));
            const busiest = crowded.filter(x => x.turn === 25);
            const pierceChaos = busiest.every(x => x.got.includes(cmd(x.lang, '⚡ хаос', '⚡ chaos')) && x.got.filter(t => t === '⚡').length === 1);
            check(pierceChaos, 'on the busiest turn armour-piercing is a bare ⚡ and Chaotic charge keeps its word («⚡ хаос» / "⚡ chaos")', JSON.stringify(busiest.map(x => x.got)));
            check(busiest.length === 2 && busiest.every(x => x.got.length === 17 && !x.out.length),
                `the busiest turn there can be (an ultimate, a crit in sudden death, effects landing and ticking, title mechanics): all 17 items in both languages, nothing cut off; ${busiest.map(x => `[${x.lang}] its second line wraps onto ${x.lines} lines`).join(', ')} (the card grows rather than hide anything)`,
                JSON.stringify(busiest));
            check(!fitIssues.length, `worst cases: nothing hidden or cut off (${n} cards, both languages): 25-letter names, the White Dragon's -1949998, the longest effect line, every ultimate, the busiest turn`, fitIssues.slice(0, 5).join(' | '));
            const idsLeft = await page.evaluate(() => { const t = document.getElementById('review-sheet').innerText; return [...EFFECT_IDS, ...ULTIMATE_IDS].filter(id => new RegExp(`(?<![\\p{L}_])${id}(?![\\p{L}_])`, 'u').test(t)).concat(['undefined', 'NaN', '{'].filter(w => t.includes(w))); });
            check(!idsLeft.length, 'no internal ids on any kind of card', idsLeft.join(', '));
            await page.waitForTimeout(500);   // the sheet sits outside the stage, so let its cells' fade-in finish too
            await page.locator('#review-sheet').screenshot({ path: path.join(SHOTS, 'fightview-cards.png') });
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 9. The log scrolls back through the whole fight =====
        console.log('\nScrollable log');
        if (run(9)) for (const lang of ['uk', 'en']) {
            const tag = `[${lang}, log]`;
            const { page, context, errors } = await open(browser, { lang });
            await register(page, lang, [['alpha', 'red'], ['omega', 'green']]);
            // A fight that runs to the 30-turn limit: both fighters get a huge max HP (the fight code reads getMaxHP by name)
            await page.evaluate(() => { const orig = window.__maxHP = getMaxHP; window.getMaxHP = (...a) => orig(...a) * 1000; });
            await say(page, 'alpha', cmd(lang, '!черга', '!queue')); await say(page, 'omega', cmd(lang, '!черга', '!queue'));
            const IDLE = await page.evaluate('LOG_IDLE_MS');
            const pillWant = n => cmd(lang, `↓ нові ходи (${n})`, `↓ new turns (${n})`);
            // What the log shows: scroll position, which cards are fully below the fade, the pill
            const view = () => page.evaluate(() => {
                const f = document.getElementById('log-feed'), fr = f.getBoundingClientRect(), panel = document.getElementById('log-panel');
                const clear = el => { const r = el.getBoundingClientRect(); return r.top >= fr.top + 34 - 0.5 && r.bottom <= fr.bottom + 0.5; };
                const cards = [...f.querySelectorAll('.lc')];
                const turns = cards.map(c => +c.querySelector('.lc-turn').textContent);
                const items = [...document.getElementById('log-list').children];
                return { top: Math.round(f.scrollTop), max: f.scrollHeight - f.clientHeight, atBottom: f.scrollHeight - f.scrollTop - f.clientHeight < 2, following: logFollowing,
                    pill: panel.classList.contains('has-new') ? document.getElementById('log-new').textContent : '', turns, rows: f.querySelectorAll('.log-row').length,
                    clearTurns: cards.filter(clear).map(c => +c.querySelector('.lc-turn').textContent), firstItem: items[0] ? items[0].className : '',
                    firstClear: items[0] ? clear(items[0]) : false, result: !!f.querySelector('.log-result'), resultClear: f.querySelector('.log-result') ? clear(f.querySelector('.log-result')) : false,
                    scrollbar: f.offsetWidth - f.clientWidth, scrollbarCss: getComputedStyle(f).scrollbarWidth, kind: arenaState.kind, turn: arenaState.turn,
                    pillClear: (() => { const p = document.getElementById('log-new').getBoundingClientRect(), pr = panel.getBoundingClientRect(); return p.top >= fr.bottom - 0.5 && p.bottom <= pr.bottom + 0.5; })() };
            });
            // The mouse wheel over the log, as a viewer (or OBS's Interact window) scrolls it; then wait for the scroll to stop
            const box = await page.locator('#log-feed').boundingBox();
            const still = async () => { let prev = -1; for (let i = 0; i < 50; i++) { await page.waitForTimeout(80); const t = await page.evaluate(() => document.getElementById('log-feed').scrollTop); if (t === prev) return; prev = t; } };
            const wheel = async dy => { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3); await page.mouse.wheel(0, dy); await still(); };

            // Turn 12: the log is full, following the newest card
            await toFightTime(page, 12 * TURN + HIT + 1);
            await settleArena(page);
            const v12 = await view();
            check(v12.max > 0 && v12.atBottom && v12.following && !v12.pill && v12.clearTurns.includes(12) && v12.scrollbar === 0 && v12.scrollbarCss === 'none',
                `${tag} turn 12: the log overflows, follows the newest card (turn 12 in view) and shows no scrollbar`, JSON.stringify(v12));

            // Scrolled to the top: the start of the fight is there, the first item clear of the fade
            await wheel(-20000);
            const up = await view();
            check(up.top === 0 && !up.following && up.firstItem.includes('log-banner') && up.firstClear && up.clearTurns.includes(1) && up.turns[0] === 1 && !up.pill,
                `${tag} the mouse wheel scrolls to the top: the intro banner and turn 1 are fully readable below the fade`, JSON.stringify(up));
            // Turns keep arriving: the view stays still, the pill counts them
            const pills = [];
            for (let t = 13; t <= 15; t++) { await toFightTime(page, t * TURN + HIT + 1); pills.push((await view()).pill); }
            const held = await view();
            check(held.top === up.top && held.clearTurns[0] === up.clearTurns[0] && held.pillClear && held.turns.includes(15) && !held.following
                && JSON.stringify(pills) === JSON.stringify([1, 2, 3].map(pillWant)),
                `${tag} scrolled up, turns 13–15 arrive without moving the view; the pill (in its own strip below the cards) counts them: ${pills.join(' → ')}`, JSON.stringify({ held, pills }));
            // Scrolling back to the bottom follows again
            await wheel(20000);
            const back = await view();
            await toFightTime(page, 16 * TURN + HIT + 1);
            const next = await view();
            check(back.atBottom && back.following && !back.pill && next.atBottom && next.clearTurns.includes(16),
                `${tag} scrolled back to the bottom: the pill goes and the log follows turn 16`, JSON.stringify({ back, next }));

            // Scrolled up and left alone: still at 15 s minus 1 ms, back to the newest turn at 15 s
            await wheel(-700);
            const idle0 = await view();
            await page.clock.runFor(IDLE - 1);
            const idle1 = await view();
            await page.clock.runFor(1);
            await still();
            const idle2 = await view();
            check(!idle0.atBottom && idle1.top === idle0.top && !idle1.following && idle1.pill === pillWant(idle1.turn - 16) && idle1.pillClear && idle2.atBottom && idle2.following && !idle2.pill,
                `${tag} scrolled up during the fight and left alone: it stays put for 15 s (pill "${idle1.pill}"), then glides back to the newest turn`, JSON.stringify({ idle0, idle1, idle2 }));
            // The pill: scroll up, a turn arrives, click "↓ нові ходи (1)"
            await page.clock.runFor(1000);   // the glide is over
            await wheel(-700);
            const tNow = (await view()).turn;
            await toFightTime(page, (tNow + 1) * TURN + HIT + 1);
            const before = await view();
            await page.click('#log-new');
            await still();
            const clicked = await view();
            await toFightTime(page, (tNow + 2) * TURN + HIT + 1);
            const after = await view();
            check(before.pill === pillWant(1) && before.pillClear && clicked.atBottom && clicked.following && !clicked.pill && after.atBottom && after.clearTurns.includes(tNow + 2),
                `${tag} a click on "${before.pill}" goes back to the newest turn and the log follows again`, JSON.stringify({ before, clicked, after }));

            // The fight runs to the limit: every row stays, from the intro banner to the result card
            for (let i = 0; i < 40 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN);
            await page.clock.runFor(HIT + 100);
            await settleArena(page);
            const end = await view();
            const all = Array.from({ length: 30 }, (_, i) => i + 1);
            check(end.kind === 'result' && end.rows === 15 && JSON.stringify([...end.turns].sort((a, b) => a - b)) === JSON.stringify(all) && end.result && end.resultClear && end.atBottom,
                `${tag} a 30-turn fight keeps all 15 rows (turns 1–30) and ends on the result card`, JSON.stringify({ ...end, turns: end.turns.length }));
            await wheel(-20000);
            const rTop = await view();
            await page.clock.runFor(IDLE + 1000);
            await still();
            const rStay = await view();
            check(rTop.top === 0 && rTop.firstItem.includes('log-banner') && rTop.firstClear && rStay.top === 0 && !rStay.following,
                `${tag} on the result screen the log scrolls up to the intro banner and stays there (no return after 15 s)`, JSON.stringify({ rTop, rStay }));
            await wheel(20000);
            const rEnd = await view();
            check(rEnd.atBottom && rEnd.resultClear, `${tag} and back down to the result card`, JSON.stringify(rEnd));

            // The next fight (normal max HP again) starts with an empty log, following, no pill
            await wheel(-20000);
            await page.evaluate(() => { window.getMaxHP = window.__maxHP; });
            await page.clock.runFor(await page.evaluate(() => typeof RESULT_HOLD_MS === 'number' ? RESULT_HOLD_MS : 5000) + 1000);   // past the result screen
            await say(page, 'alpha', cmd(lang, '!черга', '!queue')); await say(page, 'omega', cmd(lang, '!черга', '!queue'));
            const fresh = await view();
            check(fresh.kind === 'countdown' && fresh.turns.length === 0 && fresh.rows === 0 && !fresh.result && fresh.following && !fresh.pill,
                `${tag} the next fight starts with an empty log that follows again`, JSON.stringify(fresh));
            // Review screenshots from this ordinary fight: mid-fight scrolled to the top, and the result screen scrolled up
            if (lang === 'uk') {
                await toFightTime(page, 10 * TURN + HIT + 1);
                await wheel(-20000);
                await settleArena(page);
                const mid = await view();
                check(mid.max > 0 && mid.top === 0 && mid.kind === 'fight', `${tag} an ordinary fight's log overflows by turn 10 and scrolls to its top (screenshot)`, JSON.stringify(mid));
                await page.screenshot({ path: path.join(SHOTS, 'fightview-log-top.png'), clip: crop });
                for (let i = 0; i < 40 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN);
                await page.clock.runFor(HIT + 100);
                await wheel(-20000);
                await settleArena(page);
                const res = await view();
                check(res.kind === 'result' && res.result && res.top === 0 && res.max > 0, `${tag} its result screen scrolled up to the intro banner (screenshot)`, JSON.stringify(res));
                await page.screenshot({ path: path.join(SHOTS, 'fightview-log-result.png'), clip: crop });
            }
            if (errors.length) fail(`${tag} page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 10. The busiest turn there can be, as the newest card in the live log at 1920×1080 =====
        console.log('\nThe busiest turn in the live log');
        if (run(10)) for (const lang of ['uk', 'en']) {
            const tag = `[${lang}, busiest]`;
            const { page, context, errors } = await open(browser, { lang });
            await register(page, lang, [['alpha', 'red'], ['omega', 'green']]);
            await page.evaluate(() => { const orig = window.__maxHP = getMaxHP; window.getMaxHP = (...a) => orig(...a) * 1000; });   // nobody falls before turn 12
            await say(page, 'alpha', cmd(lang, '!черга', '!queue')); await say(page, 'omega', cmd(lang, '!черга', '!queue'));
            await toFightTime(page, 12 * TURN + HIT + 1);   // the log is full and follows the newest card
            await settleArena(page);
            // The next two turns as the busiest turn there can be (left) and the crowded card (right), painted the way the
            // fight paints its cards; each must be whole, below the log's top fade, once it is the newest
            const seen = [];
            for (const [turn, side] of [[13, 'left'], [14, 'right']]) {
                await page.evaluate(([t, s]) => { const busy = busiestRecs(fv.p1, fv.p2); fvSetCell(t, { k: 'card', rec: s === 'left' ? busy.left(t) : busy.right(t) }); }, [turn, side]);
                await settleArena(page);
                seen.push(await page.evaluate(([t, s, l]) => {
                    const f = document.getElementById('log-feed'), fr = f.getBoundingClientRect();
                    const c = [...f.querySelectorAll(`.lc.${s}`)].find(x => +x.querySelector('.lc-turn').textContent === t);
                    if (!c) return { turn: t, found: false };
                    const r = c.getBoundingClientRect(), row = fv.items.find(x => x.type === 'row' && x.round === Math.ceil(t / 2));
                    const shows = cardShowsAll(c, row.cells[s].rec, s, l);
                    return { turn: t, found: true, clear: r.top >= fr.top + 34 - 0.5 && r.bottom <= fr.bottom + 0.5, top: Math.round(r.top - fr.top), bottom: Math.round(fr.bottom - r.bottom),
                             height: Math.round(r.height), chips: shows.got.length, out: shows.out, lines: shows.lines, wrap: shows.wrap, atBottom: f.scrollHeight - f.scrollTop - f.clientHeight < 2 };
                }, [turn, side, lang]));
            }
            const fit = await page.evaluate(cardFitProblems);
            check(seen.every(x => x.found && x.clear && x.atBottom && !x.out.length) && !fit.length,
                `${tag} the busiest turn and the crowded card, each as the newest card: whole and in view below the fade, every item shown (${seen.map(x => `turn ${x.turn}: ${x.chips} chips, ${x.height}px`).join('; ')}), nothing cut off`,
                JSON.stringify({ seen, fit: fit.slice(0, 3) }));
            await page.evaluate(() => { window.getMaxHP = window.__maxHP; });
            if (errors.length) fail(`${tag} page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 11. Ranked play: queue order, underdog XP, the Top =====
        console.log('\nRanked play');
        if (run(11)) for (const lang of ['uk', 'en']) {
            const tag = `[${lang}, ranked]`;
            const { page, context, errors } = await open(browser, { lang });
            const Q = cmd(lang, '!черга', '!queue');
            // Chat goes through the page's chat simulator, as a viewer typing in the Send box would
            const sim = (user, msg) => page.evaluate(([u, m]) => simSay(u, m), [user, msg]);
            const levels = { qa: 5, qb: 12, qc: 7, qd: 4, qe: 5, qf: 7, qg: 3 };
            for (const [u, l] of Object.entries(levels)) await sim(u, `${cmd(lang, '!дрейк', '!drake')} ${COLOR_WORD[lang][['red', 'blue', 'black', 'purple', 'green'][l % 5]]}`);
            // Each fighter's level, set through their saved XP (as if they had played before)
            await page.evaluate(lv => { const db = getDragonDB(); const xpFor = l => { let x = 0; for (let i = 1; i < l; i++) x += getRequiredXP(i); return x; };
                Object.entries(lv).forEach(([u, l]) => { db[u].xp = xpFor(l); db[u].level = l; }); saveDragonDB(db); renderLeaderboard(); }, levels);
            const strip = () => page.evaluate(() => [...document.querySelectorAll('#queue-list-ui .queue-badge:not(.queue-more)')].map(b => `${b.querySelector('.qn').textContent}.${b.querySelector('.pname').textContent.replace('@', '')}`));
            const lastFight = () => page.evaluate(() => { const f = window.__fights[window.__fights.length - 1]; return f ? `${f.p1}-${f.p2}` : ''; });
            const finish = async () => { for (let i = 0; i < 60 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN); await page.clock.runFor(HIT + 100); };
            const hold = async () => page.clock.runFor(await page.evaluate(() => typeof RESULT_HOLD_MS === 'number' ? RESULT_HOLD_MS : 5000) + 100);

            // A test battle keeps the arena busy while four join: L5, L12, L7, L4
            await page.evaluate(() => testBattle());
            for (const u of ['qa', 'qb', 'qc', 'qd']) await sim(u, Q);
            const s1 = await strip();
            await finish(); await hold();
            const f1 = await lastFight(), s2 = await strip();
            check(s1.join() === '1.qa,2.qb,3.qc,4.qd' && f1 === 'qa-qd' && s2.join() === '1.qb,2.qc',
                `${tag} the strip reads ${s1.join(' ')}; #1 @qa (L5, the longest wait) fights the closest level, @qd (L4); the strip then reads ${s2.join(' ')}`, JSON.stringify({ s1, f1, s2 }));
            // During that fight three more join: L5, L7, L3. The next fight is the strip's #1 and #2
            for (const u of ['qe', 'qf', 'qg']) await sim(u, Q);
            const s3 = await strip();
            await finish(); await hold();
            const f2 = await lastFight();
            check(s3.join() === '1.qb,2.qc,3.qe,4.qf,5.qg' && f2 === 'qb-qc', `${tag} next, #1 @qb (L12) fights @qc (L7), the closest of the rest`, JSON.stringify({ s3, f2 }));
            await finish(); await hold();
            const f3 = await lastFight(), s4 = await strip();
            check(f3 === 'qe-qf' && s4.join() === '1.qg', `${tag} a level tie: @qe (L5) fights @qf (L7, waited longer), not @qg (L3), both 2 levels away`, JSON.stringify({ f3, s4 }));
            await page.evaluate(() => { matchmakingQueue = []; updateQueueUI(); });
            await finish(); await hold();   // the qe–qf fight and its result screen are over

            // Underdog XP: L6 beats L10 in a ranked fight (the underdog can't lose: huge max HP for its element)
            const rigged = async (win, wType, wLvl, lose, lType, lLvl) => {
                await sim(win, `${cmd(lang, '!дрейк', '!drake')} ${COLOR_WORD[lang][wType]}`); await sim(lose, `${cmd(lang, '!дрейк', '!drake')} ${COLOR_WORD[lang][lType]}`);
                await page.evaluate(([w, wl, l, ll, wt]) => { const db = getDragonDB(); const xpFor = n => { let x = 0; for (let i = 1; i < n; i++) x += getRequiredXP(i); return x; };
                    db[w].xp = xpFor(wl); db[w].level = wl; db[l].xp = xpFor(ll); db[l].level = ll; saveDragonDB(db);
                    if (!window.__maxHP) window.__maxHP = getMaxHP;
                    window.getMaxHP = (lvl, type, title) => window.__maxHP(lvl, type, title) * (type === wt ? 1000 : 1); }, [win, wLvl, lose, lLvl, wType]);
                const before = await page.evaluate(([w, l]) => [getDragonStrict(w).xp, getDragonStrict(l).xp], [win, lose]);
                await sim(win, Q); await sim(lose, Q);
                await finish();
                await settleArena(page);
                const out = await page.evaluate(([w, l]) => {
                    const cells = [...document.querySelectorAll('#log-feed .log-result .lr-xp')];
                    return { xp: [getDragonStrict(w).xp, getDragonStrict(l).xp], cells: cells.map(c => c.textContent), cut: cells.filter(c => c.scrollWidth > c.clientWidth + 1).map(c => c.textContent),
                        names: [...document.querySelectorAll('#log-feed .log-result .lr-name')].map(n => n.textContent.replace('@', '')),
                        note: (document.querySelector('#log-feed .log-result .lr-note') || {}).textContent || null };
                }, [win, lose]);
                await page.evaluate(() => { window.getMaxHP = window.__maxHP; });
                await hold();
                const cellOf = n => out.cells[out.names.indexOf(n)];
                return { gained: [out.xp[0] - before[0], out.xp[1] - before[1]], win: cellOf(win), lose: cellOf(lose), cut: out.cut, note: out.note };
            };
            const u1 = await rigged('underdog', 'red', 6, 'favourite', 'blue', 10);
            const want1 = cmd(lang, '+60 XP (+20 за сильнішого суперника)', '+60 XP (+20 for a stronger opponent)');
            check(u1.gained.join() === '60,10' && u1.win === want1 && u1.lose === '+10 XP' && !u1.cut.length && u1.note === null,
                `${tag} an L6 underdog beats L10 in a ranked fight: the result card says "${u1.win}" (the loser "${u1.lose}"), nothing cut off, no White Dragon note`, JSON.stringify(u1));
            // The longest text: a Gold underdog 10 levels down (bonus capped at +40, Gold on all 80)
            const u2 = await rigged('goldie', 'gold', 5, 'champ', 'black', 15);
            const pct = await page.evaluate(() => ELEMENT_BASE.goldXp + getTierMultiplier(5).goldXpBonus);
            const g = Math.round(80 * (1 + pct / 100));
            check(u2.gained[0] === g && u2.win === cmd(lang, `+${g} XP (+40 за сильнішого суперника)`, `+${g} XP (+40 for a stronger opponent)`) && !u2.cut.length,
                `${tag} a Gold L5 underdog beats L15: "${u2.win}" (+40 cap, Gold's +${pct}% on the whole 80), not cut off`, JSON.stringify(u2));
            // A favourite winning gets no bonus
            const u3 = await rigged('champ', 'black', 15, 'goldie', 'gold', 5);
            check(u3.gained[0] === 40 && u3.win === '+40 XP', `${tag} a higher-level winner gets the usual "+40 XP", no bonus`, JSON.stringify(u3));

            // The Top: more wins first, then fewer losses, then the higher level
            const top = await page.evaluate(() => {
                const rows = { t1: [7, 6, 15], t2: [6, 2, 3], t3: [6, 1, 3], t4: [4, 0, 3], t5: [3, 0, 10], t6: [3, 0, 12], t7: [3, 1, 20] };
                const db = {}; const xpFor = n => { let x = 0; for (let i = 1; i < n; i++) x += getRequiredXP(i); return x; };
                Object.entries(rows).forEach(([n, [w, l, lvl]]) => { db[n] = { name: n, color: '#8ab4f8', drakeObj: DRAKE_TYPES[0], title: TITLES_DB[0], xp: xpFor(lvl), level: lvl }; playerLeaderboardStats[n] = { wins: w, losses: l }; });
                saveDragonDB(db);
                renderLeaderboard();
                return [...document.querySelectorAll('#leaderboard-list .lb-row')].map(r => `${r.querySelector('.lb-name').textContent.replace('@', '')} ${r.querySelector('.wl').textContent.replace(/\s/g, '')}`);
            });
            check(top.join() === 't1 7–6,t3 6–1,t2 6–2,t4 4–0,t6 3–0,t5 3–0,t7 3–1',
                `${tag} the Top by wins: ${top.join(' · ')} (most wins first; 6 wins: fewer losses first; 3–0: the higher level first; 3–1 after both; the W–L shown as before)`, top.join());

            // A ranked fight against the streamer's White Dragon: no win or loss for either side, the viewer +10 XP as usual,
            // and the result card says so, whole
            await page.evaluate(() => setStreamerUser('dragonkeeper'));
            await sim('dragonkeeper', `${cmd(lang, '!дрейк', '!drake')} ${COLOR_WORD[lang].white}`);
            await sim('brave', `${cmd(lang, '!дрейк', '!drake')} ${COLOR_WORD[lang].red}`);
            const wd0 = await page.evaluate(() => ({ xp: getDragonStrict('brave').xp, stats: JSON.stringify(playerLeaderboardStats) }));
            await sim('dragonkeeper', Q); await sim('brave', Q);
            await finish();
            await settleArena(page);
            const wd = await page.evaluate(() => {
                const note = document.querySelector('#log-feed .log-result .lr-note');
                return { winner: arenaState.winner && arenaState.winner.name, ranked: arenaState.ranked, xp: getDragonStrict('brave').xp, stats: JSON.stringify(playerLeaderboardStats),
                         note: note && note.textContent, cut: !!note && note.scrollWidth > note.clientWidth + 1,
                         xpCells: [...document.querySelectorAll('#log-feed .log-result .lr-xp')].map(c => c.textContent) };
            });
            check(wd.ranked && wd.winner === 'dragonkeeper' && wd.xp - wd0.xp === 10 && wd.stats === wd0.stats && wd.xpCells.includes('+10 XP')
                && wd.note === cmd(lang, '🐉 Бій з Білим Драконом: без перемоги й поразки в Топі', '🐉 A fight with the White Dragon: no win or loss in the Top') && !wd.cut,
                `${tag} a ranked fight against the White Dragon: @brave +10 XP, no win or loss for either side, and the result card says "${wd.note}", not cut off`, JSON.stringify({ wd, wd0 }));
            await page.locator('#log-feed .log-result').screenshot({ path: path.join(SHOTS, `fightview-dragon-result-${lang}.png`) });
            await hold();
            await page.evaluate(() => setStreamerUser(''));
            if (errors.length) fail(`${tag} page errors: ${errors.slice(0, 3).join(' | ')}`);
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
