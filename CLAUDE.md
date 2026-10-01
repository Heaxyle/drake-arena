# Drake Arena

A Twitch chat mini-game that runs as an OBS browser source. The game is ONE self-contained HTML file (inline CSS + JS, no build step, no backend): `showcase/index.html`. It has an English/Ukrainian toggle, a test panel and a chat simulator. See `showcase/README.md` for features, commands and combat rules.

The root `index.html` only redirects to `showcase/index.html` (for GitHub Pages).

## Where things are (search the inline `<script>`)
- Balance numbers: `ELEMENT_BASE` / `ELEMENT_TIERS` (elements), `RARITIES` (drop chances), `MECH` (title abilities). Tune these, not the fight code.
- Titles: `TITLES_DB` (~194). Add titles there; use `bonus: {type:'stats', stats:{...}}` or a `mechanic`.
- Chat commands: `handleChatMessage` / the `client.on('message')` handler.
- Buffs/debuffs: the `EFFECTS` table (icon, uk/en names, description, `lasts`/`count`, `nums`) and `EFFECT_CAST`. Everything else (fight, cards, log, sim) reads from it — never hard-code an effect name or icon elsewhere.
- Fight loop: `runBattle`, `pickEffect`, `applyEffect`, `finishBattle`, `checkQueue`.
- Sprites: `DRAKE_SPRITES` (palette + pixel rows per type), between the `// ===== SPRITES START/END =====` markers; `makeDrakeCanvas` draws them, `drawFighterSprite` puts them on the fighter cards. Drakes are 48x36, the dragon 60x42; all face left (nothing is mirrored) and display at exactly 2x (`.sprite-wrap` 96x72, dragon 120x84). The space above `.fighter-stats-sub` (its `margin-top`) keeps the stats box clear of the sprite; don't shrink it.
- Streamer-only White Dragon: type `'white'` (`DRAGON_TYPE`, its own 60x42 wyvern in `DRAKE_SPRITES`, title 999). Only `STREAMER_USER` (empty by default, editable in Test Settings) can pick it. Viewers' old White Drake is now the Green Drake (`greenHp`). Random picks and balance sims use `VIEWER_DRAKE_TYPES`.
- Saves: `migrateOldSaves` runs on load (and when the streamer setting changes) — extend it when the data format changes, and keep every step idempotent. Players' saves live in `localStorage`; never break save compatibility.

## Rules
- HP bars and fighter cards must NOT move when buffs/debuffs appear. Every card block has a fixed height; keep it that way.
- Chat replies to viewers go to the info window (`addInfo`), not the battle log (`addLog`).
- Never break the transparent OBS layout (1920x1080, arena bottom-right, left side free for a camera).

## Testing — run after ANY mechanics change
- `npm run balance:check` — **before merging any balance change**: element matrix at L1/10/20 + title tiers, 3 seeds averaged; fails if a matchup leaves 45–57% or a rarity doesn't beat the one below it. Not in CI (the CI gate stays at 40–60%, L20, one seed).
- `npm test` — effect rules (`tests/effects.js`), the mutation check (`tests/mutations.js`), then balance sims (element matchups, title tiers, level gaps, and the White Dragon must win every fight). Element matchups should stay within ~45–57%; each rarity tier should beat Common by a bit more than the one below it; higher level should still clearly win.
- `npm run balance` (or `npm run balance:showcase`) — quick element check.
- `npm run test:ui` — headless Chromium smoke test (7 types, streamer-only dragon refusal, idempotent old-save migration) (needs `npx playwright install chromium` once). Screenshots go to `tests/screenshots/`.
- Node 18+ required. Open the HTML in a browser to check visuals.
