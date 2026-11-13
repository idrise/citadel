All eleven requested implementation items are complete locally. See
[the feedback review](docs/MOBILE_FEEDBACK_REVIEW.md) and
[the triangle/rally review](docs/TRIANGLE_RALLY_REVIEW.md), and
[the scene Retry and wall-gap correction](docs/SCENE_RETRY_GAP_REVIEW.md) for checks, screenshots,
audio, measurements and physical-device limits. Awaiting M09 review.

- [x] Use **Citadel** consistently in the page title, manifest, accessible UI, package and documentation.
- [x] Enlarge the mobile portrait arena while retaining every opponent and container; use a steeper camera and tighter safe framing.
- [x] Rework wall morph presentation: stable pillar identity, floor-based creation/retirement, aligned corner poses and bounded, reusable beam/crease buffers.
- [x] Make touch steering more responsive: full legal travel fits an 88–150 CSS-pixel drag across all layouts and rotations.
- [x] Give the title the same reflected, rising/sinking world lettering as the level introduction; keep menu controls fixed during roster changes.
- [x] Repair mobile audio routing, gesture priming and interruption recovery, with an **Enable sound** action when another gesture is needed.
- [x] Develop longer musical phrases, harmonic inversions, bass patterns, fills and seeded variations; add a velocity-driven FM paddle swish.
- [x] Offer scene-rendered **Back** (title screen) and immediate **Retry** as soon as the human fortress falls; retain progress and save each result once.
- [x] Investigate iPad/iPhone stalls and reduce mobile GPU/allocation costs: one floor capture, bounded resolution, no multisample/shadow passes, instanced ball trails, reusable morph buffers and stable light counts. Native Chromium/WebKit checks pass; retesting on the reported physical devices remains part of the M10 validation gate.
- [x] Move triangular-layout fortresses 2.6 units inward and reserve a 0.7-unit ball passage beside every legal bat pose; interpolate the gap through elimination morphs.
- [x] Gradually accelerate each scoreless active rally after eight seconds, by 5% of base speed per second up to 1.75×; reset that ball on a scored container hit.
- [x] When a player is killed we need an event a blooming particle destruction might just do it with an explosion sound effect (not a sample). If the players ball made the kill then trigger a short bout of fireworks as used in the win screen. Let's supply some dopamine!
- [x] The bat is currently just a curve but I think we need some additional curvature on the front of the bat so that hitting the bat and ball at different parts of the bat allows the player to have skill based aiming system.
- [x] When one of the bots or the player is holding a ball then we need a special effect to make it more visually obvious as they are quite threatening especially when the person next to you decides to aim right at you.
- [x] One really nice feature is the morphing board. Can we get all states to be a transition to the board for the next screen? IE changing players morphs the board, going from the star when you win back to a say 6 player game just morphing. So it becomes the constant.
- [x] Add some different shapes for certain levels
- [x] Can you make the curve ball a little more pronounced IE more curve...and have the spin of the ball affect it's bounce?
- [x] To modify difficulty we can shrink the size of the paddles, this should be worked into the level set.
- [x] Hitting a pickup should cause the ball to bounce off of it. The transition to the players bank needs to be emphasized a bit more so it's obvious what happened and why.
- [x] When you press the settings panel it should in game ui withonly resume, soundfx volume, music volume, sensitivity on normal browser. Touch interface may not require this setting. Remove all the other stuff like how to play etc, number of players, time to x' anything like that just pull it out. This should mean we have no react ui at this point. Remove all the react components that we no longer use.
