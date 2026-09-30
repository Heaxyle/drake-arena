# Drake Arena

A Twitch chat mini-game that runs as an OBS browser source. The game is ONE self-contained HTML file (inline CSS + JS, no build step, no backend): `showcase/index.html`. It has an English/Ukrainian toggle, a test panel and a chat simulator. See `showcase/README.md` for features, commands and combat rules.

The root `index.html` only redirects to `showcase/index.html` (for GitHub Pages).

## Where things are (search the inline `<script>`)
- Balance numbers: `ELEMENT_BASE` / `ELEMENT_TIERS` (elements), `RARITIES` (drop chances), `MECH` (title abilities). Tune these, not the fight code.
- Titles: `TITLES_DB` (~194). Add titles there; use `bonus: {type:'stats', stats:{...}}` or a `mechanic`.
- Chat commands: `handleChatMessage` / the `client.on('message')` handler.
- Fight loop: `runBattle`, `triggerEffect`, `finishBattle`, `checkQueue`.
- Sprites: `DRAKE_BODY`, `DRAGON_BODY`, `DRAKE_PALETTES`, `DRAKE_PROPS`.
- Streamer-only White Dragon: type `'white'` (`DRAGON_TYPE`, drawn with `DRAGON_BODY`, title 999). Only `STREAMER_USER` (empty by default, editable in Test Settings) can pick it. Viewers' old White Drake is now the Green Drake (`greenHp`). Random picks and balance sims use `VIEWER_DRAKE_TYPES`.
- Saves: `migrateOldSaves` runs on load (and when the streamer setting changes) — extend it when the data format changes, and keep every step idempotent. Players' saves live in `localStorage`; never break save compatibility.

## Rules
- HP bars and fighter cards must NOT move when buffs/debuffs appear. Every card block has a fixed height; keep it that way.
- Chat replies to viewers go to the info window (`addInfo`), not the battle log (`addLog`).
- Never break the transparent OBS layout (1920x1080, arena bottom-right, left side free for a camera).

## Testing — run after ANY mechanics change
- `npm test` — balance sims (element matchups, title tiers, level gaps, and the White Dragon must win every fight). Element matchups should stay within ~45–57%; each rarity tier should beat Common by a bit more than the one below it; higher level should still clearly win.
- `npm run balance` (or `npm run balance:showcase`) — quick element check.
- `npm run test:ui` — headless Chromium smoke test (7 types, streamer-only dragon refusal, idempotent old-save migration) (needs `npx playwright install chromium` once). Screenshots go to `tests/screenshots/`.
- Node 18+ required. Open the HTML in a browser to check visuals.
