# Fast progression and tactical bots — M09 follow-up

12 November 2026. The owner requested a guaranteed level 1 → 2 win, fewer steps
between rounds, and bots that aim at pickup containers and use curves. M09 remains
**Awaiting review**. No push or deployment was requested or performed.

## Delivered behavior

- Winning level 1 always unlocks level 2, including progress saved by older builds.
  Every subsequent win advances at least one level, capped at 100. Sustained wins
  retain the existing faster adaptive calibration; losses and inactivity can lower
  the next attempt's level. Progress is still saved locally once per attempt.
- After a 0.9-second result beat, **NEXT** starts the next level directly. **RETRY**
  starts a new attempt after defeat; level 100 offers **AGAIN**. The level appears
  during the opening countdown. There is no intervening title or second Start click.
- The same canvas and renderer survive between attempts. Settings, roster and human
  fortress are retained; simulation, inputs, music, observers and presentation effects
  reset. The new attempt acquires mouse/touch/fullscreen/audio within the button's
  original user gesture. Export uses the current round's actual seed.
- The victory star still morphs over 2.8 seconds and stays bright through 4.5 seconds
  if the player waits. Continuing early skips the remaining celebration. A player
  eliminated before the other bots finish can also use Pause → Play again to start
  directly at their saved adjusted level.

Numeric level bots now prefer reachable landed supplies on serves, re-evaluate
consumed/expired targets, and consider supplies on returns. Defending an incoming
ball takes precedence over aiming a serve. Full inventories ignore supply targets.
The existing reaction delay, prediction horizon, aim error and movement limits
continue to distinguish levels 1–100.

Returns use a bounded search of 27 bat-pose/swipe candidates, each with up to 24
flight steps. Candidates use the normal bat collision, return direction, decaying
curve and wall-bank functions; intervening bats stop the ownership forecast. A
chosen curve is executed by moving the bat into a short signed brush before contact.
No collision-time spin override, extra health award, teleport or future input is
available to the AI. Shot selection is cached briefly while high-level interception
can still update at its reaction rate. Named legacy bot profiles remain available for
historical replay fixtures.

## Rendered evidence

The bot captures stage an incoming ball and a known pickup, then run actual level-100
bot inputs and fixed-step physics. These are controlled demonstrations, not natural
spawn examples:

- [Curved pickup video](reviews/m09/fast-progression/curved-pickup.webm).
- 2 seats: [curve](reviews/m09/fast-progression/curve-2.png),
  [four containers after collection](reviews/m09/fast-progression/collected-2.png).
- 4 seats: [curve](reviews/m09/fast-progression/curve-4.png),
  [collection](reviews/m09/fast-progression/collected-4.png).
- 6 seats: [curve](reviews/m09/fast-progression/curve-6.png),
  [collection](reviews/m09/fast-progression/collected-6.png).
- [Phone viewport](reviews/m09/fast-progression/phone-collected.png).
- [Render report](reviews/m09/fast-progression/render-report.json): all three layouts
  produce approximately +1.39 radians/second initial curve, collect the intended
  supply, grow health from 3 to 4 and have zero collision caps or browser errors.
- Real production flow: [level 1 won](reviews/m09/fast-progression/level-1-win.png),
  [level 2 countdown after one click](reviews/m09/fast-progression/level-2-start.png).

Frames were reviewed locally at desktop and phone sizes. The return and transfer
remain readable, and the new container settles into the existing formation.

## Validation and limits

- `vp check`: strict types, lint and formatting pass.
- `vp test run`: **370 tests / 63 files pass**. Added coverage includes guaranteed
  advance and legacy saved progress, cap 100, all-level supply serves, stale targets,
  falling/expired supplies, full inventories, signed curve selection, immutable
  planning, scheduled movement, and real left/right curved pickup awards. Existing
  seeded physics/replay tests remain green.
- **49 native production Chromium checks pass** at root, including multi-round
  desktop sessions, emulated touch matches at all 2–6 counts, fullscreen fallback,
  settings, focus/background interruption, input response, export and audio lifecycle.
  A final three-check progression pass covers the legacy level-one correction.
- **9 focused native production checks pass** under `/citadel/`: progression,
  result controls and mobile fullscreen/metadata behavior.
- Root and Pages builds pass; the existing large JavaScript bundle advisory remains
  (main bundle approximately 952 kB minified).
- An initial full-suite run was stopped at a test still trying to open title Settings
  during the newly active next round. That test now pauses first; the complete rerun
  passes.

[Bot-only smoke sample](reviews/m09/fast-progression/bot-games.json), seed 2026:

| Level | 2 seats           | 4 seats                             | 6 seats                             |
| ----- | ----------------- | ----------------------------------- | ----------------------------------- |
| 1     | 17.0 s, 2 pickups | 49.1 s, 6 pickups                   | 55.6 s, 7 pickups                   |
| 50    | 28.6 s, 3 pickups | 42.1 s, 5 pickups                   | 50.8 s, 6 pickups                   |
| 100   | 72.4 s, 7 pickups | Still playing at 120.5 s, 7 pickups | Still playing at 120.5 s, 7 pickups |

All nine samples have zero collision caps. Level-100 games produced 214/432/416
curved returns in 2/4/6 seats. This small deterministic sample demonstrates tactics;
it does not calibrate human skill or close the M06 pacing gate. Strong bot-only
endgames can still last beyond two minutes. Physical phone/Safari and software-WebGL
validation were not run for this follow-up.

## Local review

Use **http://localhost:5176/**. For a reproducible first-win check, open
`http://localhost:5176/?seed=2026`, choose 2 players and the Coral fortress, and use a
fresh browser profile if you already have saved levels. Win level 1, then press NEXT:
level 2 should count down immediately. At stronger saved levels, watch bots brush
returns toward supplies; easy bots still make delayed, inaccurate catches.

Reproduce the tactics sample with
`./node_modules/.bin/vpx tooling/review-bot-tactics.ts`. With the local dev server
running, use `node tooling/render-bot-tactics.mjs /tmp/citadel-bot-tactics` for the
controlled captures.

**REVIEW REQUIRED — M09**
