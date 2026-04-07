---
title: Clocks
---

# Clocks

`clocks` is the time-reading game built on the shared falling-question and side-panel layout.

## Shared Shell

- uses the common screen structure described in [[systems/layout-manager]]
- keeps the shared split between game area and side panel
- answers area: `FourLargeCards` with clock answer cards

## Scoring

- uses the shared session metrics and post-level bonus flow from [[overview]]
- special tablet rewards are `1 / 5 / 20` coins for silver / gold / diamond
- completion bonus follows the standard profile: `+1 / +2 / +4 / +8`

## Difficulty

- Clocks now uses explicit config-based V1 difficulty profiles only
- there is no hidden stage system and no level-number-based content growth
- the active difficulty alone determines:
  - allowed minute values
  - clock face readability
  - distractor closeness

- level goals:
  - `8 / 10 / 12 / 14` correct
  - `60s / 75s / 90s / 90s`

- `easy`
  - allowed minute values: `:00` and `:30`
  - face mode: numbered dial
  - distractors stay forgiving, using half-hour minute shifts and broader hour changes

- `medium`
  - allowed minute values: every `5` minutes
  - face mode: numbered dial
  - distractors can be more plausible, with nearby `5 / 10 / 15 / 30` minute offsets

- `hard`
  - allowed minute values: every `5` minutes
  - face mode: dial without numbers
  - distractors stay on the `5`-minute system but use tighter nearby minute offsets

- `super`
  - allowed minute values: every `5` minutes
  - face mode: plain dial
  - distractors are the closest V1 set, using the plainest face and the tightest minute offsets

## Falling Speed

- active runtime behavior currently uses the shared `~12s` fall duration noted in [[overview]]
- config still defines `baseSpeed: 92` and `speedIncPerLevel: 8`, but Clocks currently uses the shared fall-duration helper at runtime

## Useful Dev Notes

- Clocks difficulty is now defined directly in `clocks/config.js`
- task generation in `clocks/game.js` reads only from the active difficulty profile
- focused logic check: `npm run test:logic:clocks`
- focused browser check: `npm run test:e2e:clocks-difficulty`
- visual readability matters here more than in the arithmetic games

Back to [[overview]].
