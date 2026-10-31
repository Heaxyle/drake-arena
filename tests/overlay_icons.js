// Shared by the Playwright tests: the overlay shows pixel icons, never emoji.
//
//   const issues = await overlayIconIssues(page)   // [] when the overlay is clean
//
// Walks what's on the overlay (#stage, without the demo controls #cam-col, which OBS never shows, and without the hidden
// text record #battle-log, which keeps its emoji for the tests and the sims) and reports:
//   - any emoji in its text, in a CSS ::before / ::after, or in an <img>-less icon (alt text and title tooltips aren't
//     drawn, so they don't count): emoji are only in the hidden record and the play-log export
//   - any pixel icon (img.px-icon) not drawn at a whole-number multiple of its drawing's size (data-n), or drawn
//     differently across and down, or not from its own drawing (its image isn't n×n), or without pixelated scaling
//   - any icon the game asked for that the set doesn't have (pxIcon's iconsMissing)
// Run it after settleArena (animations finished: a pop-in or a slam mid-way scales everything in it).
//
//   await overlaySelfTest(page)   // plants an emoji, an icon at ×1.5, a squeezed icon and an icon over its words: each must be reported
function overlayScan() {
    const EMOJI = /(?:\p{Extended_Pictographic}|✦)/u;
    const stage = document.getElementById('stage');
    const skip = el => !!el.closest('#cam-col, #battle-log');
    const shown = el => {
        for (let e = el; e && e !== document.body; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        }
        return true;
    };
    const where = el => {
        const id = el.closest('[id]');
        return `${id ? '#' + id.id : ''} ${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`.trim();
    };
    const out = [];
    const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || skip(el) || !EMOJI.test(n.nodeValue) || !shown(el)) continue;
        out.push(`emoji in ${where(el)}: «${n.nodeValue.trim().slice(0, 60)}»`);
    }
    stage.querySelectorAll('*').forEach(el => {
        if (skip(el)) return;
        for (const pseudo of ['::before', '::after']) {
            const c = getComputedStyle(el, pseudo).content;
            if (c && c !== 'none' && c !== 'normal' && EMOJI.test(c) && shown(el)) out.push(`emoji in ${where(el)}${pseudo}: ${c.slice(0, 40)}`);
        }
    });
    stage.querySelectorAll('img.px-icon').forEach(img => {
        if (skip(img) || !shown(img)) return;
        const r = img.getBoundingClientRect(), n = Number(img.dataset.n);
        if (!r.width || !r.height) return;   // inside a collapsed or clipped-away box: nothing drawn
        const kx = r.width / n, ky = r.height / n, whole = k => Math.abs(k - Math.round(k)) < 0.01 && Math.round(k) >= 1;
        if (!whole(kx) || !whole(ky) || Math.abs(kx - ky) > 0.01) out.push(`icon ${img.dataset.icon} in ${where(img.parentElement)} drawn at ×${kx.toFixed(3)} × ×${ky.toFixed(3)} (${r.width.toFixed(2)}×${r.height.toFixed(2)} px of a ${n}×${n} drawing)`);
        if (img.complete && img.naturalWidth && (img.naturalWidth !== n || img.naturalHeight !== n)) out.push(`icon ${img.dataset.icon}: its image is ${img.naturalWidth}×${img.naturalHeight}, not its ${n}×${n} drawing`);
        if (getComputedStyle(img).imageRendering !== 'pixelated') out.push(`icon ${img.dataset.icon} in ${where(img.parentElement)} isn't scaled pixelated`);
    });
    // The medal after a fighter's name is drawn by CSS (::after, so the name's text stays «@name»): its 12×12 drawing at a
    // whole-number scale too
    stage.querySelectorAll('[data-medal]').forEach(el => {
        if (skip(el) || !shown(el)) return;
        const a = getComputedStyle(el, '::after'), w = parseFloat(a.width), h = parseFloat(a.height);
        if (!/^url\(/.test(a.backgroundImage) || !(w > 0) || w !== h || w % 12 || a.imageRendering !== 'pixelated') out.push(`the medal after ${el.textContent.trim()}: ${a.width} × ${a.height}, ${a.backgroundImage.slice(0, 30)}, ${a.imageRendering}`);
    });
    // Icons sit beside their words, never on them: in every row that holds icons (a chip, a log line, the plate, a queue
    // badge, a Top row, a card line …) no icon overlaps another icon or a run of its text
    const ROWS = '.status-item, .lk, .lc-l1, .lc-ctext, .log-banner, .lr-title, .lr-note, .plaque, .queue-badge, .lb-name, .lb-sub, .sc-title, .sc-sub, .fighter-title-badge, '
        + '.fighter-info, .power-meter, #status-plate, #fight-type, .atk-tab, .ic-head, .ic-row, .ic-title, .ic-shout, .info-title, .pd-who, .hf-p, .hf-best, .cd-sub, .pd-title, .hf-title';
    const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    const rows = new Set();
    stage.querySelectorAll('img.px-icon').forEach(img => { const row = img.closest(ROWS); if (row && !skip(row)) rows.add(row); });
    rows.forEach(row => {
        if (!shown(row)) return;
        const boxes = [];
        row.querySelectorAll('img.px-icon').forEach(img => { const r = img.getBoundingClientRect(); if (r.width && shown(img)) boxes.push({ what: `icon ${img.dataset.icon}`, r, icon: true }); });
        const tw = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n; n = tw.nextNode()) {
            if (!n.nodeValue.trim() || !shown(n.parentElement)) continue;
            const range = document.createRange(); range.selectNodeContents(n);
            [...range.getClientRects()].filter(r => r.width > 0.5).forEach(r => boxes.push({ what: `«${n.nodeValue.trim().slice(0, 20)}»`, r, icon: false }));
        }
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
            if ((boxes[i].icon || boxes[j].icon) && hit(boxes[i].r, boxes[j].r)) out.push(`${boxes[i].what} overlaps ${boxes[j].what} in ${where(row)}`);
        }
    });
    if (typeof iconsMissing !== 'undefined' && iconsMissing.size) out.push(`icons asked for that the set doesn't have: ${[...iconsMissing].join(', ')}`);
    return out;
}

async function overlayIconIssues(page) {
    return page.evaluate(overlayScan);
}

// The checker catches what it's for: a planted emoji, an icon at ×1.5, a squeezed icon and an icon over its words each get reported
async function overlaySelfTest(page) {
    return page.evaluate(scan => {
        const run = new Function(`return (${scan})()`);
        const host = document.getElementById('status-plate');
        const plant = html => { const s = document.createElement('span'); s.className = 'selftest'; s.innerHTML = html; host.appendChild(s); return s; };
        const icon = (id, w) => `<img class="px-icon" data-icon="${id}" data-n="10" src="${DrakeIcons.iconURL(id)}" width="${w}" height="${w}" alt="">`;
        const cases = [
            ['an emoji in the text', plant('🏆'), /emoji in/],
            ['an icon at ×1.5', plant(icon('trophy', 15)), /drawn at ×1\.500/],
            ['an icon squeezed sideways', plant(`<span style="display:inline-block;transform:scaleX(0.8)">${icon('trophy', 20)}</span>`), /drawn at ×1\.600/],
            ['an icon over its words', plant(`${icon('trophy', 20)}<span style="margin-left:-12px">WORDS</span>`), /icon trophy overlaps «WORDS»/],
        ];
        const missed = [];
        for (const [what, el, want] of cases) {
            if (!run().some(i => want.test(i))) missed.push(what);
            el.remove();
        }
        return missed;
    }, overlayScan.toString());
}

module.exports = { overlayIconIssues, overlaySelfTest };
