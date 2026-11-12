# Pickup placement and title transitions — M09 follow-up

12 November 2026. The owner reported repeated pickup sites, collected containers
cutting into existing containers, and title arena changes snapping between layouts.
M09 remains **Awaiting review**. No push or deployment is authorised.

## Corrections

Ordinary visits now choose a fresh match seed. Each attempt also has an independent
pickup seed, including Restart. Restart preserves its opening serve/bot seed while
varying pickup sites; bot decisions no longer determine the pickup random stream.
Successive drops avoid the previous site by at least two world units in the normal
bounded search and avoid existing drops. Both seeds and current pickup positions
are included in the local round export.

Explicit URLs remain reproducible: `?seed=2026` fixes both seeds;
`?seed=2026&supplySeed=73` supplies a separate recorded pickup seed. Automated
seeded flows use the explicit URL instead of making every player's game identical.

Collected containers now search for a free position against **actual current body
positions and radii**, including wall clearance and space behind the defence rail.
The previous code chose the last target of the future formation: during a three to
four-container change that target could already be occupied. Placement no longer
moves the existing containers. A post-collection separation constraint also keeps
them apart as their spring formation settles. If there is no safe slot, the pickup
is not consumed and the ball passes through without a repeated-contact loop.

Player-count changes now retain the **same WebGL canvas, renderer, menu and hit
targets**. Floor, walls, fortress positions, paddles and containers interpolate over
0.85 seconds. Added/removed seats grow/shrink into/out of view. Repeated clicks
retarget from the visible intermediate shape. The camera adjusts with the arena;
the camera-relative UI stays at exactly the same screen coordinates. Start works
during a transition, which completes before the opening countdown ends. Reduced
motion uses the settled layout immediately.

Roster changes reset input/audio/effect observers without retaining an old match's
settings panel or impact history. Selecting an unchanged player count or fortress
keeps Settings usable and leaves the round intact. A selected fortress that becomes
invalid when shrinking the roster is clamped normally.

## Rendered evidence

The title captures use the real production app and its normal controls:

- [Title transition video](reviews/m09/pickup-title/title-transition.webm).
- 2 seats: [during transition](reviews/m09/pickup-title/title-2-moving.png), [settled](reviews/m09/pickup-title/title-2.png).
- 4 seats: [during transition](reviews/m09/pickup-title/title-4-moving.png), [settled](reviews/m09/pickup-title/title-4.png).
- 6 seats: [during transition](reviews/m09/pickup-title/title-6-moving.png), [settled](reviews/m09/pickup-title/title-6.png).
- Phone viewport: [moving](reviews/m09/pickup-title/mobile-moving.png), [settled](reviews/m09/pickup-title/mobile-title.png).
- Two ordinary, unedited attempts: [first pickup site](reviews/m09/pickup-title/pickup-attempt-1.png), [second pickup site](reviews/m09/pickup-title/pickup-attempt-2.png).
- [Production report](reviews/m09/pickup-title/title-report.json) verifies identical
  desktop/mobile control bounds, persistent canvas/menu identity, different pickup
  seeds/sites across Restart, and no browser errors.

Collection fixtures deliberately stage a shot at a known pickup location, then use
the real simulation. Their purpose is to inspect spacing, not demonstrate random
spawn sites:

- Awarded formations: [2 seats](reviews/m09/pickup-title/awarded-2.png),
  [4 seats](reviews/m09/pickup-title/awarded-4.png),
  [6 seats](reviews/m09/pickup-title/awarded-6.png).
- [Collection in flight](reviews/m09/pickup-title/transfer-4.png).
- [Clearance report](reviews/m09/pickup-title/render-report.json): all three layouts
  award the fourth container with a minimum surface gap of about 0.032 world units,
  no screen-wide transfer flash, and no browser errors.

## Checks and limits

- `vp check`: formatting, strict types and lint pass.
- `vp test run`: **357 unit tests / 62 files pass**. New coverage includes every
  pair of title layouts, intermediate retargeting, reduced motion, seeded variation,
  independent pickup RNG, and seven additions to every fortress in all five layouts.
  Body separation is checked both at placement and throughout settling. Historical
  collision goldens remain unchanged.
- **49 production Chromium browser checks pass** at root, covering persistent
  preview controls, rapid count changes, clamped seats, Start, varied pickup sites
  across ordinary Restart, unchanged selections, settings/input lifecycle, complete
  desktop/mobile matches and rematches.
- Root and `/citadel/` builds pass. Eight focused Pages-path browser checks also
  pass. The existing main-bundle size advisory remains (about 948 kB).

Regression runs exposed a settings-panel lifecycle issue after roster changes and
an unchanged-selection edge case; both were corrected and covered by browser
checks. The 50 ms mouse test now pauses at that exact clock instant to read the
actual position, rather than reading a status snapshot sampled every 80 ms. Mouse
movement tuning was not changed.

Reproduce native title evidence with a root build served at port 4174 and
`node tooling/review-title-preview.mjs /tmp/citadel-title-preview`.
`node tooling/review-progression.mjs /tmp/citadel-pickup-spacing` reproduces the
staged collection checks against the dev server at port 5176.

These are native Chromium and emulated-phone checks. Physical Safari/device review
and the existing high-level human pacing review remain outstanding.

## Try it

Open <http://localhost:5176/> without a seed query. Use −/+ repeatedly and watch the
board change while the logo and buttons stay fixed. Start, collect a container,
then Restart: the opening is repeatable but pickup sites should vary. Try a repair
into a broken slot and collecting several extras; the containers should remain
separate while joining the formation.

**REVIEW REQUIRED — M09**
