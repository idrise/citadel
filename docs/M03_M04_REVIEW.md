# M03 / M04 — swipe returns, destruction and rule hardening

Status: **Approved to advance**, 11 November 2026: the user requested M05.
The evidence below records the M03/M04 delivery. The user explicitly requested the
relevant parts of both milestones together, with the existing feel preserved.
A small swipe curve and destruction effects were pulled forward from M06/M07;
at that delivery M05 and full later gates were unstarted; [M05](M05_REVIEW.md) now
provides the other layouts, morphing and bot difficulties. The user could not
reliably notice or trigger the initial curve, so this revision strengthens it,
adds a short swipe tolerance and makes actual spin visible on the ball.

## Try it

Run `pnpm dev`, open the local page and click **Play**. Brush the bat sideways
while catching a ball to bend its return. A quick mouse flick shortly before
contact also counts. Rotating arrow bands and a cyan/pink tint show opposite
spin directions; a longer dotted trail reveals the path. Hold the bat still
for more than 100ms to retain the established contact-position aim. Watch a lost piece break up and the brief
arc toward the revenge serve. Existing speed, bat responsiveness, timed arrivals,
serve deadlines, default preview and optional pressure-only slowdown remain.

The useful hands-on decisions are whether the bend is noticeable enough without
spoiling deliberate returns, whether the lost piece is obvious, and whether the
revenge serve keeps the rally moving. This handoff does not approve those choices
on the user's behalf.

## What changed

- A moving bat imparts signed curvature from its **actual** capped motion.
  A fading **100ms** memory makes a quick brush practical without changing bat
  responsiveness or speed limits. Reversing overrides the remembered direction;
  pressing against a stopped rail does not refresh it. Moderate motion receives
  a square-root response, with a 45–100% incidence factor so glancing brushes
  also register. Maximum initial turn rate is **1.4 rad/s**, decaying at **1.8/s**:
  less than **45° total bend**, with no speed increase. A half-speed direct brush
  produces over **2 units of lateral travel in 0.5s**. Held bats lose all swipe
  memory after 100ms; ready balls and new serves reset ball spin.
- Two broken arrow bands surround a spinning ball. Their signed rotation,
  cyan/pink colour, opacity and scale indicate actual curve state; they fade
  away as it expires. The ball itself receives a subtle matching tint. Curved
  shots get up to twenty distance-spaced trail samples over about 4.4 units,
  rather than a short frame-dependent tail. Normal shots retain a shorter trail.
  Pause freezes the cue; reduced motion retains static direction/colour while
  disabling rotation and trails. The bands do not enlarge the collider.
- The dotted forecast consumes the same flight integrator. It still assumes
  current bats/pieces remain stationary and lets recent swipe memory expire
  through the same fixed steps, so a new swipe can change that conditional destination. The optional pressure detector now samples curved
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
- `pnpm test`: **165 tests in 25 files pass**. New cases cover opposite swipes,
  captured 12-pixel mouse brushes after the bat stops, timing expiry/reversal,
  visible lateral travel, signed band rotation, pause/reduced mode, trail resets,
  speed/decay bounds, zero-spin behavior, forecast agreement, curved pressure
  arrivals/blockers, simultaneous damage/final hits, queued serves, effect
  lifetime/pause/reduced mode and unchanged authoritative state during effects.
- Seven two-second regression fixtures run at **30/60/144 rendered FPS**, using
  the fixed 120 Hz clock. They match checked-in full-trace digests; all 171 impact
  events are recorded in [replays.json](reviews/m03-m04/replays.json). Cases cover
  a 240-unit/s exact wall corner, a 120-unit/s grazing bat hit, signed swipes,
  a missing health piece, an empty eliminated sector and eight curved balls at
  120 units/s. Wall-only fixtures intentionally remove defending bodies.
  No collision cap was reached. Tests assert the intended first contacts/signs,
  corner normal ordering, bounds, gap identity and no eliminated-sector damage.
- `PAGES_BASE_PATH=/citadel/ pnpm build`: passes. The existing bundle-size warning
  remains (873.75 kB minified / 237.64 kB gzip).
- `PLAYWRIGHT_RENDERER=hardware pnpm test:browser --workers=1`: **12 pass** in
  17.3 seconds, including full round/rematch, Pointer Lock, focus/pause, all human
  seats, resize, assistance settings, Pages refresh and reduced rendering.
- Native Chromium at 1440×1000: actual captured **±12-pixel mouse brushes** through
  the real input adapter produce **±0.956 rad/s** spin at contact; the bat has
  already stopped when contact occurs. No movement produces zero spin. Reviewed
  [negative brush](reviews/m03-m04/spin/mouse-spin--1.png),
  [held bat](reviews/m03-m04/spin/mouse-spin-0.png),
  [positive brush](reviews/m03-m04/spin/mouse-spin-1.png) and
  [static reduced-motion cue](reviews/m03-m04/spin/spin-reduced.png). These runs
  produced no page errors; video is `/tmp/citadel-spin-review/mouse-brushes.webm`.
- Earlier native captures: real input capture plus controlled physical
  damage and signed swipe fixtures produced no page errors. Reviewed
  [gameplay](reviews/m03-m04/gameplay.png),
  [fracture/return](reviews/m03-m04/fracture.png),
  [reduced effects](reviews/m03-m04/fracture-reduced.png),
  [negative swipe](reviews/m03-m04/curve--1.png) and
  [positive swipe](reviews/m03-m04/curve-1.png). Local videos are at
  `/tmp/citadel-m03-m04-review/gameplay.webm` and `curve-fixtures.webm` in that folder.
- Five seeded all-bot rounds finish in **49.883–64.258s**, with zero collision
  caps: [current raw benchmark](reviews/m03-m04/spin/benchmark.txt). Reproduce with
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

At this delivery, other layouts, elimination morphing, bot difficulties and audio
were later work; M05 and the music detour now cover those additions. Spectating
controls, attribution marks and full curve/pacing comparisons remain later work.
The separate AGENTS instruction is still unstaged. No `gh`, push or remote
deployment was performed.

**Approved to advance to M05.**
