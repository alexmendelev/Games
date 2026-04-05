# games_v3

Next migration target for the eventual replacement of `games/`.

Current status:
- `games/` remains the live legacy version.
- `games_v2/` remains the current intermediate version.
- `games_v3/` is the new replacement candidate.
- `games_v3/math/` is the staged arithmetic game.
- `games_v3/multiply/` is the separate multiplication game with `1-5` and `1-10` levels.
- `games/clocks/` is the live clock-reading game where kids match a digital time to the correct analog clock.
- `games_v3/words/` and `games_v3/shapes/` are carried forward from v2.

Notes:
- `games_v3/` was bootstrapped from `games_v2/` so migration can continue without destabilizing the older versions.
- When `games_v3/` is ready, the launcher and routing can replace the legacy `games/` entry points.

Browser testing:
- This repo now includes a minimal Playwright setup under `tests/e2e/`.
- Install Node.js first, then run `npm install`.
- Install the browser binaries with `npm run test:e2e:install`.
- Run the smoke tests with `npm run test:e2e`.
- Use `npm run test:e2e:headed` if you want to watch the browser while tests run.

Shared layout system:
- `shared/scripts/layout.js` is the single gameplay layout engine. It computes orientation, frame gaps, game/panel sizing, HUD height, controls height, answer-grid sizing, mascot safe zone, fall lane padding, and shared overlay sizing from viewport + config.
- `shared/scripts/game-shell.js` applies that computed layout to the DOM and is the shared integration point used by all five games.
- Each game now passes only a small `config.layout.answers` object:
  `type`, `count`, `activeCount`, `min/max button size`, `aspectRatio`, and optional `itemClass` or `content`.
- To add a new answer layout type, add a preset in `shared/scripts/layout.js` under `ANSWER_PRESETS`, then add any content-only styling in `shared/styles/answers.css` or a game-specific stylesheet.
- To add a new game, give it the standard shell DOM structure, include `shared/scripts/layout.js`, pass `layout: cfg.layout` into `createFallingShell(...)`, and let the shell create the answer buttons with `shell.getAnswerButtons()`.
- The leaderboard/results modal remains shared in `shared/scripts/game-meta.js`; the layout engine now also feeds its max width, max height, spacing, row sizing, and action stacking through shared CSS variables in `shared/styles/game-meta.css`.
