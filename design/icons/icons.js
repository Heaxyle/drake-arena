// Drake Arena icon set: first batch (the 12 effects and the 6 class ultimates). Design only: the game doesn't load this yet.
// Same format as DRAKE_SPRITES: a palette plus rows of palette letters ('.' = transparent), drawn once to a canvas and
// cached, shown only at whole-number scales (see style.md). Each icon is a category frame plus a glyph:
//   buff     10×10 round badge (octagon ring), glyph 6×6 in the middle
//   debuff   10×10 spiky badge (square ring with 8 spikes), glyph 6×6
//   ultimate 12×12 burst (a round badge with long rays), glyph 6×6 in the middle
// Colours come from the effect's / ultimate's `color` in EFFECTS / CLASS_ULTIMATES (copied here; the game's tables stay
// the only source when this is wired in). The palette letters:
//   h light edge, m colour, l dark edge, d badge inside, g glyph, w glyph highlight
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
        // Frost: a snowflake (a ring with eight points)
        frost: [
            'g.gg.g',
            '.gwwg.',
            'gw..wg',
            'gw..wg',
            '.gwwg.',
            'g.gg.g',
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
        // Dispel: a gust that blows things away
        dispel: [
            'gggw..',
            '....g.',
            'wgggg.',
            '......',
            'ggw.g.',
            '...g..',
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
        // Bloom: a flower
        bloom: [
            '..gg..',
            '.gggg.',
            'ggwwgg',
            'ggwwgg',
            '.gggg.',
            '..gg..',
        ],
    };

    // ----- The icons: frame + glyph + colour -----
    const ICONS = {
        rage:       { frame: 'buff',     color: '#ff4d4d', name: { uk: 'Лють', en: 'Rage' },                  emoji: '💢', element: 'red' },
        burn:       { frame: 'debuff',   color: '#ff7a1a', name: { uk: 'Підпал', en: 'Burn' },                emoji: '🔥', element: 'red' },
        shield:     { frame: 'buff',     color: '#00bfff', name: { uk: 'Щит', en: 'Shield' },                 emoji: '🛡️', element: 'blue' },
        frost:      { frame: 'debuff',   color: '#9fe3ff', name: { uk: 'Мороз', en: 'Frost' },                emoji: '❄️', element: 'blue' },
        shadow:     { frame: 'buff',     color: '#b27cff', name: { uk: 'Тінь', en: 'Shadow' },                emoji: '🌑', element: 'black' },
        weakness:   { frame: 'debuff',   color: '#c77dff', name: { uk: 'Слабкість', en: 'Weakness' },         emoji: '🥀', element: 'black' },
        blessing:   { frame: 'buff',     color: '#ffd700', name: { uk: 'Благословіння', en: 'Blessing' },     emoji: '🍀', element: 'gold' },
        mark:       { frame: 'debuff',   color: '#ffb000', name: { uk: 'Мітка', en: 'Mark' },                 emoji: '🎯', element: 'gold' },
        divine:     { frame: 'buff',     color: '#e0a8ff', name: { uk: 'Божественна міць', en: 'Divine Might' }, emoji: '🌟', element: 'purple' },
        dispel:     { frame: 'debuff',   color: '#d0d0e0', name: { uk: 'Розвіювання', en: 'Dispel' },         emoji: '💨', element: 'purple' },
        regen:      { frame: 'buff',     color: '#41ff41', name: { uk: 'Регенерація', en: 'Regeneration' },   emoji: '💚', element: 'green' },
        poison:     { frame: 'debuff',   color: '#7dff4d', name: { uk: 'Отруєння', en: 'Poison' },            emoji: '☠️', element: 'green' },
        firestorm:  { frame: 'ultimate', color: '#ff6a3d', name: { uk: 'Вогняний шторм', en: 'Firestorm' },   emoji: '☄️', element: 'red' },
        mirror:     { frame: 'ultimate', color: '#7fdcff', name: { uk: 'Крижане дзеркало', en: 'Ice Mirror' }, emoji: '💠', element: 'blue' },
        theft:      { frame: 'ultimate', color: '#b27cff', name: { uk: 'Крадіжка тіні', en: 'Shadow Theft' }, emoji: '🦇', element: 'black' },
        jackpot:    { frame: 'ultimate', color: '#ffd700', name: { uk: 'Джекпот', en: 'Jackpot' },           emoji: '🎰', element: 'gold' },
        detonation: { frame: 'ultimate', color: '#e0a8ff', name: { uk: 'Арканна детонація', en: 'Arcane Detonation' }, emoji: '✴️', element: 'purple' },
        bloom:      { frame: 'ultimate', color: '#ff9ad5', name: { uk: 'Цвітіння', en: 'Bloom' },             emoji: '🌸', element: 'green' },
    };
    const EFFECT_ICON_IDS = ['rage', 'burn', 'shield', 'frost', 'shadow', 'weakness', 'blessing', 'mark', 'divine', 'dispel', 'regen', 'poison'];
    const ULTIMATE_ICON_IDS = ['firestorm', 'mirror', 'theft', 'jackpot', 'detonation', 'bloom'];

    // ----- Palette from one colour -----
    const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const toHex = rgb => '#' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
    function paletteOf(color) {
        return {
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
        const rows = iconRows(id), pal = paletteOf(ICONS[id].color);
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

    root.DrakeIcons = { FRAMES, GLYPHS, ICONS, EFFECT_ICON_IDS, ULTIMATE_ICON_IDS, paletteOf, iconRows, makeIconCanvas, iconURL, iconImg };
})(typeof window !== 'undefined' ? window : globalThis);
