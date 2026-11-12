# Paddle motion and mouse response

## Current implementation: simple historical copies

The owner reported the blur still was not working and asked for the bat to be
rendered a few times in history, with nothing special. The custom instanced
smear/mask shader has been removed. The current effect draws the complete bat
body and neon outline at up to four recorded past poses, about 33/67/100/133ms
old, with decreasing opacity. These are real stored poses, not interpolated
positions. Low quality uses two copies, Medium three and High four; only reduced
effects/motion disables the trail. Pause holds history; stopping, elimination
and restart clear it. Duplicate sparse history is never stacked.

Reviewed native 2/4/6 renders: [2](reviews/m09/bat-history/2-after.png),
[4](reviews/m09/bat-history/4-after.png), [6](reviews/m09/bat-history/6-after.png).
[Real-time scripted touch capture](reviews/m09/bat-history/gameplay.webm) shows
the copies during ordinary movement. The actual bat's opaque materials remain
unchanged; the copies own faded materials and their own outline rendering.

Validation: Vite+ check, 307 unit tests, production build, six focused native
Chromium presentation/touch checks and the rendered review pass. The existing
bundle-size warning remains. Subjective appearance on the owner's device still
needs review. This supersedes the shader-based approaches recorded below.

## Earlier sensitivity and instanced blur correction (superseded)

12 November: the owner still needed too much mouse travel and saw an inner-bat
flash instead of a readable blur. The baseline mouse gain is now 0.005 rad/pixel,
up from 0.004: 25% more bat travel at the same saved sensitivity. The sensitivity
slider and its stored value remain intact.

The trail now uses one instanced draw per paddle with twelve fading exposures
over 100ms (six on Medium). It excludes the current bat's footprint in the
fragment shader, keeping translucent copies off the solid bat and its neon
edges. History older than available samples is discarded rather than stacked
at one pose. Reduced effects and Low quality continue to suppress trails.

[Without trail](reviews/m09/paddle-blur-refined/4-before.png) /
[refined trail](reviews/m09/paddle-blur-refined/4-after.png), plus
[2-player](reviews/m09/paddle-blur-refined/2-after.png) and
[6-player](reviews/m09/paddle-blur-refined/6-after.png) renders.
The [GPU report](reviews/m09/paddle-blur-refined/report.json) isolates the shader:
disabling the mask reproduces 1,039 painted pixels inside the live bat footprint;
the mask reduces that to zero while retaining 1,152 visible trail pixels outside.
This verifies the overlap correction; subjective flicker still needs owner review.

Validation: Vite+ check, 300 unit tests, production build and nine focused native
Chromium mouse/presentation/touch checks pass. The bundle-size warning remains.

## Earlier checkpoints

The subsequent full M09 request authorises a faster pointer movement limit;
see [current mobile review](M09_TOUCH_REVIEW.md). The original-cap description
below records the earlier checkpoint.

12 November 2026. Dave's supplied wording was “Bit of left right shimmy when you
move the bumper”; no supplied message explicitly mentions blur. The owner has
now requested paddle motion blur as well, and reported inconsistent mouse motion.

Moving paddles leave a short, tinted 75ms exposure along their actual arc. The
solid paddle stays crisp; stopped paddles lose the trail. Pause freezes it, and
reduced effects or Low quality clears it. Medium uses three samples; High uses
five. Samples follow the current fortress anchor during arena morphs. Simulation
state and the shared movement speed limit are unchanged.

The mouse adapter previously accumulated an unreached target ahead of the bat.
Reversing the mouse could first unwind this backlog while the bat kept travelling
in the old direction. Reversals now start from the actual bat angle. Pointer lock
also requests raw mouse deltas, with a fallback when the browser does not support
them. Hands-on consistency still needs review on the owner's mouse/browser.

Matched native renders: [2 players](reviews/m09/paddle-blur/2-after.png),
[4 before](reviews/m09/paddle-blur/4-before.png) / [4 after](reviews/m09/paddle-blur/4-after.png),
and [6 players](reviews/m09/paddle-blur/6-after.png). The reproduction script is
`node tooling/review-paddle-blur.mjs /tmp/citadel-paddle-blur http://127.0.0.1:5176`.

Validation: Vite+ check, 295 unit tests, root-path production build and eight
focused native Chromium browser tests passed. Tests cover reversal before a
target is reached, raw-input fallback, blur stop/pause/restart/elimination and
reduced-quality cleanup. Browser tests cover desktop controls, camera/input
independence and touch interaction. The existing bundle-size warning remains;
physical phone and subjective mouse feel are unverified.
