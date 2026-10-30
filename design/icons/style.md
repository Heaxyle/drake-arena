# Icon style guide

Icons made for Drake Arena's mechanics and its UI, replacing the emoji (see inventory.md). They are pixel art like the drakes
and Press Start 2P, and each one means one thing everywhere. First batch: the 12 effects and the 6 ultimates (`icons.js`,
reviewed in `review.html`).

## Format

- Same as `DRAKE_SPRITES` / `SHOW_SPRITES`: a palette plus rows of palette letters, `.` transparent. Each icon is drawn once to a
  canvas and cached (`makeIconCanvas`), then used as an `<img>` / data URL.
- An icon is its glyph alone, no frame: the glyph has the whole cell. The palette comes from the element's colour
  (`paletteOf`): `o` outline, `d` dark side, `m` the colour, `h` light side, `w` highlight, and `p` / `q` for a small accent of
  the icon's own (Burn's yellow core, Jackpot's red seven, Bloom's pink blossom). When it goes into the game, the colour comes
  from `EFFECTS` / `CLASS_ULTIMATES` (`color`), so a colour change there moves the icon with it, and nothing else names an icon
  (the same rule as effect names and icons today).
- Light comes from the top left: the light side up and left, the dark side down and right, a 1-pixel dark outline around
  every shape, so it stands on any background.
- Shown only at whole-number scales (`image-rendering: pixelated`, width and height = art size × 1, 2 or 3). Never scaled by
  `fitText` or any transform: text around an icon may shrink, the icon keeps its size.

## The grid

Press Start 2P is an 8×8 font shown at 2× (16 px). The icons use the same pixel: art on a small grid, shown at 2×.

| Category | Art | ×2 (the fight) | ×1 (side column) | ×3 (big moments) |
|---|---|---|---|---|
| effect (buff / debuff) | 10×10 | 20 px | 10 px | 30 px |
| log note, attack type (bare glyph) | 10×10 | 20 px | 10 px | 30 px |
| title (rarity frame) | 12×12: a 1-pixel frame around the note's 10×10 glyph | 24 px | 12 px | 36 px |
| ultimate | 12×12 | 24 px | 12 px | 36 px |
| medal, trophy, crown | as `SHOW_SPRITES` | | | |

Why these sizes, from the inventory: the rows that hold icons in the fight are 20–22 px (log lines 20 px, chips 21 px), so a
10-pixel glyph at 2× fills a chip. Notes were planned at 8×8, but an 8×8 glyph with its outline leaves 6×6 inside, and pass 2
showed that 6×6 glyphs read as blobs: every small icon has 10×10. A title badge is the note's glyph plus a 1-pixel frame, so the
badge and the note are literally one drawing; the title badge on the fighter card grows from ~21 to 26 px to hold it (24 px +
its border, in the 108 px top row). The side column's text is 12–14 px in rows of 15–18 px, so it takes ×1, like the drake
sprites in the Top (a 12 px badge there: small, but whole pixels). The podium medals are 24 px today.

What changes in the layout when this goes in (all within the fixed heights):
- Fighter card chips: 22 px tall instead of 21, with a 2 px gap between the rows instead of 4. The block stays 46 px.
- Log line 2: an effect chip is 22 px in the 20 px line, 1 px into the 4 px gaps above and below; the line uses
  `overflow: clip` with `overflow-clip-margin: 2px` instead of `overflow: hidden`. The same goes for an ultimate's 24 px icon
  (line 1 next to the move name, and Ice Mirror's counter in line 2). The ultimate header keeps its words without the emoji.

## Where the category shows

- **Buff or debuff: the chip's shape.** Every effect icon sits in a chip (the card's chips, the log's chips, the tick chips,
  the compact chips), so the chip says which kind it is: **rounded ends = buff, angled (pointed) ends = debuff.** The chip is
  a small pixel image (`chipURL`: both end caps and a 1-pixel middle) stretched by CSS `border-image` (`chipStyle`), so the
  caps keep their shape at any width; 22 px tall, caps 8 px, a 1 px border and a light tint inside, all in the element's
  colour. The shape reads in greyscale (review.html, "Without colour"). Today's chips are green for buffs and orange for
  debuffs; with the kind in the shape, their colour becomes the element's.
- **Ultimate: its own silhouette, 12×12.** No shared shape: the ultimate's log card already says it's an ultimate (its header,
  its glow); the icon only has to say which one.
- **Log note: a bare glyph.** 10×10, no kind shape: crit, block, immune, pierce, reflect, fortune, thorns, lifesteal, execute…
  are events, not states. In the log a note is its glyph and its word in the plain square-cornered chip (grey, or green for a
  heal, red for damage back), so it never looks like an effect's rounded or angled chip.
- **Attack type: a bare glyph** leading line 1 of every log card (claws, orb, fangs), 10×10.
- **Title: a rarity frame.** 12×12: a 1-pixel frame in the rarity's colour around a dark plaque, holding the 10×10 glyph of the
  title's mechanic (the same drawing as its log note) or main bonus (`TITLE_FRAMES`, `makeTitleCanvas`). Rarity also shows in
  the frame's pattern, for colour-blind viewers: legendary a solid edge lit at the top left with a white gem on top, mythic a
  two-tone striped edge with bright corners, meme a dotted edge in pink and yellow (confetti). Common to epic come with the
  bonus glyphs (batch 3: plain, corner studs, a double edge, notched corners); divine is a frame of its own around its own icon.
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
  on its blossom stays, green leads), Burn from orange to red, Frost from pale cyan (which was the divine rarity's colour) to
  blue. An icon may carry a small accent of its own (palette letters `p` / `q`), never as its main colour.
- The chip around an effect is the element's colour too (border, tint, text).
- Titles use the rarity colour, notes the colour of what they belong to (reflect blue, fortune gold, crit the crit yellow
  #ffd23f).
- Within an element the buff, the debuff and the ultimate share a colour: the chip's shape and the glyph tell them apart.
- The shape works without colour: the chip gives buff or debuff, every glyph has its own silhouette. Checked in review.html with
  greyscale and simulated deuteranopia, protanopia and tritanopia.

## Bold silhouettes

The bar: someone who doesn't know the game names the idea on sight (anger, fire, shield, ice, shadow, weakness, luck, target,
power up, dispel, healing, poison), at least as fast as the emoji. Each icon also has to hold up when a 1080p screenshot is
shrunk to 360p, a phone viewer (a third: a 20 px icon becomes ~7 px).
- One object per glyph, the one everybody knows: a flame, a shield, a snowflake, an arrow, a star, a crosshair, a plus,
  a skull. Filled shapes over line drawings; a line is at least 2 art pixels where it carries the meaning.
- **No four-arm rotating shapes**, anywhere in the set (pinwheels, rotated clovers, hooked crosses): at a glance they can read
  as a swastika. Symmetric four-arm shapes (a plus, a snowflake, a crosshair) are fine; nothing that turns.
- Watch for accidental readings at 2× and in greyscale: pass 3's Bloom read as an anchor, its bat as a space invader, its
  broken ring as a refresh arrow. Check every new icon in the review page's at-a-glance rows before keeping it.
- Strokes are whole art pixels; nothing anti-aliased, no in-between colours at the edges.
- The outline and the light/dark sides give every glyph the same weight, so a busy log doesn't turn into colour blobs.
- At 360p the chip's colour and the glyph's mass survive; the chip's end shape and the glyph's details are for the 1080p viewer
  (review: icons-review-phone.png).

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

| Icon | Kind (chip) | Glyph | Notes |
|---|---|---|---|
| Rage | buff | an angry face: V brows, eyes looking in, a frown | |
| Burn | debuff | a flame, yellow at the core | |
| Shield | buff | a heater shield with a boss | |
| Frost | debuff | a snowflake, eight arms with branch ticks | pass 2's icicles read as a space invader; with the whole 10×10 the snowflake no longer looks like a star |
| Shadow | buff | an eclipse: a grey disc with a bright rim, lit at the top left | pass 3's hooded shade read as a ghost or a tombstone |
| Weakness | debuff | a bold arrow down | |
| Blessing | buff | a gold five-point star | pass 3's clover read as a pinwheel (see "no four-arm rotating shapes"); with Frost a snowflake, the star no longer clashes |
| Mark | debuff | a crosshair: ring, centre dot, four ticks | |
| Divine Might | buff | a bold arrow up with a sparkle | the opposite of Weakness; the chip shape and colour keep them apart |
| Dispel | debuff | Divine Might's arrow up with a slash through it | "buffs cancelled", in purple; the angled chip says debuff (pass 3's broken ring read as a refresh arrow, which !рерол will want) |
| Regeneration | buff | a bold plus | |
| Poison | debuff | a skull | |
| Firestorm | ultimate | a meteor: a hot head, a flaming trail | |
| Ice Mirror | ultimate | a tall mirror shard with glints | |
| Shadow Theft | ultimate | the classic bat: wings in a V with scalloped points, pointed ears, two yellow eyes | pass 3's read as a space invader |
| Jackpot | ultimate | a slot reel window with a red seven | |
| Arcane Detonation | ultimate | an uneven blast with a bright core | |
| Bloom | ultimate | a big five-petal flower head: green petals with pink tips, a yellow centre, a short stem | green leads; pass 3's leaves read as an anchor |

## The second batch (log notes, title mechanics, attack types)

Colour = what the note belongs to (an element's note takes the element's colour); `mechanic` in `ICONS` names the title
mechanic a note is the badge of.

| Note | Today | Glyph | Colour | Title badge of |
|---|---|---|---|---|
| Crit | 💥 | a bold «!» with impact ticks | crit yellow #ffd23f | |
| Ultra-block (Black) | 🚫 | a brick wall | Black #9b9ba8 | |
| Quantum Dodge | 🚫 (the same as ultra-block today) | three chevrons dashing right, fading behind | teal | legendary: Володар матриці, Привид лагу |
| Miss (Jackpot) | the word | an arrow flying past an empty target | grey | |
| Unblockable | the word | the brick wall crossed out in red | brick | |
| Immune | 🐉 | a bubble with a glint | the Dragon's white-blue | legendary: Абсолютний Дрейк, Дзен при 1 HP |
| Armour-piercing | ⚡ | a spear tip through a cracked armour plate | steel | legendary: Надмозок всесвіту, Той, хто прочитав патчноут |
| Chaos | ⚡ | a lightning bolt | magenta | legendary: Творець хаосу, Феєрверк хаосу |
| Guardian heal | 👼 | a halo over a winged plus | light gold | legendary: Ангел-охоронець стрімера, Незламний модератор |
| Opening buff | 🌅 | a sunrise | dawn orange | mythic: Прокинувся в ударі, Перша кава дня |
| Thorns | 🌵 | a cactus, spines out | green | mythic: Кактус з характером, Їжак-ображака |
| Title lifesteal | 🧛 | a goblet of blood | silver, red | mythic: Енергетичний вампір, Граф Дракула чату |
| Execute | ⚰️ | an axe: a steel blade on a wooden handle | steel, wood | mythic: Добивач на 1 HP, Кат лоу-хп |
| Heads or tails | 🪙 | a coin with its star | gold | meme: Герб чи число, Картопля Шредінгера |
| Slept through it | 😴 | «Zz» | blue-grey | meme: Заснув на стрімі, Лінивець-берсерк |
| The cat | 🐈 | a cat's head | orange, yellow eyes | meme: Кіт пройшовся по клавіатурі, Код-спагеті |
| The attack dissolves (the White Dragon) | 👑 | its crown | divine #9fe3ff | divine 999 (its own icon: this crown, in its own frame) |
| Aether wrath (the White Dragon) | 👑 | the Dragon's eye | divine #9fe3ff | |
| Reflect (Blue) | 🟦 | a U-turn arrow | Blue | |
| Fortune (Gold, 1 HP) | 🟨 | a heart nearly empty, a sliver left | Gold | |
| Vampire heal | 🩸 | a blood drop with a plus | blood red | |
| Sudden death | 💀 | a red warning triangle with «!» | red | |
| Knockout | 💀 | a tombstone with a cross | stone grey | |

| Attack type | Today | Glyph |
|---|---|---|
| physical | 🗡️ | three claw slashes (drakes have claws, not swords) |
| magical | 🔮 | an orb with a spark |
| vampire | 🧛 | an open mouth with two long fangs |

When this is wired in: Quantum Dodge gets its own note and word («ухил» / "dodge") instead of sharing «🚫 блок» with
ultra-block (a new `FV_TEXT` key, visual only; the fight already knows which one it was).

Reserved for later batches, so these two batches avoid them: the heart (HP; Fortune's is an empty outline with a sliver), a
plain sword (no attack uses one), the horseshoe / U shape (the White Drake's Магніт), the circular refresh arrow (!рерол). The
skull is Poison's: KO is the tombstone, sudden death the warning sign. Crit is the «!», never a blast (Arcane Detonation's).

## The White Drake (after `streamer-white-drake` merges)

Waits for that branch: then `icon-set` is rebased on main and these are added, in white steel (#e8ecf2 to #8a93a3) with a green
accent (the `.el-steel` frame's green shimmer), so they never read as Black's grey:
- the bar «Луска Дракона» (a scale), and its bounce and break notes (bare glyphs: a debuff glancing off, a cracked scale);
- Перекування (an effect: its glyph in its kind's chip) and Магніт (the same), Удар ковадла (ultimate: an anvil, its own
  silhouette);
- «Біла сталь» (title 998: its own icon in the divine-style frame) and the 🤍 emblem.
The magnet glyph is free for Магніт: title 163 becomes a crit badge.

## Still open

1. Jackpot's reels (💎 🪙 💀) stay emoji; they need three reel glyphs of their own (a plain reel coin: Heads or tails' coin means
   something else).
2. Under deuteranopia and protanopia, Red and Gold come out as close yellows (review.html, "Without colour"). The chips and
   glyphs keep every pair apart, so nothing needs a colour change for it.
3. The weakest icons now: Miss (the arrow can look attached to the target), Dispel (an arrow with a slash, clear once you know
   it) and the ×1 title badges in the Top (12 px: the frame pattern is hard to see).
4. The banners, plate and UI emoji (⏳ ⚔️ 🏆 🤝 🎲 🔔 ⬆️ ⚠️ ℹ️ 🛑 …), the drake emblems, the bonus glyphs and the common-to-epic
   frames are batch 3.
