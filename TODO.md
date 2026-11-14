Earlier TODO items are implemented locally; new playtest proposals at the end await review. See
[the feedback review](docs/MOBILE_FEEDBACK_REVIEW.md) and
[the triangle/rally review](docs/TRIANGLE_RALLY_REVIEW.md), and
[the scene Retry and wall-gap correction](docs/SCENE_RETRY_GAP_REVIEW.md) for checks, screenshots,
audio, measurements and physical-device limits. See also [the pre-signoff tweaks](docs/PRESIGNOFF_TWEAKS_REVIEW.md), [roster/layout variety](docs/ROSTER_VARIETY_REVIEW.md), and [curved serves and bot tactics](docs/SERVING_TACTICS_REVIEW.md). Awaiting M09 review.

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
- [x] Double check the bot code and make sure that it has tactics for getting pickups, sneak attack when holding the ball. these sorts of things.

## Playtest feedback — 14 November 2026

Proposals for review only; these changes have not been implemented.

- [ ] **Centre the arena when the bat is centred.** Remove autonomous time-driven camera yaw/tilt drift during play. Keep a small, symmetric bat-driven shimmy around the current fortress bisector, with a centre dead zone and damped return to exact neutral. Retain the danger zoom and camera-independent steering. Verify neutral alignment after waiting, restarting, resizing and elimination morphs.
- [ ] **Make idle bots look attentive.** When no interception or held-serve tactic is active, slowly follow a visible active ball with small, infrequent, seeded variation; return to a neutral guard when no active ball exists. Use the ordinary paddle motor and collision pose, retain level-specific reaction/error/speed limits, and give defensive/serve decisions immediate priority. Keep idle variation separate from the existing gameplay random stream so replays and other decisions stay reproducible.
- [ ] **Introduce level-specific bat profiles.** Add shallow, standard and deeper convex bows, assigned deterministically across the level ladder and shared by every player in that level. Preserve the existing width/difficulty ramp and announce profile changes in the level introduction. Rendering, collisions, contact aiming, forecasts and bot planning must use the same authoritative profile; check wall clearance and reachable bank shots across all supported rosters.
- [ ] **Confirm playtest sharing permission.** Confirm with the owner whether David can pass on the existing public playtest link. This is a communication follow-up; no new sharing UI or deployment is needed.
- [ ] **Give the foreground more breathing room.** Adjust camera framing to reserve roughly 6% of viewport height below the front wall and human fortress as an initial tuning target. Preserve the complete playable board, mobile safe areas and the fixed bottom-menu/title anchors. Check the margin through resize, portrait/landscape rotation, maximum danger zoom and arena morphs; avoid adding an opaque letterbox or changing gameplay geometry.
- [ ] **Make the victory star upright on screen.** Capture a viewer-relative orientation at victory start, with one outer point facing screen-top, away from the camera. Carry that orientation through the existing continuous morph without a final snap; retain the centred winner's bat/containers and smooth return to the next arena. Verify every selectable human seat across 2–16 players, portrait/landscape and reduced motion.
