# Emoji inventory

Every emoji the game shows on stream, from `showcase/index.html` on `main` (140b6dd). For each: what it means, where it shows and
at what size, and every emoji that means more than one thing today. Sizes are the CSS font size of the text the emoji sits in (an
emoji glyph is about that size, a little taller); "fit" means `fitText` / `fvFitLine` may shrink it further (to the minimum given).

Not counted as "shown": `addLog` lines (the hidden text record the tests read; they keep their emoji), the demo controls and the
test panel (`#cam-col`, hidden with `?obs`), tooltips (`title=` attributes: nobody can hover on stream).

The White Drake's kit (Перекування, Магніт, Удар ковадла, «Луска Дракона», the `steel` banner) lives on the
`streamer-white-drake` branch, not on `main`; it gets added here when that branch lands. Two clashes are already known: Магніт
against title 163's 🧲, and the anvil against the 🛠️ / ⚙️ titles.

## Where things show, and how big

| Place | Element | Text size | Room for an icon | Notes |
|---|---|---|---|---|
| Fighter card: effect chips | `.status-item` in `.fc-chips` | 13 px (fit, min 9) | chip 21 px tall, two rows in a 46 px block | `effectChipText`: «💢 Лють · ще 2 атаки» |
| Fighter card: title badge | `.fighter-title-badge` | 13 px (fit, min 9) | ~21 px | title icon + name |
| Fighter card: name | `.fighter-name` | 24 px | 29 px | the medal (`data-medal`, CSS `::after`) |
| Fighter card: meter | `.pm-ready`, `.pm-mirror` | 12 px | row 14 px | «✦ ГОТОВО», Ice Mirror hits left |
| Attack tab over a card | `.atk-tab` | 12 px | ~18 px | «⚔ Атакує» / an ultimate's `ultName` |
| Log card, line 1 | `.lc-move` | 15 px (fit, min 11) | line 20 px | attack type icon + move name; frozen (Frost); non-attacking ultimate |
| Log card, ultimate header | `.lc-ult` | 11 px | 13 px | «☄️ УЛЬТИМЕЙТ · Вогняний шторм» |
| Log card, line 2 | `.lc-l2` `.lk` chips | 12 px (fit, min 10.8) | line 20 px, chip ~14 px | notes, effect chips, ticks; compact form = icon + number |
| Log cell: pending / wait / KO | `.lc-cell` | 14 px (fit, min 10) | 58 px cell | «⚔ @x атакує…», «⏳ хід @x», «💀 @x вибуває», an ultimate's icon |
| Log banners | `.log-banner` | 13 px (sudden death 14 px) | ~20 px | intro, start, opening buff, sudden death, time-out, error |
| Result card | `.lr-title` 16 px, `.lr-grid` 15 px, `.lr-note` 13 px | | | knockout / draw / time-out titles, the no-record note |
| Arena plate | `#status-plate` 15 px, `#fight-type` 13 px | | ~28 px | ⏳ ⚔️ 🏆 🤝 |
| Countdown | `.cd-sub` 14 px (13 px with the bracket), `.cd-title` 20 px | | | 🎲, 🏆 |
| Top (leaderboard) | `.lb-name` 15 px, `.lb-sub` 12 px (fit, min 9) | | row 44 px | medal after the name; title icon in the sub-line; sprites at 1× |
| Streamer card | `.sc-title` 12 px | | | 👑 / the streamer's title icon |
| Info cards (chat replies) | `.ic-head` 14 px, `.ic-row` 13 px, `.info-card` 14 px | | | `!стата`, roulette, refusals, joins |
| Podium | `.pd-medal` | 24 px | | 🥇 🥈 🥉 |
| Hall of Fame | `.hf-p` (inherits 15 px), `.hf-best` 15 px | | row 34 px | 🥇 🥈 🥉, 🏆×n |
| Tournament show | `.ts-slam` 20 px PS2P, `.tsb-*` 16 px | | | already pixel sprites: `SHOW_SPRITES` crown, trophy, laurel, headCrown |

The game's pixel text is Press Start 2P, an 8×8 grid shown at 2× (16 px: the plaque, HP numbers, damage numbers). The drake
sprites are 48×36 at 3× on the cards and 1× in the Top.

## 1. Effects (`EFFECTS`)

Shown through `fxName` / `effectChipText` / `fvFxChip` / `fvTickChip` / `fvUsedChip`: fighter card chips (13 px), log line 2 chips
(12 px; compact = icon alone), tick chips («🔥 -9»), Frost's line 1 (15 px), the opening-buff banner (13 px), Bloom / Detonation /
Theft lists in line 2.

| Effect | Emoji | Kind | Element | Colour | What it does |
|---|---|---|---|---|---|
| Лють / Rage | 💢 | buff | red | #ff4d4d | next 2 own attacks +40% damage, takes +15% |
| Підпал / Burn | 🔥 | debuff | red | #ff7a1a | 5% max HP at the start of the target's next 3 turns |
| Щит / Shield | 🛡️ | buff | blue | #00bfff | next 2 hits taken −30% |
| Мороз / Frost | ❄️ | debuff | blue | #9fe3ff | the target skips its next attack |
| Тінь / Shadow | 🌑 | buff | black | #b27cff | +25% ultra-block chance, next 2 hits taken |
| Слабкість / Weakness | 🥀 | debuff | black | #c77dff | the target's next 2 attacks −40% |
| Благословіння / Blessing | 🍀 | buff | gold | #ffd700 | next 2 own attacks +60% crit chance |
| Мітка / Mark | 🎯 | debuff | gold | #ffb000 | the next hit on the target is a crit |
| Божественна міць / Divine Might | 🌟 | buff | purple | #e0a8ff | next own attack ×1.55, can't be blocked |
| Розвіювання / Dispel | 💨 | debuff | purple | #d0d0e0 | removes all the target's buffs (instant: never on a card) |
| Регенерація / Regeneration | 💚 | buff | green | #41ff41 | heals 6.5% max HP at the start of the next 3 own turns |
| Отруєння / Poison | ☠️ | debuff | green | #7dff4d | 3% max HP for 3 turns, healing −50% |

Black's effect colours (#b27cff, #c77dff) are purple, close to purple's own (#e0a8ff), while the black element's frame is grey
(#a7aab4). See style.md, open questions.

## 2. Class ultimates (`CLASS_ULTIMATES`) and the meter (`METER`)

Shown through `ultName` / `ultLabel`: the log card's header (11 px) and line 1 (15 px, for Ice Mirror and Bloom, which don't
attack), the pending cell (14 px), the attack tab (12 px), the mirror counter in line 2 and on the card's meter row (12 px).

| Ultimate | Emoji | Element | Colour |
|---|---|---|---|
| Вогняний шторм / Firestorm | ☄️ | red | #ff6a3d |
| Крижане дзеркало / Ice Mirror | 💠 | blue | #7fdcff |
| Крадіжка тіні / Shadow Theft | 🦇 | black | #b27cff |
| Джекпот / Jackpot | 🎰 | gold | #ffd700 |
| Арканна детонація / Arcane Detonation | ✴️ | purple | #e0a8ff |
| Цвітіння / Bloom | 🌸 | green | #ff9ad5 |

Jackpot's reels: 💎 (gem, ×1 each), 🪙 (nothing), 💀 (two or more = a miss), in a `.lk.reels` chip, 12 px.
Meter: «✦ ГОТОВО» / «✦ READY» (`.pm-ready`, 12 px), the test panel's «✦ Сила стихії» button. The pips are already CSS pixels.

## 3. Log notes (fight view, `FV_TEXT` and `fvCardHtml`)

All in log line 2 chips (12 px, compact = the icon, `fvIcon` takes the first word), except where noted.

| Note | Emoji | Meaning | Where else that emoji shows |
|---|---|---|---|
| crit | 💥 | the hit is a crit (`.lc-critchip`, line 1, 12 px) | `!стата` crit chance; title 93 |
| block | 🚫 | Black's ultra-block or Quantum Dodge stopped the hit | — |
| immune | 🐉 | debuff immunity (Absolute Drake / the Dragon) | White Dragon emblem, titles 92/98, `noRecord`, «drake created» |
| sovereign | 👑 | the White Dragon's passive dissolves the attack | wrath, title 999, title 86, streamer card |
| wrath | 👑 | the White Dragon's «aether wrath» | sovereign (same emoji, a different event) |
| pierce | ⚡ | armour-piercing (sneaky attacks, Superbrain) | chaos, titles 82/100/169 |
| chaos | ⚡ | Chaos Creator's explosion (keeps its word when compact) | pierce |
| unblockable | (none, a word) | Firestorm / Divine Might can't be blocked | with Divine: «🌟 не блокується» |
| reflect | 🟦 | Blue's reflect, «🟦 відбиває -n» | Blue drake emblem |
| fortune | 🟨 | Gold's Fortune: leaves 1 HP | Gold drake emblem |
| thorns | 🌵 | thorns damage back | title 183 |
| lifesteal | 🧛 | title lifesteal heal | vampire attack type, title 185 |
| vampire heal | 🩸 | a vampire attack's heal, «🩸 +19» | — |
| execute | ⚰️ | Executioner's bonus | title 187 |
| coin | 🪙 | Heads or Tails, «🪙 ×1.5» | Jackpot reel, title 189 |
| sleep | 😴 | Fell Asleep: the attack did nothing | titles 49, 191 |
| guardian | 👼 | Guardian Angel's heal | title 96 |
| cat | 🐈 | the cat walked on the keyboard | title 193 |
| mirror | 💠 | Ice Mirror absorbed part of the hit, «💠 30 → 20» | the ultimate |
| sudden death | 💀 | «💀 ×1.6» on every hit from turn 16; the banner | KO, Jackpot skull, losses in `!стата` |
| KO cell | 💀 | «💀 @x вибуває» (`.lc-cell.ko`, 14 px) | as above |
| up next | ⏳ | «⏳ хід @x» (14 px) | time-out, waiting plate, betting, queue replies, title 88 |
| attacking | ⚔ | «⚔ @x атакує…» (14 px), the attack tab | the turn plate ⚔️, `!стата` wins |
| time-out | ⏳ | banner and result title | as up next |
| first strike | 🎲 | «🎲 першим б’є @x» (banner, countdown) | the draw plate, title roulette, title 91 |
| fight start | 🔔 | the start banner | — |
| error | ❌ | simulation error banner | duel declined |
| knockout | 🏆 | result title «🏆 НОКАУТ» | ranked fights, victory, tournament, medals |
| draw | 🤝 | result title, plate | friendly duel |
| level up | ⬆️ | result card | — |
| new turns | ↓ | the scroll pill (a character, not an emoji) | — |
| opening buff | 🌅 | (hidden `addLog` only; the banner uses the title's own icon) | title 181 |

## 4. Attack types (`ATTACK_ICONS`) and weights

Line 1 of every log card, before the move name (15 px).

| Type | Emoji | Notes |
|---|---|---|
| physical | 🗡️ | light / heavy / sneaky are not shown with an icon: the move name tells them apart (`MOVE_NAMES`) |
| magical | 🔮 | the same emoji as title 168 |
| vampire | 🧛 | lifesteal note, title 185 |

The weights (light, heavy, sneaky) have no emoji today. Sneaky shows as the pierce note (⚡).

## 5. Titles (`TITLES_DB`)

The title icon shows in the fighter card's badge (13 px), the Top's sub-line (12 px), the streamer card (12 px), `!стата` and
roulette info cards (13–14 px), the opening-buff banner (13 px). Roulette results add a line by rarity: 🌟 legendary,
🔥 mythic, 🤪 meme. The rarity is shown by colour today (`RARITIES[r].color`, the `.rarity-tag`).

195 titles: 80 common, 30 uncommon, 40 rare, 20 epic, 10 legendary, 8 mythic, 6 meme, 1 divine (999, the White Dragon's).
Common to epic are stat titles, legendary to divine have a mechanic (`MECH`).

Emoji shared by more than one title today: 📦 1, 144 · 🛋️ 3, 39, 47 · 🥱 6, 21, 143 · 🛜 9, 85 · 🐱 10, 57 · 🖱️ 14, 66, 72, 73 ·
📺 15, 54, 104 · 🥐 17, 58 · 🧠 18, 97 · 🧊 19, 149 · ☕ 20, 64, 95, 182 · 🛌 22, 35, 44, 51 · 🪑 23, 122 · 🦥 24, 192 · 💡 26, 124 ·
🤫 29, 43, 52, 55 · 👀 34, 53 · ⏳ 36, 88 · 🌪️ 38, 173 · 🔌 40, 41, 150 · 🍵 45, 56 · ⏰ 48, 109 · 😴 49, 191 · 🧦 50, 135 · 🧐 59, 87 ·
🥔 136, 190 · ⌨️ 63, 105 · 🎲 91, 115 · 🃏 61, 68 · 🏆 67, 94 · 👻 69, 179 · 🛡️ 76, 151, 176 · ⚡ 82, 100, 169 · 👑 86, 999 · 🐉 92, 98.
Several of these pair titles with different bonuses (☕ 20 is HP, 95 HP, 182 the opening buff), so today the emoji tells nothing.

"Proposed icon" follows style.md: common to legendary show what the title gives (its mechanic, or its biggest stat bonus) in
its rarity frame; mythic, meme and divine get their own icon. The "main bonus" is the stat with the biggest share of the title's
value; crit and crit power count as one (crit).

| id | rarity | now | name (uk / en) | gives | proposed icon |
|---|---|---|---|---|---|
| 1 | common | 📦 | Сесійний трайхардер / Session Tryhard | HP +9 | bonus: HP |
| 2 | common | 🥟 | Сонний пельмень / Sleepy Dumpling | crit +10% | bonus: crit |
| 3 | common | 🛋️ | Майстер диванних військ / Couch Forces Master | defence +7% | bonus: defence |
| 4 | common | 🤓 | Професійний буквоїд / Professional Nitpicker | HP +9 | bonus: HP |
| 5 | common | 🍕 | Володар піци / Pizza Lord | crit +10% | bonus: crit |
| 6 | common | 🥱 | Спеціаліст з нічого / Specialist in Nothing | defence +7% | bonus: defence |
| 7 | common | 💤 | Любитель поспати / Sleep Enthusiast | HP +9 | bonus: HP |
| 8 | common | 😱 | Генерал паніки / Panic General | crit +10% | bonus: crit |
| 9 | common | 🛜 | Король лагів / Lag King | defence +7% | bonus: defence |
| 10 | common | 🐱 | Володар котів / Cat Lord | HP +9 | bonus: HP |
| 11 | common | 🍳 | Частий гість кухні / Frequent Kitchen Guest | crit +10% | bonus: crit |
| 12 | common | 🧪 | Побутовий алхімік / Household Alchemist | defence +7% | bonus: defence |
| 13 | common | 🕰️ | Магістр прокрастинації / Procrastination Master | HP +9 | bonus: HP |
| 14 | common | 🖱️ | Оператор мишки / Mouse Operator | crit +10% | bonus: crit |
| 15 | common | 📺 | Володар пульта / Remote Controller | defence +7% | bonus: defence |
| 16 | common | 🛏️ | Диванний лорд / Couch Lord | HP +9 | bonus: HP |
| 17 | common | 🥐 | Збирач крихт / Crumb Collector | crit +10% | bonus: crit |
| 18 | common | 🧠 | Побутовий філософ / Household Philosopher | defence +7% | bonus: defence |
| 19 | common | 🧊 | Патрульний холодильника / Fridge Patrol | HP +9 | bonus: HP |
| 20 | common | ☕ | Магістр кавоваріння / Coffee Brewing Master | crit +10% | bonus: crit |
| 21 | common | 🥱 | Чемпіон з позіхання / Yawning Champion | defence +7% | bonus: defence |
| 22 | common | 🛌 | Володар ковдри / Blanket Lord | HP +9 | bonus: HP |
| 23 | common | 🪑 | Лицар табуретки / Stool Knight | crit +10% | bonus: crit |
| 24 | common | 🦥 | Генерал лінощів / Laziness General | defence +7% | bonus: defence |
| 25 | common | 📖 | Майстер казки / Fairytale Master | HP +9 | bonus: HP |
| 26 | common | 💡 | Капітан очевидність / Captain Obvious | crit +10% | bonus: crit |
| 27 | common | 🤡 | Спеціаліст з мемів / Meme Specialist | defence +7% | bonus: defence |
| 28 | common | 🧺 | Володар брудної білизни / Dirty Laundry Lord | HP +9 | bonus: HP |
| 29 | common | 🤫 | Директор тиші / Silence Director | crit +10% | bonus: crit |
| 30 | common | ❓ | Експерт з питань / Q&A Expert | defence +7% | bonus: defence |
| 31 | common | 🩴 | Володар капців / Slipper Lord | HP +9 | bonus: HP |
| 32 | common | 🍔 | Нічний жерун / Night Eater | crit +10% | bonus: crit |
| 33 | common | 📑 | Король вкладок / Tab King | defence +7% | bonus: defence |
| 34 | common | 👀 | Спеціаліст з поглядів / Gaze Specialist | HP +9 | bonus: HP |
| 35 | common | 🛌 | Буріто з ковдри / Blanket Burrito | crit +10% | bonus: crit |
| 36 | common | ⏳ | Той, хто ще 5 хвилиночок / Just 5 More Minutes | defence +7% | bonus: defence |
| 37 | common | 🕸️ | Володар павутиння / Cobweb Lord | HP +9 | bonus: HP |
| 38 | common | 🌪️ | Генерал хаосу / Chaos General | crit +10% | bonus: crit |
| 39 | common | 🛋️ | Патрульний залу / Hall Patrol | defence +7% | bonus: defence |
| 40 | common | 🔌 | Лицар розетки / Outlet Knight | HP +9 | bonus: HP |
| 41 | common | 🔌 | Володар кабелів / Cable Lord | crit +10% | bonus: crit |
| 42 | common | 🥜 | Король лушпиння / Husk King | defence +7% | bonus: defence |
| 43 | common | 🤫 | Шепіт у голосовому / Voice Chat Whisperer | HP +9 | bonus: HP |
| 44 | common | 🛌 | Будівельник фортеці з подушок / Pillow Fort Builder | crit +10% | bonus: crit |
| 45 | common | 🍵 | Володар чашки / Cup Lord | defence +7% | bonus: defence |
| 46 | common | 🪄 | Побутовий маг / Household Mage | HP +9 | bonus: HP |
| 47 | common | 🛋️ | Спеціаліст з диванів / Couch Specialist | crit +10% | bonus: crit |
| 48 | common | ⏰ | Капітан «потім зроблю» / Captain «I'll do it later» | defence +7% | bonus: defence |
| 49 | common | 😴 | Директор сну / Sleep Director | HP +9 | bonus: HP |
| 50 | common | 🧦 | Володар шкарпеток / Sock Lord | crit +10% | bonus: crit |
| 51 | common | 🛌 | Патрульний ліжка / Bed Patrol | defence +7% | bonus: defence |
| 52 | common | 🤫 | Король мʼюту / Mute King | HP +9 | bonus: HP |
| 53 | common | 👀 | Той, хто читає чат із затримкою / Reads Chat on Delay | crit +10% | bonus: crit |
| 54 | common | 📺 | Друга серія того ж серіалу / Same Show, Next Episode | defence +7% | bonus: defence |
| 55 | common | 🤫 | Генерал «я на хвилинку» / "Be Right Back" General | HP +9 | bonus: HP |
| 56 | common | 🍵 | Лицар чаю / Tea Knight | crit +10% | bonus: crit |
| 57 | common | 🐱 | Котячий дворецький / Cat Butler | defence +7% | bonus: defence |
| 58 | common | 🥐 | Хранитель останнього шматочка / Keeper of the Last Slice | HP +9 | bonus: HP |
| 59 | common | 🧐 | Побутовий критик / Household Critic | crit +10% | bonus: crit |
| 60 | common | 💭 | Спеціаліст з мрій / Dream Specialist | defence +7% | bonus: defence |
| 131 | common | 🎧 | Слухач без мікрофона / Listener Without a Mic | HP +9 | bonus: HP |
| 132 | common | 🍜 | Магістр мівіни / Instant Noodle Master | crit +10% | bonus: crit |
| 133 | common | 📱 | Скролер до третьої ночі / 3 AM Scroller | defence +7% | bonus: defence |
| 134 | common | 🔋 | Вічні 3% заряду / Forever at 3% Battery | HP +9 | bonus: HP |
| 135 | common | 🧦 | Шкарпетка-одиначка / The Lonely Sock | crit +10% | bonus: crit |
| 136 | common | 🥔 | Картопляний стратег / Potato Strategist | defence +7% | bonus: defence |
| 137 | common | 🪴 | Той, хто забув полити кактус / Forgot to Water the Cactus | HP +9 | bonus: HP |
| 138 | common | 🛒 | Турист інтернет-магазинів / Online Shopping Tourist | crit +10% | bonus: crit |
| 139 | common | 🔕 | Хранитель беззвучного режиму / Keeper of Silent Mode | defence +7% | bonus: defence |
| 140 | common | 🍞 | Батон на ранок / Loaf for the Morning | HP +9 | bonus: HP |
| 141 | common | 🧃 | Сік без трубочки / Juice Box Without a Straw | crit +10% | bonus: crit |
| 142 | common | 🐌 | Равлик-спринтер / Sprinting Snail | defence +7% | bonus: defence |
| 143 | common | 🥱 | Прокинувся на обід / Woke Up at Lunch | HP +9 | bonus: HP |
| 144 | common | 📦 | Колекціонер коробок «а раптом знадобиться» / Box Collector ("Might Need It") | crit +10% | bonus: crit |
| 145 | common | 🧂 | Солоний після програшу / Salty After a Loss | defence +7% | bonus: defence |
| 146 | common | 🎮 | Знову «ще один матч» / "Just One More Match" Again | HP +9 | bonus: HP |
| 147 | common | 🍪 | Печивко з верхньої полиці / Top-Shelf Cookie | crit +10% | bonus: crit |
| 148 | common | 👁️ | Сплю з відкритими очима / Sleeps With Eyes Open | defence +7% | bonus: defence |
| 149 | common | 🧊 | Кубик льоду в чаї / Ice Cube in the Tea | HP +9 | bonus: HP |
| 150 | common | 🔌 | Зарядка на 20 сантиметрів / 20-Centimeter Charger Cable | crit +10% | bonus: crit |
| 101 | uncommon | 🙋 | Той, хто пише «привіт» о 3 ночі / Says "Hi" at 3 AM | HP +18 | bonus: HP |
| 102 | uncommon | 🔇 | Модератор без банхамера / Mod Without a Banhammer | crit +16% | bonus: crit |
| 103 | uncommon | 🕹️ | Чемпіон AFK / AFK Champion | defence +13% | bonus: defence |
| 104 | uncommon | 📺 | Шукач пульта між подушками / Remote Hunter (Between Cushions) | effect chance +15% | bonus: effect chance |
| 105 | uncommon | ⌨️ | Капслок-оратор / Caps Lock Orator | HP +18 | bonus: HP |
| 106 | uncommon | 🐢 | Інтернет на 2 мегабіти / 2 Megabit Internet | crit +16% | bonus: crit |
| 107 | uncommon | 🍿 | Глядач з попкорном / Popcorn Spectator | defence +13% | bonus: defence |
| 108 | uncommon | 🎤 | Співак у душі / Shower Singer | effect chance +15% | bonus: effect chance |
| 109 | uncommon | ⏰ | Будильник з кнопкою «ще 5» / Snooze Button Alarm | HP +18 | bonus: HP |
| 110 | uncommon | 🧹 | Прибирає тільки перед гостями / Cleans Only Before Guests | crit +16% | bonus: crit |
| 111 | uncommon | 🐸 | Любитель смайлика з жабкою / Frog Emote Fan | defence +13% | bonus: defence |
| 112 | uncommon | 🧀 | Сирний барон / Cheese Baron | effect chance +15% | bonus: effect chance |
| 113 | uncommon | 🌙 | Нічна сова чату / Chat Night Owl | HP +18 | bonus: HP |
| 114 | uncommon | 🥤 | Повелитель енергетиків / Energy Drink Overlord | crit +16% | bonus: crit |
| 115 | uncommon | 🎲 | Везунчик на кубиках / Lucky Dice Roller | defence +13% | bonus: defence |
| 116 | uncommon | 🫖 | Чайний церемоніймейстер / Tea Ceremony Master | effect chance +15% | bonus: effect chance |
| 117 | uncommon | 📸 | Скріншотер моментів / Moment Screenshotter | HP +18 | bonus: HP |
| 118 | uncommon | 🗯️ | Майстер «ну я ж казав» / "Told You So" Master | crit +16% | bonus: crit |
| 119 | uncommon | 🦆 | Гумова качечка / Rubber Duck | defence +13% | bonus: defence |
| 120 | uncommon | 🍍 | Ананас на піці (серйозно) / Pineapple on Pizza (Seriously) | effect chance +15% | bonus: effect chance |
| 121 | uncommon | 🚪 | Пішов на хвилинку (годину тому) / Back in a Minute (an Hour Ago) | HP +18 | bonus: HP |
| 122 | uncommon | 🪑 | Лицар крісла, що скрипить / Knight of the Squeaky Chair | crit +16% | bonus: crit |
| 123 | uncommon | 🤳 | Селфі на фоні стріму / Selfie With the Stream | defence +13% | bonus: defence |
| 124 | uncommon | 💡 | Геніальна ідея о 4 ранку / Genius Idea at 4 AM | effect chance +15% | bonus: effect chance |
| 125 | uncommon | 🌮 | Тако щодня / Taco Every Day | HP +18 | bonus: HP |
| 126 | uncommon | 🐈‍⬛ | Той, чий кіт важливіший / Whose Cat Matters More | crit +16% | bonus: crit |
| 127 | uncommon | 📝 | Писав повідомлення, але стер / Typed a Message, Then Deleted It | defence +13% | bonus: defence |
| 128 | uncommon | 🎯 | Промахнувся по кнопці / Missed the Button | effect chance +15% | bonus: effect chance |
| 129 | uncommon | 🧸 | Плюшевий охоронець / Plush Bodyguard | HP +18 | bonus: HP |
| 130 | uncommon | 🍩 | Пончиковий кур'єр / Donut Courier | crit +16% | bonus: crit |
| 61 | rare | 🃏 | Король смішних мемів / Funny Meme King | HP +26, HP/level +0.3 | bonus: HP |
| 62 | rare | 🌐 | Володар швидкого інтернету / Fast Internet Lord | crit +14%, crit power +0.22 | bonus: crit |
| 63 | rare | ⌨️ | Гроза клавіатури / Keyboard Menace | defence +12%, HP +10 | bonus: defence |
| 64 | rare | ☕ | Експерт з кави / Coffee Expert | effect chance +15%, crit +8% | bonus: effect chance |
| 65 | rare | ☀️ | Володар світлої сторони / Light Side Lord | HP +26, HP/level +0.3 | bonus: HP |
| 66 | rare | 🖱️ | Майстер правої кнопки / Right Click Master | crit +14%, crit power +0.22 | bonus: crit |
| 67 | rare | 🏆 | Побутовий кіберспортсмен / Household Esportsman | defence +12%, HP +10 | bonus: defence |
| 68 | rare | 🃏 | Директор жартів / Director of Jokes | effect chance +15%, crit +8% | bonus: effect chance |
| 69 | rare | 👻 | Володар хорор-ігор / Horror Game Lord | HP +26, HP/level +0.3 | bonus: HP |
| 70 | rare | ⚖️ | Генерал балансу / Balance General | crit +14%, crit power +0.22 | bonus: crit |
| 71 | rare | 🎥 | Король стрімінгу / Streaming King | defence +12%, HP +10 | bonus: defence |
| 72 | rare | 🖱️ | Магістр кліків / Click Master | effect chance +15%, crit +8% | bonus: effect chance |
| 73 | rare | 🖱️ | Лицар Ctrl+Z / Ctrl+Z Knight | HP +26, HP/level +0.3 | bonus: HP |
| 74 | rare | 💸 | Володар донатів / Donation Lord | crit +14%, crit power +0.22 | bonus: crit |
| 75 | rare | 📰 | Спеціаліст з гарних новин / Good News Specialist | defence +12%, HP +10 | bonus: defence |
| 76 | rare | 🛡️ | Патрульний чату / Chat Patrol | effect chance +15%, crit +8% | bonus: effect chance |
| 77 | rare | ⚔️ | Король модерації / Moderation King | HP +26, HP/level +0.3 | bonus: HP |
| 78 | rare | 😎 | Майстер смайликів / Emoji Master | crit +14%, crit power +0.22 | bonus: crit |
| 79 | rare | 🐛 | Володар багів / Bug Lord | defence +12%, HP +10 | bonus: defence |
| 80 | rare | 🛠️ | Генерал патчів / Patch General | effect chance +15%, crit +8% | bonus: effect chance |
| 81 | rare | ⚙️ | Експерт з оптимізації / Optimization Expert | HP +26, HP/level +0.3 | bonus: HP |
| 82 | rare | ⚡ | Підвищені налаштування / High Settings | crit +14%, crit power +0.22 | bonus: crit |
| 83 | rare | 🖥️ | Король 2K моніторів / 2K Monitor King | defence +12%, HP +10 | bonus: defence |
| 84 | rare | 🎨 | Магістр FPS / FPS Master | effect chance +15%, crit +8% | bonus: effect chance |
| 85 | rare | 🛜 | Лицар гарного пінгу / Good Ping Knight | HP +26, HP/level +0.3 | bonus: HP |
| 151 | rare | 🛡️ | Щит від спойлерів / Spoiler Shield | crit +14%, crit power +0.22 | bonus: crit |
| 152 | rare | 🔥 | Гарячий дубль / Hot Take | defence +12%, HP +10 | bonus: defence |
| 153 | rare | 🎰 | Щасливчик рулетки / Roulette Lucky Charm | effect chance +15%, crit +8% | bonus: effect chance |
| 154 | rare | 🧙 | Чарівник Wi-Fi / Wi-Fi Wizard | HP +26, HP/level +0.3 | bonus: HP |
| 155 | rare | 🎬 | Режисер хайлайтів / Highlight Director | crit +14%, crit power +0.22 | bonus: crit |
| 156 | rare | 🕵️ | Детектив з пошуку багів / Bug-Hunting Detective | defence +12%, HP +10 | bonus: defence |
| 157 | rare | 🚀 | Пінг нуль / Zero Ping | effect chance +15%, crit +8% | bonus: effect chance |
| 158 | rare | 📢 | Голос чату / Voice of Chat | HP +26, HP/level +0.3 | bonus: HP |
| 159 | rare | 🥇 | Перша кров арени / Arena First Blood | crit +14%, crit power +0.22 | bonus: crit |
| 160 | rare | 🍀 | Чотирилисник на щастя / Four-Leaf Clover | defence +12%, HP +10 | bonus: defence |
| 161 | rare | 🌶️ | Гострий на язик / Sharp Tongue | effect chance +15%, crit +8% | bonus: effect chance |
| 162 | rare | 🔪 | Ніж у масло / Knife Through Butter | HP +26, HP/level +0.3 | bonus: HP |
| 163 | rare | 🧲 | Магніт для критів / Crit Magnet | crit +14%, crit power +0.22 | bonus: crit |
| 164 | rare | 🌊 | Цунамі емодзі / Emoji Tsunami | defence +12%, HP +10 | bonus: defence |
| 165 | rare | 🏹 | Снайпер з дивана / Couch Sniper | effect chance +15%, crit +8% | bonus: effect chance |
| 86 | epic | 👑 | Імператор чату / Chat Emperor | crit power +0.4, crit +8% | bonus: crit |
| 87 | epic | 🧐 | Легендарний буквоїд / Legendary Nitpicker | HP/level +1.1, HP +44 | bonus: HP |
| 88 | epic | ⏳ | Титан прокрастинації / Procrastination Titan | buff power +40%, effect chance +12% | bonus: buff power |
| 89 | epic | 🌌 | Володар всесвіту / Universe Lord | crit +12%, crit power +0.28 | bonus: crit |
| 90 | epic | 🧙‍♂️ | Архімаг стріму / Stream Archmage | crit power +0.4, crit +8% | bonus: crit |
| 91 | epic | 🎲 | Бог рандому / RNG God | HP/level +1.1, HP +44 | bonus: HP |
| 92 | epic | 🐉 | Легенда дрейк-арени / Drake Arena Legend | buff power +40%, effect chance +12% | bonus: buff power |
| 93 | epic | 💥 | Повелитель критичних ударів / Critical Strike Lord | crit +12%, crit power +0.28 | bonus: crit |
| 94 | epic | 🏆 | Міфічний кіберспортсмен / Mythic Esportsman | crit power +0.4, crit +8% | bonus: crit |
| 95 | epic | ☕ | Володар абсолютної кави / Absolute Coffee Lord | HP/level +1.1, HP +44 | bonus: HP |
| 166 | epic | 🌋 | Вулкан емоцій / Emotion Volcano | buff power +40%, effect chance +12% | bonus: buff power |
| 167 | epic | 🦅 | Орел з вайфаєм / Eagle With Wi-Fi | crit +12%, crit power +0.28 | bonus: crit |
| 168 | epic | 🔮 | Провидець рандому / RNG Seer | crit power +0.4, crit +8% | bonus: crit |
| 169 | epic | ⚡ | Блискавка в пляшці / Lightning in a Bottle | HP/level +1.1, HP +44 | bonus: HP |
| 170 | epic | 🐺 | Вовк-одинак (у дуо) / Lone Wolf (in Duos) | buff power +40%, effect chance +12% | bonus: buff power |
| 171 | epic | 🏰 | Власник замку з подушок / Pillow Castle Owner | crit +12%, crit power +0.28 | bonus: crit |
| 172 | epic | 🎻 | Скрипаль на нервах / Violinist on Edge | crit power +0.4, crit +8% | bonus: crit |
| 173 | epic | 🌪️ | Ураган у чашці чаю / Storm in a Teacup | HP/level +1.1, HP +44 | bonus: HP |
| 174 | epic | 🦖 | Динозавр чату / Chat Dinosaur | buff power +40%, effect chance +12% | bonus: buff power |
| 175 | epic | 🦇 | Нічний вампір стріму / Stream Night Vampire | crit +12%, crit power +0.28 | bonus: crit |
| 96 | legendary | 👼 | Ангел-охоронець стрімера / Streamer Guardian Angel | guardian_shield + HP +12 | mechanic: guardian (heal at low HP) |
| 97 | legendary | 🧠 | Надмозок всесвіту / Universal Superbrain | armor_piercer + crit power +0.5 | mechanic: pierce |
| 98 | legendary | 🐉 | Абсолютний Дрейк / Absolute Drake | debuff_immunity + HP +15 | mechanic: immune |
| 99 | legendary | 🌀 | Володар матриці / Matrix Lord | quantum_dodge + HP +16 | mechanic: dodge |
| 100 | legendary | ⚡ | Творець хаосу / Chaos Creator | chaotic_charge + effect chance +15% | mechanic: chaos |
| 176 | legendary | 🛡️ | Незламний модератор / Unbreakable Moderator | guardian_shield + HP +12 | mechanic: guardian (heal at low HP) |
| 177 | legendary | 📜 | Той, хто прочитав патчноут / Read the Patch Notes | armor_piercer + crit power +0.5 | mechanic: pierce |
| 178 | legendary | 🧘 | Дзен при 1 HP / Zen at 1 HP | debuff_immunity + HP +15 | mechanic: immune |
| 179 | legendary | 👻 | Привид лагу / Lag Ghost | quantum_dodge + HP +16 | mechanic: dodge |
| 180 | legendary | 🎆 | Феєрверк хаосу / Chaos Fireworks | chaotic_charge + effect chance +15% | mechanic: chaos |
| 181 | mythic | 🌅 | Прокинувся в ударі / Woke Up Swinging | opening_buff + HP +20, effect chance +10%, HP/level +1.1 | own icon (opening buff mechanic) |
| 182 | mythic | ☕ | Перша кава дня / First Coffee of the Day | opening_buff + HP +20, effect chance +10%, HP/level +1.1 | own icon (opening buff mechanic) |
| 183 | mythic | 🌵 | Кактус з характером / Cactus With Attitude | thorns + HP +15, HP/level +1.1 | own icon (thorns mechanic) |
| 184 | mythic | 🦔 | Їжак-ображака / Grumpy Hedgehog | thorns + HP +15, HP/level +1.1 | own icon (thorns mechanic) |
| 185 | mythic | 🧛 | Енергетичний вампір / Energy Vampire | lifesteal + HP +15, crit +8%, HP/level +1.1 | own icon (lifesteal mechanic) |
| 186 | mythic | 🍷 | Граф Дракула чату / Count Dracula of Chat | lifesteal + HP +15, crit +8%, HP/level +1.1 | own icon (lifesteal mechanic) |
| 187 | mythic | ⚰️ | Добивач на 1 HP / 1 HP Finisher | executioner + crit +12%, HP +20, HP/level +1.1 | own icon (execute mechanic) |
| 188 | mythic | 🪓 | Кат лоу-хп / Low-HP Executioner | executioner + crit +12%, HP +20, HP/level +1.1 | own icon (execute mechanic) |
| 189 | meme | 🪙 | Герб чи число / Heads or Tails | coin_flip + HP +20 | own icon (coin flip mechanic) |
| 190 | meme | 🥔 | Картопля Шредінгера / Schrödinger's Potato | coin_flip + HP +20 | own icon (coin flip mechanic) |
| 191 | meme | 😴 | Заснув на стрімі / Fell Asleep on Stream | sleepy + HP +5 | own icon (sleep mechanic) |
| 192 | meme | 🦥 | Лінивець-берсерк / Berserk Sloth | sleepy + HP +5 | own icon (sleep mechanic) |
| 193 | meme | 🐈 | Кіт пройшовся по клавіатурі / Cat Walked on the Keyboard | cat_keyboard + HP +18 | own icon (cat mechanic) |
| 194 | meme | 🍝 | Код-спагеті / Spaghetti Code | cat_keyboard + HP +18 | own icon (cat mechanic) |
| 999 | divine | 👑 | Владика Етеру / Sovereign of the Aether | streamer_god | own icon (sovereign mechanic) |

## 6. Rarities (`RARITIES`)

No emoji of their own: a colour (#a0a0a0 common, #2ecc71 uncommon, #3498db rare, #b36bff epic, #f1c40f legendary, #ff4757 mythic,
#ff66cc meme, #9fe3ff divine), the roulette's banner lines (🌟 / 🔥 / 🤪) and the roulette odds card (🎰).
Divine's colour is the same as Frost's (#9fe3ff).

## 7. Drake emblems (`DRAKE_TYPES`)

The emoji at the end of each drake's name: 🟥 red, 🟦 blue, ⬛ black, 🟨 gold, 🟪 purple, 🟩 green, 🐉 the White Dragon.
`drakeIcon` puts it in the intro banner (13 px); the name with its emoji shows in info cards (`!стата`, `!дрейк`, `!рерол`,
13–14 px). The cards and the Top draw a swatch or the sprite instead (`ELEMENT_COLORS`). 🟦 and 🟨 are also the reflect and
fortune notes, and 🟥 / ⬛ start the hidden crit and ultra-block log lines.

## 8. UI

| Emoji | Meaning | Where (size) |
|---|---|---|
| 🏆 | ranked battle | plate (15 px), intro banner, info cards |
| 🏆 | victory / knockout | plate, result title (16 px) |
| 🏆 | tournament | plate, sign-up strip, countdown, every tournament reply |
| 🏆 | 1st place badge (`MEDALS`) | Top name (15 px), fighter name (24 px), `!стата` |
| 🥇 | 1st place | podium (24 px), Hall of Fame, the champion line; title 159 |
| 🥈 🥉 | 2nd, 3rd place | podium, Hall of Fame, badges |
| 🏛️ | Hall of Fame | `!зала` card, its title |
| 🎟️ | free title spins | `!стата`, spin replies |
| 👑 | the streamer | streamer card (12 px); also title 999, 86, two log notes |
| ⏳ | waiting / betting / up next / time-out / queue | plate, countdown, log, replies |
| ⚔️ | the turn counter, duel accepted, wins | plate «⚔️ Хід 3 / 30», info cards, `!стата` |
| 🤝 | friendly duel / draw | plate, banner, result |
| 🎲 | first strike, the tournament draw, roulette | countdown, `SHOW_TEXT.drawPlate`, roulette card |
| 💀 | losses | `!стата` |
| ❤️ 💥 🛡️ | HP, crit, defence | `!стата` row (13 px) |
| 📊 | stats card | `!стата` head |
| ✅ 👋 | joined / left the tournament | info cards |
| ⚠️ ℹ️ 🛑 ❌ ⌛ 🤡 | warning, hint, refused, declined, timed out, "can't fight yourself" | info cards (14 px) |
| 🔄 | the arena restarted after a reload | info card |
| 🚨 | ranked matchmaking picked a pair | info card |
| 🔥 | reroll («ПЕРЕРОДИВСЯ»), mythic title roll | info cards |
| ✨ | Gold's bonus XP | info card |
| 🐉 | a drake was created | info card |
| ✦ | Element Power ready | meter row (12 px) |
| (pixel) | crown, trophy, laurel, headCrown, confetti | tournament show: already `SHOW_SPRITES` |

## Emoji with more than one meaning

| Emoji | Meanings today |
|---|---|
| 👑 | the Sovereign's attack dissolving; aether wrath; title 999; title 86 (an epic stat title); the streamer card; the Top's absent streamer; the champion (pixel crown) |
| 💥 | a crit; title 93; crit chance in `!стата` |
| 🐉 | debuff immunity; the White Dragon; titles 92, 98; «drake created»; the no-record note |
| ⚡ | armour-piercing; Chaos Creator; titles 82, 100, 169 (chaos keeps its word for this reason) |
| 🧛 | the vampire attack type; title lifesteal; title 185 |
| 🛡️ | the Shield effect; ultra-block (hidden log); defence in `!стата`; the loser's mark in the hidden result line; titles 76, 151, 176 |
| 🏆 | ranked; victory; knockout; tournament; 1st place badge; Hall of Fame wins; titles 67, 94 |
| 1st place | 🏆 as a badge, 🥇 on the podium and in the Hall: two icons for one meaning |
| ⏳ | waiting; up next; betting open; time-out; already in the queue; title 36, 88 |
| 💀 | KO; sudden death; Jackpot's skull; losses |
| 🎲 | first strike; the tournament draw; title roulette; titles 91, 115 |
| 🪙 | Heads or Tails; Jackpot's coin; title 189 |
| 💎 | Jackpot's gem; channel points (sim) |
| 🎰 | Jackpot; roulette odds; title 153 |
| 🔥 | Burn; reroll; mythic roll; title 152 |
| 🌟 | Divine Might; legendary roll |
| 🦇 | Shadow Theft; title 175 |
| 🔮 | magical attack; title 168 |
| 🌀 | Quantum Dodge (hidden log); title 99 |
| 🌅 | the opening buff (hidden log); title 181 |
| 🌵 ⚰️ 😴 🐈 👼 | each a log note and a title's icon (183, 187, 191, 193, 96) |
| 🟦 🟨 | drake emblems and the reflect / fortune notes |
| 🍀 🎯 | Blessing and title 160; Mark and title 128 |
| 🧊 | title 19, 149 (and close to ❄️ Frost) |
| ☕ | titles 20, 64, 95, 182 (HP, HP, HP, the opening buff) |
| ⚔ / ⚔️ | attacking; the turn plate; duel accepted; wins in `!стата` |
| block | 🚫 in the fight view, 🛡️ «Ультраблок» in the hidden log: two icons for one meaning |
| reflect | 🟦 in the fight view, 🔵 in the hidden log: two icons for one meaning |
| ✦ | the meter being ready; the test panel's meter button |
| #9fe3ff | (a colour) Frost and the divine rarity |
