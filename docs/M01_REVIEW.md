# M01 — first playable prototype

Status: awaiting user review. No approval or work on M02 is implied.

Run `pnpm dev` and open the local URL. The four-player square has one human,
three basic bots, eight physical pieces per fortress, revenge serves, elimination,
a winner and rematch. No network or account is involved.

## Current feel and feedback incorporated

- Ball radius **0.187**, up 10% from 0.17; speed **24 units/s**, doubled from 12.
- One initial ball; another every **15 playing seconds**, to a provisional cap of
  **four**. Countdown and pause do not advance the arrival clock. Interval/cap are
  editable under the prototype experiments. The simulation supports up to eight.
- Responsive, speed-limited bats. Each bat's **2.2-unit face curvature** is separate
  from its **4.4-unit travel rail**; visible shape and collisions agree. Returns
  use the actual face normal with a contact-offset adjustment. No spin yet.
- Both adjacent rivals are reachable. Serves and actual bat contacts can bank off
  **either wall beside the bat**, at every fortress. Serve aiming spans the field
  instead of being constrained to the narrow rail normal. The serve guide includes
  one wall rebound; actual defenders can intercept it. Serves have no random spread.
- A swept collision destroys the piece actually contacted. Empty gaps never
  substitute damage to a nearby piece. The damaged survivor gets the revenge serve;
  an eliminating hit uses the documented seeded surviving-seat fallback.
- One click launches at most one queued ball. Held balls auto-launch; pending
  serves move to surviving seats if their defender is eliminated.
- Mouse, A/D or arrows, click/Space/Enter serving, Escape/P pause, explicit resume
  after focus loss, immediate restart and an optional spectator finish after death.
- Return preview and approach slowdown are experiments, both off by default.
  Slowdown applies symmetrically to all defenders; reduced effects are available.

## Validation actually run

- `pnpm check`: formatting, lint and strict TypeScript passed.
- `pnpm test`: **51 tests across seven files** passed. Covers physical hits and
  gaps, moving curved contact, high-speed crossings, speed caps, serve deadlines,
  queued recipient elimination, deterministic simultaneous balls, bank reach from
  all corners, eight-ball slowdown stress, replay, GPU cleanup and fixed-tick timing.
- `PAGES_BASE_PATH=/citadel/ pnpm build`: production build passed.
- `pnpm test:browser`: **six production Chromium tests passed**, covering for project-path load/refresh,
  small-window fit, WebGL2 fallback, keyboard/held-key clearing, focus pause,
  second/third balls, both mouse arc limits, a complete round, results and rematch.
  The full-round test advances the browser clock; it does not edit match state.
- `pnpm exec vpx tooling/benchmark.ts`: five all-bot matches finished naturally
  with zero collision-loop caps. This is simulation evidence, not a human playtest.
- `git diff --check`: passed.

| Seed | All-bot duration | Returns | Pieces destroyed |
| ---- | ---------------: | ------: | ---------------: |
| 1    |            74.6s |      94 |               31 |
| 21   |            64.6s |      79 |               31 |
| 2026 |            68.7s |      89 |               30 |
| 100  |            59.0s |      89 |               31 |
| 300  |            59.2s |      85 |               29 |

The bot-only median is about 65 seconds. The two-minute target and human survival
are still tuning questions; no retention or balance claim is made.

## Rendered evidence

- [Four-fortress game with three balls](reviews/m01/arena.png).
- [Bank toward one adjacent wall](reviews/m01/bank-left.png).
- [Bank toward the other adjacent wall](reviews/m01/bank-right.png).
- A roughly 38-second desktop gameplay capture is available locally at
  `/tmp/citadel-m01-review/gameplay.webm`; it uses scripted mouse/serve input at
  normal simulation speed. The temporary video is not checked into the repository.

Screenshots were visually inspected. The previously discussed layout sketch is
not available in this workspace, so no claim of matching it is made.

## Limits and provisional rules

- Only the four-player layout and one basic bot controller are implemented.
  Mobile, audio, bloom polish, advanced spin and multiplayer remain later work.
- Physics is 120 Hz. Moving curved centres/endcaps use short fixed-tick chord
  approximations; M03 remains the broader collision-hardening gate. No claim of
  exhaustive collision correctness or measured hardware frame-rate coverage.
- Same-tick impacts resolve in ball-ID order; a declared winner ends the tick's
  match logic before subsequent balls can overturn it. This deterministic tie rule
  is provisional for review.
- Balls do not collide with one another. Experiment settings reset on rematch.
  Reducing a live ball cap stops further additions rather than removing active
  balls; changing the interval can add balls immediately to catch up with elapsed
  playing time. These are prototype tuning controls.
- The static bundle currently emits a >500 kB chunk warning (about 813 kB minified,
  220 kB gzip). Splitting renderer loading remains future work.
- Local checks validate the existing CI/Pages files and project-path build. No
  remote workflow, Pages settings, push, deployment or `gh` command was executed.

## What to try

1. Pick a fortress, play a round and try both ends of the arc. Can you deliberately
   bank off either adjacent wall and attack the next corner?
2. Let the second and third balls join. Does the faster pace feel exciting while
   leaving enough time for a deserved save? Try 10/15/20-second arrival intervals.
3. Lose a piece, then use the revenge serve. Are the damage, gaps and next serve
   obvious? Compare return preview and approach slowdown independently.

REVIEW REQUIRED — M01
