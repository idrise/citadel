# Adaptive levels and container supplies — M09 amendment

12 November 2026. The owner explicitly requested saved adaptive progression instead
of configurable bots, backwards movement after losses or time away, three starting
containers, and collectible falling containers that stop arriving before the finish.
M09 remains **Awaiting review**. This does not begin M10, complete the broader M06
pacing gate, or authorise publishing.

## Player experience

Every fortress now starts with **three physical containers**. A large procedural
**LEVEL 1–100** card appears during the existing 1.5-second opening countdown,
before the first ball becomes visible or can launch. There is no level HUD during
play. Pause shows the current round's level; the old Bot difficulty selector is gone.

A neutral luminous container falls into the arena at 4 playing seconds, then every
8 seconds. It takes one second to land. Hit a landed container with your ball and
it teleports into your fortress, with a brief translucent transport effect and a
positive sound. The ball keeps moving. Ownership follows the last actual serve or
paddle return; wall rebounds keep that ownership. Bots collect by the same rules,
and an eliminated player cannot be resurrected by a leftover ball.

No new drops spawn at or after 60 playing seconds. Unclaimed drops expire after
14 seconds, so the final scheduled drop at 52 seconds is gone by 66 seconds. Pause,
countdown and suspended-tab time do not advance the schedule. Falling and landed
supplies follow a changing arena. There are at most two unclaimed drops at once.
These timings are **provisional playtest tuning**, not a fixed match-end timer.

The awarded health and its visible body appear together immediately. The flying
copy is a cosmetic ghost, so there is no invisible defending collider. Broken slots
are reused, new slots can be added, and all health retains real moving collision.
Natural supply availability allows at most ten containers for one player; the
render/simulation safety capacity is twelve. Reduced motion removes the falling
and transport animation while keeping identical gameplay timing and awards.

## How the game finds a level

Progress lives in `localStorage` under `citadel.progress.v1`: current level, last
arena size, highest level won, total resolved attempts, and the latest **16 results**.
Preferences remain separate; old bot selections are ignored without losing other
settings. Blocked/full storage leaves the game playable in memory. No data is sent.

A new player starts at level 1. Two wins among the latest three results permit an
increase. A bounded Bayesian ranking model uses finishing position and opponent
count, so second of six is different evidence from last of six. The same estimate
transfers between arena sizes with a rival-count adjustment. The provisional model
seeks roughly a **60% full-round win probability**, with uncertainty allowing steps
up to 24 levels initially and smaller adjustments as evidence accumulates. This is
an explicit calibration assumption, not a measured human win-rate claim or a proof
of optimality. Levels stay fixed throughout each attempt and remain within 1–100.

Losses can lower the next level. Older results receive less weight, with a seven-day
half-life; the bounded recent window also permits recovery as skill changes. After
a full week away the return round is 12% gentler, with further weekly relief capped
at twenty levels. Reloads derive relief from the original timestamp and cannot
compound it. The highest level won is retained. For example, level 80 returns at
70 after a week; winning again lets the estimate readjust.

A known personal loss is recorded as soon as the human fortress is eliminated,
exactly once. Surviving bots may continue. Pause offers **Play again** at the adjusted
level or Resume to spectate. A win is recorded at the real match finish. Restarting
or changing seats while still alive does not fabricate a loss; repeated renders,
pauses, results screens and rematches cannot rate an attempt twice. Round export
includes the level used.

## Bot strength and limits

All 100 levels tune reaction delay, aim error, prediction horizon, movement speed
and serve timing. Level 100 has zero artificial aim error, one-physics-tick reaction,
a bounded one-second forecast of curved flight/wall banks/intervening actors, and
the same 16 rad/s maximum movement as the human pointer. Strong bots also consider
landed supplies when short of containers. They use ordinary intents, public current
state and actual collisions; health, ball speed and rules are unchanged by level.
Legacy named profiles remain internal only for existing authored fixtures.

The [seeded bot-only report](reviews/m09/progression/calibration.json) compares a
fixed standard controller in the human seat against level 1 and level 100 opponents.
Across seeds 7/21/2026 and 2/6 seats, that proxy wins five of six against level 1,
and is eliminated in all six against level 100. There are zero collision caps and
real supply collections. The three six-seat level-100 bot-only games remain running
at the 120-second fixed-step observation limit (~118.5 playing seconds). This is
honest evidence of difficult endgames, **not** validation of the two-minute target.
Personal loss saving avoids making the player wait for those bots before retrying.
No arbitrary health removal or anti-stall rule was added.

Synthetic threshold players reach the vicinity of capacities 25/60 within a handful
of rounds, and an always-winning player reaches 100 for the seventh attempt. A
separate fixed-seed noisy test covers 135 synthetic players: after fourteen rounds,
median target-level error is under nine and the 90th percentile under nineteen.
These results test the estimator under its model; real human calibration is still
required, especially after the three-container rule change.

## Rendered review

All assets are procedural. The following native GPU fixtures stage a supply and
shot, then run the **real fixed-step collision and award code**. They do not claim
an unedited played victory.

- [Opening, falling container and collection video](reviews/m09/progression/supplies.webm).
- 2 seats: [level](reviews/m09/progression/level-2.png), [fall](reviews/m09/progression/fall-2.png), [transfer](reviews/m09/progression/transfer-2.png), [four containers](reviews/m09/progression/awarded-2.png).
- 4 seats: [level](reviews/m09/progression/level-4.png), [fall](reviews/m09/progression/fall-4.png), [transfer](reviews/m09/progression/transfer-4.png), [four containers](reviews/m09/progression/awarded-4.png).
- 6 seats: [level](reviews/m09/progression/level-6.png), [fall](reviews/m09/progression/fall-6.png), [transfer](reviews/m09/progression/transfer-6.png), [four containers](reviews/m09/progression/awarded-6.png).
- Phone viewport: [level 100](reviews/m09/progression/mobile-level-100.png), [awarded health](reviews/m09/progression/mobile-award.png).
- [Reduced motion](reviews/m09/progression/reduced-award.png).
- [Render assertions](reviews/m09/progression/render-report.json): one collection and four resulting containers for 2/4/6; no browser errors; pixel checks reject a screen-wide warm flash.

Rendered review caught and corrected a copied feature-outline material whose
resolution callback still updated its source material. Transfer outlines now retain
their drawing uniforms; a regression test and native pixel check cover the fault.

## Validation and reproduction

- `./node_modules/.bin/vp check`: strict types, lint and formatting pass.
- `./node_modules/.bin/vp test run`: **348 tests / 59 files pass**. Coverage includes
  noisy calibration, level bounds, inactivity, storage errors, exactly-once results,
  legal bot movement, curved prediction, opening layout, three-container starts,
  swept collection, simultaneous balls, ownership through a wall bank, dead-owner
  exclusion, expiry/cutoff, arena morphs, pause/reduced motion, and live visibility.
- Existing reviewed collision goldens still pass. Their eight-container fixtures
  are now explicit; new last-striker metadata is omitted from that historical trace
  digest. New gameplay tests cover current three-container matches and collection.
- Root and `/citadel/` production builds pass. The existing main-chunk size advisory
  remains (about 943 kB minified).
- **45 native Chromium production browser tests pass** at root: desktop input,
  complete 2–6-seat matches, all mobile layouts, focus/rotation/fullscreen, settings,
  music, real wins, progression persistence, reloads and a returning player's intro.
- Six focused progression/victory/mobile flows also pass under `/citadel/`.
- `./node_modules/.bin/vpx tooling/review-progression.ts /tmp/citadel-progression-final.json`
  reproduces the synthetic sequences and bot-only comparison.
- `node tooling/review-progression.mjs /tmp/citadel-progression-final`
  captures the rendering against the local dev server at port 5176.

These are Chromium and emulated-phone checks. Physical iPhone/Safari and Android
playtests, empirical human level calibration and high-level match pacing remain
open. No push, `gh` command or deployment was performed.

## Try it

Open <http://localhost:5176/>. Start a round, check the level card and the three
containers, then aim your coloured ball at a landed supply. Try several attempts,
reload, and check the next level. After a loss, Pause → Play again uses the adjusted
level. Progress is specific to that browser/origin; private browsing may discard it.

**REVIEW REQUIRED — M09**
