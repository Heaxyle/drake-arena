// Drake Arena icon set: first batch (the 12 effects and the 6 class ultimates). Design only: the game doesn't load this yet.
// Same format as DRAKE_SPRITES: a palette plus rows of palette letters ('.' = transparent), drawn once to a canvas and
// cached, shown only at whole-number scales (see style.md). No frames: every effect glyph has the whole 10×10 (buff or
// debuff shows in the chip around it: CHIP_SHAPES below), every ultimate its own 12×12 silhouette.
// Colour = element: every effect and the ultimate of an element share its colour family (ELEMENT_COLORS). When this is wired
// in, these become the `color` values in EFFECTS / CLASS_ULTIMATES (a visual-only change), which stay the only source. The
// palette letters:
//   o outline, d dark, m colour, h light, w highlight, p accent (an icon's own second colour), q accent dark
(function (root) {
    // ----- Sizes by category -----
    const SIZES = { buff: 10, debuff: 10, ultimate: 12 };

    // ----- Glyphs -----
    const GLYPHS = {
        // Rage: an angry face (V brows, eyes looking in, a frown)
        rage: [
            '..oooooo..',
            '.ohhhmmmo.',
            'ohommmmomo',
            'ommommommo',
            'omwwmmwwmo',
            'omwommowmo',
            'ommmmmmmdo',
            'ommoooomdo',
            '.omoddomo.',
            '..oooooo..',
        ],
        // Burn: a flame, yellow at the core
        burn: [
            '.....o....',
            '....omo...',
            '...ohmo.o.',
            '..ohmmoomo',
            '.ohmmhmmmo',
            'ohmhpphmmo',
            'omhppwphmo',
            'omhpwwpmdo',
            '.omdppddo.',
            '..oooooo..',
        ],
        // Shield: a heater shield with a boss, lit on its left half
        shield: [
            'oooooooooo',
            'ohhhhmmmmo',
            'ohwhhmmmdo',
            'ohhhwwmmdo',
            'ohhhwwmmdo',
            'ohhhhmmmdo',
            '.ohhhmmdo.',
            '.oohhmmdo.',
            '..oohmdo..',
            '....oo....',
        ],
        // Frost: a snowflake, eight arms with branch ticks
        frost: [
            'h...h...h.',
            '.h.hwh.h..',
            '..hhwhh...',
            '.hhwwwhh..',
            'hwwwmwwwh.',
            '.hhwwwhh..',
            '..hhwhh...',
            '.h.hwh.h..',
            'h...h...h.',
            '..........',
        ],
        // Shadow: a hooded shade with glowing eyes
        shadow: [
            '...oooo...',
            '..ohhhmo..',
            '.ohmddmmo.',
            '.omdddddo.',
            'ohdwdwddmo',
            'omdddddddo',
            'omddddddmo',
            'omdddddddo',
            'ommdmdmdmo',
            'oo.o.o.ooo',
        ],
        // Weakness: a bold arrow down
        weakness: [
            '..oooooo..',
            '..ohmmdo..',
            '..ohmmdo..',
            'ooohmmdooo',
            'ohhhmmmmdo',
            '.ohhmmmdo.',
            '..ohmmdo..',
            '...ohdo...',
            '....oo....',
            '..........',
        ],
        // Blessing: a four-leaf clover with a stem
        blessing: [
            '.ooo.ooo..',
            'ohhhohhho.',
            'ohmdohmdo.',
            'ohdmhmddo.',
            '.oohddoo..',
            'ohhmdmhho.',
            'ohmdohmdo.',
            'ohddohddo.',
            '.ooo.oood.',
            '.........d',
        ],
        // Mark: a crosshair (ring, centre dot, four ticks)
        mark: [
            '...ohho...',
            '..oohhoo..',
            '.ommoommo.',
            'oomoooomoo',
            'hhoowwoohh',
            'hhoowwoohh',
            'oomoooomoo',
            '.ommoommo.',
            '..oohhoo..',
            '...ohho...',
        ],
        // Divine Might: a bold arrow up with a sparkle (the opposite of Weakness)
        divine: [
            '........w.',
            '....oo.www',
            '...ohdo.w.',
            '..ohhmdo..',
            '.ohhhmmdo.',
            'ohhhhmmmdo',
            'ooohmmdooo',
            '..ohmmdo..',
            '..ohmmdo..',
            '..oooooo..',
        ],
        // Dispel: a ring broken in two across a diagonal (round means buff: a broken ring breaks the buffs)
        dispel: [
            '..oohho...',
            '.ohhmmhow.',
            'ohmdddo.o.',
            'ohdooo.oho',
            'hmdo..ohmh',
            'hmdo..ohmd',
            'oho.ooohdo',
            '.o.ohhhmdo',
            '.wohmmddo.',
            '...ohdoo..',
        ],
        // Regeneration: a bold plus
        regen: [
            '...oooo...',
            '...ohho...',
            '...ohmo...',
            'oooohmoooo',
            'ohhhhwmmmo',
            'ohmmwmmmdo',
            'oooommoooo',
            '...ommo...',
            '...oddo...',
            '...oooo...',
        ],
        // Poison: a skull
        poison: [
            '..oooooo..',
            '.ohhhhhmo.',
            'ohhhhhmmmo',
            'ohooohoodo',
            'ohooomoodo',
            'ohmmooomdo',
            '.ommmmmdo.',
            '..ohohodo.',
            '..ooooooo.',
            '..........',
        ],
        // ----- Ultimates (12×12, each its own silhouette) -----
        // Firestorm: a meteor, a hot head at the bottom left and a flaming trail
        firestorm: [
            '.........oo.',
            '........ohho',
            '......oohhho',
            '....oohhhho.',
            '..oommppho..',
            '.ommppppho..',
            'oppppppmo...',
            'oppppppmo...',
            'opwwppmo....',
            'opwwppmo....',
            '.oppppo.....',
            '..oooo......',
        ],
        // Ice Mirror: a tall mirror shard with glints
        mirror: [
            '.....oo.....',
            '....ohwo....',
            '...ohhwmo...',
            '...ohwhmo...',
            '..ohwhhmdo..',
            '..ohhwhmdo..',
            '.ohhhhwmmdo.',
            '.ohhhhhwmdo.',
            '..ohhhhmwdo.',
            '..ohhhmmmo..',
            '...ohmmdo...',
            '....oooo....',
        ],
        // Shadow Theft: a bat with spread wings
        theft: [
            '............',
            '............',
            '....o..o....',
            '...omoomo...',
            '..oohmmhoo..',
            '.ohhwmmwmmo.',
            'ohhmmmmmmmdo',
            'ohmmmmmmmmdo',
            'omdmmmmmmdmo',
            'omo.ommo.omo',
            'oo...oo...oo',
            '............',
        ],
        // Jackpot: a slot reel window with a red seven
        jackpot: [
            'oooooooooooo',
            'ohhhhhhhhhmo',
            'ohwwwwwwwwdo',
            'ohwppppppwdo',
            'ohwqqqqppwdo',
            'ohwwwwppqwdo',
            'ohwwwppqwwdo',
            'ohwwwppwwwdo',
            'ohwwppqwwwdo',
            'ohwwwwwwwwdo',
            'ommddddddddo',
            'oooooooooooo',
        ],
        // Arcane Detonation: an uneven blast with a bright core
        detonation: [
            '...o....o...',
            '..omo..omo.o',
            'o.ohmooomoom',
            'omohhmmmhmo.',
            '.ohhwwhmmmo.',
            'ohhwwwwhmmdo',
            'ohmwwwwhmmdo',
            '.ommwwhmmdo.',
            '.ommmmmmmdoo',
            'omoommdmoomo',
            'oo.omo.omo.o',
            '....o...o...',
        ],
        // Bloom: a pink blossom on a green stem with two big leaves (green leads)
        bloom: [
            '....oooo....',
            '...oppwpo...',
            '..oppwwppo..',
            '...oppppo...',
            '....omho....',
            '.oo.omho.oo.',
            'ohhoomhoohmo',
            'ohhhomhomhmo',
            '.ohhhmhmmdo.',
            '..ohhmhmdo..',
            '...oomhoo...',
            '.....oo.....',
        ],
    };

    // ----- Element colours: one family per element -----
    // Red, blue, purple and green are the card frames' light edges (.el-*), gold is ELEMENT_COLORS.gold (the card's #ae8513
    // is too dark on the dark UI), black is the card swatch's slate #4a4a60 lightened 45% towards white (the swatch itself
    // doesn't read on the dark UI; this stays a neutral grey, never a purple)
    const ELEMENT_COLORS = {
        red: '#ff4f5a', blue: '#4a98ff', black: '#9b9ba8', gold: '#f2c14e', purple: '#b47aff', green: '#6fe896',
    };

    // ----- The icons: kind + glyph + element (accent: an icon's own second colour, kept small) -----
    // was: the effect's own colour in EFFECTS / CLASS_ULTIMATES today
    const ICONS = {
        rage:       { kind: 'buff',     element: 'red',    name: { uk: 'Лють', en: 'Rage' },                  emoji: '💢', was: '#ff4d4d' },
        burn:       { kind: 'debuff',   element: 'red',    name: { uk: 'Підпал', en: 'Burn' },                emoji: '🔥', was: '#ff7a1a', accent: '#ffd23f' },
        shield:     { kind: 'buff',     element: 'blue',   name: { uk: 'Щит', en: 'Shield' },                 emoji: '🛡️', was: '#00bfff' },
        frost:      { kind: 'debuff',   element: 'blue',   name: { uk: 'Мороз', en: 'Frost' },                emoji: '❄️', was: '#9fe3ff' },
        shadow:     { kind: 'buff',     element: 'black',  name: { uk: 'Тінь', en: 'Shadow' },                emoji: '🌑', was: '#b27cff' },
        weakness:   { kind: 'debuff',   element: 'black',  name: { uk: 'Слабкість', en: 'Weakness' },         emoji: '🥀', was: '#c77dff' },
        blessing:   { kind: 'buff',     element: 'gold',   name: { uk: 'Благословіння', en: 'Blessing' },     emoji: '🍀', was: '#ffd700' },
        mark:       { kind: 'debuff',   element: 'gold',   name: { uk: 'Мітка', en: 'Mark' },                 emoji: '🎯', was: '#ffb000' },
        divine:     { kind: 'buff',     element: 'purple', name: { uk: 'Божественна міць', en: 'Divine Might' }, emoji: '🌟', was: '#e0a8ff' },
        dispel:     { kind: 'debuff',   element: 'purple', name: { uk: 'Розвіювання', en: 'Dispel' },         emoji: '💨', was: '#d0d0e0' },
        regen:      { kind: 'buff',     element: 'green',  name: { uk: 'Регенерація', en: 'Regeneration' },   emoji: '💚', was: '#41ff41' },
        poison:     { kind: 'debuff',   element: 'green',  name: { uk: 'Отруєння', en: 'Poison' },            emoji: '☠️', was: '#7dff4d' },
        firestorm:  { kind: 'ultimate', element: 'red',    name: { uk: 'Вогняний шторм', en: 'Firestorm' },   emoji: '☄️', was: '#ff6a3d', accent: '#ffd23f' },
        mirror:     { kind: 'ultimate', element: 'blue',   name: { uk: 'Крижане дзеркало', en: 'Ice Mirror' }, emoji: '💠', was: '#7fdcff' },
        theft:      { kind: 'ultimate', element: 'black',  name: { uk: 'Крадіжка тіні', en: 'Shadow Theft' }, emoji: '🦇', was: '#b27cff' },
        jackpot:    { kind: 'ultimate', element: 'gold',   name: { uk: 'Джекпот', en: 'Jackpot' },           emoji: '🎰', was: '#ffd700', accent: '#ff4f5a' },
        detonation: { kind: 'ultimate', element: 'purple', name: { uk: 'Арканна детонація', en: 'Arcane Detonation' }, emoji: '✴️', was: '#e0a8ff' },
        bloom:      { kind: 'ultimate', element: 'green',  name: { uk: 'Цвітіння', en: 'Bloom' },             emoji: '🌸', was: '#ff9ad5', accent: '#ff9ad5' },
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
            o: mix(color, '#06070b', 0.84),   // outline
            d: mix(color, '#000000', 0.42),   // dark side (bottom right)
            m: color,                          // the colour
            h: mix(color, '#ffffff', 0.42),   // light side (top left)
            w: mix(color, '#ffffff', 0.8),    // highlight
            p: accent,                         // accent
            q: mix(accent, '#000000', 0.35),  // accent dark
        };
    }

    // ----- Rows: the glyph itself (no frame), checked against its category's size -----
    function iconRows(id) {
        const rows = GLYPHS[id], size = SIZES[ICONS[id].kind];
        if (rows.length !== size || rows.some(r => r.length !== size)) throw new Error(`${id}: not ${size}×${size}`);
        return rows;
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

    // ----- Chips: buff or debuff is the chip's shape, the element its colour -----
    // Every effect icon sits in a chip (card chips, log chips, ticks, compact chips). The chip is drawn like the icons, as a
    // small pixel image (both end caps and a 1-pixel middle), and stretched by CSS border-image, so the caps keep their shape
    // at any width: buff = rounded ends, debuff = angled (pointed) ends. 22 px tall, the caps 8 px wide; border and fill are
    // the element's colour (1 px border, a light tint inside).
    const CHIP = { h: 22, cap: 8 };
    const CHIP_SHAPES = {
        // How far each row of the left cap is cut in (0 = the full width): a quarter circle at each corner
        buff: y => { const r = CHIP.cap, d = y < r ? r - y - 0.5 : y >= CHIP.h - r ? y - (CHIP.h - r) + 0.5 : -1; return d < 0 ? 0 : Math.round(r - Math.sqrt(Math.max(0, r * r - d * d))); },
        // A straight slant from the middle out to both corners
        debuff: y => Math.round(Math.abs(y - (CHIP.h - 1) / 2) * (CHIP.cap - 1) / ((CHIP.h - 1) / 2)),
    };
    const rgba = (c, a) => `rgba(${hex(c).join(', ')}, ${a})`;
    const chipCache = {};
    function chipURL(element, kind, doc = root.document) {
        const key = element + '|' + kind;
        if (chipCache[key]) return chipCache[key];
        const w = CHIP.cap * 2 + 1, cut = CHIP_SHAPES[kind], color = ELEMENT_COLORS[element] || element;
        const inside = (x, y) => y >= 0 && y < CHIP.h && x >= 0 && x < w && Math.min(x, w - 1 - x) >= cut(y);
        const c = doc.createElement('canvas');
        c.width = w; c.height = CHIP.h;
        const g = c.getContext('2d');
        for (let y = 0; y < CHIP.h; y++) for (let x = 0; x < w; x++) {
            if (!inside(x, y)) continue;
            const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
            g.fillStyle = edge ? rgba(color, 0.62) : rgba(color, 0.12);
            g.fillRect(x, y, 1, 1);
        }
        return (chipCache[key] = c.toDataURL());
    }
    // The CSS for a chip of this element and kind (the element's text colour goes with it)
    const chipStyle = (element, kind) => `border-style: solid; border-width: 1px ${CHIP.cap}px; border-image: url(${chipURL(element, kind)}) 1 ${CHIP.cap} fill / 1px ${CHIP.cap}px stretch; color: ${mix(ELEMENT_COLORS[element], '#ffffff', 0.35)};`;

    root.DrakeIcons = { CHIP, CHIP_SHAPES, chipURL, chipStyle, SIZES,GLYPHS, ICONS, ELEMENT_COLORS, EFFECT_ICON_IDS, ULTIMATE_ICON_IDS, paletteOf, iconRows, makeIconCanvas, iconURL, iconImg };
})(typeof window !== 'undefined' ? window : globalThis);
