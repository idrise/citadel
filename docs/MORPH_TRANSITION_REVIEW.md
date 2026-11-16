# Arena transition jam — 16 November 2026

Local experiment for M09 review. The owner initially requested no commits, then
authorised local checkpoint commits for the work below. No push or deployment
was authorised or performed.

Open <http://127.0.0.1:5177/morph.html> while `pnpm dev --host 127.0.0.1 --port 5177`
is running. The studio holds the finished pose and offers classic/curved/
wide/faceted walls, slow motion, pause and scrubbing. Try 6 → 5, 3 → 2, Victory
and Next board. The normal game at <http://127.0.0.1:5177/> uses the same changes.

The first 15% of a transition retracts the full-size corner posts vertically.
Their faces, neon and shadows clip at floor level. The middle 70% reshapes the
floor, walls and actors; the last 15% raises the target posts. Quintic easing
starts and stops with zero velocity and acceleration. Visible posts stay at
fixed corners; a retarget captures their current position and lift, including
interruptions during an elimination or victory reveal. Preview transitions take
1.25 seconds; the existing 1.4-second victory-to-board and 2.8-second victory
reveal remain. Elimination morphs reserve the same post phases and extend large
retargets to retain the six-unit/s fortress speed bound. Live simulation keeps
running throughout; moving walls still carry the floor coordinates of balls.

The new rounded family bows the walls outward while retaining fortress corners
and symmetry. It appears at levels 3 and 8 in the first ten-level sequence; levels
99 and 100 remain classic. The authoritative convex outline has at most 32 edges,
shared by collision, bots, placement and rendering. Small wall supports and
cross-section neon seams were removed; side glazing fades with the view instead
of switching opacity. Curved layouts use the floor reflection rather than an
incomplete subset of planar wall reflections.

Follow-up after the owner reported snapping and broken wall edges: wall sections
now sweep between shared world-space joins rather than independently clamped
local mitres. Plinth outlines trace four explicit closed rings, avoiding abrupt
angle-threshold seams as corners flatten. The neon shader extends its depth slope
with its screen-space caps; previously a wall could cover part of its own stroke.
The GPU fixture reproduces a loss of 302 of 1,430 stroke pixels at the steepest
sample; the correction retains all 1,430. Genuine foreground objects still occlude
those lines. Wall reflections fade rather than switching off, and a transition
away from a live elimination captures the actual post lift.

The studio holds its ending pose instead of resetting automatically. Scenario
buttons prepare the source board through the production transition on the same
canvas; Next board can continue directly from the visible victory star. The reel
records that single canvas throughout the sequence.

Post-base refinement: every selected corner post now reaches its full height;
corner angle selects whether a post exists instead of leaving it partly buried.
Settled bases sit at Y 0.08 above the Y 0.025 reflective floor, exposing their
bottom neon outline. The reflection remains. The extended downward travel still
retracts posts entirely to floor level. This follow-up passed 25 focused post,
camera and transition tests, `vp check` and the production build; the rendered
pose captures and reel were refreshed.

Small-roster spacing: three-player boards now have 160% of their previous linear
dimensions, and two-player boards 130%, in every variant and after eliminations.
The classic rectangle is now 15.6 by 28.6 units; the classic triangle's outer
radius is 20.8. Other roster sizes retain their previous dimensions. Physical
paddle/rail/container sizes, triangle inset and ball speed remain unchanged, giving
balls more space to travel. Larger morphs may take longer to preserve the existing
speed limit. This follow-up passed all 570 unit tests, check/build and three native
browser scenarios: three complete two-player rounds, one three-player round,
rematches and two-player input reach. Captures and the reel were refreshed.

Validation: `vp check`, 568 unit tests across 104 files, and a root production
build passed. Three focused native Chromium scenarios passed: full three-player
match/rematch, reduced-effects rendering and rapid title retargeting. The GPU
coverage/foreground-occlusion regression passed. A separate browser check proved
that the studio holds its final pose and retains its canvas across three scenario
changes. The authored render harness captured 120 desktop/phone poses without
page or console errors.

Local checkpoint verification: the transition/rendering commit passed check,
build and all 569 unit tests in an export of its staging index. The separate
board-spacing checkpoint passed the same checks and all 570 tests in its own
staged export. These checks do not rely on unstaged studio or documentation files.

The initial software-WebGL run timed out on three cases; its long match case was
interrupted before the native rerun. Software-rendered performance and physical
Safari/mobile devices remain unverified. The build retains the existing bundle
size advisory. Authored captures demonstrate presentation, not natural gameplay
outcomes or device performance.

[Transition reel](reviews/morph-studio/transitions.webm) ·
[Desktop mid-morph](reviews/morph-studio/desktop-rounded-6-5-0.5.png) ·
[Phone rebuild](reviews/morph-studio/phone-rounded-4-3-0.9.png) ·
[Pose report](reviews/morph-studio/report.json)

REVIEW REQUIRED — M09
