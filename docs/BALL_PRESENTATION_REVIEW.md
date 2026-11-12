# Ball presence and visible spin

12 November 2026: the owner reported that balls looked puny and did not visibly
show their spin, despite being the most important moving objects.

The visible sphere is 35% larger (radius 0.25245), with a bright, cool core and
broad dark procedural seams. A soft owner-coloured aura and a stronger, closely
spaced comet trail give it more presence. The colour of the halo, seams and tail
continues to show the last striker; ready balls use the serving defender.

The surface rotates from the actual signed spin value, amplified 5× for readable
motion. Direction bands use the same signed rate instead of their previous very
fast baseline. Rotation slows with spin, freezes on pause/reduced motion, remains
still at zero spin and resets for a ready/replaced ball. The through-wall ghost
now shares the sphere's rotation, preventing faceted self-overlap streaks.

All art is analytic shader/geometry; there are no image textures. This is a
presentation-only enlargement: the collision radius remains **0.187** and all
trajectories, damage, timing and bots are unchanged. The luminous visible shell
therefore extends slightly beyond the authoritative collision surface; review
whether the stronger appearance still makes close catches feel fair.

Evidence:

- [Spin close-up](reviews/m09/balls/spin-close.png) and
  [later pose](reviews/m09/balls/spin-close-later.png): left zero, centre positive,
  right negative spin. Positions and spin values are held as rendering fixtures.
- [Animated spin comparison](reviews/m09/balls/spin-review.webm), with fixed
  arena/close-up fixture transitions; this is not a live match.
- Full arena: [2 players](reviews/m09/balls/arena-2.png),
  [4 players](reviews/m09/balls/arena-4.png), [6 players](reviews/m09/balls/arena-6.png).
- [Eight balls](reviews/m09/balls/eight-balls.png),
  [phone eight-ball view](reviews/m09/balls/mobile-eight.png),
  [reduced effects](reviews/m09/balls/reduced.png).
- [Real-time scripted phone gameplay](reviews/m09/balls/gameplay.webm), using
  ordinary touch input with actual simulation. Physical phone review is outstanding.

Checks: `vp check`, 308 unit tests, root-path production build and eleven native
Chromium control/presentation/scene/touch tests pass. The native render script
reports no console/page errors. The prior bundle-size warning remains. Unit
coverage checks signed surface rotation, zero spin, pause/reduced mode, serve
reset, matching ghost orientation, owner tint and unchanged simulated state.

The old presentation test's exact 0.187 visual-radius expectation was updated
to reflect this deliberate visual enlargement; simulation-radius coverage still
asserts 0.187. Reproduce the fixed render set with the Vite server running:
`node tooling/review-balls.mjs /tmp/citadel-balls http://127.0.0.1:5176`.
