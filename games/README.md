# games_v3

Next migration target for the eventual replacement of `games/`.

Current status:
- `games/` remains the live legacy version.
- `games_v2/` remains the current intermediate version.
- `games_v3/` is the new replacement candidate.
- `games_v3/math/` is the staged arithmetic game.
- `games_v3/multiply/` is the separate multiplication game with `1-5` and `1-10` levels.
- `games_v3/words/` and `games_v3/shapes/` are carried forward from v2.

Notes:
- `games_v3/` was bootstrapped from `games_v2/` so migration can continue without destabilizing the older versions.
- When `games_v3/` is ready, the launcher and routing can replace the legacy `games/` entry points.
