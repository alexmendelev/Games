# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Games

Start the static server (serves on `http://127.0.0.1:8000`):
```
server.bat
# or
node games/scripts/static-server.js
```

The entry point is `games/index.html`. Games load inside an iframe from the menu.

## Testing (run from `games/` directory)

```bash
# Install dependencies (first time)
npm install
npm run test:e2e:install

# Fast logic-only tests (Node.js, no browser)
npm run test:logic               # math
npm run test:logic:words
npm run test:logic:clocks
npm run test:logic:equations
npm run test:logic:multiply
npm run test:logic:shapes

# Full E2E browser tests
npm run test:e2e
npm run test:e2e:headed          # watch in browser

# Per-game E2E difficulty tests
npm run test:e2e:math-difficulty
npm run test:e2e:words-difficulty
# (same pattern for clocks, equations, multiply, shapes)

# Adaptive difficulty simulation
npm run simulate:difficulty
node scripts/run-difficulty-sim.js --profile average --seed 11 --levels 16
```

## Architecture

### Repository Layout

- `games/` — active game suite (6 games + shared framework)
- `maze/` — standalone 3D maze (Three.js) and picture-maze variant

### Game Shell Pattern

All 6 games (`math`, `multiply`, `words`, `shapes`, `clocks`, `equations`) share an identical initialization pattern:

1. Each game has `config.js` + `game.js` loaded into an HTML shell
2. `game.js` calls `shellApi.createFallingShell(...)` with layout config from `config.js`
3. Shell creates answer buttons, handles animations, pause, mute, exit
4. Game calls `shell.getAnswerButtons()` and drives the question/answer loop

### Shared Framework (`games/shared/`)

| Script | Role |
|--------|------|
| `layout.js` | Single responsive layout engine — computes all sizing (HUD, controls, answer grid, lanes) from viewport + config |
| `game-shell.js` | Applies layout to DOM; falling-tile animation; reward multipliers by difficulty |
| `difficulty-manager.js` | Adaptive difficulty (tracks streaks, promotes easy→medium→hard→super) |
| `game-meta.js` | Leaderboard + results modal (shared across all games) |
| `audio.js` | BGM + SFX management |
| `fx.js` | Sprite-sheet visual effects (splash, burst, coins) |

### Adding a New Game

1. Copy an existing game's directory structure (HTML + `config.js` + `game.js`)
2. Give it the standard shell DOM structure
3. Include `shared/scripts/layout.js` and pass `layout: cfg.layout` into `createFallingShell(...)`
4. Add a new `ANSWER_PRESETS` entry in `layout.js` if a new answer layout type is needed
5. Add card to `games/index.html` launcher

### Maze (`maze/`)

- `main.js` — Three.js 3D scene with player physics and collision detection
- `picture-maze.js` — 2D picture-based variant with directional hints
- `buildmaze.py` — Python script that generates `maze.js` / `mz.js` maze data
- Python dependency: `Pillow` (via `.venv/`, see `requirements.txt`)

### Asset Pipeline

- No build step — files are served as-is by the static server
- Cache-busting via query strings on asset URLs (e.g., `?v=20260407`)
- Words game emoji images: `games/words/data/emojis-new/` with `icon-pack-manifest.tsv`
- To resize emoji icons: `python scripts/resize_words_icons.py`
