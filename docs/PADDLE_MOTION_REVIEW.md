# Paddle motion and mouse response

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
