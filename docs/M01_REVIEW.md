# M01 — first playable prototype

Status: awaiting review of the exterior neon grid. The user reported that the
shader edges and solid wall look is good, then requested more setting beyond the
arena. The camera remains at about 38° with tight fullscreen framing. M02 has not
started.

## Current build

Run `pnpm dev` and open the local URL. Click **Play** to capture the mouse;
horizontal movement steers, click/Space serves, and A/D or arrows also steer.
**Escape/P** releases the cursor and pauses. Losing focus or capture pauses too;
click **Resume** to recapture. Settings are tucked into the start/pause/result
menus. Pause controls sit in a small corner panel; **H** hides/restores them
for an unobstructed screenshot, keeping simulation paused. During play the only visible content is the full-viewport Three.js scene.
Nonvisual controls/status remain available to assistive technology.

- One human plays three bots with physical health targets, revenge serves,
  elimination, results and rematch. Ball radius **0.187**, speed **24 units/s**;
  start with one ball and add another every **15 playing seconds**, up to four.
- The camera uses **true perspective**, behind the selected human fortress, about
  **38° above the plane**. Framing prioritises the arena and wall tops; the lower
  decorative plinth can extend outside the view. A bounded slow orbit/tilt and
  breathing zoom keep it alive. Selecting a different fortress rotates the view.
- Relative mouse deltas accumulate into a clamped world-space bat-angle target.
  Neither camera motion nor screen edges can steer or limit the captured mouse.
  Keyboard uses the existing simulation movement caps. Pause and reduced effects
  hold the current camera pose without snapping.
- Walls are **2.22 units tall and 0.96 units deep**, with opaque extruded caps,
  broad top decks, chamfered shoulders, solid feet, outer supports and corner
  posts. Recessed dark faces sit between the structural beams. Foreground faces
  remain translucent; caps, feet and posts are real opaque solids. The physical
  gameplay boundary remains at 9 units.
- Floor and rear recessed faces capture softened moving reflections. Reflection
  planes fit the recessed faces rather than covering the caps. Procedural neon
  light cards supplement rough metal reflections; no image/HDRI assets are used.
- Mesh edges are selected at **35° between adjacent face normals**, once when
  geometry is built. Flat-face triangle diagonals and smooth cylinder facets are
  omitted. A custom vertex shader expands selected edges in screen pixels;
  fragment shading adds an antialiased bright core, shoulder and round joins.
- Structural outlines are **3–4.5 CSS pixels** wide, including the far side of the
  arena. The shader updates for each render viewport, reflection target and
  display pixel ratio. It replaces the hand-placed tubes, skinny box strips and
  decorative cylinder spines. Geometry bounds and shared resource cleanup are
  retained. Strokes remain depth-tested against other solids.
- Bloom uses **0.45 radius**, **0.25 strength** and **1.05 threshold**. Wider edges
  need less bloom contribution to keep the metal faces dark and the ball clear.
  Reduced effects disables bloom/reflections while preserving geometry and bold
  feature edges.
- A faint ball ghost appears only where opaque geometry occludes the ball. It
  keeps near-wall rebounds readable behind solid caps, using the same position
  and radius, without changing collision or input rules.

## Exterior setting

A procedural neon grid sits at **y = -3.08**, just below the entire plinth, on a
600×600 world-space ground plane. Minor cells are **2 units**, with stronger
lines every **10 units**. Lines fade between 38 and 125 units from the arena;
derivative filtering suppresses distant cells as they shrink below a pixel.
The plane is two triangles with no artwork textures or additional animation.

The grid remains outside the arena's framing bounds, so it does not shrink or
reposition the game. Camera motion supplies real perspective and parallax. The
playing floor conceals the grid beneath it. Reduced effects retains the static
grid while disabling the existing bloom/reflections. Simulation and input files
are unchanged.

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
serve deadline. Bat movement/limits, speed, serving and banks remain as previously
agreed. Relative capture replaces the former absolute pointer input. Health
trajectories changed in the preceding cluster revision; the older presentation-
only trace hash is not a baseline for those rules.

## Validation actually run

- `pnpm check`: formatting, lint and strict TypeScript passed.
- `pnpm test`: **96 tests in 14 files** passed. Includes sharp/shallow fold
  selection, exterior-grid separation from the plinth, fade/clip bounds and cleanup,
  suppression of triangle diagonals and smooth facets, screen and
  reflection viewport updates, resource sharing/disposal, extruded wall cap
  dimensions, opaque structure/translucent faces, occluded-ball placement and
  the existing input, camera, health, collision, serve and determinism contracts.
- `PAGES_BASE_PATH=/citadel/ pnpm build`: static production build passed.
- Preceding shader/wall browser checks: **four focused cases passed** across runs:
  default/reduced shader and reflection rendering (no console/shader errors),
  stationary captured input through live camera motion, both relative-mouse bank
  limits, and hiding/restoring pause controls. The final render check passed in
  1.2 minutes and the focused live-camera rerun in 2.5 minutes under software WebGL.
- Full Chromium is required for actual Pointer Lock. The live-camera check now
  uses an 800×600 viewport and 240-second allowance; the dedicated render check
  retains the larger default viewport. Gameplay controls and complete round /
  results / rematch passed in the preceding revision. They are historical
  evidence rather than a fresh full-match run for this presentation-only change.
- The exterior-grid revision was rendered on **Apple M2 Pro / ANGLE Metal**;
  it exercised real capture/steering/serving/release and normal/reduced-effects
  views without page or console errors. The full automated browser suite was not
  rerun for this background-only change. This is
  rendered validation, not a measured frame-rate or cross-device claim.
- `git diff --check` passed. The new shader/wall treatment was inspected in rendered
  screenshots and a desktop gameplay clip recorded locally with actual capture.
- Simulation files were unchanged by this presentation/input revision. The five
  all-bot results below were recorded for the preceding health-cluster revision,
  with zero collision-loop caps; they are not new human playtest evidence.

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

- [Current exterior grid](reviews/m01/exterior-grid.png).
- [Exterior grid with reduced effects](reviews/m01/exterior-grid-reduced.png).
- Earlier wall-focused evidence: [fullscreen perspective arena, lower camera](reviews/m01/perspective-fullscreen.png).
- [Gameplay with captured relative input](reviews/m01/perspective-gameplay.png).
- [Solid wall cross-section with reduced effects](reviews/m01/solid-wall-reduced.png).
- [Ball visibility behind an opaque cap](reviews/m01/ball-behind-cap.png). These last
  two are rendering diagnostics with the ball positioned behind the near corner,
  rather than normal gameplay captures.
- Local gameplay capture: `/tmp/citadel-grid-review/gameplay.webm`.
  It uses real mouse/serve input without gameplay state edits, captured in
  Chromium on Apple M2 Pro / ANGLE Metal.
  Temporary video is not checked into the repository.
- Earlier orthographic images remain in the review directory as historical
  comparisons; they do not represent the current camera or fullscreen layout.

Try **Play**, sweep the mouse both ways, then **Escape → Resume**. Check the lower,
closer framing, exterior-grid contrast and depth, solid wall thickness, frosted
reflections and ball readability near the foreground caps.
The spring/growth tuning and 15-second ball interval remain provisional.

Only four seats and one basic bot controller are implemented. Mobile, audio,
advanced spin, multiplayer and broader effects/performance work remain later
milestones. Same-tick balls resolve in ID order. No exhaustive collision or real-
hardware frame-rate claim is made. Settings reset on rematch; a lower live ball
cap stops additions without deleting existing balls. The bundle still emits a

greater-than-500 kB warning (about 858 kB minified / 232 kB gzip).

The original sketch remains unavailable. No remote workflow, push, deployment,
repository-setting change or `gh` command was performed.

REVIEW REQUIRED — M01
