---
title: Words
---

# Words

`words` is the word-recognition game built on the same falling-question shell.

## Shared Shell

- uses the common screen structure described in [[systems/layout-manager]]
- keeps the same game area, mascot, HUD, and controls as the other games
- answers area: `FourLargeCards` with image content

## Scoring

- uses the shared session metrics and post-level bonus flow from [[overview]]
- special tablet rewards are `1 / 5 / 20` coins for silver / gold / diamond
- completion bonus follows the standard profile: `+1 / +2 / +4 / +8`

## Difficulty

- levels: `easy`, `medium`, `hard`, `super`
- level goals:
  - `8 / 10 / 12 / 14` correct
  - `60s / 75s / 90s / 90s`
- Words now uses explicit config-based V1 profiles only
- there is no hidden stage system and no level-number-based content growth
- active difficulty alone determines word-pool filtering and distractor similarity

### Frequency Tiers

Every word in `icon-pack-manifest.tsv` has a `frequency` column (1–4) rating child familiarity:

| Tier | Meaning | Examples |
|------|---------|---------|
| 1 | Every child knows | dog, cat, pizza, robot, rainbow |
| 2 | Most children 6–8+ know | saxophone, pyramid, chameleon, avocado |
| 3 | Children 9+ or with specific interests | narwhal, accordion, armadillo, burrito |
| 4 | Rare / specialist | pangolin, abacus, gondola |

Unrated words (legacy items without a `frequency` value) always pass through at any difficulty.

### V1 Profiles

Word lengths are counted in the active display language (e.g., Hebrew letter count for he, English letter count for en).

- `easy`
  - words `2–3` letters
  - frequency tiers `1` only
  - curated pool of ~20 iconic short words (dog, cat, sun, hat, …) — falls back to all short words when the preferred pool is too small
  - distractors are chosen to look clearly different
  - avoids visually confusing first-letter and last-letter matches
- `medium`
  - words `3–5` letters
  - frequency tiers `1–2`
  - broad familiar word pool
  - distractors can be mildly similar
  - some distractors may share first or last letters
- `hard`
  - words `5–7` letters
  - frequency tiers `1–3`
  - broader vocabulary, no category filter
  - distractors are noticeably closer
  - same-length and similar-shape distractors are preferred
- `super`
  - words `7+` letters
  - frequency tiers `1–4` (all words)
  - broadest and least trivial vocabulary
  - distractors are very similar and plausible
  - same-length, shared-prefix, and shared-suffix distractors are preferred

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 96` and `speedIncPerLevel: 8`, but those are not the active runtime path right now

## Generation Notes

- the same word is never shown twice in the same session until the whole pool is exhausted — `levelUsedIds` accumulates across levels and only resets when the pool runs out
- when the pool is exhausted the used-set is cleared and the cycle starts fresh
- the `recentCorrectIds` sliding window (last 8) additionally prevents the same word from appearing in back-to-back questions across the exhaustion reset

## Word Data

- all words live in `data/emojis-new/icon-pack-manifest.tsv` — 367 entries across ~15 categories
- columns: `filename`, `category`, `english`, `hebrew`, `russian`, `frequency`
- `frequency` (1–4) is read at runtime by `buildPoolForProfile` and enforced via `maxFrequency` in `config.js`
- to add new words: add a row to the TSV with a `frequency` rating and place the 160×160 PNG in `data/emojis-new/`
- high-res 512×512 source images live in `data/image_source/emojis-new/` (not served, kept for regeneration)
- `scripts/generate-word-images.py` generates images via OpenAI API; `scripts/resize-source-images.py` batch-resizes sources

## Useful Dev Notes

- Words now uses explicit word-pool rules and explicit distractor similarity rules per difficulty
- emoji data and fallback handling are still important maintenance points
- answer-content work here is more data-driven than the arithmetic games

## Test Commands

- fast logic check: `npm run test:logic:words`
- focused browser check: `npm run test:e2e:words-difficulty`

Back to [[overview]].
