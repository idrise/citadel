# M03 / M04 — swipe returns, destruction and rule hardening

Status: **Awaiting review**, 11 November 2026. The user explicitly requested the
relevant parts of both milestones together, with the existing feel preserved.
A small swipe curve and destruction effects were pulled forward from M06/M07;
M05 and the full pacing/audio/polish gates remain unstarted.

## Try it

Run `pnpm dev`, open the local page and click **Play**. Brush the bat sideways
while catching a ball to bend its return. Catch with the bat held still to keep
the established contact-position aim. Watch a lost piece break up and the brief
arc toward the revenge serve. Existing speed, bat responsiveness, timed arrivals,
serve deadlines, default preview and optional pressure-only slowdown remain.

The useful hands-on decisions are whether the bend is noticeable enough without
spoiling deliberate returns, whether the lost piece is obvious, and whether the
revenge serve keeps the rally moving. This handoff does not approve those choices
on the user's behalf.

## What changed

- A moving bat imparts signed curvature, scaled by its actual capped angular
  speed and how directly the ball approaches the face. Maximum initial turn rate
  is **0.28 rad/s**, decaying exponentially at **2.6/s**: less than **6.2° total
  bend** from a full swipe. It changes direction without adding speed. A held
  bat returns with zero curve; ready balls and new serves reset it.
- The dotted forecast consumes the same flight integrator. It still assumes
  current bats/pieces remain stationary, so a last-moment swipe can change that
  conditional destination. The optional pressure detector now samples curved
  arrivals and rejects intervening live bodies; straight arrivals retain the
  previous path. Bots retain their limited linear estimates and use the same
  movement/curve rules as humans.
- Each destroyed piece emits ten small neon fragments distributed through its
  height and an expanding low ring, fading over **0.62s**. A **0.18s** raised arc
  indicates the return to the actual ready ball. It tracks that ball's ID and
  current ready position, and cancels if it launches or disappears. These are
  pooled presentation objects: they do not delay the real ball or consume match
  RNG. Pause holds their positions; reduced effects uses three quieter fragments
  and hides the ring/transfer arc.
- Impact events record ball ID, within-tick time, normal, incoming/outgoing
  velocity and curve. Damage additionally carries the struck body's current
  radius and revenge destination. These support effects and replay inspection.
- Ball processing explicitly uses ascending ID, independent of array order.
  Within each ball, earliest swept contact wins; exact contact ties retain
  paddle/piece/wall, seat and piece ordering. This makes the existing result
  policy explicit: **the first final hit to leave one survivor ends the match**;
  later balls neither damage nor launch that tick. Mutual final shots resolve by
  ball ID, rather than becoming a draw. This remains a reviewable policy.
- Ordinary damage still serves to the damaged survivor. After elimination,
  seeded selection among survivors remains the provisional fallback, including
  reassignment of that eliminated seat's queued serves. No attribution/attacker
  rule replaces revenge serving.

## Evidence and checks

- `pnpm check`: formatting, lint and strict types pass.
- `pnpm test`: **156 tests in 24 files pass**. New cases cover opposite swipes,
  speed/decay bounds, zero-spin behavior, forecast agreement, curved pressure
  arrivals/blockers, simultaneous damage/final hits, queued serves, effect
  lifetime/pause/reduced mode and unchanged authoritative state during effects.
- Seven two-second regression fixtures run at **30/60/144 rendered FPS**, using
  the fixed 120 Hz clock. They match checked-in full-trace digests; all 175 impact
  events are recorded in [replays.json](reviews/m03-m04/replays.json). Cases cover
  a 240-unit/s exact wall corner, a 120-unit/s grazing bat hit, signed swipes,
  a missing health piece, an empty eliminated sector and eight curved balls at
  120 units/s. Wall-only fixtures intentionally remove defending bodies.
  No collision cap was reached. Tests assert the intended first contacts/signs,
  corner normal ordering, bounds, gap identity and no eliminated-sector damage.
- `PAGES_BASE_PATH=/citadel/ pnpm build`: passes. The existing bundle-size warning
  remains (871.11 kB minified / 236.71 kB gzip).
- `PLAYWRIGHT_RENDERER=hardware pnpm test:browser --workers=1`: **12 pass** in
  16.6 seconds, including full round/rematch, Pointer Lock, focus/pause, all human
  seats, resize, assistance settings, Pages refresh and reduced rendering.
- Native Chromium at 1440×1000: real input capture plus controlled physical
  damage and signed swipe fixtures produced no page errors. Reviewed
  [gameplay](reviews/m03-m04/gameplay.png),
  [fracture/return](reviews/m03-m04/fracture.png),
  [reduced effects](reviews/m03-m04/fracture-reduced.png),
  [negative swipe](reviews/m03-m04/curve--1.png) and
  [positive swipe](reviews/m03-m04/curve-1.png). Local videos are at
  `/tmp/citadel-m03-m04-review/gameplay.webm` and `curve-fixtures.webm` in that folder.
- Five seeded all-bot rounds finish in **50.475–67.442s**, with zero collision
  caps: [raw benchmark](reviews/m03-m04/benchmark.txt). Reproduce with
  `pnpm exec vpx tooling/benchmark.ts`. This is stall evidence, not human pacing
  evidence or approval of the two-minute target.

## Remaining limits and next gate

Curved flight uses a swept straight segment per 1/120s tick, with direction
updated by the shared decaying integrator. It is a bounded small-curve
approximation, not an exact continuous curved sweep. The reviewed stress cases
are finite examples, not a proof for arbitrary speeds or degenerate geometry.
The full software-WebGL browser suite was not rerun here; the complete suite ran
on the host GPU. Native captures are visual evidence, not measured performance
budgets or human playtest results.

Spectating controls, attribution marks, other layouts, layout morphing after
elimination, bot difficulties, full curve/pacing comparisons and audio remain
later work. Your M05 dynamic-layout note and AGENTS instruction were preserved
as separate, unstaged edits. No `gh`, push or remote deployment was performed.

**REVIEW REQUIRED — M03 / M04.**
