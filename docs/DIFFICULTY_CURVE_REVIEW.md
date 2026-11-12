> Updated by [the mobile feedback review](MOBILE_FEEDBACK_REVIEW.md): the current curve reaches 16 balls, with unlocks every 6–7 levels. The measurements and eight-ball captures below describe the preceding revision.

# Ball, pickup and bat progression — M09 follow-up

12 November 2026. The owner requested ball count, pickup count, ball speed and bat
size across the 100-level ladder, with pickups introduced at level 5. M09 remains
**Awaiting review**. No push or deployment is authorised.

## Level rules

| Level | Ball cap | Pickup drops per round | Ball speed | Bat arc width |
| ----- | -------- | ---------------------- | ---------- | ------------- |
| 1     | 1        | 0                      | 14.0       | 135%          |
| 4     | 1        | 0                      | 14.6       | 133%          |
| 5     | 1        | 1                      | 14.8       | 132%          |
| 10    | 2        | 1                      | 15.8       | 129%          |
| 25    | 3        | 2                      | 18.8       | 118%          |
| 50    | 4        | 4                      | 23.9       | 100%          |
| 75    | 6        | 5                      | 28.9       | 85%           |
| 100   | 8        | 7                      | 34.0       | 70%           |

Speed is in simulation units per second. Bat percentages compare arc length against
the previous standard bat; thickness, height, curve radius and control response are
unchanged. All players use the same size at a given level, including bots.

Ball cap increments occur at **10, 25, 40, 55, 70, 85 and 100**. Pickup budget
increments occur at **5, 20, 35, 50, 65, 80 and 95**. Staggering the unlocks gives
players time to learn pickups before the second ball arrives. Speed and width
interpolate continuously, while existing bot reaction, accuracy and tactics continue
to rise with the same actual level.

Every round still opens with one ball. Extra balls enter progressively: the interval
shortens from 22 seconds at level 1 to 5 seconds at 100. The ball column is a **cap**,
not a promise that every match lasts long enough to reach it. Supplies are a **total
budget**, not concurrent drops. They start at four playing seconds and are spread
within the opening minute, with no drops at/after 60 seconds. Seven drops retain the
previous 4/12/20/28/36/44/52 schedule. Levels 1–4 never spawn supplies.

The three-loss demotion rule, level-one win to level two, five-level maximum winning
jump, inactivity-independent progress and reflected floor announcement are retained.
Existing saved levels are retained too; the combined difficulty now needs tester
feedback rather than a forced reset or an automatic downgrade.

## Simulation and presentation contract

A pure `levelDifficulty` profile is captured and frozen when the attempt is created.
The simulation uses that profile for speed, arrivals, pickup budget and bot level.
Changing the saved next level or passing contradictory caller pacing options cannot
change the current attempt halfway through play. Restart and the next attempt rebuild
with the appropriate profile. Local exports include the exact profile played.

Bat width is geometry, not a stretched picture: collision faces and rounded ends,
wall clearance, travel limits, return previews, AI aiming, visible meshes, reflections
and historical blur copies use the same arc. Width persists through elimination
morphs. Old body/edge buffers are disposed on width changes, and blur copies retain
their faint opacity and draw order.

The eight-ball limit exposed overlapping waiting serve shells at travel extremes.
Graded rounds now separate those queued positions and keep them inside the arena.
The queue is tested at both travel limits in all five arena layouts; the historical
ungraded collision fixtures retain their reviewed trajectories.

Ball-count and interval sliders were removed from player settings, and obsolete saved
values are ignored. Pause shows the current level's ball cap, pickup budget and bat
size. Help explains the level-five pickup unlock. Visual quality, assistance,
sensitivity, music and automatic-serve preferences remain available.

## Rendered evidence

These captures use the actual graded simulation and renderer. Intro views show the
physical width before play; later frames are natural seeded bot play, with only the
last part of the visual history warmed for late captures:

- 2 seats: [level 1](reviews/m09/difficulty-curve/intro-2-level-1.png),
  [level 50](reviews/m09/difficulty-curve/intro-2-level-50.png),
  [level 100](reviews/m09/difficulty-curve/intro-2-level-100.png).
- 4 seats: [level 1](reviews/m09/difficulty-curve/intro-4-level-1.png),
  [level 50](reviews/m09/difficulty-curve/intro-4-level-50.png),
  [level 100](reviews/m09/difficulty-curve/intro-4-level-100.png).
- 6 seats: [level 1](reviews/m09/difficulty-curve/intro-6-level-1.png),
  [level 50](reviews/m09/difficulty-curve/intro-6-level-50.png),
  [level 100](reviews/m09/difficulty-curve/intro-6-level-100.png).
- Pickup boundary at the same playing time: [level 4, no drop](reviews/m09/difficulty-curve/pickup-gate-4.png),
  [level 5, first falling drop](reviews/m09/difficulty-curve/pickup-gate-5.png).
- [Natural eight-ball pressure](reviews/m09/difficulty-curve/eight-ball-pressure.png),
  [level-100 video](reviews/m09/difficulty-curve/level-100-pressure.webm).
- [Phone level 100](reviews/m09/difficulty-curve/phone-level-100.png).
- [Render report](reviews/m09/difficulty-curve/render-report.json): eight balls at
  approximately 35.5 playing seconds, six active and two queued, zero collision caps
  and no browser errors.

Desktop/phone frames were inspected for bat width, reflection, pickup visibility
and ball readability. The high-tier scene visibly has more pressure and smaller bats.

## Checks and limits

- `vp check apps tests tooling docs PLAN.md AGENTS.md` passes strict types, lint and
  formatting. An unrestricted root `vp check` only flags the unrelated, newly added
  `TODO.md` formatting. That file was left untouched and excluded from commits.
- **406 unit tests / 64 files pass**, including all 100 profile steps, exact unlock
  boundaries, spawn budgets/cutoff, current-round immutability, true width-dependent
  catches, all-layout wall clearance, elimination morphs, blur replacement, eight-ball
  stress and queued-shell separation. Reviewed physics golden digests remain unchanged.
- **58 full native production Chromium checks pass** at root. Coverage includes six
  difficulty checkpoints, real wins/losses/demotion, current versus next rules, saves,
  exports, complete desktop/mobile matches, input, resize/fullscreen and audio layers.
- **12 difficulty/progression checks pass** under `/citadel/`. Root and Pages builds
  pass. The existing approximately 957 kB main bundle advisory remains.
- Initial browser failures referenced the old fixed bat endpoint angles and a seed
  whose outcome changed with the new rules. Tests now use physical travel limits and
  seed 8 for an ordinary reproducible defeat; no live health/outcomes are injected.
- Physical phone/Safari and full software-WebGL validation were not run. Broader M06
  human pacing and calibration review remain open; M10 was not started.

[Bounded simulation report](reviews/m09/difficulty-curve/simulation-report.json):
12 bot-only games cover levels 1/5/50/100 in 2/4/6 seats, using seed 2026 and three
initial containers. All have zero collision caps. Natural level-100 four- and six-seat
samples reach eight balls. Some early one-ball four/six-bot games are still playing
at the roughly 90-second sample bound; a slower ball and larger bat give more learning
time but can lengthen those rounds. These are smoke samples, not human calibration.

## Local review

Use **http://localhost:5176/**. Fresh progress starts at level 1 with one slow ball,
a wider bat and no pickups. At level 5 the first supply appears after four playing
seconds. Higher saved levels progressively add pressure. Pause shows the profile,
and Export round records it for tester feedback.

Reproduce captures with the dev server running:
`node tooling/render-difficulty.mjs /tmp/citadel-difficulty-review`.
Reproduce the bounded sample:
`./node_modules/.bin/vpx tooling/review-difficulty.ts /tmp/citadel-difficulty.json`.

**REVIEW REQUIRED — M09**
