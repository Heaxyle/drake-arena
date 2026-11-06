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
//     whoever waited longer), in the order the "Далі в черзі" strip shows; an underdog's bonus XP on the result card, and
//     a favourite's cut (the floor's -30, and its longest text, a Gold winner's two digits on each side), nothing cut off;
//     the Top by wins (then fewer losses, then level); a ranked fight against the streamer's White Dragon: no win or
//     loss for either side, +10 XP for the viewer, and its result card says so
//   - Every turn of several real fights: one card per attack in the attacker's column, the highlight on the attacker,
//     the damage number on the target's card, the whole turn animation finished inside the turn, nothing cut off
//   - Every effect from the test menu's "next hit casts" picker, every ultimate from its СИЛА button, every Jackpot
//     outcome (including a miss): the card text and the fighter-card chip
//   - The streamer's White Drake, in a duel: Магніт and Перекування from the test menu (cast only by its own hit), a buff
//     the foe casts under Магніт pulled to it, a debuff bouncing off its scales, the scales cracking and Перекування
//     rebuilding them, the opening banner, the faint White Dragon behind the log through its fights (gone in the next
//     fight without it), the result card's line; the steel segment at the VS end of its HP row: its number and fill as the
//     fight's scales on every turn, full in the countdown (and the betting window, with it on), as the fight left it on the
//     result screen (a ranked fight's too, after the XP redraw), the HP row's boxes the same throughout, none in the next
//     fight without it. Screenshots (not tracked): tests/screenshots/white-drake-card.png (its fighter card, the segment
//     part-gone), white-drake-fight.png (the arena mid-fight) and white-drake-log.png (its lines in the log)
//   - The result card's numbers against the fight's own cards; level-up messages against the game's numbers
//   - After several fights the log holds only the current fight; no internal ids anywhere; worst-case cards fit
//   - Nothing on a card is ever hidden (nobody can hover or scroll on stream): a second line that doesn't fit at 90% shows
//     its lower-priority items compact (icon and number), after what the attack did, and only then grows to a third line;
//     never "+N". The busiest turn there can be shows every item in both languages, nothing cut off, on the review sheet
//     and as the newest card in the live log at 1920×1080
//   - The log scrolls: a 30-turn fight keeps every row and its top is reachable; scrolled up, the view stays still while
//     turns arrive and "↓ нові ходи (N)" counts them; back at the bottom (or the pill) it follows again; 15 s untouched
//     during a fight brings it back; the result screen scrolls from the intro banner to the result card and stays put
//   - Icons that don't change keep their elements (a new <img> restarts its image's loop): marked at turn 1, the cards',
//     the plate's, the fight type's, the title plate's, the Top's, the queue's, the log's and the chat cards' icons are the
//     same elements three turns later; a new chip and another title's badge are new elements, the rest stay
//   - The notes a title fires, on painted cards in both languages: for each note, the holder of an own-icon title gets that
//     icon, in the full chip and the compact one, with the ability's words, and the pair title's holder the ability's glyph,
//     with either title on the other fighter; 194's card says «баг» / "bug"; a sneaky attack by 97's holder keeps the spear;
//     the White Dragon's immunity keeps the immune glyph; the opening banner for 182 shows firstCoffee; a crowded card shows
//     every item, no two alike; two real fights, the own-icon titles and then their pairs
//   - The notes of the abilities of titles 205–294, on painted cards in both languages: the title's badge glyph with the
//     ability's words; compact, a Legendary title's own icon (205–244) and the number, a stand-in (245–294) its words too;
//     crowded cards of stand-ins, no two alike
//   - The Meme abilities in real fights with fixed dice, both languages: «404» on the card and the pop; Синій екран's «:(» on
//     the log card and the fighter card (a blue flash, a calm «:(» under prefers-reduced-motion), the turn lost, gone the
//     next turn; AFK's grey card with «AFK» until its next turn and the ×3 return; Лаг's «…» and the stuck hit landing a turn
//     late, one that knocks out too (the target is the one out); Підзарядка's banner and 2/5 on the card. No block of a
//     fighter card moves. Screenshots: tests/screenshots/fightview-meme-*.png
//   - Помаранчевий in real fights with fixed dice, both languages: the heat on the fighter card from 0/8, no block moving; the
//     tick on the opponent's log card and as a pop on its fighter card; a blocked attack adding none, a blocked tick shown as a
//     block; a tick that knocks out, on the knockout cell; Виверження's
//     card (its multiplier and the heat dropping) and the card's heat after it; against the White Drake the heat takes the
//     scales and isn't counted as the damage she dealt
//   - Вишневий in real fights with fixed dice, both languages: the frenzy's +N% on the fighter card once it's above 0, no block
//     moving, and its note on the log card; Кров за кров's and Кровотеча's numbers on the log card and as pops; Кровотеча knocking
//     its own drake out; Останній подих at ×2.5 below a quarter of its HP
//   - Бірюзовий in real fights with fixed dice, both languages: its layers on the fighter card from 0/8, no block moving; the cut
//     on the log card; Чиста вода naming what it took off; Приплив's heal and layers on its card, the layers staying
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
const { overlayIconIssues, overlaySelfTest } = require('./overlay_icons');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const PAGE = 'file:///' + path.join(ROOT, 'showcase/index.html').replace(/\\/g, '/');
const SEED = Number(process.env.UI_SEED || 3);
const TURN = 4500, HIT = 600, WHITE_STEEL = 998;
// FV_ONLY=2,4 runs only those sections (0–19, numbered below); the review sheet of the arena (8) needs 1, 2, 3 and 5
const ONLY = (process.env.FV_ONLY || '').split(',').filter(Boolean);
const run = n => !ONLY.length || ONLY.includes(String(n));

let failures = 0;
const fail = msg => { failures++; console.log(`  ✗ ${msg}`); };
const pass = msg => console.log(`  ✓ ${msg}`);
const check = (ok, good, bad) => ok ? pass(good) : fail(`${good} — ${bad}`);

async function open(browser, { lang = 'uk', betting = false, width = 1920, height = 1080, dpr = 1, motion = false } = {}) {
    // The icons' stills (prefers-reduced-motion), so the screenshots are the same on every run; motion: the loops (section 13)
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, reducedMotion: motion ? 'no-preference' : 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
    await offTwitch(page);
    await page.clock.install({ time: new Date('2026-01-01T11:59:59') });
    await page.clock.pauseAt(new Date('2026-01-01T12:00:00'));
    await page.addInitScript(pageInit, SEED);
    await page.addInitScript({ content: [busiestRecs, cardShowsAll, titleNoteCases, abilityNoteCases].map(f => `window.${f.name} = ${f};`).join('\n') });   // page-side helpers (below)
    if (betting) await page.addInitScript(() => localStorage.setItem('drake_arena_showcase_betting', '1'));
    await page.goto(`${PAGE}?lang=${lang}`);
    await page.evaluate(() => document.fonts.ready);
    await settleArena(page);
    return { page, context, errors };
}
const say = (page, user, msg, color = '#ff7f50') => page.evaluate(([u, m, c]) => handleChatMessage('#test', { username: u, color: c }, m, false), [user, msg, color]);
const cmd = (lang, uk, en) => lang === 'uk' ? uk : en;
// «білий» gives the streamer the White Drake ('steel'); the White Dragon ('white') is the streamer's other form, through !дракон
const COLOR_WORD = { uk: { red: 'червоний', blue: 'синій', black: 'чорний', gold: 'золотий', purple: 'фіолетовий', green: 'зелений', orange: 'помаранчевий', cherry: 'вишневий', turquoise: 'бірюзовий', steel: 'білий', white: 'білий' },
                     en: { red: 'red', blue: 'blue', black: 'black', gold: 'gold', purple: 'purple', green: 'green', orange: 'orange', cherry: 'cherry', turquoise: 'turquoise', steel: 'white', white: 'white' } };
async function register(page, lang, users) {
    for (const [u, type, color] of users) {
        await say(page, u, `${cmd(lang, '!дрейк', '!drake')} ${COLOR_WORD[lang][type]}`, color || '#ff7f50');
        if (type === 'white') await say(page, u, cmd(lang, '!дракон', '!dragon'), color || '#ff7f50');
    }
}
// Moves the game clock to an exact time after the current fight started
async function toFightTime(page, ms) {
    const [start, now] = await page.evaluate(() => [window.__fights[window.__fights.length - 1].t, Date.now()]);
    if (start + ms > now) await page.clock.runFor(start + ms - now);
}

// ---- In the page: what the arena shows right now ----
function arenaNow() {
    const txt = el => window.__vt(el);   // each pixel icon as [id]
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
    // How far a line's words and chips reach below its box (px): a line that wraps puts them on a second row. A pixel
    // icon is measured on its own: an ultimate's 24 px icon hangs 2 px into the gaps of its 20 px line, as designed
    // (design/icons/style.md), and never more
    const below = l => { const b = l.getBoundingClientRect(), tops = [];
        l.querySelectorAll('.lk, .lx, .lc-num, .lc-critchip, .lc-turn, .lc-arrow, b, span:not(:has(*))').forEach(x => { if (!x.closest('img')) tops.push(x.getBoundingClientRect().bottom); });
        const tw = document.createTreeWalker(l, NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n; n = tw.nextNode()) if (n.nodeValue.trim()) { const r = document.createRange(); r.selectNodeContents(n); [...r.getClientRects()].forEach(x => tops.push(x.bottom)); }
        return (tops.length ? Math.max(...tops) : b.bottom) - b.bottom; };
    const iconsHang = (l, what) => { const b = l.getBoundingClientRect();
        l.querySelectorAll('img.px-icon').forEach(i => { const r = i.getBoundingClientRect();
            if (r.top < b.top - 2.5 || r.bottom > b.bottom + 2.5) out.push(`icon ${i.dataset.icon} hangs ${Math.max(b.top - r.top, r.bottom - b.bottom).toFixed(1)} px out of its line on ${what}`); }); };
    const inside = (l2, what) => {
        const b = l2.getBoundingClientRect();
        l2.querySelectorAll('.lk, .lx').forEach(x => { const r = x.getBoundingClientRect();
            if (r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1) out.push(`hidden: "${x.textContent}" on ${what}`); });
        if (l2.querySelector('.lk.more') || [...l2.querySelectorAll('.lk')].some(x => /^\+\d+$/.test(window.__vt(x)))) out.push(`"+N" on ${what}`);
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
            if (!(l === l2 && wrapped) && below(l) > 1) out.push(`wraps: "${l.textContent.slice(0, 60)}"`);
            iconsHang(l, what);
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
    // A chip's compact form: its icon (data-ci) and its number (data-ct), read as __vt reads the compact chip
    const compactOf = k => k.dataset.c ? `${k.dataset.ci ? `[${k.dataset.ci}] ` : ''}${k.dataset.ct || ''}`.trim() : undefined;
    const want = [...box.querySelectorAll('.lc-l2 .lk')].map(k => ({ text: window.__vt(k), c: compactOf(k), first: !k.closest('.lg') }));
    const got = [...el.querySelectorAll('.lc-l2 .lk')].map(k => window.__vt(k));
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

// The notes a title fires, painted (page side). Each case: a note, its ability's own-icon title and pair, whose title fires it
// and the turn that shows it. Each title is drawn on the side that fires with the other on the far side, so a note reading
// the wrong fighter's title shows it. Read as the card shows it: the chip in full, then squeezed by fvFitLine (a note in a
// lower-priority group takes its compact form; what the attack did never does, so its data-ci says what that form would be)
function titleNoteCases() {
    const T = id => TITLES_DB.find(x => x.id === id);
    const mk = (name, id, type = 'red') => ({ name, color: '#ff7f50', drakeObj: DRAKE_TYPES.find(d => d.type === type), title: T(id) });
    const hit = more => Object.assign({ type: 'physical', sub: 'light', dmg: 20, crit: false, block: false, shadow: false, miss: false, pierce: false, sd: 0 }, more);
    const box = document.createElement('div');
    box.className = 'log-panel frame-sm';
    box.style.cssText = 'position:absolute;left:0;top:0;width:920px;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;padding:14px 22px 18px;z-index:99;background:#15171e';
    document.body.appendChild(box);
    const rec = (atk, def, extra) => Object.assign({ turn: 1, atk, def, side: 'left', ticks: [], notes: {}, casts: [], used: [], ult: null, attack: hit(), frozen: false }, extra);
    const paint = r => { const item = { type: 'row', cells: { left: { k: 'card', rec: r }, right: { k: 'empty' } } }; item.el = document.createElement('div'); box.appendChild(item.el); fvPaint(item); return item.el; };
    const chipOf = (el, icons) => [...el.querySelectorAll('.lc-l2 .lk.note')].find(k => { const i = k.querySelector('img.px-icon'); return i && icons.includes(i.dataset.icon); }) || null;
    const read = (r, icons) => {
        const el = paint(r), l = el.querySelector('.lc-l2'), chip = chipOf(el, icons);
        if (!chip) return { full: __vt(l), icon: null };
        const full = __vt(chip), ci = chip.dataset.ci || null, group = !!chip.closest('.lg');
        l.style.width = '24px';
        fvFitLine(l);
        const now = chipOf(el, icons);
        return { full, ci, group, compact: now ? __vt(now) : '', isCompact: !!now && now.classList.contains('compact'), icon: now && now.querySelector('img.px-icon').dataset.icon };
    };
    const NOTES = [
        ['guardian', 176, 96, 'atk', () => ({ notes: { guardian: 12 } })],
        ['immune', 178, 98, 'def', f => ({ casts: [{ owner: f, id: 'burn', result: 'immune' }] })],   // the cast's owner
        ['immune', 178, 98, 'atk', f => ({ casts: [{ owner: f, id: 'poison', result: 'immune' }] })],   // the cat's debuff landing on its own attacker
        ['immune', 178, 98, 'def', () => ({ ult: { id: 'theft', immune: true } })],   // an ultimate can't take the defender's buffs
        ['dodge', 179, 99, 'def', () => ({ notes: { dodge: true }, attack: hit({ dmg: 0, block: true }) })],
        ['chaos', 180, 100, 'atk', () => ({ notes: { chaos: true } })],
        ['thorns', 184, 183, 'def', () => ({ notes: { thorns: 6 } })],
        ['lifesteal', 185, 186, 'atk', () => ({ notes: { lifesteal: 9 } })],
        ['execute', 188, 187, 'atk', () => ({ notes: { execute: true } })],
        ['coin', 190, 189, 'atk', () => ({ notes: { coin: 1.5 } })],
        ['sleep', 192, 191, 'atk', () => ({ notes: { sleep: true } })],
        ['cat', 194, 193, 'atk', () => ({ notes: { cat: true } })],
        // The Legendary titles that reuse an ability with a glyph: each has its own icon now, and its pair is the older title
        ['guardian', 235, 96, 'atk', () => ({ notes: { guardian: 12 } })],
        ['guardian', 236, 96, 'atk', () => ({ notes: { guardian: 12 } })],
        ['immune', 239, 98, 'def', f => ({ casts: [{ owner: f, id: 'burn', result: 'immune' }] })],
        ['immune', 240, 98, 'def', f => ({ casts: [{ owner: f, id: 'burn', result: 'immune' }] })],
        ['dodge', 241, 99, 'def', () => ({ notes: { dodge: true }, attack: hit({ dmg: 0, block: true }) })],
        ['dodge', 242, 99, 'def', () => ({ notes: { dodge: true }, attack: hit({ dmg: 0, block: true }) })],
        ['chaos', 243, 100, 'atk', () => ({ notes: { chaos: true } })],
        ['chaos', 244, 100, 'atk', () => ({ notes: { chaos: true } })],
    ];
    const cases = NOTES.map(([note, ownId, pairId, side, turn]) => {
        const icon = titleGlyph(T(ownId));
        const draw = (firing, other) => { const a = mk('atk', side === 'atk' ? firing : other), d = mk('def', side === 'atk' ? other : firing, 'blue'); return rec(a, d, turn(side === 'atk' ? a : d)); };
        return { note, ownId, pairId, side, icon, words: note === 'coin' ? null : __fvv(ownId === 194 ? 'bug' : note).replace(/^\[\w+\] /, ''), pairWords: note === 'coin' ? null : __fvv(note).replace(/^\[\w+\] /, ''),
            own: read(draw(ownId, pairId), [icon, note]), pair: read(draw(pairId, ownId), [icon, note]) };
    });
    const foe = mk('def', 96, 'blue'), dragon = mk('dragon', 999, 'white');
    const sneaky = read(rec(mk('atk', 97), foe, { attack: hit({ sub: 'sneaky', pierce: true }) }), ['pierce', 'bigBrain']);
    const immune = read(rec(foe, dragon, { casts: [{ owner: dragon, id: 'burn', result: 'immune' }] }), ['immune', 'sovereign']);
    const banner = id => { const item = { type: 'banner', kind: 'opening', data: { f: mk('atk', id), id: 'rage' } }; item.el = document.createElement('div'); box.appendChild(item.el); fvPaint(item);
        const b = item.el.querySelector('.px-badge'); return { glyph: b && b.querySelector('.px-glyph').dataset.icon, frame: b && b.dataset.frame, text: __vt(item.el) }; };
    // A crowded card with own-icon titles on both sides: every item shown, no two alike
    const A = mk('atk', 180), B = mk('def', 184, 'blue'), busy = busiestRecs(A, B), left = busy.left(25), right = busy.right(26);
    const row = { type: 'row', cells: { left: { k: 'card', rec: left }, right: { k: 'card', rec: right } } };
    row.el = document.createElement('div'); box.appendChild(row.el); fvPaint(row);
    const shown = side => cardShowsAll(row.el.querySelector(`.lc.${side}`), side === 'left' ? left : right, side, currentLang);
    const crowded = { left: shown('left'), right: shown('right') };
    const out = { cases, sneaky, sneakyWords: __fvv('pierce'), immune, immuneWords: __fvv('immune'), coffee: banner(182), sunrise: banner(181), crowded };
    box.remove();
    return out;
}

// The notes of the abilities of titles 205–294, painted (page side). Each case: a note, a title of its ability, whose title
// fires it, the turn that shows it, what follows the words. Read as the card shows it: the chip in full, then squeezed by
// fvFitLine (a note in a lower-priority group takes its compact form; what the attack did never does)
function abilityNoteCases() {
    const T = id => TITLES_DB.find(x => x.id === id);
    const mk = (name, id, type = 'red') => ({ name, color: '#ff7f50', drakeObj: DRAKE_TYPES.find(d => d.type === type), title: T(id) });
    const hit = more => Object.assign({ type: 'physical', sub: 'light', dmg: 20, crit: false, block: false, shadow: false, miss: false, pierce: false, sd: 0 }, more);
    const box = document.createElement('div');
    box.className = 'log-panel frame-sm';
    box.style.cssText = 'position:absolute;left:0;top:0;width:920px;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;padding:14px 22px 18px;z-index:99;background:#15171e';
    document.body.appendChild(box);
    const rec = (atk, def, extra) => Object.assign({ turn: 1, atk, def, side: 'left', ticks: [], notes: {}, casts: [], used: [], ult: null, attack: hit(), frozen: false }, extra);
    const paint = r => { const item = { type: 'row', cells: { left: { k: 'card', rec: r }, right: { k: 'empty' } } }; item.el = document.createElement('div'); box.appendChild(item.el); fvPaint(item); return item.el; };
    const NOTES = [
        ['combo', 205, 'atk', () => ({ notes: { combo: true } }), ''],
        ['firstBlood', 208, 'atk', () => ({ notes: { firstBlood: true } }), ''],
        ['ironHide', 211, 'def', () => ({ notes: { ironHide: true } }), ''],
        ['lastStand', 214, 'atk', () => ({ notes: { lastStand: true } }), ''],
        ['counter', 217, 'def', () => ({ notes: { counter: 9 } }), ' -9'],
        ['eats', 220, 'atk', () => ({ notes: { eaten: { id: 'divine', healed: 12 } } }), ''],
        ['meterRush', 223, 'atk', () => ({ ult: { id: 'firestorm', boost: 1.5 } }), ' ×1.5'],
        ['momentum', 226, 'atk', () => ({ notes: { momentum: 12 } }), ' +12%'],
        ['cleanse', 229, 'atk', () => ({ notes: { cleanse: ['mark'] } }), ''],
        ['longBuffs', 232, 'atk', f => ({ casts: [{ owner: f, id: 'shield', result: 'applied' }] }), ' ×2'],
        ['phoenix', 245, 'def', f => ({ notes: { phoenix: { f, hp: 1 } } }), ' · 1 HP'],
        ['twin', 249, 'atk', () => ({ notes: { twin: 14 } }), ' -14'],
        ['storm', 253, 'atk', () => ({ notes: { storm: 1.5 } }), ' ×1.5'],
        ['rewind', 257, 'atk', () => ({ notes: { rewind: { from: 40, to: 180 } } }), ' 40 → 180'],
        ['tempered', 260, 'atk', () => ({ notes: { tempered: 15 } }), ' +15%'],
        ['returned', 264, 'def', f => ({ casts: [{ owner: f, id: 'mark', result: 'returned' }] }), ''],
        ['overcharge', 268, 'atk', () => ({ ult: { id: 'firestorm', boost: 1.6 } }), ' ×1.6'],
        ['sentenced', 271, 'atk', () => ({ notes: { sentenced: true } }), ''],
        ['sentenceDone', 271, 'atk', () => ({ notes: { sentenceDone: 2 } }), ' ×2'],
        ['notFound', 275, 'def', f => ({ notes: { notFound: f }, attack: hit({ dmg: 0, vanish: true }) }), ''],
        ['crashed', 278, 'def', f => ({ crash: f, attack: null }), ''],
        ['chat', 281, 'atk', () => ({ notes: { chat: true } }), ''],
        ['away', 284, 'atk', () => ({ away: true, attack: null }), ''],
        ['afkBack', 284, 'atk', () => ({ notes: { afkBack: 3 } }), ' ×3'],
        ['lagHang', 287, 'atk', () => ({ notes: { lagHang: true }, attack: hit({ dmg: 0, stuck: true }) }), ''],
        ['lagLand', 287, 'atk', () => ({ notes: { lagLand: 50 } }), ' -50'],
        ['copy', 292, 'atk', () => ({ notes: { copy: 31 } }), ' -31'],
    ];
    const cases = NOTES.map(([key, id, side, turn, after]) => {
        const f = mk('f', id), o = mk('o', 96, 'blue'), el = paint(side === 'atk' ? rec(f, o, turn(f)) : rec(o, f, turn(f)));
        // A Legendary title (205–244) has its own icon: compact, its chip is the icon and the number, so it's found by its icon
        const glyph = titleGlyph(f.title), own = !!titleOwnIcon(f.title), l = el.querySelector('.lc-l2'), words = fvT(key);
        const chipOf = () => [...el.querySelectorAll('.lc-l2 .lk.note')].find(k => { const i = k.querySelector('img.px-icon'); return i && i.dataset.icon === glyph && (own || __vt(k).includes(words)); }) || null;
        const chip = chipOf(), full = chip ? __vt(chip) : __vt(l), group = !!(chip && chip.closest('.lg'));
        l.style.width = '24px';
        fvFitLine(l);
        const now = chipOf(), want = `[${glyph}] ${words}${after}`;
        return { key, side, own, want, wantCompact: own ? `[${glyph}] ${after.trim()}`.trim() : want, full, group, compact: now ? __vt(now) : '', isCompact: !!now && now.classList.contains('compact') };
    });
    // Crowded cards of stand-ins, a Дзеркальний двійник attacker on a Феніксове перо holder and a Лаг attacker on a Карма
    // holder: every item shown, no two alike, though every note wears the same heart
    const A = mk('atk', 249), B = mk('def', 245, 'blue'), C = mk('lag', 287), D = mk('karma', 264, 'blue');
    const left = rec(A, B, { turn: 25, attack: hit({ type: 'vampire', sub: 'sneaky', dmg: 87, crit: true, pierce: true, sd: 2.8 }), notes: { twin: 31, phoenix: { f: B, hp: 1 }, vamp: 43, reflect: 13 },
        ticks: [{ id: 'burn', v: -12 }, { id: 'regen', v: 19 }], used: ['rage', 'mark'], casts: [{ owner: B, id: 'frost', result: 'replaced', extra: 'weakness' }, { owner: B, id: 'poison', result: 'applied' }] });
    const right = rec(C, D, { turn: 26, side: 'right', attack: hit({ dmg: 64, crit: true, sd: 3.1 }), notes: { lagLand: 120, scales: 12, thorns: 6 },
        ticks: [{ id: 'burn', v: -9 }], used: ['blessing', 'shield'], casts: [{ owner: D, id: 'mark', result: 'returned' }, { owner: C, id: 'rage', result: 'refreshed' }] });
    const row = { type: 'row', cells: { left: { k: 'card', rec: left }, right: { k: 'card', rec: right } } };
    row.el = document.createElement('div'); box.appendChild(row.el); fvPaint(row);
    const shown = side => cardShowsAll(row.el.querySelector(`.lc.${side}`), side === 'left' ? left : right, side, currentLang);
    const crowded = { left: shown('left'), right: shown('right') };
    box.remove();
    return { cases, crowded };
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
            const allProblems = [], fit = [], ids = new Set(), tails = [], iconIssues = new Set();
            let resultChecks = [], onlyCurrent = [], xpChecks = [];
            // The overlay check catches what it's for (each fault overlaySelfTest plants), then runs every turn
            const selfMissed = await overlaySelfTest(page);
            check(!selfMissed.length, `[${lang}] the overlay check reports a planted emoji, an icon at ×1.5, a squeezed icon, an icon over its words, an icon with another icon's art, one sharing another icon's copy, an icon smoothed or pixelated against the display rule and a badge glyph a pixel off`, `not reported: ${selfMissed.join(', ')}`);
            for (const [a, b, ranked] of fights) {
                await page.clock.runFor(4 * 60000);   // a pause between fights (there is no rest now; kept so the seeded fights stay the same)
                const xpBefore = await page.evaluate(([a, b]) => ({ [a]: getDragonStrict(a).xp, [b]: getDragonStrict(b).xp }), [a, b]);
                if (ranked) { await say(page, a, cmd(lang, '!черга', '!queue')); await say(page, b, cmd(lang, '!черга', '!queue')); }
                else { await say(page, a, `${cmd(lang, '!бій', '!battle')} @${b}`); await say(page, b, cmd(lang, '!прийняти', '!accept')); }
                const sides = await page.evaluate(() => { const f = window.__fights[window.__fights.length - 1]; return f; });
                const pops = [];
                const seen = await playChecked(page, `[${lang}] ${a} vs ${b}`, {
                    onStep1: async (s1, turn) => {
                        (await overlayIconIssues(page)).forEach(i => iconIssues.add(`turn ${turn}: ${i}`));
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
            (await overlayIconIssues(page)).forEach(i => iconIssues.add(`result: ${i}`));
            check(!iconIssues.size, `[${lang}] every turn and result of the ${fights.length} fights: no emoji on the overlay, every icon at a whole-number scale of its drawing, none missing`, [...iconIssues].slice(0, 5).join(' | '));
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
            // The 12 effects every drake can cast (the White Drake's own pair: 4b, below)
            const ids = await page.evaluate(() => POOL_IDS.slice());
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
                        const c = [...document.querySelectorAll('#log-feed .lc')].pop();
                        if (!c || !(__vt(c).includes(__fxv(id)) || __vt(c).includes(__fxv(id, true)))) return null;
                        const ownerChips = ['p1', 'p2'].flatMap(p => [...document.querySelectorAll(`#status-${p} .status-item`)].map(x => __vt(x)));
                        return { l2: [...c.querySelectorAll('.lc-l2 .lk, .lc-l2 .lx')].map(x => __vt(x)).join(' '), chip: EFFECTS[id].lasts === 'instant' ? '' : `${__fxv(id)} · ${effectLeftText(id, EFFECTS[id].count)}`, ownerChips, forced: forcedCast };
                    }, id);
                }
                if (!found) { results.push({ id, ok: false, why: 'never cast' }); continue; }
                const e = await page.evaluate(id => ({ kind: EFFECTS[id].kind, lasts: EFFECTS[id].lasts, name: __fxv(id), acc: __fxv(id, true) }), id);
                const label = { uk: e.kind === 'buff' ? 'отримує' : 'накладає', en: e.kind === 'buff' ? 'gets' : 'applies' }[lang];
                const refresh = { uk: 'оновлює', en: 'refreshes' }[lang], removes = { uk: 'знімає', en: 'removes' }[lang], lost = { uk: 'зникає', en: 'lost' }[lang];
                // After the verb the accusative («накладає 🎯 Мітку»); a replacement names it first, in the nominative: «X · Y зникає»
                const textOk = e.lasts === 'instant' ? found.l2.includes(`${e.name} ${removes}`)
                    : found.l2.includes(`${label} ${e.acc}`) || found.l2.includes(`${refresh} ${e.acc}`) || (found.l2.includes(`${e.name} ·`) && found.l2.includes(lost));
                const chipOk = e.lasts === 'instant' || found.ownerChips.some(c => c.startsWith(e.name));
                results.push({ id, ok: textOk && chipOk && found.forced === null, why: JSON.stringify(found) });
            }
            await page.selectOption('#debug-force-cast', '');
            const bad = results.filter(r => !r.ok);
            check(!bad.length && results.length === ids.length, `[${lang}] all ${ids.length} effects cast from "next hit casts": the card says it ("накладає 🎯 Мітку", the name after the verb in the accusative; refresh / Dispel in words, a replacement «X · Y зникає») and the fighter card shows the chip, in the nominative`,
                bad.slice(0, 3).map(r => `${r.id}: ${r.why}`).join(' | '));
            if (errors.length) fail(`[${lang}] page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 4b. The streamer's White Drake on the log cards =====
        console.log('\nThe White Drake on the log cards');
        if (run(4)) for (const lang of ['uk', 'en']) {
            const { page, context, errors } = await open(browser, { lang });
            await page.click('button[data-i18n="btn_settings"]');
            await page.evaluate(() => setStreamerUser('stalwart'));
            await register(page, lang, [['stalwart', 'steel', '#e8f6ff'], ['ruby', 'red', '#ff7f50']]);
            const W = await page.evaluate(() => ({ magnet: __fxv('magnet', true), reforge: __fxv('reforge', true), rage: __fxv('rage'), burn: __fxv('burn'),   // the first two after a verb
                bounced: __fvv('bounced'), pulled: __fvv('pulled'), cracked: __fvv('cracked'), scales: __fvv('scales'), steelIn: __fvv('steelIn'), steelWin: __fvv('steelWin'), steelLoss: __fvv('steelLoss') }));
            const applies = cmd(lang, 'накладає', 'applies'), gets = cmd(lang, 'отримує', 'gets');
            const pick = async id => { await page.selectOption('#debug-force-cast', ''); if (id) await page.selectOption('#debug-force-cast', id); };
            const chipOn = (id, side) => page.evaluate(([id, side]) => [...document.querySelectorAll(`#status-${side} .status-item`)].some(x => __vt(x).startsWith(__fxv(id))), [id, side]);
            // What each cast from the menu must say on its card: a Підпал on the White Drake bounces while its scales hold; a
            // Лють the foe casts under Магніт goes to the White Drake
            const says = { burn: l2 => l2.includes(`${W.burn} ${W.bounced}`), magnet: l2 => l2.includes(`${applies} ${W.magnet}`),
                           rage: l2 => l2.includes(`${W.rage} ${W.pulled}`), reforge: l2 => l2.includes(`${gets} ${W.reforge}`) };
            const todo = new Set(Object.keys(says)), done = {}, chips = {}, panel = [], fights = [];   // panel: the silhouette, turn by turn
            let crackSeen = false, rebuildSeen = false, scalesHitSeen = false, menuOnlyWd = null, shots = false, logShot = false;
            // The White Drake's card as drawn: its side, its HP row's boxes (the HP bar, the segment, the HP number; the right
            // card's mirrored about the arena's centre, so a coin flip that moves it to the other card compares too), the
            // segment's number and fill, and the fight's own scales (battleFx)
            const wdRow = () => page.evaluate(() => {
                const side = document.getElementById('name-p1').textContent.includes('stalwart') ? 'p1' : 'p2', other = side === 'p1' ? 'p2' : 'p1';
                const c1 = document.getElementById('card-p1').getBoundingClientRect(), c2 = document.getElementById('card-p2').getBoundingClientRect(), axis = (c1.left + c2.right) / 2;
                const box = el => { const b = el.getBoundingClientRect(), [l, r] = side === 'p1' ? [b.left, b.right] : [2 * axis - b.right, 2 * axis - b.left];
                    return [l, b.top, r - l, b.height].map(v => Math.round(v * 10) / 10).join(','); };
                const fill = document.getElementById(`scales-${side}`), seg = fill.parentElement, sc = battleFx && battleFx.stalwart && battleFx.stalwart.scales;
                return { side, kind: arenaState.kind, betting: !!arenaState.betting, shown: document.getElementById(`card-${side}`).classList.contains('has-scales') && getComputedStyle(seg).display !== 'none',
                         otherShown: document.getElementById(`card-${other}`).classList.contains('has-scales'),
                         boxes: [document.getElementById(`bar-${side}`).parentElement, seg, document.getElementById(`hp-text-${side}`)].map(box).join(' | '),
                         text: document.getElementById(`scale-text-${side}`).textContent, scale: new DOMMatrix(getComputedStyle(fill).transform).a, broken: seg.classList.contains('broken'),
                         fx: sc ? { now: sc.now, max: sc.max } : null };
            });
            // The segment matches the scales it should show (the fight's own; full before the fight has any)
            const segAgrees = (r, sc) => r.shown && !r.otherShown && !!sc && r.text === String(Math.max(0, sc.now)) && Math.abs(r.scale - Math.max(0, sc.now) / sc.max) < 0.002 && r.broken === (sc.now <= 0);
            const rows = [], segBad = [];   // every sample of the White Drake's HP row, and the turns whose segment disagreed
            for (let duel = 0; duel < 4 && (todo.size || !crackSeen || !rebuildSeen || menuOnlyWd === null); duel++) {
                await page.clock.runFor(4 * 60000);
                await say(page, 'stalwart', `${cmd(lang, '!бій', '!battle')} @ruby`); await say(page, 'ruby', cmd(lang, '!прийняти', '!accept'));
                const wd = await page.evaluate(() => document.getElementById('name-p1').textContent.includes('stalwart') ? 'p1' : 'p2'), foe = wd === 'p1' ? 'p2' : 'p1';
                // The countdown: the segment is there, full, before the first hit
                await page.clock.runFor(1000);
                await settleArena(page);
                const cd = await wdRow();
                rows.push({ at: `duel ${duel + 1} countdown`, ...cd });
                if (cd.kind !== 'countdown' || !segAgrees(cd, cd.fx) || cd.fx.now !== cd.fx.max) segBad.push(`duel ${duel + 1} countdown: ${JSON.stringify(cd)}`);
                for (let turn = 1; turn <= 30 && await page.evaluate('isBattleRunning'); turn++) {
                    const mine = (turn % 2 === 1) === (wd === 'p1');   // p1 strikes on odd turns
                    await toFightTime(page, turn * TURN - 50);
                    const st = await page.evaluate(() => battleFx && battleFx.stalwart ? { scales: battleFx.stalwart.scales.now, magnet: battleFx.ruby.debuff.some(x => x.id === 'magnet') } : null);
                    if (!st) break;
                    // The White Drake's turn: Магніт (again, while a pull is still to be seen and it has worn off), Перекування.
                    // The foe's: Підпал while the scales hold, Лють under Магніт, or the menu check: the White Drake's own
                    // Перекування, picked before the foe's hit, is still waiting after it
                    let id = null, probe = false;
                    if (mine) id = todo.has('magnet') || (todo.has('rage') && !st.magnet) ? 'magnet' : todo.has('reforge') ? 'reforge' : null;
                    else if (todo.has('burn') && st.scales > 0) id = 'burn';
                    else if (todo.has('rage') && st.magnet) id = 'rage';
                    else if (menuOnlyWd === null) { id = 'reforge'; probe = true; }
                    if (id) await pick(id);
                    await toFightTime(page, turn * TURN + HIT + 1);
                    await settleArena(page);
                    const seg = await wdRow();
                    rows.push({ at: `duel ${duel + 1} turn ${turn}`, ...seg });
                    if (!segAgrees(seg, seg.fx)) segBad.push(`duel ${duel + 1} turn ${turn}: ${JSON.stringify(seg)}`);
                    const now = await page.evaluate(arenaNow);
                    const card = now.cards.find(c => c.turn === turn);
                    if (probe) {
                        if (card && /^-[1-9]\d*$/.test(card.num)) menuOnlyWd = await page.evaluate(() => forcedCast === 'reforge');
                        await pick('');
                    } else if (id && card && says[id](card.l2)) {
                        done[id] = card.l2;
                        // Where the chip is: nowhere for the bounced Підпал, on the foe for Магніт, on the White Drake for the rest
                        chips[id] = id === 'burn' ? !await chipOn('burn', wd) : await chipOn(id, id === 'magnet' ? foe : wd);
                        todo.delete(id);
                    } else if (id) await pick('');   // used up by a hit that didn't show it, or not at all: picked again on its turn
                    if (card && card.l2.includes(W.cracked)) crackSeen = true;
                    if (card && /\[reforge\] \+\d+/.test(card.l2)) rebuildSeen = true;
                    if (card && (card.l2.includes(`${W.scales} -`) || /\[scales\] -\d+/.test(card.l2))) scalesHitSeen = true;
                    panel.push(await page.evaluate(() => { const p = document.getElementById('log-panel'); return p.classList.contains('steel-fight') && /^url\(/.test(p.style.backgroundImage); }));
                    const up = await page.evaluate(() => !!battleFx && !!battleFx.stalwart && battleFx.stalwart.scales.now > 0 && battleFx.stalwart.scales.now < battleFx.stalwart.scales.max);
                    if (lang === 'uk' && !shots && done.magnet && up) {
                        // The White Drake's card with its scales up (and its frame's shimmer around it), and the whole arena
                        const box = await page.locator(`#card-${wd}`).boundingBox();
                        await page.screenshot({ path: path.join(SHOTS, 'white-drake-card.png'), clip: { x: box.x - 16, y: box.y - 16, width: box.width + 32, height: box.height + 32 } });
                        await page.screenshot({ path: path.join(SHOTS, 'white-drake-fight.png') });
                        shots = true;
                    }
                    if (lang === 'uk' && !logShot && done.burn && done.rage && (crackSeen || rebuildSeen)) {
                        await page.locator('#log-panel').screenshot({ path: path.join(SHOTS, 'white-drake-log.png') });
                        logShot = true;
                    }
                }
                await pick('');
                for (let i = 0; i < 40 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN);
                await page.clock.runFor(HIT + 100);
                // The result screen: the segment stays, as the fight left it
                await settleArena(page);
                const res = await wdRow();
                rows.push({ at: `duel ${duel + 1} result`, ...res });
                if (res.kind !== 'result' || !segAgrees(res, res.fx)) segBad.push(`duel ${duel + 1} result: ${JSON.stringify(res)}`);
                const end = await page.evaluate(arenaNow);
                const won = end.textLog.some(l => /(Переміг|Переможець|Winner):? @stalwart\b/.test(l));
                fights.push({ won, banner: end.banners.some(t => t.includes(W.steelIn)), line: end.result.includes(won ? W.steelWin : W.steelLoss) && !end.result.includes(won ? W.steelLoss : W.steelWin) });
                await page.clock.runFor(await page.evaluate(() => RESULT_HOLD_MS) + 1000);   // past the result screen's hold
            }
            // Turn by turn to the result screen, sampling the White Drake's HP row (from step 2 of turn 1 on)
            const playSampled = async label => {
                for (let turn = 1; turn <= 30 && await page.evaluate('isBattleRunning'); turn++) {
                    await toFightTime(page, turn * TURN + HIT + 1);
                    await settleArena(page);
                    const r = await wdRow();
                    rows.push({ at: `${label} turn ${turn}`, ...r });
                    if (!segAgrees(r, r.fx)) segBad.push(`${label} turn ${turn}: ${JSON.stringify(r)}`);
                }
                await page.clock.runFor(HIT + 100);
                await settleArena(page);
                const r = await wdRow(), ranked = await page.evaluate(() => !!arenaState.ranked);
                rows.push({ at: `${label} result`, ...r });
                if (r.kind !== 'result' || !segAgrees(r, r.fx)) segBad.push(`${label} result: ${JSON.stringify(r)}`);
                await page.clock.runFor(await page.evaluate(() => RESULT_HOLD_MS) + 1000);
                return ranked;
            };
            // With the betting window on: the betting window shows the segment full (the fight's own scales come with the
            // fight), then the countdown, every turn and the result screen as before
            await page.evaluate(() => setBettingWindow(true));
            await page.clock.runFor(4 * 60000);
            await say(page, 'stalwart', `${cmd(lang, '!бій', '!battle')} @ruby`); await say(page, 'ruby', cmd(lang, '!прийняти', '!accept'));
            await page.clock.runFor(1000);
            await settleArena(page);
            const bw = await wdRow();
            const full = await page.evaluate(() => { const f = [fv.p1, fv.p2].find(x => x && x.name === 'stalwart'), lvl = calculateLevelAndProgress(f.xp).level; return scalesOf(lvl, getMaxHP(lvl, f.drakeObj.type, f.title)); });
            rows.push({ at: 'betting window', ...bw });
            if (bw.kind !== 'countdown' || !bw.betting || !segAgrees(bw, { now: full, max: full })) segBad.push(`betting window: ${JSON.stringify({ bw, full })}`);
            await page.evaluate(() => skipBettingWindow());
            await page.clock.runFor(1000);
            await settleArena(page);
            const bcd = await wdRow();
            rows.push({ at: 'betting duel countdown', ...bcd });
            if (bcd.kind !== 'countdown' || !segAgrees(bcd, bcd.fx) || bcd.fx.now !== full || bcd.fx.max !== full) segBad.push(`betting duel countdown: ${JSON.stringify({ bcd, full })}`);
            await playSampled('betting duel');
            await page.evaluate(() => setBettingWindow(false));
            // A ranked fight: the cards are drawn again at its end (for the XP), and the segment stays, as the fight left it
            await page.clock.runFor(4 * 60000);
            await say(page, 'stalwart', cmd(lang, '!черга', '!queue')); await say(page, 'ruby', cmd(lang, '!черга', '!queue'));
            const rankedFight = await playSampled('ranked');
            // The next fight, without the White Drake: no silhouette behind the log
            await register(page, lang, [['onyx', 'black', '#a9a9ff']]);
            await page.clock.runFor(4 * 60000);
            await say(page, 'ruby', `${cmd(lang, '!бій', '!battle')} @onyx`); await say(page, 'onyx', cmd(lang, '!прийняти', '!accept'));
            await toFightTime(page, TURN + HIT + 1);
            const plainAfter = await page.evaluate(() => { const p = document.getElementById('log-panel'); return !p.classList.contains('steel-fight') && !p.style.backgroundImage; });
            const noSegAfter = await page.evaluate(() => !document.querySelector('.fighter-card.has-scales') && ['p1', 'p2'].every(p => getComputedStyle(document.getElementById(`scales-${p}`).parentElement).display === 'none'));
            for (let i = 0; i < 40 && await page.evaluate('isBattleRunning'); i++) await page.clock.runFor(TURN);
            const missing = Object.keys(says).filter(id => !done[id] || !chips[id]);
            check(!missing.length, `[${lang}] the White Drake's lines: «${(done.burn || '').slice(0, 40)}», «${(done.magnet || '').slice(0, 30)}», «${(done.rage || '').slice(0, 45)}», «${(done.reforge || '').slice(0, 30)}», each chip on the right card`,
                JSON.stringify({ missing, done, chips }));
            check(menuOnlyWd === true, `[${lang}] Перекування from the test menu waits for the White Drake's own hit (the foe's damaging hit leaves it picked)`, String(menuOnlyWd));
            check(crackSeen && rebuildSeen && scalesHitSeen, `[${lang}] what a hit takes off the scales («[scales] -N»), «${W.cracked}» and Перекування's «[reforge] +N» on the cards (pixel icons)`, JSON.stringify({ crackSeen, rebuildSeen, scalesHitSeen }));
            check(fights.length && fights.every(r => r.banner && r.line), `[${lang}] every White Drake fight opens with «${W.steelIn}» and its result card says «${W.steelWin}» or «${W.steelLoss}», as it ended (${fights.map(f => f.won ? 'won' : 'lost').join(', ')})`, JSON.stringify(fights));
            check(panel.length && panel.every(Boolean) && plainAfter, `[${lang}] the faint White Dragon behind the log through every turn of its fights (${panel.length}), gone in the next fight without it`, JSON.stringify({ panel: panel.slice(0, 12), plainAfter }));
            // Its scales on its card: the segment's number and fill as battleFx has them on every turn, full from the countdown
            // (and the betting window), still there on the result screen (a ranked fight's too, after its cards are drawn
            // again for the XP); the HP row's boxes the same from the first sample to the last
            const boxes = [...new Set(rows.map(r => r.boxes))], turns = rows.filter(r => / turn /.test(r.at)).length;
            check(!segBad.length && boxes.length === 1 && turns >= 20 && rankedFight && rows.some(r => r.at === 'betting window') && rows.some(r => r.at === 'ranked result'),
                `[${lang}] the White Drake's segment matches battleFx's scales, number and fill, on every turn of its fights (${turns} turns, ${fights.length + 2} fights, ${rows.filter(r => r.broken).length} samples broken), full in the countdown and the betting window, as the fight left it on every result screen (a ranked fight's too); its HP row's boxes the same throughout (${boxes[0]})`,
                JSON.stringify({ segBad: segBad.slice(0, 3), boxes, rankedFight }));
            check(noSegAfter, `[${lang}] no segment on either card in the next fight without the White Drake`, String(noSegAfter));
            if (lang === 'uk') check(shots && logShot, 'screenshots: tests/screenshots/white-drake-card.png, white-drake-fight.png, white-drake-log.png', JSON.stringify({ shots, logShot }));
            if (errors.length) fail(`[${lang}] page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 5. Every ultimate from the СИЛА button, every Jackpot outcome =====
        console.log('\nUltimates from the test menu');
        if (run(5)) for (const lang of ['uk', 'en']) {
            const { page, context, errors } = await open(browser, { lang });
            await page.click('button[data-i18n="btn_settings"]');
            const ults = await page.evaluate(() => ULTIMATE_IDS.map(id => ({ id, element: CLASS_ULTIMATES[id].element, label: `${METER.label[currentLang]} · ${CLASS_ULTIMATES[id].name[currentLang]}`, name: `[${iconOf(id)}] ${CLASS_ULTIMATES[id].name[currentLang]}`, icon: CLASS_ULTIMATES[id].icon })));
            const jackpotCases = [['💎', '💎', '💎'], ['💎', '🪙', '💀'], ['🪙', '💀', '💀'], ['💀', '💀', '💀']];
            const REEL = { '💎': '[reelgem]', '🪙': '[reelcoin]', '💀': '[reelbust]' };   // each reel's pixel icon on the card
            const runs = [...ults.map(u => ({ u })), ...jackpotCases.map(reels => ({ u: ults.find(x => x.id === 'jackpot'), reels }))];
            const results = [];
            let n = 0;
            for (const run of runs) {
                const u = run.u, me = `ult_${n}`, foe = `foe_${n}`; n++;
                const foeType = u.element === 'purple' ? 'red' : 'purple';
                if (u.element === 'steel') await page.evaluate(n => setStreamerUser(n), me);   // Удар ковадла: the streamer's White Drake
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
                    burn: __fxv('burn'), hits: `[mirror] ${unitLeftText('hits', CLASS_ULTIMATES.mirror.nums.hits)}`,
                    takes: { uk: 'забирає', en: 'takes' }[lang], forced: { uk: 'гарантований крит', en: 'guaranteed crit' }[lang], rage: __fxv('rage'),
                    anvil: CLASS_ULTIMATES.anvil.nums.dmgMult,
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
                        detail = reels ? l2.includes(reels.map(r => REEL[r]).join(' ')) && (miss ? l2.includes(want.miss) && card.num === '0' : l2.includes(`×${1 + gems}`)) : /\[reel(gem|coin|bust)\]/.test(l2);
                    }
                    if (u.id === 'detonation') detail = /×\d/.test(l2);
                    if (u.id === 'anvil') detail = l2.includes(`×${want.anvil}`);
                    if (u.id === 'bloom') detail = card.num.startsWith('+');
                    if (u.id === 'eruption') detail = /×\d/.test(l2) && / → /.test(l2);
                    if (u.id === 'lastbreath') detail = /×\d/.test(l2);
                    if (u.id === 'hightide') detail = card.num.startsWith('+');
                }
                const ok = !!card && card.ult === u.label && !!step1 && step1.ult && step1.tab === u.name && detail;
                results.push({ id: u.id + (run.reels ? ` [${run.reels.join('')}]` : ''), ok, why: JSON.stringify({ step1, card }) });
            }
            await page.evaluate(() => { if (window.__realSpin) window.spinReel = window.__realSpin; });
            const bad = results.filter(r => !r.ok);
            check(!bad.length, `[${lang}] every ultimate from the СИЛА button: the tab shows its icon and name with the stronger glow, the card's header strip says "${lang === 'uk' ? 'УЛЬТИМЕЙТ · …' : 'ULTIMATE · …'}" (its icon on line 1) and lists what it did; Jackpot shows its reels' icons (gem, coins, bust) for 💎💎💎, 💎🪙💀 and both misses`,
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
                    // The streamer's White Drake: its banner; a debuff bouncing off its scales (and what the hit took off them);
                    // Магніт; a buff pulled to it, replacing one of its own, as its scales crack; Перекування rebuilding them;
                    // Удар ковадла re-forging them; armour-piercing on its scales
                    const Wd = mk('streamer', 'steel', '#e8f6ff');
                    fv.stats[Wd.name] = { dmg: 191, max: 74, crits: 2 };
                    add({ type: 'banner', kind: 'steel', data: {} });
                    row(card(rec(29, B, Wd, { attack: atk('physical', 'light', 18), notes: { scales: 18 }, casts: [{ owner: Wd, id: 'burn', result: 'bounced' }] })),
                        card(rec(30, Wd, B, { attack: atk('magical', 'heavy', 33), casts: [{ owner: B, id: 'magnet', result: 'applied' }] })));
                    row(card(rec(31, B, Wd, { attack: atk('physical', 'heavy', 41), notes: { scales: 22, crack: true }, casts: [{ owner: Wd, id: 'rage', result: 'pulled', extra: 'regen' }] })),
                        card(rec(32, Wd, B, { attack: atk('physical', 'light', 25), notes: { reforge: 15 }, used: ['reforge'] })));
                    row(U(33, Wd, B, 'anvil', atk('physical', 'heavy', 74), { mult: 1.5, reforged: 31 }), card(rec(34, B, Wd, { attack: atk('magical', 'sneaky', 29, { pierce: true }), notes: { scales: 9 } })));
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
                    // The White Drake's result lines, a win and a loss
                    add({ type: 'result', data: { winner: Wd, loser: B, ranked: true, turns: 14, timeout: false, xp: { [Wd.name]: 40, [B.name]: 10 }, stats: fv.stats, steel: 'win' } });
                    add({ type: 'result', data: { winner: B, loser: Wd, ranked: true, turns: 19, timeout: false, xp: { [Wd.name]: 10, [B.name]: 40 }, stats: fv.stats, steel: 'loss' } });
                }
                currentLang = 'uk';
                fv = { on: false, items: [], stats: {}, rec: null, hold: null, lit: null };
            });
            await settleArena(page);
            const fitIssues = await page.evaluate(cardFitProblems);
            const n = await page.evaluate(() => document.querySelectorAll('#review-sheet .lc').length);
            const burnOnce = await page.evaluate(() => [...document.querySelectorAll('#review-sheet .lc')].filter(c => (c.querySelector('.lc-turn') || {}).textContent === '15')
                .map(c => [...c.querySelectorAll('.lc-l2 .lk')].filter(x => __vt(x).includes('[burn]')).length));
            check(burnOnce.length === 2 && burnOnce.every(k => k === 1), 'one attack touching the same effect twice (Firestorm applies Burn, its cast refreshes it) shows its chip once', JSON.stringify(burnOnce));
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
            // Armour-piercing (a spear through armour) and Chaotic charge (a bolt) are two drawings now, both once, whatever
            // their form (cardShowsAll already fails any two items shown alike)
            const pierceChaos = busiest.every(x => x.got.filter(t => t.startsWith('[pierce]')).length === 1 && x.got.filter(t => t.startsWith('[chaos]')).length === 1);
            check(pierceChaos, 'on the busiest turn armour-piercing and Chaotic charge each show their own icon, once', JSON.stringify(busiest.map(x => x.got)));
            check(busiest.length === 2 && busiest.every(x => x.got.length === 17 && !x.out.length),
                `the busiest turn there can be (an ultimate, a crit in sudden death, effects landing and ticking, title mechanics): all 17 items in both languages, nothing cut off; ${busiest.map(x => `[${x.lang}] its second line wraps onto ${x.lines} lines`).join(', ')} (the card grows rather than hide anything)`,
                JSON.stringify(busiest));
            check(!fitIssues.length, `worst cases: nothing hidden or cut off (${n} cards, both languages): 25-letter names, the White Dragon's -1949998, the longest effect line, every ultimate, the White Drake's lines, the busiest turn`, fitIssues.slice(0, 5).join(' | '));
            // The White Drake's own lines, in both languages: the bounce, the pull, the crack, the rebuild, Удар ковадла's
            // re-forge, the banner and both result lines
            const steelMissing = await page.evaluate(() => {
                const t = __vt(document.getElementById('review-sheet'));
                const want = ['uk', 'en'].flatMap(l => { currentLang = l; return ['bounced', 'pulled', 'cracked', 'steelIn', 'steelWin', 'steelLoss'].map(k => __fvv(k))
                    .concat(`${fvT('pulled')} · ${__fxv('regen')} ${fvT('lost')}`); });   // the pulled card (turn 31): «… · [regen] Регенерація зникає»
                currentLang = 'uk';
                return [...new Set(want)].concat(['[reforge] +15', '[scales] +31', '[anvil] ']).filter(w => !t.includes(w));
            });
            check(!steelMissing.length, "the White Drake's cards on the sheet, both languages: a debuff bounced off its scales, a buff pulled to it (replacing one), the scales cracking, Перекування's rebuild, Удар ковадла re-forging them, its banner and both result lines",
                steelMissing.join(' | '));
            // A dropped effect is named first, then «зникає» (its name stays in the nominative): a replaced buff (turn 9), a
            // replaced debuff (the busiest turn), Shadow Theft's lost buff (turn 18); no card says «замінює» any more
            const dropped = await page.evaluate(() => {
                const t = __vt(document.getElementById('review-sheet'));
                const want = ['uk', 'en'].flatMap(l => { currentLang = l; return [`${__fxv('divine')} · ${__fxv('blessing')} ${fvT('lost')}`, `· ${__fxv('weakness')} ${fvT('lost')}`, `${__fxv('shield')} · ${__fxv('blessing')} ${fvT('lost')}`]; });
                currentLang = 'uk';
                return { missing: want.filter(w => !t.includes(w)), replaces: /замінює|\breplaces\b/.test(t) };
            });
            check(!dropped.missing.length && !dropped.replaces, 'a dropped effect is named first, then «зникає» / "lost" (a replaced buff, a replaced debuff, Shadow Theft\'s), and no card says «замінює»', JSON.stringify(dropped));
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

        // ===== 11. Ranked play: queue order, XP from the level gap, the Top =====
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
            const rigged = async (win, wType, wLvl, lose, lType, lLvl, shot = null) => {
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
                if (shot) await page.locator('#log-feed .log-result').screenshot({ path: path.join(SHOTS, shot) });
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
            // A favourite gets 5 less per level, never below 10: L15 beats L5 → +10, and the card shows the cut before Gold and
            // after the floor (-30, not -50)
            const u3 = await rigged('champ', 'black', 15, 'goldie', 'gold', 5);
            check(u3.gained[0] === 10 && u3.win === cmd(lang, '+10 XP (-30 за слабшого суперника)', '+10 XP (-30 for a weaker opponent)') && !u3.cut.length,
                `${tag} an L15 favourite beats L5: "${u3.win}" (40 less 50 stops at the floor of 10, so the cut shows -30), not cut off`, JSON.stringify(u3));
            // The cut's longest text, two digits on each side: a Gold L12 beats L10 (40 - 10, then Gold on the 30)
            const u4 = await rigged('goldking', 'gold', 12, 'rival', 'blue', 10, `fightview-cut-result-${lang}.png`);
            const pct12 = await page.evaluate(() => ELEMENT_BASE.goldXp + getTierMultiplier(12).goldXpBonus);
            const g4 = Math.round(30 * (1 + pct12 / 100));
            check(u4.gained.join() === `${g4},10` && u4.win === cmd(lang, `+${g4} XP (-10 за слабшого суперника)`, `+${g4} XP (-10 for a weaker opponent)`) && u4.lose === '+10 XP' && !u4.cut.length && u4.note === null,
                `${tag} a Gold L12 beats L10: "${u4.win}" (Gold's +${pct12}% on 40 - 10), the loser "${u4.lose}", nothing cut off`, JSON.stringify(u4));

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
            await sim('dragonkeeper', cmd(lang, '!дракон', '!dragon'));   // «білий» is the White Drake; !дракон, the Dragon
            await sim('brave', `${cmd(lang, '!дрейк', '!drake')} ${COLOR_WORD[lang].red}`);
            const wd0 = await page.evaluate(() => ({ xp: getDragonStrict('brave').xp, stats: JSON.stringify(playerLeaderboardStats) }));
            await sim('dragonkeeper', Q); await sim('brave', Q);
            await finish();
            await settleArena(page);
            const wd = await page.evaluate(() => {
                const note = document.querySelector('#log-feed .log-result .lr-note');
                return { winner: arenaState.winner && arenaState.winner.name, ranked: arenaState.ranked, xp: getDragonStrict('brave').xp, stats: JSON.stringify(playerLeaderboardStats),
                         note: note && __vt(note), cut: !!note && note.scrollWidth > note.clientWidth + 1,
                         xpCells: [...document.querySelectorAll('#log-feed .log-result .lr-xp')].map(c => c.textContent) };
            });
            check(wd.ranked && wd.winner === 'dragonkeeper' && wd.xp - wd0.xp === 10 && wd.stats === wd0.stats && wd.xpCells.includes('+10 XP')
                && wd.note === cmd(lang, '[emDragon] Бій з Білим Драконом: без перемоги й поразки в Топі', '[emDragon] A fight with the White Dragon: no win or loss in the Top') && !wd.cut,
                `${tag} a ranked fight against the White Dragon: @brave +10 XP, no win or loss for either side, and the result card says "${wd.note}", not cut off`, JSON.stringify({ wd, wd0 }));
            await page.locator('#log-feed .log-result').screenshot({ path: path.join(SHOTS, `fightview-dragon-result-${lang}.png`) });
            await hold();
            await page.evaluate(() => setStreamerUser(''));
            if (errors.length) fail(`${tag} page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 12. Icons that don't change keep their elements (a new <img> restarts the image's loop) =====
        // At turn 1 of a ranked fight every icon on the cards, the plate, the fight type, the title plate, the Top, the queue,
        // the log's legend, the log and the chat cards is marked; three turns later (and with the Top, the queue, the legend
        // and the title plate drawn again too), each one still drawn with the same id and size where it was (its card, log
        // row or chat card) must be the very same element. Then a changed icon must be a new one: a chip for a buff the card
        // didn't show (the other chips keep theirs) and another title's badge (the card's emblem keeps its own).
        console.log('\nIcons kept across redraws');
        if (run(12)) {
            const { page, context, errors } = await open(browser, { lang: 'uk' });
            await register(page, 'uk', [['kotyk_ua', 'red'], ['jade', 'green'], ['sapphire', 'blue']]);
            await page.evaluate(() => {
                const db = getDragonDB();
                db.kotyk_ua.title = TITLES_DB.find(t => t.id === 183); db.jade.title = TITLES_DB.find(t => t.id === 98); db.sapphire.title = TITLES_DB.find(t => t.id === 74);
                saveDragonDB(db);
                saveHonours({ ...getHonours(), holders: ['kotyk_ua', 'jade', 'sapphire'] });
                renderLeaderboard();
            });
            for (const u of ['kotyk_ua', 'jade', 'sapphire']) await say(page, u, '!черга');
            const until = async cond => { for (let i = 0; i < 240 && !(await page.evaluate(cond)); i++) await page.clock.runFor(250); };
            await until(() => arenaState.kind === 'fight' && arenaState.turn >= 1);
            await page.clock.runFor(HIT + 400);
            await settleArena(page);
            const AREAS = ['#card-p1', '#card-p2', '#status-plate', '#fight-type', '.plaque', '#leaderboard-list', '#queue-list-ui', '#log-head', '#log-list', '#info-feed'];
            const inPage = `const key = i => i.matches('.px-badge') ? 'badge ' + i.dataset.frame + ' ' + i.querySelector('.px-glyph').dataset.icon + ' ' + i.style.width : i.dataset.icon + ' ×' + i.dataset.s;
                const boxes = el => [...el.querySelectorAll('.px-badge, img.px-icon')].filter(i => !i.parentElement.classList.contains('px-badge'));`;
            const before = await page.evaluate(([areas, src]) => {
                const { key, boxes } = new Function(`${src} return { key, boxes };`)();
                window.__marks = [];
                areas.forEach(sel => document.querySelectorAll(sel).forEach(area => boxes(area).forEach(node => window.__marks.push({
                    sel, key: key(node), node, unit: node.closest('.log-row, .log-banner, .log-result, .info-card') || area }))));
                return { n: window.__marks.length, turn: arenaState.turn, plate: __vt(document.getElementById('status-plate')) };
            }, [AREAS, inPage]);
            for (let i = 0; i < 3; i++) {
                await page.clock.runFor(TURN);
                await page.evaluate(() => { renderLeaderboard(); updateQueueUI(); fvHead(); renderPlaque(); });   // drawn again, unchanged
            }
            await page.clock.runFor(HIT + 400);
            await settleArena(page);
            const after = await page.evaluate(src => {
                const { key, boxes } = new Function(`${src} return { key, boxes };`)();
                const out = { kept: [], lost: [], gone: 0, turn: arenaState.turn, plate: __vt(document.getElementById('status-plate')) };
                for (const m of window.__marks) {
                    // A log row, a banner or a chat card that's gone took its icons with it; elsewhere the area stays
                    if (!m.unit.isConnected) { out.gone++; continue; }
                    const same = boxes(m.unit).filter(i => key(i) === m.key);
                    if (!same.length) { out.gone++; continue; }   // changed: not drawn there any more
                    (same.includes(m.node) ? out.kept : out.lost).push(`${m.sel}: ${m.key}`);
                }
                return out;
            }, inPage);
            const areasKept = [...new Set(after.kept.map(k => k.split(':')[0]))];
            check(after.turn >= before.turn + 3 && after.plate !== before.plate && !after.lost.length && after.kept.length >= 30 && AREAS.slice(0, 8).every(a => areasKept.includes(a)),
                `icons that don't change keep their elements: of ${before.n} marked at turn ${before.turn}, ${after.kept.length} are the same elements at turn ${after.turn} (the plate went from «${before.plate}» to «${after.plate}»; ${after.gone} no longer drawn), in ${areasKept.join(', ')}`,
                `drawn again as new elements: ${after.lost.slice(0, 8).join(' | ')} (kept in: ${areasKept.join(', ')}; turn ${before.turn} → ${after.turn})`);
            // A changed icon is a new element: a new chip (the others keep theirs), another title's badge (the emblem stays)
            const chip = await page.evaluate(() => {
                const name = document.getElementById('name-p1').innerText.replace('@', '').trim(), box = document.getElementById('status-p1');
                const d = getDragonDB()[name], lvl = calculateLevelAndProgress(d.xp || 0).level;
                const draw = (buff, debuff) => updateStatusUI(name, lvl, d.drakeObj.type, d.title, { buff: buff.map(id => ({ id, left: 2, power: 1 })), debuff: debuff.map(id => ({ id, left: 2, power: 1 })) });
                draw(['rage'], ['burn']);   // two chips on the card
                const old = [...box.querySelectorAll('img.px-icon')];
                draw(['rage', 'shield'], ['burn']);   // and a buff it didn't show
                const now = [...box.querySelectorAll('img.px-icon')], added = now.find(i => i.dataset.icon === 'shield');
                return { kept: old.filter(i => now.includes(i)).length, old: old.map(i => i.dataset.icon), isNew: !!added && !old.includes(added), now: now.map(i => i.dataset.icon) };
            });
            check(chip.old.length === 2 && chip.isNew && chip.kept === 2, `a new chip (shield) gets a new icon; the card's other chips (${chip.old.join(', ')}) keep theirs`, JSON.stringify(chip));
            const badge = await page.evaluate(() => {
                const name = document.getElementById('name-p1').innerText.replace('@', '').trim(), d = getDragonDB()[name];
                const oldBadge = document.querySelector('#badge-container-p1 .px-badge'), oldEmblem = document.querySelector('#info-p1 img.px-icon');
                const was = oldBadge && oldBadge.dataset.frame;
                d.title = TITLES_DB.find(t => t.id === (d.title && d.title.id === 96 ? 98 : 96));
                updateFighterCard('p1', d, null);
                const newBadge = document.querySelector('#badge-container-p1 .px-badge');
                return { was, now: newBadge && newBadge.dataset.frame, glyph: newBadge && newBadge.querySelector('.px-glyph').dataset.icon,
                    replaced: !!oldBadge && !!newBadge && newBadge !== oldBadge && !oldBadge.isConnected, emblemKept: !!oldEmblem && document.querySelector('#info-p1 img.px-icon') === oldEmblem };
            });
            check(badge.replaced && badge.emblemKept, `another title's badge (${badge.was} → ${badge.now}, ${badge.glyph}) is a new element; the card's emblem stays the same one`, JSON.stringify(badge));
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 13. A new copy of an icon doesn't restart the ones already on screen =====
        // Every icon <img> has its own copy of its image (a blob: URL no other icon on the page shows), so a new icon starts its
        // own loop and the ones already there run on (a new icon taking a freed copy's URL starts that loop over too). With the loops on and at devicePixelRatio 2 (the ×2 icons drawn pixel for pixel), the
        // frame an icon shows is read off a screenshot, matched against Burn's 12 frames (all different, decoded in the page).
        // Each icon is read while mid-loop, the new copy goes in, and about 0.45 s later the icon must show the frame its own
        // loop has reached by then (± 1), not the new copy's (whose loop starts when it appears): Burn's chip on a fighter card
        // when the next log card shows Burn's tick, and Burn on a chat card when a new chat card shows it (with one image
        // shared by all copies, the chat card's icon started over with the new one's: the previous commit's page fails here)
        console.log('\nAn icon keeps its loop when a new copy of it appears');
        if (run(13)) {
            const { page, context, errors } = await open(browser, { lang: 'uk', dpr: 2, motion: true });
            await register(page, 'uk', [['kotyk_ua', 'red'], ['jade', 'green']]);
            for (const u of ['kotyk_ua', 'jade']) await say(page, u, '!черга');
            for (let i = 0; i < 240 && !(await page.evaluate(() => arenaState.kind === 'fight' && arenaState.turn >= 1)); i++) await page.clock.runFor(250);
            // Burn on a card: the next hit casts it (the test menu picker's own handler), until a card shows its chip
            let chip = null;
            for (let i = 0; i < 10 && !chip; i++) {
                if (!(await page.evaluate('forcedCast'))) await page.evaluate(() => setForcedCast('burn'));
                await page.clock.runFor(TURN);
                chip = await page.$('.fighter-card .status-item[data-fx="burn"] img.px-icon');
            }
            await page.evaluate(() => setForcedCast(''));
            await settleArena(page);
            const loopMs = await page.evaluate(() => ICONS_V2.burn.ms), N = await page.evaluate(async () => {
                const dec = new ImageDecoder({ data: await (await fetch(ICONS_V2.burn.anim)).arrayBuffer(), type: 'image/png' });
                await dec.tracks.ready;
                window.__burnFrames = [];
                for (let i = 0; i < dec.tracks.selectedTrack.frameCount; i++) {
                    const { image } = await dec.decode({ frameIndex: i });
                    const c = new OffscreenCanvas(image.displayWidth, image.displayHeight);
                    c.getContext('2d').drawImage(image, 0, 0);
                    image.close();
                    window.__burnFrames.push(c.getContext('2d').getImageData(0, 0, c.width, c.height).data);
                }
                return window.__burnFrames.length;
            });
            // The frame an icon shows now (its opaque pixels against each of Burn's frames), and when (the screenshot's middle)
            const read = async el => {
                const box = await el.boundingBox(), t0 = Date.now();
                const shot = await page.screenshot({ clip: box });
                const t = (t0 + Date.now()) / 2;
                const f = await page.evaluate(async src => {
                    const im = new Image(); im.src = src; await im.decode();
                    const c = new OffscreenCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0);
                    const d = g.getImageData(0, 0, im.width, im.height).data;
                    const err = window.__burnFrames.map(fr => { let e = 0; for (let i = 0; i < fr.length; i += 4) if (fr[i + 3] === 255) e += Math.abs(fr[i] - d[i]) + Math.abs(fr[i + 1] - d[i + 1]) + Math.abs(fr[i + 2] - d[i + 2]); return e; });
                    return err.indexOf(Math.min(...err));
                }, 'data:image/png;base64,' + shot.toString('base64'));
                return { f, t };
            };
            const gap = (a, b) => { const d = Math.abs(a - b) % N; return Math.min(d, N - d); };
            const midLoop = async el => { let r = await read(el); for (let i = 0; i < 25 && (r.f < 4 || r.f > 7); i++) { await page.waitForTimeout(60); r = await read(el); } return r; };
            // Each its own copy: the old icon and the new one each hold a live copy of their own, and show it
            const ownCopies = (a, b) => page.evaluate(([a, b]) => { if (typeof iconCopies === 'undefined') return false; const ca = iconCopies.get(a), cb = iconCopies.get(b); return !!ca && !!cb && ca.url !== cb.url && a.getAttribute('src') === ca.url && b.getAttribute('src') === cb.url; }, [a, b]);
            // A: Burn's chip on the card, the next log card with Burn's tick
            const card = { chip: !!chip };
            if (chip) {
                const r0 = await midLoop(chip);
                const old = await page.evaluateHandle(() => [...document.querySelectorAll('#log-list img.px-icon[data-icon="burn"]')]);
                let fresh = null;
                for (let i = 0; i < 4 && !fresh; i++) {
                    await page.clock.runFor(TURN);
                    const h = await page.evaluateHandle(old => [...document.querySelectorAll('#log-list img.px-icon[data-icon="burn"]')].find(i => !old.includes(i)) || null, old);
                    fresh = h.asElement();
                }
                const appeared = Date.now();
                await page.waitForTimeout(450);
                const r1 = await read(chip), g1 = fresh ? await read(fresh) : null;
                Object.assign(card, { f0: r0.f, f1: r1.f, loop: (r0.f + Math.round((r1.t - r0.t) / loopMs)) % N, fresh: g1 && g1.f, since: Math.round(r1.t - appeared),
                    sameNode: await chip.evaluate(el => el.isConnected && el === document.querySelector('.fighter-card .status-item[data-fx="burn"] img.px-icon')),
                    own: fresh ? await ownCopies(chip, fresh) : false });
            }
            check(card.chip && card.fresh !== null && card.sameNode && card.own && gap(card.f1, card.loop) <= 1 && gap(card.f1, card.fresh) >= 2,
                `Burn's chip on the card keeps its loop when a new log card shows Burn: frame ${card.f0} → ${card.f1} (its loop: ${card.loop}), the new card's icon at ${card.fresh}, ${card.since} ms after it appeared; each its own copy, the chip the same element`,
                JSON.stringify(card));
            // B: Burn on a chat card, a new chat card with Burn 1.5 s later
            await page.evaluate(() => addInfo(`<div class="ic-head"><span>${pxIcon('burn')} 1</span></div>`, 'note'));
            await page.waitForTimeout(1500);
            const first = await page.$('#info-feed .info-card:first-child img.px-icon[data-icon="burn"]');
            const a0 = await midLoop(first);
            await page.evaluate(() => addInfo(`<div class="ic-head"><span>${pxIcon('burn')} 2</span></div>`, 'note'));
            const added = Date.now();
            await page.waitForTimeout(450);
            const second = await page.$('#info-feed .info-card:first-child img.px-icon[data-icon="burn"]');
            const a1 = await read(first), n1 = await read(second);
            const chat = { f0: a0.f, f1: a1.f, loop: (a0.f + Math.round((a1.t - a0.t) / loopMs)) % N, fresh: n1.f, since: Math.round(a1.t - added), own: await ownCopies(first, second) };
            check(chat.own && gap(chat.f1, chat.loop) <= 1 && gap(chat.f1, chat.fresh) >= 2,
                `Burn on a chat card keeps its loop when a new chat card shows Burn: frame ${chat.f0} → ${chat.f1} (its loop: ${chat.loop}), the new card's icon at ${chat.fresh}, ${chat.since} ms after it appeared; each its own copy`,
                JSON.stringify(chat));
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // ===== 14. The notes a title fires =====
        // When an own-icon title's ability fires, its note shows the title's icon with the ability's words; everyone else, the
        // pair title's holder too, shows the ability's glyph. On painted cards (titleNoteCases), then through two real fights:
        // the record the fight fills is what reaches the cards, the own-icon titles first and then their pairs
        console.log('\nThe notes a title fires');
        if (run(14)) for (const lang of ['uk', 'en']) {
            const { page, context, errors } = await open(browser, { lang });
            const r = await page.evaluate(() => titleNoteCases());
            const icon = s => (/^\[(\w+)\]/.exec(s || '') || [])[1];
            const bad = [];
            for (const c of r.cases) {
                const where = `${c.note} (${c.side}'s title)`;
                if (c.icon === c.note) bad.push(`${where}: title ${c.ownId} has no own icon`);
                for (const [who, side, want, words] of [['own', c.own, c.icon, c.words], ['pair', c.pair, c.note, c.pairWords]]) {
                    if (icon(side.full) !== want) bad.push(`${where}: ${who} title's chip is «${side.full}», not ${want}`);
                    if (words && !side.full.includes(words)) bad.push(`${where}: ${who} title's chip «${side.full}» doesn't say «${words}»`);
                    if (c.note === 'coin') continue;   // compact already: a glyph and a number
                    if (side.ci !== want) bad.push(`${where}: ${who} title's compact form is ${side.ci}, not ${want}`);
                    if (side.group && !(side.isCompact && icon(side.compact) === want && !(words && side.compact.replace(/^\[\w+\]/, '').includes(words)))) bad.push(`${where}: ${who} title's compact chip is «${side.compact}», not ${want} with no words`);
                }
            }
            check(!bad.length, `[${lang}] each note: the own-icon title's holder gets that icon, full and compact, with the ability's words, the pair title's holder the ability's glyph (${r.cases.length} cases, either title on the far side): «${r.cases.find(c => c.note === 'thorns').own.full}» / «${r.cases.find(c => c.note === 'thorns').pair.full}»`, bad.slice(0, 6).join(' | '));
            const cat = r.cases.find(c => c.note === 'cat'), bugWord = lang === 'uk' ? 'баг' : 'bug', catWord = lang === 'uk' ? 'кіт' : 'cat';
            check(cat.own.full === `[spaghettiCode] ${bugWord}` && cat.pair.full === `[cat] ${catWord}`, `[${lang}] 194's card says «${cat.own.full}», the pair title's «${cat.pair.full}»`, JSON.stringify({ own: cat.own, pair: cat.pair }));
            check(r.sneaky.full === r.sneakyWords && r.sneaky.ci === 'pierce', `[${lang}] a sneaky attack by 97's holder keeps the spear: «${r.sneaky.full}»`, JSON.stringify(r.sneaky));
            check(r.immune.full === r.immuneWords && r.immune.ci === 'immune', `[${lang}] the White Dragon's immunity keeps the immune glyph: «${r.immune.full}»`, JSON.stringify(r.immune));
            check(r.coffee.glyph === 'firstCoffee' && r.coffee.frame === 'mythic' && r.sunrise.glyph === 'opening', `[${lang}] the opening banner for 182 shows firstCoffee, the pair title's the ability's glyph: «${r.coffee.text}»`, JSON.stringify({ coffee: r.coffee, sunrise: r.sunrise }));
            const crowded = [...r.crowded.left.out, ...r.crowded.right.out];
            check(!crowded.length && r.crowded.left.got.some(g => g.startsWith('[chaosFirework]')) && r.crowded.left.got.some(g => g.startsWith('[grumpyHedgehog]')),
                `[${lang}] a crowded card with own-icon titles shows every item, no two alike: ${r.crowded.left.got.filter(g => /chaosFirework|grumpyHedgehog/.test(g)).join(', ')} (${r.crowded.left.compact} compact)`, JSON.stringify({ crowded, got: r.crowded.left.got }));
            // Two real fights: the attacker's coin flip and the defender's thorns fire on every damaging hit
            await register(page, lang, [['kotyk_ua', 'red'], ['jade', 'green']]);
            const fought = {};
            for (const [label, thorns, coin] of [['own', 184, 190], ['pair', 183, 189]]) {
                await page.evaluate(([thorns, coin]) => { const db = getDragonDB(), T = id => TITLES_DB.find(x => x.id === id); db.kotyk_ua.title = T(thorns); db.jade.title = T(coin); saveDragonDB(db); }, [thorns, coin]);
                await page.clock.runFor(60000);   // past the last fight's result screen
                for (const u of ['kotyk_ua', 'jade']) await say(page, u, cmd(lang, '!черга', '!queue'));
                for (let i = 0; i < 240 && !(await page.evaluate(() => isBattleRunning)); i++) await page.clock.runFor(250);
                for (let i = 0; i < 40 && await page.evaluate(() => isBattleRunning); i++) await page.clock.runFor(TURN);
                await page.clock.runFor(HIT + 400);
                fought[label] = await page.evaluate(() => [...new Set([...document.querySelectorAll('#log-list .lc-l2 img.px-icon')].map(i => i.dataset.icon))]);
            }
            check(fought.own.includes('grumpyHedgehog') && fought.own.includes('schrodPotato') && !fought.own.includes('thorns') && !fought.own.includes('coin')
                && fought.pair.includes('thorns') && fought.pair.includes('coin') && !fought.pair.includes('grumpyHedgehog') && !fought.pair.includes('schrodPotato'),
                `[${lang}] real fights: 184's thorns and 190's coin flip show their own icons, 183's and 189's the abilities' glyphs`, JSON.stringify(fought));
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // The notes of the abilities of titles 205–294 have no glyph of their own: the badge of the title that fired them, its
        // own icon for the Legendary titles (205–244), else the stand-in. On painted cards, in full and compact, in both
        // languages (design/icons/test.js also lends an own icon to a stand-in's title)
        console.log('\nThe notes of the new abilities');
        if (run(15)) for (const lang of ['uk', 'en']) {
            const { page, context, errors } = await open(browser, { lang });
            const r = await page.evaluate(() => abilityNoteCases());
            const bad = r.cases.flatMap(c => [
                ...(c.full === c.want ? [] : [`${c.key} (${c.side}): the chip reads «${c.full}», not «${c.want}»`]),
                ...(!c.group || (c.isCompact && c.compact === c.wantCompact) ? [] : [`${c.key} (${c.side}): compact it reads «${c.compact}», not «${c.wantCompact}»`]),
            ]);
            check(!bad.length, `[${lang}] each new note on a card: the title's badge glyph and the ability's words; compact, a Legendary title's own icon and the number, a stand-in its words too (${r.cases.length} notes, ${r.cases.filter(c => c.own).length} on own icons, ${r.cases.filter(c => c.group).length} compacted)`, bad.slice(0, 5).join(' | '));
            const crowded = [...r.crowded.left.out, ...r.crowded.right.out];
            check(!crowded.length && r.crowded.left.compact + r.crowded.right.compact > 0, `[${lang}] crowded cards of stand-ins show every item, no two alike, though the notes wear the same heart (${r.crowded.left.compact} + ${r.crowded.right.compact} compact)`, crowded.slice(0, 5).join(' | '));
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // The Meme abilities as the stream sees them, in real fights with fixed dice (window.__dice, then 0.99: no crit, no block,
        // no cast). Rolls in the fight's order: `before` (Синій екран, AFK's draw), the attack's five, `after`, the cast
        console.log('\nThe Meme abilities, as the stream sees them');
        const ROLLS = (o = {}) => [...(o.before || []), 0.5, 0.5, 0.5, 0.99, o.block ?? 0.99, ...(o.after || []), 0.99];
        const memePage = async (lang, motion, users = [['kotyk_ua', 'red'], ['jade', 'green']]) => {
            const { page, context, errors } = await open(browser, { lang, motion });
            await page.evaluate(() => { const real = Math.random; window.__dice = null; Math.random = () => window.__dice ? (window.__dice.length ? window.__dice.shift() : 0.99) : real(); });
            await register(page, lang, users);
            // A fight between the two with these titles: the last one played out first, then the coin flip keeps kotyk_ua first
            const fight = async (a, b) => {
                await page.evaluate(() => { window.__dice = null; });
                for (let i = 0; i < 40 && await page.evaluate(() => isBattleRunning); i++) await page.clock.runFor(TURN);
                await page.evaluate(([a, b]) => { const db = getDragonDB(), T = id => TITLES_DB.find(x => x.id === id); db.kotyk_ua.title = T(a); db.jade.title = T(b); saveDragonDB(db); }, [a, b]);
                await page.clock.runFor(60000);   // past the last fight's result screen
                await page.evaluate(() => { window.__dice = [0.9]; });
                for (const u of ['kotyk_ua', 'jade']) await say(page, u, cmd(lang, '!черга', '!queue'));
                for (let i = 0; i < 240 && !(await page.evaluate(() => isBattleRunning)); i++) await page.clock.runFor(250);
            };
            // Turn n with these rolls, read just after its step 2. Not settled: a settled arena has no flash left to read
            const turn = async (n, rolls) => {
                await page.evaluate(q => { window.__dice = q; }, rolls);
                await toFightTime(page, n * TURN + 1);
                await page.clock.runFor(HIT + 100);
                const s = await page.evaluate(arenaNow);
                return { s, card: s.cards.find(c => c.turn === n) || {} };
            };
            const hp = p => page.evaluate(p => Number(document.getElementById(`hp-text-${p}`).innerText.split('/')[0]), p);
            // A fighter card's looks, and every block's place (a fixed height means they never move)
            const looks = p => page.evaluate(p => {
                const c = document.getElementById(`card-${p}`), crash = c.querySelector('.fx-crash'), afk = c.querySelector('.fx-afk'), cs = e => getComputedStyle(e);
                return { crash: c.classList.contains('crash'), afk: c.classList.contains('afk'), crashText: crash.textContent, crashOpacity: +cs(crash).opacity, crashAnims: crash.getAnimations().length,
                         crashBack: cs(crash).backgroundColor, afkText: afk.textContent, afkOpacity: +cs(afk).opacity, sprite: cs(c.querySelector('.drake-sprite')).filter,
                         boxes: [...c.children].filter(x => !x.classList.contains('fx-layer')).map(x => { const b = x.getBoundingClientRect(); return `${x.className}:${Math.round(b.top)}:${Math.round(b.height)}`; }).join(' ') };
            }, p);
            return { page, context, errors, fight, turn, hp, looks };
        };
        if (run(16)) for (const lang of ['uk', 'en']) {
            const { page, context, errors, fight, turn, hp, looks } = await memePage(lang, false);
            const W = await page.evaluate(() => FV_TEXT[currentLang]);
            // 404: the number on the card and the pop say «404»; nothing is lost
            await fight(275, 1);
            const full2 = await hp('p2');
            const v = await turn(1, ROLLS({ after: [0.01] }));
            check(v.card.num === '404' && v.s.p2.pops.includes('404') && await hp('p2') === full2 && v.card.l2.includes(`[hp] ${W.notFound}`),
                `[${lang}] 404: «404» on the card and the pop, instead of the number, and the title's note «${W.notFound}»`, JSON.stringify({ card: v.card, pops: v.s.p2.pops }));
            // Синій екран: the card's «:(», the lost turn, the fighter card; under reduced motion nothing flashes
            await fight(278, 1);
            const calm = await looks('p1');
            const crashed = await turn(1, [0.01]);
            const b = await looks('p1');
            check(crashed.card.move === ':(' && crashed.card.num === '' && crashed.card.l2 === `[hp] ${W.crashed} ${W.turnLost}` && !crashed.s.cells.some(c => c.kind === 'ko'),
                `[${lang}] Синій екран: the log card says «:(», «${W.crashed} ${W.turnLost}», with no number, and nobody is knocked out`, JSON.stringify({ card: crashed.card, cells: crashed.s.cells }));
            check(b.crash && b.crashText === ':(' && b.crashOpacity === 1 && b.crashAnims === 0 && b.crashBack === 'rgba(0, 0, 0, 0)' && b.boxes === calm.boxes,
                `[${lang}] Синій екран under prefers-reduced-motion: a calm «:(» on the fighter card, nothing flashing, no block moved`, JSON.stringify(b));
            await page.screenshot({ path: `tests/screenshots/fightview-meme-crash-${lang}.png` });
            await turn(2, ROLLS());
            check(!(await looks('p1')).crash, `[${lang}] Синій екран: the next turn takes it off the card`, JSON.stringify(await looks('p1')));
            // AFK: its turn 2 (the third of the fight); grey with «AFK» until its next turn, then ×3
            await fight(284, 1);
            const hit1 = (await turn(1, ROLLS({ before: [0] }))).card.num;
            await turn(2, ROLLS());
            const calm2 = await looks('p1');
            const gone = await turn(3, []);
            const g = await looks('p1');
            check(gone.card.move === 'AFK' && gone.card.l2 === `[hp] ${W.away} ${W.turnSkipped}` && gone.card.num === '' && !gone.s.cells.some(c => c.kind === 'ko'),
                `[${lang}] AFK: the log card says «AFK», «${W.away} ${W.turnSkipped}», with no number`, JSON.stringify(gone.card));
            check(g.afk && g.afkText === 'AFK' && g.afkOpacity === 1 && /grayscale/.test(g.sprite) && g.boxes === calm2.boxes, `[${lang}] AFK: the fighter card greys out with «AFK», no block moved`, JSON.stringify(g));
            await page.screenshot({ path: `tests/screenshots/fightview-meme-afk-${lang}.png` });
            await turn(4, ROLLS());
            check((await looks('p1')).afk, `[${lang}] AFK: still away through the opponent's turn`, JSON.stringify(await looks('p1')));
            const back = await turn(5, ROLLS());
            const num = s => Math.abs(Number(s));
            check(!(await looks('p1')).afk && back.card.l2.includes(`[hp] ${W.afkBack} ×3`) && Math.abs(num(back.card.num) - 3 * num(hit1)) <= 2,
                `[${lang}] AFK: back on its next turn, «${W.afkBack} ×3», and the hit shows it (${hit1} then ${back.card.num})`, JSON.stringify(back.card));
            // Лаг: the number waits, the stuck hit lands a turn late, on the target
            await fight(287, 1);
            const before = await hp('p2');
            const stuck = await turn(1, ROLLS({ after: [0.01] }));
            check(stuck.card.num === '…' && stuck.s.p2.pops.includes('…') && await hp('p2') === before && stuck.card.l2.includes(`[hp] ${W.lagHang}`),
                `[${lang}] Лаг: «…» instead of the number, «${W.lagHang}», and the target's HP stays`, JSON.stringify(stuck.card));
            await turn(2, ROLLS());
            const landed = await turn(3, ROLLS());
            const late = Number((landed.card.l2.match(new RegExp(`${W.lagLand} -(\\d+)`)) || [])[1]), lost = before - await hp('p2');
            check(late > 0 && lost === late + num(landed.card.num) && landed.s.p2.pops.includes(`-${late}`),
                `[${lang}] Лаг: a turn late «${W.lagLand} -${late}» on the card and on the target, then its normal hit (${landed.card.num})`, JSON.stringify({ card: landed.card, lost, pops: landed.s.p2.pops }));
            // A stuck hit that knocks the target out: the target is out, not the one whose turn it was
            await fight(287, 1);
            await turn(1, ROLLS({ after: [0.01] }));
            await page.evaluate(() => { battleFx.jade.debuff.push({ id: 'burn', left: 1, power: 18.5 }); });
            await turn(2, ROLLS({ block: 0.01 }));
            const ko = await turn(3, []);
            await page.clock.runFor(HIT);
            const end = await page.evaluate(arenaNow);
            const koCell = end.cells.find(c => c.kind === 'ko');
            check(ko.card.move === W.lagLand && /^-\d+$/.test(ko.card.num) && koCell && koCell.text.includes('@jade') && !end.cells.some(c => c.kind === 'ko' && c.text.includes('@kotyk_ua')),
                `[${lang}] Лаг: a stuck hit that knocks out shows as a card, and the target is the one knocked out`, JSON.stringify({ card: ko.card, cells: end.cells }));
            // Підзарядка: the banner and the meter on the card
            await fight(223, 1);
            const start = await page.evaluate(() => ({ banners: [...document.querySelectorAll('#log-feed .log-banner')].map(__vt), pips: document.querySelectorAll('#card-p1 .pm-pip.on').length, foe: document.querySelectorAll('#card-p2 .pm-pip.on').length }));
            check(start.banners.some(x => x.includes('2/5') && x.includes('@kotyk_ua')) && start.pips === 2 && start.foe === 0,
                `[${lang}] Підзарядка: the fight's banner says 2/5, and the card's meter shows it`, JSON.stringify(start));
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }
        // With motion allowed the fighter card does flash blue
        if (run(16)) {
            const { page, context, errors, fight, turn, looks } = await memePage('uk', true);
            await fight(278, 1);
            await turn(1, [0.01]);
            const f = await looks('p1');
            check(f.crash && f.crashAnims === 1 && f.crashBack !== 'rgba(0, 0, 0, 0)', 'Синій екран with motion allowed: the fighter card flashes blue', JSON.stringify(f));
            // The flash is over in 1.4 s of real time: the screenshot holds it at its height
            await page.evaluate(() => { const x = document.querySelector('#card-p1 .fx-crash').getAnimations()[0]; x.pause(); x.currentTime = 500; });
            await page.screenshot({ path: 'tests/screenshots/fightview-meme-crash-motion.png' });
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // Помаранчевий as the stream sees it, in real fights with fixed dice
        console.log('\nПомаранчевий, as the stream sees it');
        if (run(17)) for (const lang of ['uk', 'en']) {
            const { page, context, errors, fight, turn, hp, looks } = await memePage(lang, false, [['kotyk_ua', 'orange'], ['jade', 'red']]);
            const word = (await page.evaluate(() => __fvv('heat')));   // the note as it shows: its icon and its word
            const heatRow = () => page.evaluate(() => __vt(document.querySelector('#card-p1 .pm-heat')));
            const glyph = word.split(' ')[0];
            await fight(1, 1);
            const start = await heatRow(), calm = await looks('p1');
            check(start === `${glyph} 0/8` && !(await page.evaluate(() => !!document.querySelector('#card-p2 .pm-heat'))), `[${lang}] the fight starts with ${start} on its card, and none on the other`, start);
            await turn(1, ROLLS());
            const one = await heatRow(), after = await looks('p1');
            check(one === `${glyph} 1/8` && after.boxes === calm.boxes, `[${lang}] an attack adds heat (${one}), and no block of the card moves`, JSON.stringify([one, calm.boxes, after.boxes]));
            const before = await hp('p2');
            const ticked = await turn(2, ROLLS({ before: [0.99] }));
            check(ticked.card.l2.includes(`${word} -1`) && ticked.s.p2.pops.includes('-1') && before - await hp('p2') === 1,
                `[${lang}] the tick: «${word} -1» on the opponent's log card and a pop on its fighter card`, JSON.stringify({ card: ticked.card, pops: ticked.s.p2.pops }));
            // A blocked attack adds no heat, and a blocked tick shows as a block
            await turn(3, ROLLS({ block: 0.01 }));
            const stillOne = await heatRow(), blockedHp = await hp('p2'), blockWord = await page.evaluate(() => __fvv('block'));
            const stopped = await turn(4, ROLLS({ before: [0.01] }));
            check(stillOne === `${glyph} 1/8` && stopped.card.l2.includes(`${word} ${blockWord}`) && stopped.s.p2.pops.includes('0') && await hp('p2') === blockedHp,
                `[${lang}] a blocked attack adds no heat (${stillOne}), and a blocked tick shows as a block: «${word} ${blockWord}», a 0 on the card, no HP lost`, JSON.stringify({ stillOne, card: stopped.card, pops: stopped.s.p2.pops }));
            // A tick that knocks out: the knockout cell says what did it (a Burn that leaves 3 HP, then 8 heat at 0.5% each)
            const foeMax = await page.evaluate(() => { const [now, max] = document.getElementById('hp-text-p2').innerText.split('/').map(Number); battleFx.kotyk_ua.heat = 8; battleFx.jade.debuff.push({ id: 'burn', left: 1, power: (now - 3) / max * 100 / 5 }); return max; });
            await turn(5, ROLLS({ block: 0.01 }));
            await page.evaluate(() => { battleFx.kotyk_ua.heat = 8; });
            await turn(6, []);
            await page.clock.runFor(HIT);
            const end = await page.evaluate(arenaNow), koCell = end.cells.find(c => c.kind === 'ko');
            check(koCell && koCell.text.includes('@jade') && koCell.text.includes(`${word} -${Math.round(foeMax * 0.04)}`), `[${lang}] a tick that knocks out shows on the knockout cell`, JSON.stringify(end.cells));
            // Виверження: ×1.85 at 7 heat, the heat dropping to 3
            await fight(1, 1);
            await page.evaluate(() => { battleFx.kotyk_ua.meter = 5; battleFx.kotyk_ua.heat = 7; });
            const erupted = await turn(1, ROLLS());
            check(erupted.card.ult.includes(await page.evaluate(() => CLASS_ULTIMATES.eruption.name[currentLang])) && erupted.card.l2.includes('×1.85') && erupted.card.l2.includes(`${word} 7 → 3`) && await heatRow() === `${glyph} 3/8`,
                `[${lang}] Виверження: its head, ×1.85 and «${word} 7 → 3» on the card, and 3/8 on the fighter card`, JSON.stringify(erupted.card));
            // The White Drake: the tick goes to the scales, and it isn't damage she dealt
            await page.evaluate(() => { const db = getDragonDB(); db.jade.drakeObj = DRAKE_TYPES.find(d => d.type === WHITE_DRAKE_TYPE); saveDragonDB(db); });
            await fight(1, WHITE_STEEL);
            const scalesBefore = await page.evaluate(() => { battleFx.kotyk_ua.heat = 8; return battleFx.jade.scales.now; });
            const hpBefore = await hp('p2');
            await turn(1, ROLLS({ block: 0.01 }));
            const burned = await turn(2, ROLLS({ before: [0.99], block: 0.01 }));
            const seen = await page.evaluate(() => ({ now: battleFx.jade.scales.now, dealt: fv.stats.jade.dmg, biggest: fv.stats.jade.max }));
            check(seen.now < scalesBefore && await hp('p2') === hpBefore && seen.dealt === 0 && seen.biggest === 0 && burned.card.l2.includes(word),
                `[${lang}] against the White Drake the tick takes her scales (${scalesBefore} → ${seen.now}), and it doesn't count as damage she dealt`, JSON.stringify({ seen, card: burned.card }));
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // Вишневий as the stream sees it, in real fights with fixed dice
        console.log('\nВишневий, as the stream sees it');
        if (run(18)) for (const lang of ['uk', 'en']) {
            const { page, context, errors, fight, turn, hp, looks } = await memePage(lang, false, [['kotyk_ua', 'cherry'], ['jade', 'red']]);
            const frenzyRow = () => page.evaluate(() => __vt(document.querySelector('#card-p1 .pm-frenzy')));
            const word = await page.evaluate(() => FV_TEXT[currentLang].frenzy), name = id => page.evaluate(id => EFFECTS[id].name[currentLang], id);
            const glyph = await page.evaluate(() => iconOf('frenzy'));
            // A share of its max HP lost at the start of its next turn, through a Burn that ends there
            const lose = share => page.evaluate(share => { battleFx.kotyk_ua.debuff.push({ id: 'burn', left: 1, power: share * 100 / 5 }); }, share);
            await fight(1, 1);
            const calm = await looks('p1');
            check(await frenzyRow() === '', `[${lang}] no frenzy on the card at full HP`, await frenzyRow());
            await lose(0.6);
            const hurt = await turn(1, ROLLS());
            const shown = await frenzyRow(), after = await looks('p1');
            check(shown === `[${glyph}] +20%` && hurt.card.l2.includes(`[${glyph}] ${word} +20%`) && after.boxes === calm.boxes,
                `[${lang}] 60% of its HP lost: «${shown}» on the fighter card, «${word} +20%» on the log card, and no block moves`, JSON.stringify({ shown, card: hurt.card, calm: calm.boxes, after: after.boxes }));
            // Кров за кров and Кровотеча: their numbers on the card and as pops
            await turn(2, ROLLS());
            await page.evaluate(() => { battleFx.kotyk_ua.buff.push({ id: 'bloodprice', left: 2, power: 1 }); battleFx.kotyk_ua.debuff.push({ id: 'bleed', left: 3, power: 1 }); });
            const both = await turn(3, ROLLS());
            const bp = await name('bloodprice'), bl = await name('bleed');
            const healed = (both.card.l2.match(new RegExp(`${bp} \\+(\\d+)`)) || [])[1], bled = (both.card.l2.match(new RegExp(`${bl} -(\\d+)`)) || [])[1];
            check(healed > 0 && bled > 0 && both.s.p1.pops.includes(`+${healed}`) && both.s.p1.pops.includes(`-${bled}`),
                `[${lang}] «${bp} +${healed}» and «${bl} -${bled}» on the log card, and as pops on its own fighter card`, JSON.stringify({ card: both.card, pops: both.s.p1.pops }));
            // Кровотеча knocks its own drake out: a Burn that leaves 2 HP, then an attack that lands nothing
            await turn(4, ROLLS());
            await page.evaluate(() => { const [now, max] = document.getElementById('hp-text-p1').innerText.split('/').map(Number); battleFx.kotyk_ua.debuff.push({ id: 'burn', left: 1, power: (now - 2) / max * 100 / 5 }); });
            await turn(5, ROLLS({ block: 0.01 }));
            await page.clock.runFor(HIT);
            const end = await page.evaluate(arenaNow), koCell = end.cells.find(c => c.kind === 'ko');
            check(koCell && koCell.text.includes('@kotyk_ua') && end.kind === 'result', `[${lang}] Кровотеча knocks its own drake out, after its attack`, JSON.stringify({ kind: end.kind, cells: end.cells }));
            // Останній подих: ×2.5 below a quarter of its HP
            await fight(1, 1);
            await page.evaluate(() => { battleFx.kotyk_ua.meter = 5; });
            await lose(0.8);
            const last = await turn(1, ROLLS());
            check(last.card.ult.includes(await page.evaluate(() => CLASS_ULTIMATES.lastbreath.name[currentLang])) && last.card.l2.includes('×2.5'), `[${lang}] Останній подих: its head and ×2.5 on the card`, JSON.stringify(last.card));
            if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
            await context.close();
        }

        // Бірюзовий as the stream sees it, in real fights with fixed dice
        console.log('\nБірюзовий, as the stream sees it');
        if (run(19)) for (const lang of ['uk', 'en']) {
            const { page, context, errors, fight, turn, hp, looks } = await memePage(lang, false, [['jade', 'red'], ['kotyk_ua', 'turquoise']]);
            const word = await page.evaluate(() => FV_TEXT[currentLang].nacre), glyph = await page.evaluate(() => iconOf('nacre'));
            const layerRow = () => page.evaluate(() => __vt(document.querySelector('#card-p2 .pm-nacre')));
            // kotyk_ua, the first in `fight`, attacks first: Бірюзовий is on the left there, so its row is read by name
            const row = () => page.evaluate(() => { const p = document.getElementById('name-p1').textContent.includes('kotyk_ua') ? 'p1' : 'p2'; return __vt(document.querySelector(`#card-${p} .pm-nacre`)); });
            await fight(1, 1);
            const side = await page.evaluate(() => document.getElementById('name-p1').textContent.includes('kotyk_ua') ? 'p1' : 'p2');
            const calm = await looks(side);
            check(await row() === `[${glyph}] 0/8`, `[${lang}] the fight starts with ${await row()} on its card`, await row());
            await turn(1, ROLLS());
            const hit = await turn(2, ROLLS());
            const one = await row(), after = await looks(side);
            check(one === `[${glyph}] 1/8` && after.boxes === calm.boxes && !hit.card.l2.includes(word), `[${lang}] a hit adds a layer (${one}), not cut by it, and no block of the card moves`, JSON.stringify({ one, card: hit.card, calm: calm.boxes, after: after.boxes }));
            await turn(3, ROLLS());
            const cut = await turn(4, ROLLS());
            check(cut.card.l2.includes(`[${glyph}] ${word} −3%`) && await row() === `[${glyph}] 2/8`, `[${lang}] the next hit shows the cut: «${word} −3%»`, JSON.stringify(cut.card));
            // Чиста вода: named on the card with what it took off
            await page.evaluate(() => { battleFx.kotyk_ua.debuff.push({ id: 'burn', left: 3, power: 1 }, { id: 'mark', left: 1, power: 1 }); setForcedCast('clearwater'); });
            const washed = await turn(5, ROLLS());
            const names = await page.evaluate(() => [__fxv('clearwater'), __fxv('burn', true), __fxv('mark', true)]);
            check(washed.card.l2.includes(names[0]) && washed.card.l2.includes(names[1]) && washed.card.l2.includes(names[2]) && !(await page.evaluate(() => battleFx.kotyk_ua.debuff.length)),
                `[${lang}] Чиста вода on the log card: «${names.join(' ')}», and nothing left on the fighter card`, JSON.stringify(washed.card));
            // Приплив: the heal and the layers on its card, and they stay
            await fight(1, 1);
            await page.evaluate(() => { battleFx.kotyk_ua.meter = 5; battleFx.kotyk_ua.layers = 6; battleFx.kotyk_ua.debuff.push({ id: 'burn', left: 1, power: 10 }); });
            const tide = await turn(1, ROLLS());
            check(tide.card.ult.includes(await page.evaluate(() => CLASS_ULTIMATES.hightide.name[currentLang])) && tide.card.num.startsWith('+') && tide.card.l2.includes(`${word} 6/8`) && await row() === `[${glyph}] 6/8`,
                `[${lang}] Приплив: its head, the heal as the number, «${word} 6/8», and the layers stay`, JSON.stringify(tide.card));
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
