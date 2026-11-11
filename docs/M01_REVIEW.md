# M01 — first playable prototype

Status: awaiting review of the fullscreen perspective arena and relative mouse
capture. The user requested a lower, closer camera after the first perspective
pass; it is now about 38° with tighter framing. M02 has not started.

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
- Four bevelled outer walls are **2 units tall and 0.5 units thick**, with thin
  neon edges and vertical seams. Near panels are translucent so threats remain
  visible; rear panels retain solid dark frosted faces. These replace the low
  cutaway strips. The gameplay wall collision plane is unchanged.
- Softened planar reflections on the floor and rear inner wall faces capture
  actual moving geometry. Reflectors hide one another during captures to avoid
  recursive rendering. Rough metal faces also use procedural neon light cards;
  no image textures or HDRIs are used.
- Darker ambient/key lighting and saturated player colours replace the pastel
  treatment. Physical neon tubes trace both bat rims and end faces; health pieces
  have glowing top/base rims and vertical spines. The plinth has two traced
  levels. Wall seams are **0.024 units square on the inner surface**, rather than
  full-thickness luminous slabs; perimeter lights meet cleanly at corners.
- Bloom uses **0.5 radius**, **0.5 strength** and **1.05 threshold**, with HDR neon
  cores and dark broad faces. The glow follows geometric edges rather than a
  uniform bright wash. Reduced effects disables bloom and planar reflections.

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
- `pnpm test`: **86 tests in 12 files** passed. Includes unlimited relative deltas,
  clamp/reversal, keyboard handover, capture rejection/disposal, perspective size,
  solid wall geometry and thin surface seams, physical HDR bat outlines, framing through camera motion, reflection cleanup and the
  existing health/damage/serve/elimination/replay/stress contracts.
- `PAGES_BASE_PATH=/citadel/ pnpm build`: static production build passed.
- All **ten browser cases** passed across full and focused Chromium runs:
  captured steering/banks, focus/pause/held-key clearing, timed arrivals/restart,
  complete round/results/rematch, live-camera input safety, default/reduced
  rendering, pure fullscreen play, project-path refresh, narrow layout,
  WebGL2 fallback and hidden pause controls. The complete-round focused rerun
  passed in 2.0 minutes. Following the final neon revision,
  `pnpm test:browser --grep 'captured controls|perspective walls|pause controls' --workers=1`
  passed **3/3** in 1.3 minutes.
- Full Chromium is required for actual Pointer Lock; the lightweight headless
  shell rejected capture. Long gameplay cases use a 480×360 viewport and
  180/300-second allowances for software WebGL. Dedicated rendering checks use
  the larger default viewport. Earlier timeouts were resolved by those harness
  changes and sequential focused runs; no gameplay state was edited.
- `git diff --check` passed. The lower, tighter camera was inspected in rendered
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

- [Fullscreen perspective arena, lower camera](reviews/m01/perspective-fullscreen.png).
- [Gameplay with captured relative input](reviews/m01/perspective-gameplay.png).
- Local gameplay capture: `/tmp/citadel-perspective-review/gameplay.webm`.
  It uses mouse/serve input at normal simulation speed, without state edits.
  Temporary video is not checked into the repository.
- Earlier orthographic images remain in the review directory as historical
  comparisons; they do not represent the current camera or fullscreen layout.

Try **Play**, sweep the mouse both ways, then **Escape → Resume**. Check the lower,
closer framing, visible wall height, frosted reflections and ball readability.
The spring/growth tuning and 15-second ball interval remain provisional.

Only four seats and one basic bot controller are implemented. Mobile, audio,
advanced spin, multiplayer and broader effects/performance work remain later
milestones. Same-tick balls resolve in ID order. No exhaustive collision or real-
hardware frame-rate claim is made. Settings reset on rematch; a lower live ball
cap stops additions without deleting existing balls. The bundle still emits a

greater-than-500 kB warning (about 855 kB minified / 232 kB gzip).

The original sketch remains unavailable. No remote workflow, push, deployment,
repository-setting change or `gh` command was performed.

REVIEW REQUIRED — M01
