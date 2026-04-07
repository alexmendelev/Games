---
title: Improvement Ideas
---

# Improvement Ideas

Working notes for design ideas we may want to revisit later. These are ideas, not current behavior.

## Adaptive Challenge

- start every player on the easiest content stage
- adapt challenge from results instead of relying only on a fixed selected difficulty
- primary signals:
  - average incorrect clicks
  - average answer latency
- use rolling averages or EMA over recent questions, not one-question reactions
- change difficulty gradually, with hysteresis, to avoid bouncing up and down
- apply this idea not only to `multiply`, but also to `math` and `equations`

## Difficulty Model Direction

- make `stage` the true content-difficulty tier
- keep challenge split into:
  - content stage: what kinds of tasks appear
  - pressure stage: pace, distractor pressure, answer density, timer pressure
- let player-facing difficulty act as a start point or allowed range, not the only driver

## Multiply Expansion

- expand multiply beyond only `1-5` and `1-10`
- candidate bands:
  - `1-4`
  - `1-7`
  - `1-10`
  - `1-20` as `super`
- caution:
  - `1-20` may be too large a jump for some players
  - alternatives worth considering: `1-12` or `1-15`
- longer-term idea:
  - bias question selection toward weak factors, not only larger ranges
- especially track difficult factors such as `6`, `7`, `8`, and `9`
- possible multiply-specific adaptation:
  - keep a per-factor weakness score
  - ask weak factors more often
  - only widen the total factor range when performance is stable
- this may be more valuable than range growth alone, because a player can be comfortable with `1-10` overall but still weak on a few specific factors

## Math And Equations Targeting

- extend weakness-aware selection to `math` and `equations`, not just `multiply`
- possible tracked weak patterns:
  - carrying / borrowing
  - subtraction near zero
  - negative results
  - multiplication facts
  - division facts
  - missing left / right / result slots in equations
- use weak-pattern weighting so the game asks more of the specific task types the player struggles with

## Content Filtering Questions

- review whether trivial patterns should appear often, rarely, or not at all
- examples:
  - `x + 0`
  - `x * 0`
- these may be useful for very early teaching, but may become low-value noise once the player already understands them
- likely direction:
  - allow them only in the easiest stages, or
  - make them rare, or
  - disable them once mastery is detected

## Special Tablet Placement

- special tablets should mostly appear on more difficult tasks, not evenly across all tasks
- likely direction:
  - increase special-tablet chance when the generated task is at the harder end of the current stage
  - reduce or remove special tablets on trivial tasks
- this would make rewards feel more earned and better aligned with challenge
- this should apply across games, with game-specific tuning as needed

## Good Follow-Up Spec

- define exact adaptive thresholds
- define when to evaluate adaptation
- define per-game stage maps
- define how pressure stage affects pace and answers area
- decide whether player-facing difficulty remains visible or becomes mostly internal

Back to [[index]].
