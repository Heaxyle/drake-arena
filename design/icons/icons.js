// Drake Arena icon set: first batch (the 12 effects and the 6 class ultimates). Design only: the game doesn't load this yet.
// Same format as DRAKE_SPRITES: a palette plus rows of palette letters ('.' = transparent), drawn once to a canvas and
// cached, shown only at whole-number scales (see style.md). Each icon is a category frame plus a glyph:
//   buff     10×10 round badge (octagon ring), glyph 6×6 in the middle
//   debuff   10×10 spiky badge (square ring with 8 spikes), glyph 6×6
//   ultimate 12×12 burst (a round badge with long rays), glyph 6×6 in the middle
// Colour = element: every effect and the ultimate of an element share its colour family (ELEMENT_COLORS). When this is wired
// in, these become the `color` values in EFFECTS / CLASS_ULTIMATES (a visual-only change), which stay the only source. The
// palette letters:
//   h light edge, m colour, l dark edge, d badge inside, g glyph, w glyph highlight, p accent (an icon's own second colour)
(function (root) {
    // ----- Frames -----
    const FRAMES = {
        buff: { size: 10, glyph: [2, 2], rows: [
            '..hhhhhh..',
            '.hhddddddm',
            'hhddddddmm',
            'hddddddddl',
            'hddddddddl',
            'hddddddddl',
            'hddddddddl',
            'mmddddddll',
            '.mddddddl.',
            '..llllll..',
        ] },
        debuff: { size: 10, glyph: [2, 2], rows: [
            'h...hh...m',
            '.hhhhhhhm.',
            '.hddddddl.',
            '.hddddddl.',
            'hhddddddll',
            'hhddddddll',
            '.hddddddl.',
            '.hddddddl.',
            '.mllllllm.',
            'm...ll...l',
        ] },
        ultimate: { size: 12, glyph: [3, 3], rows: [
            'h....hh....m',
            '.h..hhhh..m.',
            '..hhddddmm..',
            '..hddddddm..',
            '.hddddddddm.',
            'hhddddddddll',
            'hhddddddddll',
            '.mddddddddl.',
            '..mddddddl..',
            '..mmddddll..',
            '.m..llll..l.',
            'm....ll....l',
        ] },
    };

    // ----- Glyphs ('.' keeps the frame underneath) -----
    const GLYPHS = {
        // Rage: an angry face
        rage: [
            'g....g',
            'gg..gg',
            '.w..w.',
            '......',
            '.gggg.',
            'g....g',
        ],
        // Burn: a flame
        burn: [
            '...g..',
            '..gg..',
            '.ggwg.',
            '.gwwgg',
            'gwwwwg',
            '.gwwg.',
        ],
        // Shield: a heater shield, lit on its left half
        shield: [
            'gggggg',
            'gwwggg',
            'gwwggg',
            'gwwggg',
            '.gwgg.',
            '..gg..',
        ],
        // Frost: icicles hanging from a ledge (a snowflake read as Blessing's star)
        frost: [
            'gggggg',
            'gwggwg',
            '.wg.wg',
            '.wg..g',
            '..g..g',
            '.....g',
        ],
        // Shadow: a crescent moon
        shadow: [
            '..ggg.',
            '.gw...',
            'gw....',
            'gw....',
            '.gw...',
            '..ggg.',
        ],
        // Weakness: an arrow down
        weakness: [
            '..gg..',
            '..gg..',
            '..gg..',
            'gggggg',
            '.gwwg.',
            '..gg..',
        ],
        // Blessing: a lucky star
        blessing: [
            '..gg..',
            '..gw..',
            'gggwgg',
            '.gwgg.',
            '.g..g.',
            'g....g',
        ],
        // Mark: a target
        mark: [
            '.gggg.',
            'g....g',
            'g.ww.g',
            'g.ww.g',
            'g....g',
            '.gggg.',
        ],
        // Divine Might: an arrow up (the opposite of Weakness)
        divine: [
            '..gg..',
            '.gwgg.',
            'gwgggg',
            '..wg..',
            '..wg..',
            '..gg..',
        ],
        // Dispel: a ring cracked across (round means buff: a broken ring breaks the buffs; also reads as ⊘)
        dispel: [
            '.ggg..',
            'g...w.',
            'g..w.g',
            'g.w..g',
            '.w...g',
            '..ggg.',
        ],
        // Regeneration: a plus
        regen: [
            '..gg..',
            '..gw..',
            'gggwgg',
            'gwwwwg',
            '..gg..',
            '..gg..',
        ],
        // Poison: a drop
        poison: [
            '..g...',
            '..gg..',
            '.gggg.',
            'gwgggg',
            'gwgggg',
            '.gggg.',
        ],
        // ----- Ultimates (6×6, like the badges: the burst is what makes them bigger) -----
        // Firestorm: a meteor falling from the top right
        firestorm: [
            '....gg',
            '...gg.',
            '.ggg..',
            'gwwg..',
            'gwwg..',
            '.gg...',
        ],
        // Ice Mirror: a diamond mirror with a glint
        mirror: [
            '..gg..',
            '.gwwg.',
            'gwgwwg',
            'gwwgwg',
            '.gwwg.',
            '..gg..',
        ],
        // Shadow Theft: a bat
        theft: [
            'g.gg.g',
            'gggggg',
            'gwggwg',
            '.gggg.',
            '.g..g.',
            '......',
        ],
        // Jackpot: a seven
        jackpot: [
            'gggggg',
            'wwwwgg',
            '...gg.',
            '..gg..',
            '..gg..',
            '..gg..',
        ],
        // Arcane Detonation: an X blast around a core
        detonation: [
            'g....g',
            '.g..g.',
            '..ww..',
            '..ww..',
            '.g..g.',
            'g....g',
        ],
        // Bloom: a flower, green with pink petal tips
        bloom: [
            '..pp..',
            '.gggg.',
            'pgwwgp',
            'pgwwgp',
            '.gggg.',
            '..pp..',
        ],
    };

    // ----- Element colours: one family per element -----
    // Red, blue, purple and green are the card frames' light edges (.el-*), gold is ELEMENT_COLORS.gold (the card's #ae8513
    // is too dark on the dark UI), black is the card swatch's slate #4a4a60 lightened 45% towards white (the swatch itself
    // doesn't read on the dark UI; this stays a neutral grey, never a purple)
    const ELEMENT_COLORS = {
        red: '#ff4f5a', blue: '#4a98ff', black: '#9b9ba8', gold: '#f2c14e', purple: '#b47aff', green: '#6fe896',
    };

    // ----- The icons: frame + glyph + element (accent: an icon's own second colour, kept small) -----
    // was: the effect's own colour in EFFECTS / CLASS_ULTIMATES today
    const ICONS = {
        rage:       { frame: 'buff',     element: 'red',    name: { uk: 'Лють', en: 'Rage' },                  emoji: '💢', was: '#ff4d4d' },
        burn:       { frame: 'debuff',   element: 'red',    name: { uk: 'Підпал', en: 'Burn' },                emoji: '🔥', was: '#ff7a1a' },
        shield:     { frame: 'buff',     element: 'blue',   name: { uk: 'Щит', en: 'Shield' },                 emoji: '🛡️', was: '#00bfff' },
        frost:      { frame: 'debuff',   element: 'blue',   name: { uk: 'Мороз', en: 'Frost' },                emoji: '❄️', was: '#9fe3ff' },
        shadow:     { frame: 'buff',     element: 'black',  name: { uk: 'Тінь', en: 'Shadow' },                emoji: '🌑', was: '#b27cff' },
        weakness:   { frame: 'debuff',   element: 'black',  name: { uk: 'Слабкість', en: 'Weakness' },         emoji: '🥀', was: '#c77dff' },
        blessing:   { frame: 'buff',     element: 'gold',   name: { uk: 'Благословіння', en: 'Blessing' },     emoji: '🍀', was: '#ffd700' },
        mark:       { frame: 'debuff',   element: 'gold',   name: { uk: 'Мітка', en: 'Mark' },                 emoji: '🎯', was: '#ffb000' },
        divine:     { frame: 'buff',     element: 'purple', name: { uk: 'Божественна міць', en: 'Divine Might' }, emoji: '🌟', was: '#e0a8ff' },
        dispel:     { frame: 'debuff',   element: 'purple', name: { uk: 'Розвіювання', en: 'Dispel' },         emoji: '💨', was: '#d0d0e0' },
        regen:      { frame: 'buff',     element: 'green',  name: { uk: 'Регенерація', en: 'Regeneration' },   emoji: '💚', was: '#41ff41' },
        poison:     { frame: 'debuff',   element: 'green',  name: { uk: 'Отруєння', en: 'Poison' },            emoji: '☠️', was: '#7dff4d' },
        firestorm:  { frame: 'ultimate', element: 'red',    name: { uk: 'Вогняний шторм', en: 'Firestorm' },   emoji: '☄️', was: '#ff6a3d' },
        mirror:     { frame: 'ultimate', element: 'blue',   name: { uk: 'Крижане дзеркало', en: 'Ice Mirror' }, emoji: '💠', was: '#7fdcff' },
        theft:      { frame: 'ultimate', element: 'black',  name: { uk: 'Крадіжка тіні', en: 'Shadow Theft' }, emoji: '🦇', was: '#b27cff' },
        jackpot:    { frame: 'ultimate', element: 'gold',   name: { uk: 'Джекпот', en: 'Jackpot' },           emoji: '🎰', was: '#ffd700' },
        detonation: { frame: 'ultimate', element: 'purple', name: { uk: 'Арканна детонація', en: 'Arcane Detonation' }, emoji: '✴️', was: '#e0a8ff' },
        bloom:      { frame: 'ultimate', element: 'green',  name: { uk: 'Цвітіння', en: 'Bloom' },             emoji: '🌸', was: '#ff9ad5', accent: '#ff9ad5' },
    };
    Object.values(ICONS).forEach(ic => { ic.color = ELEMENT_COLORS[ic.element]; });
    const EFFECT_ICON_IDS = ['rage', 'burn', 'shield', 'frost', 'shadow', 'weakness', 'blessing', 'mark', 'divine', 'dispel', 'regen', 'poison'];
    const ULTIMATE_ICON_IDS = ['firestorm', 'mirror', 'theft', 'jackpot', 'detonation', 'bloom'];

    // ----- Palette from one colour -----
    const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const toHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
    function paletteOf(color, accent = color) {
        return {
            p: accent,                         // accent
            h: mix(color, '#ffffff', 0.45),   // light edge (top left)
            m: color,                          // the colour
            l: mix(color, '#000000', 0.45),   // dark edge (bottom right)
            d: mix(color, '#0b0c10', 0.82),   // badge inside
            g: mix(color, '#ffffff', 0.15),   // glyph
            w: mix(color, '#ffffff', 0.75),   // glyph highlight
        };
    }

    // ----- Compose: frame rows with the glyph laid over them -----
    function iconRows(id) {
        const icon = ICONS[id], frame = FRAMES[icon.frame], glyph = GLYPHS[id];
        const rows = frame.rows.map(r => r.split(''));
        const [gx, gy] = frame.glyph;
        glyph.forEach((r, y) => r.split('').forEach((c, x) => { if (c !== '.') rows[gy + y][gx + x] = c; }));
        return rows.map(r => r.join(''));
    }

    // Drawn once per icon at 1×; larger sizes are the same canvas drawn with image smoothing off, or CSS pixelated
    const cache = {};
    function makeIconCanvas(id, doc = root.document) {
        if (cache[id]) return cache[id];
        const rows = iconRows(id), pal = paletteOf(ICONS[id].color, ICONS[id].accent);
        const c = doc.createElement('canvas');
        c.width = rows[0].length; c.height = rows.length;
        const g = c.getContext('2d');
        rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] !== '.') { g.fillStyle = pal[row[x]]; g.fillRect(x, y, 1, 1); } });
        return (cache[id] = c);
    }
    const iconURL = id => makeIconCanvas(id).toDataURL();
    // <img> at a whole-number scale (1, 2, 3 …), never anything in between
    function iconImg(id, scale = 2, cls = 'px-icon') {
        const c = makeIconCanvas(id), s = Math.max(1, Math.round(scale));
        return `<img class="${cls}" src="${iconURL(id)}" width="${c.width * s}" height="${c.height * s}" alt="${ICONS[id].name.en}" style="image-rendering: pixelated">`;
    }

    root.DrakeIcons = { FRAMES, GLYPHS, ICONS, ELEMENT_COLORS, EFFECT_ICON_IDS, ULTIMATE_ICON_IDS, paletteOf, iconRows, makeIconCanvas, iconURL, iconImg };
})(typeof window !== 'undefined' ? window : globalThis);
