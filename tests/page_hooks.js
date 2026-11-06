// Shared page set-up for the Playwright tests: runs in the page before the game's own script.
//  - Math.random is replaced with a seeded generator (mulberry32), so every run plays the same fights
//  - every line of the fight's text record (#battle-log) is kept in window.__fightLog
//  - the fight's events are kept in window.__fightEvents: each fight's start (who, ranked or not), every HP update and
//    each fight's end (both HPs). This is what the fights *did*, independent of how the log looks, so two versions of
//    the page can be compared: same events = same fights.
//  - window.__fights: for each fight, the game time it started (so tests can step to exact turn times)
//  - window.__vt(el): what an element shows, as text: the overlay draws pixel icons, not emoji, so each icon reads as
//    [its id] (an effect chip «[mark] Мітку», the meter's «[firestorm] ГОТОВО»), a title badge as its glyph's (its frame is
//    the rarity, in data-frame: «[immune] Абсолютний Дрейк»), whitespace collapsed. Like innerText,
//    items that are laid out apart (blocks, flex and grid items) are read apart, but the text is as written (no
//    text-transform). Checks that once looked for an emoji on screen look for its icon this way. window.__fxv(id, acc):
//    an effect as a chip shows it (its icon and its name; acc: the name after a verb, in the accusative)
function pageInit(seed) {
    window.__vt = el => {
        if (!el) return '';
        const parts = [];
        const apart = e => {
            if (!e.isConnected) return false;
            const d = getComputedStyle(e).display, p = e.parentElement && getComputedStyle(e.parentElement).display;
            return (!!d && !d.startsWith('inline') && d !== 'contents') || /flex|grid/.test(p || '');
        };
        const walk = n => {
            if (n.nodeType === 3) { parts.push(n.nodeValue); return; }
            if (n.nodeType !== 1) return;
            if (n.matches('.px-badge')) { const g = n.querySelector('img.px-glyph'); parts.push(` [${g ? g.dataset.icon : ''}] `); return; }
            if (n.matches('img.px-icon')) { parts.push(` [${n.dataset.icon}] `); return; }
            const sep = n !== el && apart(n);
            if (sep) parts.push(' ');
            n.childNodes.forEach(walk);
            if (sep) parts.push(' ');
        };
        walk(el);
        return parts.join('').replace(/\s+/g, ' ').trim();
    };
    window.__fxv = (id, acc = false) => `[${id}] ${acc && currentLang === 'uk' ? EFFECTS[id].acc : EFFECTS[id].name[currentLang]}`;
    // The game's own overlay text for a key, as __vt reads it: __fvv (FV_TEXT, the fight view), __tv (TOURNEY_TEXT)
    const shown = html => { const d = document.createElement('div'); d.innerHTML = html; return window.__vt(d); };
    window.__fvv = (key, vars) => shown(fvH(key, vars));
    window.__tv = (key, vars) => shown(tH(key, vars));
    let a = seed >>> 0;
    Math.random = () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    window.__fightLog = [];
    window.__fightEvents = [];
    window.__fights = [];
    document.addEventListener('DOMContentLoaded', () => {
        const log = document.getElementById('battle-log');
        if (log) new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => window.__fightLog.push(n.textContent)))).observe(log, { childList: true });
        const wrap = (name, record) => {
            const orig = window[name];
            if (typeof orig !== 'function') return;
            window[name] = function (...args) { record(...args); return orig.apply(this, args); };
        };
        wrap('runBattle', (p1, c1, p2, c2, ranked) => { window.__fights.push({ t: Date.now(), p1, p2, ranked }); window.__fightEvents.push(`B ${p1} ${p2} ${!!ranked}`); });
        wrap('updateUIHP', (h1, m1, h2, m2) => window.__fightEvents.push(`H ${Math.round(h1)}/${m1} ${Math.round(h2)}/${m2}`));
        wrap('finishBattle', (p1, p2, h1, h2) => window.__fightEvents.push(`F ${p1.name} ${Math.round(h1)} ${p2.name} ${Math.round(h2)}`));
    });
}

module.exports = { pageInit };
