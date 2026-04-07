# Wiki Maintenance Rules

- Keep this wiki small, practical, and easy to scan.
- Prefer updating an existing page over creating a new one.
- Use wiki-style links such as `[[overview]]` and `[[systems/layout-manager]]`.
- When documenting a game, describe what is unique about its answers area and reuse the shared layout page for common structure.
- Any code change that affects behavior, rules, layout, scoring, difficulty, timing, rewards, assets, or developer workflow should trigger a wiki review and update in the same session.
- The wiki must not contradict the code. If code and wiki differ, treat the code as the source of truth and update the wiki immediately.
- Treat gameplay configs and shared session/meta scripts as the source of truth for scoring, difficulty, and timing notes.
- If scoring, rewards, difficulty, or fall timing changes, update `[[overview]]` and the affected game pages in the same session.
- If a config knob exists but is not currently active in runtime behavior, note that clearly instead of assuming it is live.
- Do not mix implementation notes with wishlist ideas unless clearly labeled.
- If the app layout changes, update `[[overview]]` and `[[systems/layout-manager]]` first.
- If a new game page is added later, link it from `[[index]]` and `[[overview]]`.
