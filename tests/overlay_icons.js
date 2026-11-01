// Shared by the Playwright tests: the overlay shows pixel icons, never emoji.
//
//   const issues = await overlayIconIssues(page)   // [] when the overlay is clean
//
// Walks what's on the overlay (#stage, without the demo controls #cam-col, which OBS never shows, and without the hidden
// text record #battle-log, which keeps its emoji for the tests and the sims) and reports:
//   - any emoji in its text, in a CSS ::before / ::after, or in an <img>-less icon (alt text and title tooltips aren't
//     drawn, so they don't count): emoji are only in the hidden record and the play-log export
//   - any pixel icon (img.px-icon) not drawn at a whole-number multiple of its glyph's size (data-n), or drawn differently
//     across and down, or not from its own V2 art (the page's ICONS_V2: its loop, or its still under prefers-reduced-motion,
//     an image ICON_DENSITY times its glyph's size), or not rendered by the display rule: pixelated exactly when its size on
//     screen × devicePixelRatio is a whole multiple of its art, smoothed otherwise
//   - any title badge (.px-badge) that isn't its rarity's frame with the glyph on top, one glyph pixel in (s CSS px at ×s)
//   - any icon the game asked for that the set doesn't have (pxIcon's iconsMissing)
// Run it after settleArena (animations finished: a pop-in or a slam mid-way scales everything in it).
//
//   await overlaySelfTest(page)   // plants an emoji, an icon at ×1.5, a squeezed icon, an icon over its words, an icon with
//                                 // another's art, a smoothed icon that should be crisp (and the reverse) and a badge whose
//                                 // glyph is off by a pixel: each must be reported
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
    // The V2 art each icon must show (the page's copy of design/icons/v2, which design/icons/test.js holds to the files)
    const V2 = typeof ICONS_V2 !== 'undefined' ? ICONS_V2 : {};
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches, dpr = window.devicePixelRatio || 1;
    const whole = k => Math.abs(k - Math.round(k)) < 0.01 && Math.round(k) >= 1;
    const rule = (cssPx, art) => whole(cssPx * dpr / art) ? 'pixelated' : 'auto';
    stage.querySelectorAll('img.px-icon').forEach(img => {
        if (skip(img) || !shown(img)) return;
        const r = img.getBoundingClientRect(), n = Number(img.dataset.n), id = img.dataset.icon, art = V2[id];
        if (!r.width || !r.height) return;   // inside a collapsed or clipped-away box: nothing drawn
        const kx = r.width / n, ky = r.height / n;
        if (!whole(kx) || !whole(ky) || Math.abs(kx - ky) > 0.01) out.push(`icon ${id} in ${where(img.parentElement)} drawn at ×${kx.toFixed(3)} × ×${ky.toFixed(3)} (${r.width.toFixed(2)}×${r.height.toFixed(2)} px of a ${n}×${n} glyph)`);
        if (!art) { out.push(`icon ${id} in ${where(img.parentElement)}: no V2 art for it`); return; }
        if (art.size !== n * ICON_DENSITY) out.push(`icon ${id}: its V2 art is ${art.size} px, not ${ICON_DENSITY} × its ${n}×${n} glyph`);
        if (img.getAttribute('src') !== art[still ? 'still' : 'anim']) out.push(`icon ${id} in ${where(img.parentElement)} doesn't show its V2 ${still ? 'still' : 'loop'}`);
        if (img.complete && img.naturalWidth && (img.naturalWidth !== art.size || img.naturalHeight !== art.size)) out.push(`icon ${id}: its image is ${img.naturalWidth}×${img.naturalHeight}, not its ${art.size}×${art.size} art`);
        const got = getComputedStyle(img).imageRendering, want = rule(r.width, art.size);
        if (got !== want) out.push(`icon ${id} in ${where(img.parentElement)} drawn ${got}: ${r.width.toFixed(2)} px × devicePixelRatio ${dpr} for its ${art.size} px art wants ${want}`);
    });
    // A title badge: its rarity's frame (12×12 at ×s, the badge's own box) with the glyph on top, one glyph pixel in
    stage.querySelectorAll('.px-badge').forEach(b => {
        if (skip(b) || !shown(b)) return;
        const [frame, glyph] = b.children, br = b.getBoundingClientRect();
        if (!br.width) return;
        const ok = b.children.length === 2 && frame.matches('img.px-icon') && glyph.matches('img.px-icon') && frame.dataset.icon === `frame-${b.dataset.frame}` && !glyph.dataset.icon.startsWith('frame-');
        if (!ok) { out.push(`the title badge in ${where(b.parentElement)} isn't its frame and a glyph: ${[...b.children].map(c => c.dataset.icon || c.tagName).join(', ')}`); return; }
        const fr = frame.getBoundingClientRect(), gr = glyph.getBoundingClientRect(), s = fr.width / Number(frame.dataset.n);
        const near = (a, c) => Math.abs(a - c) < 0.01;
        if (!near(fr.left, br.left) || !near(fr.top, br.top) || !near(fr.width, br.width) || !near(fr.height, br.height)) out.push(`the title badge ${glyph.dataset.icon} in ${where(b.parentElement)}: its frame isn't the badge's box`);
        if (!near(gr.left - fr.left, s) || !near(gr.top - fr.top, s)) out.push(`the title badge ${glyph.dataset.icon} in ${where(b.parentElement)}: its glyph sits ${(gr.left - fr.left).toFixed(2)}, ${(gr.top - fr.top).toFixed(2)} px into its frame, not one glyph pixel (${s} px)`);
    });
    // The medal after a fighter's name is drawn by CSS (::after, so the name's text stays «@name»): its V2 art at its 12×12
    // glyph's size × a whole number, by the same display rule
    stage.querySelectorAll('[data-medal]').forEach(el => {
        if (skip(el) || !shown(el)) return;
        const a = getComputedStyle(el, '::after'), w = parseFloat(a.width), h = parseFloat(a.height), art = V2[el.dataset.medal];
        const src = art && `url("${art[still ? 'still' : 'anim']}")`;
        if (!art || a.backgroundImage !== src || !(w > 0) || w !== h || w % 12 || art.size !== 12 * ICON_DENSITY || a.imageRendering !== rule(w, art.size)) out.push(`the medal after ${el.textContent.trim()}: ${el.dataset.medal}, ${a.width} × ${a.height}, ${art && a.backgroundImage === src ? `its V2 ${still ? 'still' : 'loop'}` : `${a.backgroundImage.slice(0, 30)}…`}, ${a.imageRendering}`);
    });
    // Icons sit beside their words, never on them: in every row that holds icons (a chip, a log line, the plate, a queue
    // badge, a Top row, a card line …) no icon overlaps another icon or a run of its text. A title badge is one icon (its
    // frame and glyph are one drawing)
    const ROWS = '.status-item, .lk, .lc-l1, .lc-ctext, .log-banner, .lr-title, .lr-note, .plaque, .queue-badge, .lb-name, .lb-sub, .sc-title, .sc-sub, .fighter-title-badge, '
        + '.fighter-info, .power-meter, #status-plate, #fight-type, .atk-tab, .ic-head, .ic-row, .ic-title, .ic-shout, .info-title, .pd-who, .hf-p, .hf-best, .cd-sub, .pd-title, .hf-title';
    const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
    const icons = row => [...row.querySelectorAll('.px-badge, img.px-icon')].filter(i => !(i.parentElement && i.parentElement.classList.contains('px-badge')));
    const rows = new Set();
    stage.querySelectorAll('img.px-icon').forEach(img => { const row = img.closest(ROWS); if (row && !skip(row)) rows.add(row); });
    rows.forEach(row => {
        if (!shown(row)) return;
        const boxes = [];
        icons(row).forEach(i => { const r = i.getBoundingClientRect(), id = i.matches('.px-badge') ? (i.children[1] || {}).dataset.icon : i.dataset.icon; if (r.width && shown(i)) boxes.push({ what: `icon ${id}`, r, icon: true }); });
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

// The checker catches what it's for: a planted emoji, an icon at ×1.5, a squeezed icon, an icon over its words, an icon
// showing another icon's art, an icon smoothed where it should be pixelated and one pixelated where it should be smoothed,
// and a badge whose glyph sits a pixel off: each gets reported
async function overlaySelfTest(page) {
    return page.evaluate(scan => {
        const run = new Function(`return (${scan})()`);
        const host = document.getElementById('status-plate');
        const plant = html => { const s = document.createElement('span'); s.className = 'selftest'; s.innerHTML = html; host.appendChild(s); return s; };
        const art = id => ICONS_V2[id][matchMedia('(prefers-reduced-motion: reduce)').matches ? 'still' : 'anim'];
        const icon = (id, w, style = '', src = art(id)) => `<img class="px-icon" data-icon="${id}" data-n="10" src="${src}" width="${w}" height="${w}" alt="" style="${style}">`;
        // At this devicePixelRatio, the 10×10 trophy at a CSS size that maps whole (its 40 px art × a whole number) and one that doesn't
        const crispPx = 40 / devicePixelRatio, smoothPx = [10, 20, 30].find(w => Math.abs(w * devicePixelRatio / 40 - Math.round(w * devicePixelRatio / 40)) > 0.01 || w * devicePixelRatio < 40);
        const badge = off => `<span class="px-badge" data-frame="epic" style="width:24px;height:24px"><img class="px-icon px-frame" data-icon="frame-epic" data-n="12" src="${art('frame-epic')}" width="24" height="24" alt="">`
            + `<img class="px-icon px-glyph" data-icon="crit" data-n="10" src="${art('crit')}" width="20" height="20" alt="" style="left:${off}px;top:2px"></span>`;
        const cases = [
            ['an emoji in the text', plant('🏆'), /emoji in/],
            ['an icon at ×1.5', plant(icon('trophy', 15)), /drawn at ×1\.500/],
            ['an icon squeezed sideways', plant(`<span style="display:inline-block;transform:scaleX(0.8)">${icon('trophy', 20)}</span>`), /drawn at ×1\.600/],
            ['an icon over its words', plant(`${icon('trophy', 20)}<span style="margin-left:-12px">WORDS</span>`), /icon trophy overlaps «WORDS»/],
            ["an icon showing another icon's art", plant(icon('trophy', 20, '', art('hall'))), /icon trophy .*doesn't show its V2/],
            ['an icon smoothed where its art maps whole', plant(icon('trophy', crispPx, 'image-rendering:auto')), /icon trophy .*drawn auto: .* wants pixelated/],
            ['an icon pixelated where its art does not map whole', plant(icon('trophy', smoothPx, 'image-rendering:pixelated')), /icon trophy .*drawn pixelated: .* wants auto/],
            ['a badge whose glyph is a pixel off', plant(badge(1)), /title badge crit .*its glyph sits 1\.00, 2\.00 px into its frame/],
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
