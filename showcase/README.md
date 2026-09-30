# ⚔️ Drake Arena

A Twitch chat mini-game that runs as a browser-source overlay. Viewers create a drake, pick an element, queue up and watch turn-based auto-battles play out on stream. It's a single HTML file with no build step and no backend.

**Try it without Twitch:** open `index.html` in a browser and use the **Chat Simulator** under the arena. Type commands as any viewer name, or press **🎬 Demo** to have four viewers join and fight.

![Drake Arena screenshot](screenshot.png)

## Features

- **6 elements**, each with its own passive, scaling at levels 5 / 10 / 15 / 20
- **White Dragon:** a bigger, unbeatable dragon that only the streamer can pick (see [below](#white-dragon-streamer-only))
- **194 titles** in seven rarities, from Common stat boosts to Legendary, Mythic and Meme titles with unique abilities
- **Chat-request window:** replies to viewers (`!stats` cards, title rolls, warnings) appear in their own panel, separate from the battle log
- **Turn-based combat** with physical, magic and vampire attacks, crits, armor, ultra-blocks, 10 buffs/debuffs and a sudden-death phase
- **Ranked queue** with level-based matchmaking, plus friendly duels that give no XP
- **Progression:** XP, levels 1–20 and a win/loss leaderboard, saved in `localStorage`
- **Channel-point rewards** for title rolls and element rerolls
- **Ukrainian / English** interface and commands
- **Test panel:** set up any two drakes at any level with any title and run a fight
- **Chat simulator** that feeds the same handler as real Twitch messages

## Setup

1. Set your channel at the top of the script:
   ```js
   const TWITCH_CHANNEL = "yourchannel";
   ```
2. **OBS:** add a Browser Source pointing to the file with `?obs` on the end. For example:
   `file:///C:/DrakeArena/index.html?obs&lang=en`

   `?obs` makes the background transparent and hides the simulator, test panel and buttons. `lang` can be `en` or `uk`.
3. *(Optional)* Set the streamer who owns the White Dragon. Either set it in the script:
   ```js
   let STREAMER_USER = "yourname";
   ```
   or type the name into **⚙️ Test Settings → Streamer**, which saves it in that browser and overrides the script value. Empty (the default) means nobody can pick the White Dragon.
4. *(Optional)* Create two channel-point rewards that require text. Paste their IDs into `REWARD_ID_TITLE` and `REWARD_ID_REROLL`. Until you do, any text reward is accepted.

Chat is read anonymously through [tmi.js](https://github.com/tmijs/tmi.js). The overlay never posts to chat. If tmi.js can't load, the page still works offline through the simulator.

## Chat commands

| English | Українська | What it does |
|---|---|---|
| `!drake <color>` | `!дрейк <колір>` | Create your drake: red, blue, black, gold, purple, green (`white` is the streamer's White Dragon) |
| `!queue` | `!черга` | Join the ranked queue |
| `!battle @name` | `!бій @нік` | Challenge someone to a friendly duel (30 s to answer) |
| `!accept` / `!decline` | `!прийняти` / `!відхилити` | Answer a challenge |
| `!stats` / `!profile` | `!стата` / `!профіль` | Level, progress, HP/crit/defense, wins/losses, title and its bonus |
| `!title` | `!титул` | Roll a random title *(channel points)* |
| `!odds` / `!chances` | `!шанси` | Show the title roulette drop chances |
| `!reroll <color>` | `!рерол <колір>` | Change element and reset to level 1 *(channel points)* |

`!queue` and `!battle` have a 3-minute cooldown. The broadcaster is exempt.

## How combat works

**Base stats:** 150 HP + 10 per level. Defense is 5% + 1% per level, capped at 65%. Crit chance is 15% + 1% per level, dealing 1.5× damage. Each hit that deals damage has a 30% chance to apply a buff or debuff. Everyone has a 10% ultra-block chance, which reduces a hit to 0 damage.

| Element | Passive (grows with level tier) |
|---|---|
| 🟥 Red | +10–18% crit, crit damage 1.85–2.1× |
| 🟦 Blue | +5–14 defense; 10–18% chance to reflect half the damage back |
| ⬛ Black | +3–10% ultra-block; +18–25% effect chance |
| 🟨 Gold | +50–90% XP; 4–6% chance for a hit to leave the enemy at exactly 1 HP |
| 🟪 Purple | Buffs and debuffs 25–40% stronger; +20–35% effect chance |
| 🟩 Green | +15–35% max HP |

All element numbers live in `ELEMENT_BASE` (the level-1 value) and `ELEMENT_TIERS` (the bonus at levels 5 / 10 / 15 / 20). They were tuned with a balance simulator so every element matchup stays within roughly 45–57%.

### White Dragon (streamer only)

`!drake white` / `!дрейк білий` works only for the user in `STREAMER_USER`; anyone else gets a refusal in the chat-request window, and `!reroll white` is refused the same way. The White Dragon uses a bigger 60×42 wyvern sprite (drakes are 48×36; all sprites face left and are shown at 2×) and is deliberately a one-sided spectacle, not a balanced element:

- Starts at level 20 with the special title 👑 **Sovereign of the Aether** / **Владика Етеру** (Divine rarity, never rolled by `!title`, and `!title` is refused for the dragon)
- 99,999 HP, 100% defense, 100% crit at ×100, 100% effect chance
- Every hit it deals ignores ultra-blocks and armor; every hit it takes is dissolved to 0
- Ignores Blue reflect, Gold's 1-HP hit and Thorns, and is immune to debuffs

When the streamer setting changes, the White Dragon stays with the streamer only (see saves below). The Test Panel can also put the White Dragon on a test fighter.

**Each turn** (every 4.5 s, attackers alternate after a coin flip for who goes first):

1. Damage over time and regeneration apply first. Burn and poison deal 5% of max HP. Regeneration heals 8%.
2. The attack type is rolled:
   - 45% physical, 45% magic. Each can be light, heavy or sneaky. Sneaky ignores armor.
   - 10% vampire. It ignores armor and heals the attacker for half the damage dealt.
3. Modifiers are applied in order: rage, weakness, divine power, sudden death, crit, ultra-block, shield, then armor.
4. Element procs are checked: Blue reflect and Gold's 1-HP hit.
5. A buff or debuff may trigger, lasting 3 rounds. Each drake can hold at most 2 buffs and 2 debuffs.

**Sudden death** starts at turn 16 and adds +30% damage every turn. If both drakes are still alive after turn 29, the one with more HP wins.

**XP:** win +40, loss +10, draw +10 each. XP only counts in ranked fights. Reaching the next level takes `100 × level^1.4` XP, up to level 20.

## Titles

`!title` first rolls a rarity, then a random title of that rarity. `!odds` shows the chances in chat.

| Rarity | Drop chance | Titles | Bonus |
|---|---|---|---|
| Common | 45% | 80 | +9 HP, +10% crit or +7% defense |
| Uncommon | 25% | 30 | +18 HP, +16% crit, +13% defense or +15% effect chance |
| Rare | 15% | 40 | Two stats, e.g. +14% crit and +0.22 crit power |
| Epic | 9% | 20 | Stronger pairs, e.g. +40% effect strength and +12% effect chance |
| Legendary | 4.5% | 10 | A unique ability plus a small stat |
| Mythic | 1.3% | 8 | A unique ability plus HP per level |
| Meme | 0.2% | 6 | A chaotic ability |

**Title abilities** (numbers in `MECH`):

| Rarity | Ability | Effect |
|---|---|---|
| Legendary | Guardian shield | Heals 25% once when it drops below 15% HP |
| Legendary | Armor piercer | Ignores 70% of enemy defense |
| Legendary | Debuff immunity | Immune to debuffs |
| Legendary | Quantum dodge | +10% ultra-block |
| Legendary | Chaotic charge | 15% chance to apply an extra debuff |
| Mythic | Opening buff | Starts every fight with a random buff |
| Mythic | Thorns | Returns 15% of damage taken to the attacker |
| Mythic | Lifesteal | Heals 15% of damage dealt |
| Mythic | Executioner | +50% damage to targets below 35% HP |
| Meme | Coin flip | Every hit deals ×1.5 or ×0.6 |
| Meme | Sleepy | 10% chance to sleep through a turn, otherwise +25% damage |
| Meme | Cat on the keyboard | 25% chance of a random buff or debuff, on either fighter |

## Bugs found and fixed

This project went through a QA pass. Each fix was verified by simulating all 36 element matchups plus targeted command scenarios.

| # | Bug | Impact | Fix |
|---|---|---|---|
| 1 | Chat handler read `context.channel`, which tmi.js doesn't provide | **Every chat message threw an error, so the game ignored chat entirely** | Use the `target` channel argument |
| 2 | The effect-chance formula referenced an undefined `tier` variable | Any fight with a Black or Purple drake crashed on its first attack | Use the attacker's own tier |
| 3 | Fighter 1 always attacked first | Structural advantage for whoever was listed first | Coin flip before each fight |
| 4 | Only the challenger got a cooldown after a duel | The accepting player could immediately queue again | Both players get the cooldown |
| 5 | Ranked opponents were picked at random | A level 1 drake could be paired against a level 20 | Pick the queued player with the closest level |
| 6 | The "buff strength" title gave non-Purple drakes the full Purple bonus | The +15% title actually gave up to +55% | One `getEffectMult()` formula used everywhere |
| 7 | Burn and poison were scaled by the **victim's** effect strength | Purple drakes took *extra* damage from debuffs, and their own debuffs weren't stronger | Each debuff stores the strength of the drake that applied it |
| 8 | The leaderboard showed the word "Drake" instead of the element icon | Cosmetic | Take the last word of the name |
| 9 | Switching language reset fighter names to "Waiting…" and left the queue text untranslated | Cosmetic | Re-render only the static labels |
| 10 | If tmi.js failed to load, the whole script stopped | Page dead when offline | Twitch connection is optional |

## Project structure

Everything is in `index.html`:

- `TITLES_DB`, `DRAKE_TYPES`: game data. `DRAGON_TYPE` (`'white'`) is the streamer-only dragon; `VIEWER_DRAKE_TYPES` is everything else, used for random picks
- `STREAMER_USER`, `isStreamer`, `setStreamerUser`: who owns the White Dragon
- `RARITIES` (drop chances), `ELEMENT_BASE` / `ELEMENT_TIERS` (element passives), `MECH` (title abilities): balance numbers — tune these, not the fight code
- `titleStats`, `getMaxHP`, `getModifiedDefenses`, `getCritStats`, `getEffectMult`, `getTierMultiplier`: stat calculations
- `handleChatMessage`: command parsing, shared by Twitch and the simulator
- `checkQueue`, `runBattle`, `triggerEffect`, `finishBattle`: matchmaking and the combat loop
- `addInfo`, `showStatsCard`, `showTitleRoll`, `showOddsCard`: the chat-request window
- `renderLeaderboard`, `updateFighterCard`, `updateStatusUI`: UI rendering
- `migrateOldSaves`, the chat simulator and page init are at the end of the script

Save data lives in the browser's `localStorage` under the keys `drake_arena_showcase_db` and `drake_arena_showcase_stats` (plus `drake_arena_showcase_streamer` for the Test Settings streamer). To reset, clear site data. Saves from older versions are upgraded automatically on load: titles keep their ID and pick up the new names and bonuses. `'white'` used to be the viewers' White Drake, so any White Drake that doesn't belong to the streamer becomes a Green Drake with the same stats and XP, and title 999 is re-rolled on anything that isn't the dragon. The upgrade is idempotent: running it again changes nothing.

## Credits

Built with AI assistance (Claude Code); design, testing and balance by Heaxyle.
