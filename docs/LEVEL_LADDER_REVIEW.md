# Three-loss ladder, bot difficulty and reflected level signs — M09

12 November 2026. This supersedes the earlier inactivity and immediate-loss policies.
The owner requested a level drop after three losses, an explicit demotion message,
increasing bot skill through level 100, and a level sign emerging from the floor.
M09 remains **Awaiting review**; no push or deployment is authorised.

## Progression contract

- No inactivity penalty or calendar-based skill weighting. Returning after a week or
  a year loads the same challenge. Changing the number of opponents retains the
  existing arena-size adjustment.
- Three **consecutive** losses at the current challenge demote exactly one level,
  with level 1 as the floor. The first two losses retry the same level. A win,
  demotion or change of challenge resets the loss count. Abandoned rounds and draws
  are not results. An eliminated human is counted once while other bots may continue.
- Winning level 1 always leads to level 2. Later wins advance at least one level,
  capped at 100. Consistent wins can accelerate, now capped at **five levels per
  win**: a 24-level overshoot was too costly to correct under three-loss demotion.
- The result screen says **DEMOTED TO LEVEL 01** (or the appropriate number).
  The next floor sign repeats the previous level beneath the new level. The same
  message is available in Pause and announced to assistive technology. The message
  survives a reload until the next resolved attempt.
- The existing direct NEXT/RETRY flow remains. Saved progress has a version-two
  loss counter and demotion record, in the existing local storage entry. Version-one
  saves migrate once, including repairing older immediate-loss drops. Version-two
  demotions are preserved rather than mistakenly repaired upward on reload.

## Bots follow the actual round level

The session passes the announced round level into authoritative bot options.
The next level cannot change the AI halfway through the current round.
Reaction delay, jitter, positional error, prediction horizon, movement speed and
serve timing already ramped with level. This revision additionally scales:

- Serve aim: stable seeded inaccuracies at easy levels, zero deliberate error at 100.
- Shot planning: three coarse bat poses and eight flight steps at level 1; nine poses,
  three signed brush options and 24 flight steps at 100.
- Curve use: deliberate brushes unlock gradually and increase in strength with skill.
  Easy bots still try to collect pickups; their aim and execution are less reliable.

Level 1 has a 0.65-second base reaction, jitter, large aim error, 0.1-second prediction
and a 2 rad/s movement cap. Level 100 has physics-tick reaction (1/120 second), zero
jitter/aim error, one-second curved-flight interception, the full shot planner and
the human pointer speed cap of 16 rad/s. It uses normal movement, collisions and
public state. This is the strongest current controller without artificial mistakes;
it is not a proof of mathematically perfect play or the ability to catch physically
unreachable simultaneous balls.

The [sample report](reviews/m09/level-ladder/bot-progression.json) includes profiles
at levels 1/25/50/75/100, synthetic threshold trajectories and 12 bounded bot-only
matches. The same level-60 proxy wins 3/6 against level 1 and 0/6 against level 100
in the sampled 2/6-seat games. All samples have zero collision caps. Strong six-bot
endgames still run beyond the sample's roughly two-minute bound after the proxy is
eliminated. These are smoke samples, not human difficulty calibration or M06 approval.
Synthetic capacities 25/60/100 settle within one level of their threshold over 30
attempts with the five-level climb cap.

## Floor introduction

`LEVEL 01` is now bevelled procedural geometry in the arena scene. The existing
planar floor captures its actual reflection. It rises in the opening 0.4 seconds,
holds above the surface, and sinks during the final 0.45 seconds of the unchanged
1.5-second countdown. The floor occludes the buried part naturally. There is no
camera-mounted duplicate and no countdown veil dimming the arena.

The countdown owns the pose: pausing cannot advance it, and rendering never delays
gameplay. Lettering faces the selected fortress, fits the arena width, and uses fine
edges so small phone letters remain distinguishable. Reduced motion shows the
settled sign and hides it at play; low/reduced quality continues to disable reflections.

## Rendered review

Native GPU pose fixtures use the real arena, world lettering, countdown and reflection
code. They deliberately choose countdown positions rather than simulate a whole match:

- [Rise/hold/sink video](reviews/m09/level-ladder/floor-level-introduction.webm).
- Raised signs and floor reflections: [2 seats](reviews/m09/level-ladder/raised-2.png),
  [4 seats](reviews/m09/level-ladder/raised-4.png), [6 seats](reviews/m09/level-ladder/raised-6.png).
- Four-seat sequence: [buried](reviews/m09/level-ladder/buried-4.png),
  [rising](reviews/m09/level-ladder/rising-4.png), [sinking](reviews/m09/level-ladder/sinking-4.png),
  [clear before play](reviews/m09/level-ladder/playing-4.png).
- [Level 07 after demotion](reviews/m09/level-ladder/demoted-07.png),
  [phone level 100](reviews/m09/level-ladder/phone-level-100.png),
  [reduced-motion level 01](reviews/m09/level-ladder/reduced-level-01.png).
- Actual production app, real third loss: [demotion result](reviews/m09/level-ladder/demotion-result.png),
  [next countdown](reviews/m09/level-ladder/demoted-level-start.png).
- [Render report](reviews/m09/level-ladder/render-report.json): no browser errors.

Frames were inspected at desktop and phone sizes; the reflected text emerges and
recedes through the floor without covering the arena with an overlay.

## Checks and remaining limits

- `vp check`: strict TypeScript, lint and formatting pass.
- `vp test run`: **385 tests / 63 files pass**, including streak resets, repeated
  demotions, floor 1/ceiling 100, time-independent progress, versioned migration,
  demotion persistence, bounded calibration, progressive bot accuracy/tactics,
  level-to-bot wiring and actual text bounds for every seat in all five layouts.
- **52 full native production browser checks pass** at root, including real first
  win, first-loss retry, third-loss demotion, reload, time-away behavior, desktop
  rematches, all mobile arena counts, input, fullscreen and audio lifecycle.
- **Six progression checks pass under `/citadel/`**. Root and Pages builds pass.
- Initial defeat tests used a seed whose weaker bot now loses. The tests use seed 1
  for a reproducible ordinary defeat; no state/health/outcome is injected.
- The existing approximately 954 kB main-bundle advisory remains. Physical phone/
  Safari and full software-WebGL checks were not run for this revision. Human
  difficulty and broader M06 pacing review remain open; M10 is not started.

Try **http://localhost:5176/**. Start a round to see the sign emerge and reflect.
Two losses should retain the level; the third should announce the one-level drop.
A win should clear the streak. Closing the game and returning later must not lower it.

To reproduce the pose captures with the local dev server running:
`node tooling/render-level-intro.mjs /tmp/citadel-level-intro`.
Run `./node_modules/.bin/vpx tooling/review-progression.ts /tmp/citadel-ladder.json`
for the bounded simulation samples.

**REVIEW REQUIRED — M09**
