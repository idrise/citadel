# M05 revision — quieter walls, faster catch-up, full bat reach

Status: **Awaiting review**, 11 November 2026. User direction: retain regular
layouts, minimise movement, stop the arena lagging behind eliminations, and fix
unreachable gaps at the ends of the bat's travel. This supersedes the original
M05 eight-second transition and first-survivor alignment.

- [New eight-second gameplay clip](reviews/m05/walls/transition.mp4).
- [Transition start](reviews/m05/walls/start.png), [one second](reviews/m05/walls/midpoint.png),
  [settled at three seconds](reviews/m05/walls/settled.png).
- Two-player captured mouse at the [left end](reviews/m05/walls/reach-left.png)
  and [right end](reviews/m05/walls/reach-right.png).

Reload the local game and try two players, then four/six. The round settings,
relative mouse capture, geometric marks, health and music remain available.

## Changes

The new regular layout rotates to minimise total squared survivor travel instead
of pinning the first survivor and moving everyone else around it. Closest corner
correspondence collapses an old corner onto an edge. A six-to-five transition
uses **at most six sections**, instead of eleven temporary sections. The same
convex outline drives the colliders, plinth, wall meshes and reflections.

Caps, feet and panels now have **mitered ends**, closing their joins instead of
sliding overlapping boxes past each other. Corner posts retract as a bend flattens.

A normal transition takes **2.8 playing seconds**. Further deaths retain its
remaining time rather than starting another eight-second animation. A large
retarget may extend that deadline enough to cap eased fortress motion at **six
units/s**; the destination always reflects the latest surviving count. Final
victory remains immediate. Relative targets and bot serve targets still move
with their fortress/floor coordinates.

The two-player bat was restricted by a one-radian sector cap intended for corner
layouts. Its centre now travels approximately **±74°**, rather than ±39°. All
layouts derive their limits from the **actual curved bat against the current
wall planes**, leaving **0.015 game units** beyond its physical thickness. The
ball radius no longer reduces player reach. During morphs the same check prevents
an expanding rail range letting the bat clip through a wall that has not moved
clear. Wider serve travel is bounded to an inward fan (±1.45 rad) to avoid
backwards launches. Speed, spin and damage/serve-allocation rules are retained.

## Checks actually run

- `pnpm check`: formatting, lint and strict types pass without warnings.
- `pnpm test`: **246 tests in 40 files pass**. Added corner-count/convexity,
  retarget timing, minimal travel and wall-join tests. Every seat at every player
  count moves to both limits and must catch a ball swept along the adjoining wall.
  Moving-floor checks cover the bat extremes for every first elimination.
- Production Pages build passes: initial game **898.58 kB / 246.28 kB gzip**;
  lazy music **271.75 kB / 66.58 kB gzip**. Existing large-chunk warning remains.
- Native Chromium browser validation: the full run passed **21/22**; its only
  failure was an old assertion that square travel must stay below 27.5°. The
  corrected travel is about 29.2°. Updating that expectation and rerunning the
  settings/all-seat control test and new two-player mouse test passes both.
  Thus all **22 distinct browser checks** pass across the full run and focused
  rerun, including twelve complete rounds/rematches across all layouts.
- Twelve seeded bot-only rounds finish with **zero collision caps**, in
  **31.37–109.71s**. [Report](reviews/m05/walls/bot-rounds.json). This is stability
  evidence, not a human fun judgement or an M06 pacing decision.
- The real gameplay capture is moving at one second and settled by three, with
  no page errors. It was fast-forwarded normally to the first elimination, then
  resumed for real-time recording. Music is muted; emulated RAF timing is not
  a performance benchmark. [Run log](reviews/m05/walls/live-stats.json).
- Reach changes deliberately update five replay digests because bots can now
  use the fuller rail. All seven initial contacts are unchanged at 1e-6 precision;
  later grazing/empty-sector contacts change with bot reach. The two isolated
  wall-only digests remain identical. [Comparison](reviews/m05/walls/replay-comparison.json).
  The existing 30/60/144 FPS and collision-cap checks still pass. Golden updates
  retain prior values within that precision to avoid unrelated float churn.

The renderer remains procedural. No textures, dependencies, `gh`, push or deployment
were added. Your separate AGENTS edit remains unstaged. Mobile/Safari and a full
software-WebGL run are unverified. M06 remains unstarted.

Implementation: `80e95b8`.

**REVIEW REQUIRED — M05.**
