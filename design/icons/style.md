# Icon style guide

Icons made for Drake Arena's mechanics and its UI, replacing the emoji (see inventory.md). They are pixel art like the drakes
and Press Start 2P, and each one means one thing everywhere. First batch: the 12 effects and the 6 ultimates (`icons.js`,
reviewed in `review.html`).

## Format

- Same as `DRAKE_SPRITES` / `SHOW_SPRITES`: a palette plus rows of palette letters, `.` transparent. Each icon is drawn once to a
  canvas and cached (`makeIconCanvas`), then used as an `<img>` / data URL.
- Each icon is a category frame plus a glyph, composed in code (`iconRows`). The palette comes from one colour (`paletteOf`):
  `h` light edge (top left), `m` the colour, `l` dark edge (bottom right), `d` the badge's inside, `g` glyph, `w` glyph highlight.
  When it goes into the game, the colour comes from `EFFECTS` / `CLASS_ULTIMATES` (`color`), so a colour change there moves the
  icon with it, and nothing else names an icon (the same rule as effect names and icons today).
- Shown only at whole-number scales (`image-rendering: pixelated`, width and height = art size × 1, 2 or 3). Never scaled by
  `fitText` or any transform: text around an icon may shrink, the icon keeps its size.

## The grid

Press Start 2P is an 8×8 font shown at 2× (16 px). The icons use the same pixel: art on a small grid, shown at 2×.

| Category | Art | ×2 (the fight) | ×1 (side column) | ×3 (big moments) |
|---|---|---|---|---|
| log note (bare glyph) | 8×8 | 16 px | 8 px | 24 px |
| buff / debuff badge | 10×10, glyph 6×6 | 20 px | 10 px | 30 px |
| title (rarity frame) | 10×10, glyph 6×6 | 20 px | 10 px | 30 px |
| ultimate burst | 12×12, glyph 6×6 | 24 px | 12 px | 36 px |
| medal, trophy, crown | as `SHOW_SPRITES` | | | |

Why these sizes, from the inventory: the rows that hold icons in the fight are 20–22 px (log lines 20 px, chips 21 px, the title
badge ~21 px), so a 10-pixel badge at 2× fills a line, and an 8-pixel note at 2× sits beside 12–15 px text like a capital letter.
The side column's text is 12–14 px in rows of 15–18 px, so it takes ×1, like the drake sprites in the Top. The podium medals are
24 px today: ×3 of an 8-pixel glyph.

What changes in the layout when this goes in (all within the fixed heights):
- Fighter card chips: 22 px tall instead of 21, with a 2 px gap between the rows instead of 4. The block stays 46 px.
- Log line 2 chips: a chip with an icon fills the 20 px line (no top and bottom padding).
- An ultimate's 24 px burst goes in line 1, next to the move name; it reaches 2 px into the 4 px gaps above and below. The
  header keeps its words without the emoji. In line 2 (Ice Mirror's counter) the line uses `overflow: clip` with
  `overflow-clip-margin: 2px` instead of `overflow: hidden`.

## Shape tells the category

The frame is the category; it still reads without colour (review.html, "Without colour").

- **Buff: round badge.** An octagon ring, light at the top left, dark at the bottom right, dark inside, glyph in the middle.
- **Debuff: spiky badge.** A square ring with eight spikes (corners and sides).
- **Ultimate: a larger burst.** A round badge with eight long rays, 12×12 against the badges' 10×10.
- **Log note: a bare glyph.** No frame, 8×8. Crit, block, immune, pierce, reflect, fortune, thorns, lifesteal, execute… are
  events, not states, so they never wear a badge.
- **Title: a rarity frame.** A square frame (a plaque, like the title badge), 10×10, in the rarity's colour, holding a 6×6 glyph.
  Rarity also shows in the frame's shape, for colour-blind viewers, richer up the ladder: common plain, uncommon with corner
  studs, rare with a double edge, epic with notched corners, legendary with a crest on top. Mythic and meme hold the same
  mechanic glyphs as legendary, so their frames carry the difference: mythic a crest plus flame-tipped corners and a two-tone
  edge, meme a wobbly (offset) edge with confetti studs. Divine is a frame of its own around its own icon. (To draw with the
  titles batch.)
- **Drake emblems:** the element's sigil (flame, wave, moon, coin, crystal, leaf; the Dragon's crown-wing) in a 10×10 shield.
  They replace 🟥🟦⬛🟨🟪🟩🐉 in names and banners. (Later batch.)

## Colour tells the element

- **Colour = element, everywhere.** Each element has one colour family, and all its effects and its ultimate use it
  (`ELEMENT_COLORS` in icons.js):

  | Element | Colour | From |
  |---|---|---|
  | red | #ff4f5a | the red card frame's light edge |
  | blue | #4a98ff | the blue card frame |
  | black | #9b9ba8 | the card swatch's slate #4a4a60, 45% lighter (the swatch is too dark to read on the dark UI); a neutral grey, never purple |
  | gold | #f2c14e | `ELEMENT_COLORS.gold` (the gold frame's #ae8513 is too dark) |
  | purple | #b47aff | the purple card frame |
  | green | #6fe896 | the green card frame |

  When the icons go in, these become every `color` in `EFFECTS` and `CLASS_ULTIMATES` (visual only). That moves Black's
  Shadow and Weakness off purple, Purple's Dispel off Black-like grey (#d0d0e0), Green's Bloom off pink (#ff9ad5; a pink accent
  on its petal tips stays, green leads), Burn from orange to red, Frost from pale cyan (which was the divine rarity's colour) to
  blue. An icon may carry a small accent of its own (palette letter `p`), never as its main colour.
- Titles use the rarity colour, notes the colour of what they belong to (reflect blue, fortune gold, crit the crit yellow
  #ffd23f).
- Light edge, colour, dark edge and the dark inside are all made from that one colour, so every icon has the same light and depth.
- Within an element the buff, the debuff and the ultimate now share a colour, so the frame and the glyph tell them apart.
- The shape still works without colour: within an element, the buff and the debuff have different frames; across elements, every
  glyph has its own silhouette. Checked in review.html with greyscale and simulated deuteranopia, protanopia and tritanopia.

## Bold silhouettes

Each icon has to read when a 1080p screenshot is shrunk to 360p, a phone viewer (a third: a 20 px badge becomes ~7 px).
- Strokes are whole art pixels (2 screen pixels at ×2); the shape that carries the meaning is solid or outlined in one piece,
  never a pattern of single dots. Nothing anti-aliased, no in-between colours at the edges.
- One shape per glyph: a flame, a shield, a moon, an arrow, a star, a target, a drop. No scenes, no faces with expressions
  (Rage's face is the one exception and is a bold one).
- The glyph is lighter than the badge's inside (the inside is the colour 82% towards the background).
- What survives at 360p is the frame and the colour: a viewer on a phone tells a buff from a debuff and the element; the glyph
  is for the 1080p viewer. That is still more than the emoji gives at that size (review: icons-review-phone.png).

## One meaning per icon

- An icon means one thing, the same in every place: the card chip, the log chip, the compact chip, the banner, the info card.
- A mechanic's title badge and its log note are one icon: the legendary title Absolute Drake's badge is the immune glyph in the
  legendary frame, and the immune note in the log is the same glyph, bare.
- One meaning never gets two icons: today 1st place is both 🏆 and 🥇, block is 🚫 and 🛡️, reflect is 🟦 and 🔵 (inventory.md).
- **1st place is the gold medal**, one icon in the badge (the Top, the fighter card's name, `!стата`), on the podium and in the
  Hall of Fame; the silver and bronze medals are the same medal in their metals, so the three read as a set. The trophy means
  the tournament itself (the plate, the sign-up strip, the bracket's `SHOW_SPRITES.trophy`), never a place. Ranked, victory and
  knockout get icons of their own in the UI batch, so 🏆 stops meaning five things.
- Before adding an icon, look it up in the inventory's "more than one meaning" table and in `icons.js`.

## Titles

- Every title shows what it gives, in its rarity frame: its mechanic, otherwise its main bonus. Main bonuses in use: HP (HP
  and HP per level), crit (crit chance and crit power), defence, effect chance, buff power.
- Mechanics: legendary (guardian, pierce, immune, dodge, chaos), mythic (opening buff, thorns, lifesteal, execute), meme (coin
  flip, sleep, cat). Each is shared by two titles of the same rarity, and the badge is the same glyph as the mechanic's log
  note, so the two titles visibly do the same thing and the note in the log matches the badge.
- In all: 5 bonus glyphs and 12 mechanic glyphs (the mechanic glyphs are also the log notes), in 7 frames.
- Icons of their own: only the divine title 999 «Владика Етеру» and, with the White Drake, «Біла сталь» (998).
- The joke stays in the name. Two titles with the same bonus show the same icon; the name tells them apart. Title 163
  «Магніт для критів» is a crit title, so a crit glyph in a rare frame, not a magnet.

## The first batch (effects and ultimates)

| Icon | Frame | Glyph | Why |
|---|---|---|---|
| Rage | buff | an angry face | the emoji's anger, as a face (bold brows, frown) |
| Burn | debuff | a flame | |
| Shield | buff | a heater shield | |
| Frost | debuff | icicles hanging from a ledge | a snowflake at 6×6 read as Blessing's star (pass 2) |
| Shadow | buff | a crescent moon | the black element's night |
| Weakness | debuff | an arrow down | the target's attacks get weaker |
| Blessing | buff | a lucky star | crit luck (a four-leaf clover doesn't hold at 6×6) |
| Mark | debuff | a target | |
| Divine Might | buff | an arrow up | one mighty attack; the opposite of Weakness |
| Dispel | debuff | a ring cracked across | round means buff, so a broken ring breaks the buffs; it also reads as ⊘ (pass 2; the gust read as "≡") |
| Regeneration | buff | a plus | healing |
| Poison | debuff | a drop | |
| Firestorm | ultimate | a meteor | |
| Ice Mirror | ultimate | a diamond mirror | |
| Shadow Theft | ultimate | a bat | |
| Jackpot | ultimate | a seven | |
| Arcane Detonation | ultimate | an X blast | |
| Bloom | ultimate | a flower | green, pink petal tips (the accent) |

Reserved for later batches, so the first batch avoids them: the heart (HP), the burst (crit), a plain sword (attacks), the drop
in red (vampire heal: a fang instead, so it doesn't look like Poison), the horseshoe / U shape (the White Drake's Магніт).

## The White Drake (after `streamer-white-drake` merges)

Waits for that branch: then `icon-set` is rebased on main and these are added, in white steel (#e8ecf2 to #8a93a3) with a green
accent (the `.el-steel` frame's green shimmer), so they never read as Black's grey:
- the bar «Луска Дракона» (a scale), and its bounce and break notes (bare glyphs: a debuff glancing off, a cracked scale);
- Перекування (buff) and Магніт (its effect, by its kind's frame), Удар ковадла (ultimate burst: an anvil);
- «Біла сталь» (title 998: its own icon in the divine-style frame) and the 🤍 emblem.
The magnet glyph is free for Магніт: title 163 becomes a crit badge.

## Still open

1. Jackpot's reels (💎 🪙 💀) and the other notes stay emoji until the notes batch; Jackpot needs three reel glyphs of its own.
2. Under deuteranopia and protanopia, Red and Gold come out as close yellows (review.html, "Without colour"). The frames and
   glyphs keep every pair apart, so nothing needs a colour change for it.
