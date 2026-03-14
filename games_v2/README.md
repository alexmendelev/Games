# games_v2

Parallel scaffold for the next shared-architecture version of the games.

Current status:
- `games/` remains the live legacy version.
- `games_v2/` is the migration target.
- The new launcher and per-game entry points are shared-shell wrappers.
- Gameplay still lives in the legacy files until each game is ported.

Suggested migration order:
1. Port shared shell behavior into `shared/styles` and `shared/scripts`.
2. Port one game first, preferably `words` or `shapes`.
3. Move game-specific task logic into each game folder.
4. Switch the launcher from legacy wrappers to native v2 gameplay pages.

Notes:
- The v2 scaffold currently reuses images from `../games/assets/` for the launcher.
- The wrapper pages link to the legacy games so the new tree is usable immediately.
