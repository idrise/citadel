# Paddle motion and mouse response

## Latest sensitivity and blur correction

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
