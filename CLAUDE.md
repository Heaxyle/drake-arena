# Drake Arena

A Twitch chat mini-game that runs as an OBS browser source. The game is ONE self-contained HTML file (inline CSS + JS, no build step, no backend): `showcase/index.html`. It has an English/Ukrainian toggle, a test panel and a chat simulator. See `showcase/README.md` for features, commands and combat rules.

The root `index.html` only redirects to `showcase/index.html` (for GitHub Pages).

## Where things are (search the inline `<script>`)
- Balance numbers: `ELEMENT_BASE` / `ELEMENT_TIERS` (elements), `RARITIES` (drop chances), `MECH` (title abilities). Tune these, not the fight code.
- Titles: `TITLES_DB` (~194). Add titles there; use `bonus: {type:'stats', stats:{...}}` or a `mechanic`.
- Chat commands: `handleChatMessage` / the `client.on('message')` handler.
- Buffs/debuffs: the `EFFECTS` table (icon, uk/en names, description, `lasts`/`count`, `nums`) and `EFFECT_CAST`. Everything else (fight, cards, log, sim) reads from it — never hard-code an effect name or icon elsewhere.
- Class ultimates: the `CLASS_ULTIMATES` table (one per viewer element: icon, uk/en names, `nums`, description) and `METER` (Element Power meter). Same rule as effects: names and icons live only in the table; the description placeholders fill in the numbers. The White Dragon has no meter. The meter row on the cards sits between the effect chips and the HP row, in a fixed-height row, so nothing moves.
- Fight loop: `runBattle`, `pickEffect`, `applyEffect`, `finishBattle`, `checkQueue` (ranked fights and duels start through `startFight`, which adds the optional betting window).
- Fight view (the battle log cards, turn animation, countdown, result card): the `fv*` functions, after `renderResultTags`. Visual only: the fight calls `fvTurn` / `fvTick` / `fvNote` / `fvAttack` / `fvCast` … to record what happened (never a roll, never a number the fight uses), and the view draws it. Between step 1 and step 2 of a turn (`HIT_DELAY_MS`) visual updates (`updateUIHP`, `updateFighterCard`, `setArenaState`, …) are held and shown together. `FV_LIVE` is false in Node, so the sims and the effect/ultimate tests run the fight exactly as before. `addLog` is the hidden text record they read: keep its lines as they are. Move names live in `MOVE_NAMES`; animate only transform and opacity.
- Sprites: `DRAKE_SPRITES` (palette + pixel rows per type), between the `// ===== SPRITES START/END =====` markers; `makeDrakeCanvas` draws them, `drawFighterSprite` puts them on the fighter cards. Drakes are 48x36, the dragon 60x42; all face left (nothing is mirrored) and display at exactly 3x on the fighter cards (`.sprite-wrap` 144x108, dragon 180x126 with a taller `.fc-top`), 1x in the leaderboard.
- Streamer-only White Dragon: type `'white'` (`DRAGON_TYPE`, its own 60x42 wyvern in `DRAKE_SPRITES`, title 999). Only `STREAMER_USER` (empty by default, editable in Test Settings) can pick it. Viewers' old White Drake is now the Green Drake (`greenHp`). Random picks and balance sims use `VIEWER_DRAKE_TYPES`.
- Saves: `migrateOldSaves` runs on load (and when the streamer setting changes) — extend it when the data format changes, and keep every step idempotent. Players' saves live in `localStorage`; never break save compatibility.

- Layout: `#stage` (1920x1080) holds `#cam-col` (demo controls, hidden with `?obs`), `#arena` (left 500, top 150, 920 wide) and `#side` (left 1452, 428 wide). The look follows `design/redesign-reference.html`; its "Effects reference" and "Class ultimates" sheets are a superseded draft — effect/ultimate text and numbers come only from `EFFECTS` / `CLASS_ULTIMATES`. Fighter card rows, top to bottom: name/title + sprite, info line, XP bar, stats, chips (two fixed rows), СИЛА meter (none for the dragon), HP. Long text goes through `fitText`; player name colours through `nameColor`.

## Rules
- HP bars and fighter cards must NOT move when buffs/debuffs appear. Every card block has a fixed height; keep it that way.
- Chat replies to viewers go to the info window (`addInfo`), not the battle log (`addLog`).
- Never break the transparent OBS layout (1920x1080, arena and side column on the right, the left column and the strip above the arena free for a camera and alerts).

## Testing — run after ANY mechanics change
- `npm run balance:check` — **before merging any balance change**: element matrix at L1/10/20 + title tiers, 3 seeds averaged; fails if a matchup leaves 45–57% (listed `KNOWN_COUNTERS` may be up to 2 points outside) or a rarity doesn't beat the one below it. Tune titles to 2 points per step on the tuning seeds (`--min-gap 2`). Not in CI (the CI gate stays at 40–60%, L20, one seed).
- `npm test` — effect rules (`tests/effects.js`), ultimates (`tests/ultimates.js`), the mutation check (`tests/mutations.js`), then balance sims (element matchups, title tiers, level gaps, and the White Dragon must win every fight). Element matchups should stay within ~45–57%; each rarity tier should beat Common by a bit more than the one below it; higher level should still clearly win.
- `npm run balance` (or `npm run balance:showcase`) — quick element check.
- `npm run test:fightview` — battle log cards, turn animation, every effect and ultimate from the test menu, countdown in both modes, result card and level-ups, both languages. Review screenshots: `tests/screenshots/fightview-*.png`.
- Visual-only changes: `npm run test:balance-gate` must print the same table as main, and `UI_FILE=<main's index.html> node tests/ui.js showcase` must print the same fight-events fingerprint as the branch.
- `npm run test:layout` — 1920x1080 layout in both languages (worst-case cards, Google Fonts blocked, `?obs` empty regions, demo controls, 1366x768, "How to play", name contrast, winner/loser labels). Screenshots in `tests/screenshots/layout-*.png`.
- `npm run test:ui` — headless Chromium smoke test (7 types, streamer-only dragon refusal, idempotent old-save migration) (needs `npx playwright install chromium` once). Screenshots go to `tests/screenshots/`.
- Node 18+ required. Open the HTML in a browser to check visuals.
