# ⚔️ Drake Arena

[![CI](https://github.com/Heaxyle/drake-arena/actions/workflows/ci.yml/badge.svg)](https://github.com/Heaxyle/drake-arena/actions/workflows/ci.yml)

A Twitch chat mini-game that runs as an OBS browser-source overlay. Viewers create a drake, pick an element, queue up and watch turn-based auto-battles play out on stream. It's a single HTML file with no build step and no backend, and it has an English/Ukrainian interface.

**▶ [Play the demo](https://heaxyle.github.io/drake-arena/)**: no Twitch needed. Use the Chat Simulator in the left column, or press **🎬 Demo**.

![Drake Arena screenshot](showcase/screenshot.png)

- **[Game guide](showcase/README.md)**: setup, chat commands, combat rules, titles
- **[Testing](TESTING.md)**: balance simulation, UI smoke test, layout test, fight view test, CI pipeline

## Testing

CI runs all of these on every pull request except the multi-seed check, which is run by hand ([details](TESTING.md)):

- **[Seeded balance simulations](TESTING.md#layer-1-balance-simulation)** play thousands of fights; a [CI gate](TESTING.md#what-fails-ci) fails if any element matchup leaves 40–60%
- **[Multi-seed balance check](TESTING.md#before-merging-a-balance-change-npm-run-balancecheck)**, run before merging any balance change: levels 1, 10 and 20 and every title tier, over 3 seeds
- **[Mutation testing](TESTING.md#testing-the-tests-deliberate-breakages)**: 49 deliberate bugs, and the tests must catch every one
- **Per-[effect](TESTING.md#layer-1-effect-rules) and per-[ultimate](TESTING.md#layer-1-class-ultimates) tests** play real turns and check them against the numbers in the game's tables
- **[Layout and contrast checks](TESTING.md#layer-2-layout-test)** at 1920×1080 in Ukrainian and English, with worst-case names and with web fonts blocked
- **[Seeded UI tests](TESTING.md#layer-2-ui-smoke-test)** drive the overlay through fake chat in headless Chromium; a fight fingerprint shows visual changes leave fights alone
- **[Visual review sheets](TESTING.md#layer-2-fight-view-test)**: every fighter card and log card in both languages, committed as images

Built with AI assistance (Claude Code); design, testing and balance by Heaxyle.
