# Icon style guide

Icons made for Drake Arena's mechanics and its UI, replacing the emoji (see inventory.md). They are pixel art like the drakes
and Press Start 2P, and each one means one thing everywhere. First batch: the 12 effects and the 6 ultimates (`icons.js`,
reviewed in `review.html`); batches 2–4 follow below.

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
| title (rarity frame) | 12×12: a 1-pixel frame around the note's 10×10 glyph | 24 px | the bare glyph, 10 px (no frame) | 36 px |
| ultimate | 12×12 | 24 px | 12 px | 36 px |
| medal (1st, 2nd, 3rd) | 12×12: a round 10 px disc under a ribbon | 24 px | 12 px | 36 px (the podium) |
| the title roulette (a wheel) | 11×11: an odd grid, so the wheel has a centre pixel | 22 px | 11 px | 33 px |
| trophy, crown, laurel (the show) | as `SHOW_SPRITES` | | | |

Why these sizes, from the inventory: the rows that hold icons in the fight are 20–22 px (log lines 20 px, chips 21 px), so a
10-pixel glyph at 2× fills a chip. Notes were planned at 8×8, but an 8×8 glyph with its outline leaves 6×6 inside, and pass 2
showed that 6×6 glyphs read as blobs: every small icon has 10×10. A title badge is the note's glyph plus a 1-pixel frame, so the
badge and the note are literally one drawing; the title badge on the fighter card grows from ~21 to 26 px to hold it (24 px +
its border, in the 108 px top row). The side column's text is 12–14 px in rows of 15–18 px, so it takes ×1, like the drake
sprites in the Top (there a title shows its bare glyph: a 12 px frame is noise). The podium medals are 24 px today.

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
  the frame's pattern, for colour-blind viewers, richer up the ladder: common plain with cut corners, uncommon light corner
  studs, rare light studs mid-side, epic notched corners lit top-left, legendary a solid gold edge lit top-left, mythic (the
  richest) a solid red edge with gold corners and a white gem on top; meme the odd one out, a dotted edge in pink and yellow
  (confetti); divine white star points at the corners. **In the Top (×1) the frame is left out**: at 12 px its pattern is
  noise, so the Top shows the bare 10 px glyph.
- **Drake emblems:** each drake's own head, drawn from its sprite, on a 10×10 tile in its colour, facing left like the
  sprites (mirrored only on the title plate's left side, so both groups face the title). The tile keeps them apart from the
  bare effect glyphs. They replace 🟥🟦⬛🟨🟪🟩🐉🤍 in names and banners. See "The emblems" below.

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
  | steel (the White Drake) | #cdd6e4 | its scale bar's white steel, with the sprite's navy outline (#151b30) and slate shade (#6a78a2) and its mane's green (#58e888) as the accent; lighter and bluer than Black's neutral grey |

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
| Miss (Jackpot) | the word | an arrow flying over an empty target, a clear gap between them, motion lines behind | grey | |
| Unblockable | the word | the brick wall crossed out in red | brick | |
| Immune | 🐉 | a bubble with a glint | the Dragon's white-blue | legendary: Абсолютний Дрейк, Дзен при 1 HP |
| Armour-piercing | ⚡ | a spear tip through a cracked armour plate | steel | legendary: Надмозок всесвіту, Той, хто прочитав патчноут |
| Chaos | ⚡ | a lightning bolt | magenta | legendary: Творець хаосу, Феєрверк хаосу |
| Guardian heal | 👼 | an angel: a halo, a head between two wings, a robe | light gold | legendary: Ангел-охоронець стрімера, Незламний модератор |
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

## The third batch (reels, emblems, bonuses, medals, UI)

| Icon | Today | Glyph | Where |
|---|---|---|---|
| Jackpot: gem / coins / bust | 💎 🪙 💀 | a cut gem / two stacked coins / a red X | the reels chip in the log (the skull is Poison's; the coin reel is not Heads or tails' coin) |
| Bonus: HP / crit / defence / effect chance / buff power | ❤️ 💥 🛡️ – – | a heart / the crit «!» / a helmet / a wand with a sparkle / a buff chip's rounded shape with an arrow up | common-to-epic title badges; `!стата` |
| 1st, 2nd, 3rd place | 🏆 and 🥇, 🥈, 🥉 | a medal: the same red ribbon with a white stripe on all three, a round disc with a rim in gold, silver or bronze, its place (1, 2, 3) bold in the middle; only the metal and the number change, and the ribbon keeps it from reading as Gold's coin. 12×12: at 10×10 the disc came out oval | the Top, the fighter card's name, `!стата`, the podium (×3), the Hall of Fame |
| The tournament | 🏆 | a trophy | the plate, the sign-up strip, tournament banners |
| Ranked battle | 🏆 | a podium | the plate, the intro banner; matchmaking replies too (🚨 → this) |
| Friendly duel | 🤝 | a smiling face (the opposite of Rage) | the plate, the intro banner |
| Victory / knockout | 🏆 | a laurel wreath | the plate, the result title |
| Draw | 🤝 | balance scales | the plate, the result title |
| Waiting, time | ⏳ | an hourglass | the plate, «хід @x», betting, time-out |
| Turn | ⚔️ | a clock dial | the plate «Хід 3 / 30» |
| Chance decides | 🎲 | a die showing five | first strike, the tournament draw (the title roulette has its own wheel: batch 4) |
| The fight is on | 🔔 | a bell | the start banner |
| Level up | ⬆️ | a double chevron up | the result card |
| Hall of Fame | 🏛️ | a temple | `!зала`, its title |
| Free title spin | 🎟️ | a ticket | `!стата`, spin replies |
| Stats | 📊 | a bar chart | the `!стата` card |
| XP | ✨ | a four-point sparkle | the result card, Gold's bonus XP |
| Reroll | 🔥 | two arrows chasing round a circle | `!рерол` replies |

Decided: chat replies (⚠️ ℹ️ 🛑 ❌ ✅ 👋 ⌛ 🤡, and «🔄 Арену перезапущено») get no prefix icon. They carry no game meaning; the
info card's tone (ok, warning, note) already says it. Where a reply names a game thing (a drake, a title, a medal, an effect),
it shows that thing's icon next to its name, as the reroll line does (the reroll icon and the new drake's emblem).

The emblems (first element sigils on rune tiles) are the drakes' heads now: see "The emblems" below.

Reserved, so the batches avoid them: a plain sword (no attack uses one), the horseshoe / U shape (the White Drake's Магніт).
The skull is Poison's: KO is the tombstone, sudden death the warning sign, Jackpot's bust the X. Crit is the «!», never a blast
(Arcane Detonation's). Heads or tails' coin has its star; the reel coins are a stack.

## The fourth batch (attacking, the roulette, the meter, the roll card, the plate, Twitch rewards)

| Icon | Today | Glyph | Where |
|---|---|---|---|
| Attacking | ⚔ | two crossed swords, steel blades, gold guards (×2) | the card's «АТАКУЄ» tab (it grows from 18 to 22 px, upward over the card's frame), the log's «⚔ @x атакує…» cell |
| The title roulette | 🎰 (odds), 🎲 (the roll card) | a prize wheel, 11×11 (a centre pixel, so the spokes are clean 1-pixel lines): eight sectors in the rarities' colours split by dark spokes, a gold rim and hub, a white pointer triangle on top pointing down into the wheel (a pointer sitting on the rim like a cap read as a bauble) | the odds card (`!шанси`), the roll card's head, the Twitch reward |
| The meter full | ✦ | the drake's own ultimate icon (×1, 12 px in the 14 px row) | «ГОТОВО» on the Element Power meter |
| A top-rarity roll | 🌟 / 🔥 / 🤪 | the rolled title's own badge at ×3 in its rarity frame, beside the shout | the roll's info card (legendary, mythic, meme; the card keeps its glow) |
| The arena's title plate | six coloured squares | the six drake emblems at ×2, three either side of «ДРЕЙК-АРЕНА», the left three mirrored so both groups face the title | `.plaque` (the plate gets about 70 px wider; it stays centred) |
| Duel challenged, accepted | ⚔️ | the friendly duel's smile | info cards |

- **Attacking is crossed swords.** A single plain sword stays reserved (no attack type uses one); the pair means only "this one
  attacks now". The turn counter keeps its clock dial.
- **The roulette gets its own wheel**, so it shares nothing with Jackpot's slot (🎰) or the die. Jackpot's emoji goes away with
  its ultimate icon; title 153 «Щасливчик рулетки» shows its bonus glyph like every rare title.
- **«ГОТОВО» shows the ultimate, not a new glyph.** A full-gauge drawing read as a cake at ×2; the ultimate's own icon says
  which ultimate is ready, and the four-point sparkle stays XP's alone. The test panel's «✦ Сила стихії» button is not on
  stream and can keep its ✦.
- **Hidden record, no icons.** The fight-start line «⚔️ … розпочався», «🚨 Рейтинговий матчмейкінг!», «🏆 Переможець … 🎉» and
  the roll shouts «🌟 ЛЕГЕНДАРНИЙ ТИТУЛ!» … are `addLog` lines, the hidden text record (`#battle-log` is `hidden`): no viewer
  sees them, and the tests read them, so they keep their text as it is. What viewers see at those moments already has its
  icon: the log's «Бій почався» banner (the bell), the intro banner (ranked or friendly), the result card (the laurel). So
  🎉 gets no icon, and the roll's shout moves into the visible roll card with the ×3 badge. Wins in `!стата` (⚔️) take the
  laurel.
- **There is no «⚔ Атаки» log tab** in the game (main or `streamer-white-drake`); the visible ⚔ are the attack tab and the
  log cell above.

**Twitch channel-point rewards.** `design/icons/twitch-rewards/`: the game's two rewards (`REWARD_ID_TITLE` the title
roulette, `REWARD_ID_REROLL` the reroll; there are no others) as `title-roulette-28/56/112.png` and `reroll-28/56/112.png`,
transparent, at whole-number scales and centred exactly (the largest scale that leaves the same margin both sides): the
11×11 wheel at ×2, ×4 and ×10, the 10×10 reroll at ×2, ×5 and ×11. Made by
`node design/icons/export-twitch.js` (re-run it after a glyph changes). Set the reroll's reward colour to anything but purple
(gold, dark or Twitch's default); the wheel reads on any colour.

## The White Drake (its kit, its emblem, the streamer card)

Drawn after `streamer-white-drake` merged (c4b5e16), in white steel with the green of its mane (`STEEL` in icons.js: the
sprite's navy outline and slate shade, never Black's neutral grey). Review: review.html sections 14–15.

| Icon | Today | Glyph | Where |
|---|---|---|---|
| Луска Дракона | the bare number; 🤍 in the log | a white scale layered over a darker one (bare, 10×10) | ×1 before the scale bar's number on the card (10 px in its 12 px row), ×2 in the log («луска -14», the anvil's «+38») |
| Bounced off the scales | 🤍 | an arrow glancing off a steel plate, a green spark where it hits | the log, after the debuff's own chip: «відскочило від луски» |
| The scales cracked | 💔 | the scale split down a red crack (#ff8a8a, the bar's own crack colour) | the log's «Луска розкололася!»; the card's number while the bar is broken |
| Перекування | ⚒️ | a sledgehammer tilted 45°, head up, green sparks off its striking face (upright, it read as a «T») | its buff chip (the card, the log, «+9») |
| Магніт | 🔗 | a horseshoe magnet with green poles | its debuff chip; it lasts the target's next attack («ще 1 атака») |
| Удар ковадла | 🔨 | an anvil, sparks flying off its face (12×12) | line 1 of its log card, the pending cell |
| «Біла сталь» (title 998) | 👑 | an upright sword in white steel, a green gem in the guard | its badge in the divine frame; the `steel` banner, «Сталь не гнеться» |
| The White Drake | 🤍 | the six drakes' head in white steel on a white-steel tile, the green eye, the Dragon's green mane swept back down its neck (`emSteel`; see "The emblems") | in names, the intro banner, replies that name it, the streamer card |

- **The scale is the bar's icon, not the emblem.** A single scale read as Jackpot's gem, the Shield or a drop at 10 px; the
  layered pair doesn't. The emblem shows the drake itself, with the mane its sprite took from the Dragon.
- **No crown on the White Drake.** 👑 stays the Sovereign's (title 999, the Sovereign's note). «Біла сталь» takes the single
  sword, kept free for it in batch 4 (attacking is the crossed pair). «Дракон це запамʼятав…» takes the White Dragon's wing.
- **Магніт is free:** title 163 «Магніт для критів» is a crit title, its badge the crit glyph in a rare frame.
- **The streamer card** (settled): the title line carries the form's title badge at ×1 (Біла сталь or Владика Етеру), the
  line under the name the emblem of the form the streamer is in, by its name (×1), so the card changes with `!дракон`. With
  no drake yet or no streamer set, the title line shows the White Dragon's emblem greyed, like the sprite beside it. 👑
  leaves the card.
- Replies that name a form show its emblem by the name; their own leading 🤍 or 🛑 goes, as decided for chat replies.
- The review's streamer card uses the game's two sprites, copied by `node design/icons/ref-sprites.js` into `ref/`.

## The emblems: the drakes' heads

Picked over the element symbols (the sigils on rune tiles, deleted). `EMBLEM_IDS` in icons.js, review.html section 16. Each is
its own sprite's head (`DRAKE_SPRITES`) in 8×8 inside the 10×10 tile: the frame in the element's colour (`m`), a dark fill
(`s`), the head facing left like the sprites. The six viewer drakes share the sprites' one head and keep the mark each sprite
has, so they differ in outline, not only in colour (one head recoloured six times read as one drake in greyscale, and under
red-green colour blindness Blue and Purple became one blue head, Red and Green two khaki ones).

| Drake | Its mark |
|---|---|
| Red | the upright cream horn, its tip curving back; the crest behind it with orange flame tips |
| Blue | the teal fin crest, a fan over the back of the head |
| Black | the flat pale-violet horns, short, straight back; the sprite's violet glow as a rim round the near-black head, so it stands out from the grey tile |
| Gold | the cream ram's horn curling round behind the eye |
| Purple | the long horns swept back to the tile's corner, longer than Black's |
| Green | the leaf blades fanning back, gaps between them |
| The White Drake | the six drakes' head in white steel, the green eye, the green mane swept back down its neck |
| The White Dragon | the wyvern's longer, lower snout and the green crown horns, so the two white heads differ in outline |

`node design/icons/test.js` checks it: every two emblems' silhouettes (the drake's pixels against the tile's, colour
ignored) differ in at least 4 pixels (the closest pair today, Purple and the White Drake, 5). A new drake's emblem must
pass it too. Where they go: names in info cards and the intro banner, the queue (instead of the 14 px colour square), the
Top (before the level; the sprite stays), the card's name line, the title plate (the left three mirrored).

## Still open

1. Under deuteranopia and protanopia, Red and Gold come out as close yellows (review.html, "Without colour"). The chips and
   glyphs keep every pair apart, so nothing needs a colour change for it.

Decided: the side column stays at ×1, `!стата` included (a 10 px icon beside 13 px text).
