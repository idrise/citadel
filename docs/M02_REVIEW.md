# M02 — controls and deliberate aiming

Status: **Approved on 11 November 2026**, at `854276b`. The user said the feel
is good and requested relevant M03/M04 work, a flourish and a little swipe curve. This milestone preserves the approved arena, exterior grid, ball speed
and timed arrivals.

## Play and compare

Run `pnpm dev`, reload the local page and open **Settings**. The starting mode is
**Preview only**, following the user's clarification: show a dotted forecast
from a nearby ball, through a bounce off the current stationary bat, toward the
next impact. **Pressure slowdown stays off**, available as an option. Ordinary shots and bat
input retain their normal speed.

Settings offers **Neither / Preview only / Pressure slowdown only / Preview + pressure slowdown**
and **0.5–2× mouse sensitivity**. Changes survive seat selection, Restart and
Rematch within the current page; reloading resets defaults. **Restart** repeats
the same seeded opening. **Rematch** chooses a new seed. This makes comparisons
possible without reconfiguring the game each time.

Mouse movement remains relative and captured. A/D or arrows share the same
movement cap. Click, Space and Enter latch a single serve request; key repeats
neither cancel a pending request nor launch again. The existing 0.25-second
minimum ready age, countdown rule and automatic serve deadline remain.
Escape/P, focus loss and capture loss pause and clear held input. Resume requires
a click. Delayed/rejected capture requests cannot recapture after pausing or
pause a newer request. All four human seats and resize were exercised in Chromium.

## Dotted forecast

- The earliest incoming ball is considered once it is within **8.4 units of the
  human fortress anchor** and would strike the bat within **0.45 seconds**.
  Shots intercepted first by a wall, another bat or a surviving piece do not get
  a misleading bat-return forecast.
- A private simulation copy holds the current bat and piece poses fixed. The
  forecast uses the same fixed-step collision, return and slowdown rules as the
  game. It does not change live health, random state, velocity or outcomes.
- Dots begin at the actual ball, pass through the predicted bat contact, and
  continue for up to **0.9 seconds** after contact. One wall bank is shown; the
  path ends at the next collision or the projection limit. Rings mark impacts
  and the projected end; the last ring is slightly larger. Rings remain legible
  when their contact point is partly hidden by a solid face.
- The display consumes a sampled trajectory, resampled into evenly spaced dots,
  rather than assuming a straight ray. Future curvature belongs in ball physics;
  the display can consume those curved samples without replacing the renderer.
  **Curving/spin is not implemented in M02.**
- This is conditional information. Moving bats and springing pieces can change
  the outcome; there is no guaranteed future destination. The serve guide remains
  available in all modes and stops at current obstructing bodies.

## Bat shape and response

The bat already has a convex face independent of its rail: **2.2-unit face
radius**, **0.48-radian half-angle**, and about **0.249-unit bulge** relative to
its chord. Rendering and swept collision use the same shape. It was retained
rather than changing the approved feel without evidence.

Controlled incoming shots at offsets **−0.75 / 0 / +0.75** produce returns about
**−34.377° / 0° / +34.377°** relative to the central facing. This combines the
curved surface normal with the existing bounded contact-offset aiming. Every
seat, both neighbouring banks and adjacent-rival reach remain covered by tests.

The rail spans **53.294°**. At the unchanged **3.2 rad/s** cap, full travel takes at
least **290.671 ms**, regardless of sensitivity. Full rail travel requires about
465 / 233 / 116 captured movement pixels at 0.5 / 1 / 2× sensitivity. These are
browser movement units, not a universal physical mouse-distance calibration.
No acceleration/inertia filter was added: responsive input with the existing
speed cap remains the proposed feel.

## Assistance comparison

Recommendation: **Preview only**, sensitivity **1×**, no extra inertia, pressure
slowdown off. This follows the user's requested behavior and subsequent feedback
that routine delay is unwanted. The optional aid is specifically a counter for
rapid, separated incoming catches, not a general approach slowdown.

| Mode                        | Physics                                          | Benefit                                                   | Tradeoff                               |
| --------------------------- | ------------------------------------------------ | --------------------------------------------------------- | -------------------------------------- |
| Neither                     | Fast baseline                                    | Least visual information; direct arcade challenge         | Requires reading returns unaided       |
| Preview only                | Identical to Neither                             | Dotted stationary-bat forecast supports small adjustments | Moving actors may invalidate it        |
| Pressure slowdown only      | Later threatened arrival receives bounded relief | Can buy time to move between two catches                  | Emergency rally timing changes         |
| Preview + pressure slowdown | Identical to Pressure slowdown only              | Forecast plus optional multi-ball relief                  | Most assistance; needs hands-on tuning |

A single ordinary shot stays at full speed in **all four modes**. Two nearby
shots which one bat pose can cover also do not trigger relief. The detector
looks ahead **0.45 seconds**, rejects already-intercepted paths, and compares
separated catching intervals against **75% of the normal paddle speed cap**.
This is a straight-shot pressure heuristic; revisit its tuning with future spin.

Only the **later arrival** is armed for relief. It moves normally until the
near-defence band, then uses **55% travel speed**. The armed state survives the
first catch so the second ball can still receive the assistance. Departure,
contact, leaving the defence approach, disabling the option or losing the
defender clears it. Stored velocity and paddle speed are never multiplied or
increased. The same rule applies to humans and bots.

The controlled **1.5-unit gap, 24 units/s** single-shot fixture reaches contact
at **62.5 ms** even with the pressure option enabled. When a separate earlier
threat makes this shot the pressured later arrival, it reaches contact at
**113.636 ms**. Return angles remain the same.

A separate scripted two-catch fixture demonstrates an actual benefit:

| Optional relief | Catches | First catch | Maximum bat speed |
| --------------- | ------: | ----------: | ----------------: |
| Off             |       1 |       75 ms |         3.2 rad/s |
| On              |       2 |       75 ms |         3.2 rad/s |

This is one reproducible mechanical example, not a guarantee of every save or a
claim about human reaction time. It verifies that the first arrival is not
held up and the second catch does not depend on teleporting or faster controls.

The three-seed **all-bot** comparison measures outcomes, not human feel, match
fun or two-minute pacing:

| Seed | Neither / Preview only | Pressure slowdown / Both |
| ---- | ---------------------: | -----------------------: |
| 1    |                53.417s |                  60.992s |
| 21   |                45.042s |                  57.700s |
| 2026 |                61.558s |                  57.958s |

All twelve mode/seed runs finished with **zero collision-loop caps**. Outcomes
and digests match within each informational-preview pair. Reproduce with
`pnpm exec vpx tooling/compare-controls.ts`; raw results are in
[comparison.json](reviews/m02/comparison.json). The recommendations still need
hands-on review.

## Checks and rendered evidence

- `pnpm check`: formatting, lint and strict TypeScript passed.
- `pnpm test`: **136 tests across 19 files** passed. Covers sensitivity/clamp
  reversal at all seats, keyboard handover, single-press launches, capture races,
  movement caps, pressure detection/latching/restoration, ordinary-shot speed,
  the two-catch counter example, immutable forecasts and physical
  target/gap endpoints, banks, curved-sample resampling and instance cleanup.
- `PAGES_BASE_PATH=/citadel/ pnpm build`: static build passed.
- `PLAYWRIGHT_RENDERER=hardware pnpm test:browser --workers=1`: **all 12 tests
  passed**, including full round/results/rematch, every human seat, settings
  persistence, repeatable Restart, resize/focus, live-camera input safety,
  default/reduced rendering, Pages-path refresh and WebGL2 fallback.
- The final marker adjustment passed a focused **2/2 rendering rerun**. Native
  capture exercised the actual default selector, play/capture/steering/serving/
  release with no page or console errors. Chromium used Apple M2 Pro / ANGLE Metal.
  The default test configuration still uses portable software WebGL; that full
  configuration was not rerun for this milestone. No cross-device performance
  claim is made.
- `git diff --check` passed. Screenshots were visually inspected.

[Controls and aid choices](reviews/m02/settings.png) ·
[Gameplay](reviews/m02/gameplay.png) ·
[Left contact](reviews/m02/return-left.png) ·
[Centre contact](reviews/m02/return-centre.png) ·
[Right contact](reviews/m02/return-right.png)

The three contact images are controlled, stationary-bat rendering fixtures,
not claimed human playtest observations. Local desktop gameplay recording:
`/tmp/citadel-m02-review/gameplay.webm` (not checked in).

Try Preview only, then Both, using Restart for the same opening. Check the
activation timing, dots/bounce/end markers and whether small bat adjustments give
useful shot control. No further milestone has started. The existing large-bundle
warning remains (about 867 kB minified / 235 kB gzip). No push, deployment, remote
workflow or `gh` command was performed.

M02 approved; see PLAN.md for the current combined M03/M04 work.
