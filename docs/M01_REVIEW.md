# M01 — first playable prototype

Status: awaiting review of the behind-player view, frosted materials and clustered
health. Gameplay feedback was positive before these requested amendments. M02 has
not started.

## Current build

Run `pnpm dev` and open the local URL. One human plays three bots in the square
arena, with physical health targets, revenge serves, elimination, results and rematch.

- Ball radius **0.187**, 10% larger than the first prototype; speed **24 units/s**,
  doubled from 12. Start with one ball; add another every **15 playing seconds** to
  a provisional cap of **four**. Interval/cap are editable in the experiment panel.
- The live camera sits **behind the selected human fortress**, looking down into
  the arena at about 45°. Selecting another fortress rotates the view and its
  cutaway walls. A bounded slow orbit/tilt and breathing zoom keep it alive.
- Pointer events use the current rendered camera and the bat plane. A stationary
  cursor retains its world-space target; the camera cannot steer it. Pausing or
  enabling reduced effects holds the current camera pose without a jump.
- The arena has a deep raised plinth, extruded curved bats, taller pieces,
  directional shadows and low foreground walls that cannot hide the ball.
- Broad faces are **dark rough metal**, with subdued procedural neon reflections.
  A softened planar floor reflection captures actual moving geometry. The
  reflection environment uses procedural light cards, with no image/HDRI assets.
- Bloom radius remains **0.22**; its strength drops from **0.45 to 0.22** to reduce
  opacity without changing the halo spread. Reduced effects disables bloom and
  the floor reflection; the real 3D geometry remains.

## Physical health cluster

Eight pieces begin in two staggered rows inside each fortress, behind the defence
rail. After a loss, surviving IDs spring toward a tighter formation, with damping,
soft separation and bounded movement speed. This is a provisional attraction
experiment anchored inside the fortress, not a rigid-body pile or extra ball force.

Survivors gradually grow by **3.5% of their original size per loss**, capped at
**24.5%** for the last piece. Their current position/radius belongs to simulation;
rendering uses the same state, and ball collision sweeps relative to moving targets.
Gaps are real at each instant, although pieces can move into them. No nearest-piece
substitution is allowed. A ball can legitimately pass through a front gap and hit
an actual piece in the rear row.

A physical hit destroys exactly the contacted piece and returns that ball to the
damaged survivor. Eliminating hits use the documented seeded surviving-seat
fallback. One click serves at most one queued ball; every ball has an automatic
serve deadline. Bat movement/limits, speed, serving, banks and input controls remain
as previously agreed. Health trajectories intentionally change in this revision;
the older presentation-only trace hash is not a baseline for these new rules.

## Validation actually run

- `pnpm check`: formatting, lint and strict TypeScript passed.
- `pnpm test`: **80 tests in 12 files** passed. Includes all remaining health counts,
  growth limits, spring settling/separation, moving-target swept collision,
  render/collider agreement, camera placement behind all four seats, projection
  throughout camera motion, stationary-pointer safety, reflection resource cleanup,
  and the existing damage/serve/elimination/replay/stress contracts.
- `PAGES_BASE_PATH=/citadel/ pnpm build`: static production build passed.
- `pnpm test:browser`: **eight Chromium tests passed**, including full round/results/
  rematch, live-camera input, both mouse travel limits, focus/held-key clearing,
  project-path refresh, WebGL2 fallback and bloom/reduced rendering. Longer match
  checks use reduced effects and controlled browser clocks; render checks exercise
  the default effects. WebGL workers remain capped at two.
- Five seeded all-bot matches finished with **zero collision-loop caps**. These are
  simulation benchmarks, not human playtest or retention evidence.
- `git diff --check` passed. Rendered screenshots were inspected and a desktop
  gameplay clip recorded locally.

| Seed | Bot-only duration | Returns | Pieces destroyed |
| ---- | ----------------: | ------: | ---------------: |
| 1    |             53.4s |      62 |               30 |
| 21   |             45.0s |      46 |               30 |
| 2026 |             61.6s |      93 |               27 |
| 100  |             60.5s |      63 |               30 |
| 300  |             59.8s |      66 |               30 |

A separate idle-human seed 2026 simulation finished at 57.1 seconds. Pacing and
spring/growth tuning still need hands-on review; no two-minute human-duration
claim is made.

## Evidence and review

- [Behind-player view and frosted neon surfaces](reviews/m01/arena-frosted.png).
- [Health formation after a hit](reviews/m01/cluster-after-hit.png).
- [Reduced-effects view](reviews/m01/arena-frosted-reduced.png).
- Local updated gameplay capture: `/tmp/citadel-frost-review/gameplay.webm`.
  It uses scripted mouse/serve input at normal simulation speed, not state edits.
  Temporary video is not checked into the repository.

Try the camera from different fortress seats. Check that the darker faces still
show height, that the lighter bloom keeps the ball obvious, and that growing,
gathering pieces feel fair to attack and defend. Both adjacent rivals and wall
banks remain covered by the aiming tests.

Only four seats and one basic bot controller are implemented. Mobile, audio,
advanced spin, multiplayer and broader effects/performance work remain later
milestones. Same-tick balls resolve in ID order. No exhaustive collision or real-
hardware frame-rate claim is made. Settings reset on rematch; a lower live ball
cap stops additions without deleting existing balls. The bundle still emits a

> 500 kB warning (about 852 kB minified / 230 kB gzip).

The original sketch remains unavailable. No remote workflow, push, deployment,
repository-setting change or `gh` command was performed.

REVIEW REQUIRED — M01
