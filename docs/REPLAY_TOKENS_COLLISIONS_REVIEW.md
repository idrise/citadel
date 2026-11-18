# Replay tokens, demotion and ball collisions

Implemented the five remaining 18 November TODOs at the owner's request. M09
awaits review; this does not advance M10 or publish a build.

## What to try

Open [the local demo](http://127.0.0.1:5179/). REPLAYS appears at the top left.
Three failed attempts spend the balance **3 → 2 → 1 → 0**. Another failure at
zero demotes one level and restores three tokens. Every win resets to three;
level 1 refills after an exhausted failure without dropping below the floor.
Settings restart, abandoned rounds and debug navigation spend nothing.

On a demotion, large peach **DEMOTED** world lettering rises with the same
geometry, reflections and screen anchor as the title. It sits above the star's
side walls so the complete word stays visible. The result and next introduction
identify the new level, and Retry starts that level immediately.

A rightward mouse/keyboard/touch brush now imparts anticlockwise spin as seen
from the defender and bends the inward flight left. The previous sign did the
opposite. Both serves and returns share the corrected convention; strength,
decay, contact aiming and spin-sensitive wall grip are retained.

Active balls collide through relative swept circles. World and pair contacts
share a clock, so an earlier wall, bat, pickup or scored piece invalidates later
predictions. Equal-mass normal impulses exchange signed spin; tangential motion
is retained during resolution. Each ball's paced speed is restored at the end
of the fixed tick, preventing permanent stalls or speed spikes. Exact ties use
contact rank then stable IDs. Ready/newly launched balls retain their existing
arming/flight timing, and ready balls do not collide.

Ball contact never transfers last-striker credit, health or serve ownership.
It uses the existing neutral ricochet and bounded spark pool. There is no new
damage-protection window. Dense launch overlaps use bounded separation passes,
separate from the eight real impacts permitted per ball per tick.

## Progress compatibility

Save version 5 preserves the existing storage key, level, best actual win and
result history. Versions 1–4 migrate spent losses to spent replay tokens once.
Older intentional demotions and recorded wins restore a full balance. Tokens
follow the player when the level roster changes. Invalid balances/demotions
remain rejected and blocked storage remains safe.

The owner's uncommitted early-level roster overrides are retained. The duplicate
level-3 key was removed to permit validation; no tuning choices were reverted or
included in the feature commits. The debug capture regression now locates an
actual descending roster boundary rather than hard-coding levels 3/4.

## Validation

- Independent staged snapshots passed formatting, lint and TypeScript checks:
  641 unit tests for tokens/demotion; 660 for spin/collisions.
- Final working-copy formatting, lint, TypeScript and all 660 unit tests pass.
  Root and Pages production builds pass, and the Pages viewport/refresh smoke
  test passes with portable software WebGL (23.9 seconds for the test).
- The final 37 native Chromium browser scenarios pass across progression,
  reset, token rendering, desktop/touch curve input, level rosters, reading
  windows and captured debug navigation.
- Simulation coverage includes swept crossings, near misses/tangencies, exact
  overlaps, separating overlaps, dense launch queues, momentum/energy during
  impulses, spin transfer, per-tick paced speeds, ownership, ignored ready
  balls, wall/pair ordering, consumed revenge serves and array-order independence.
- Ten two-second fixed-step fixtures replay identically at 30/60/144 FPS,
  including fast pairs, three-ball chains and wall/pair contacts.
  [New golden logs](reviews/m09/replay-tokens-collisions/replays.json) retain the
  previous review's logs as historical evidence.
- A legal level-100 proxy still wins the twelve-player finale with seed 3.
  The old seed's outcome changed with the requested physics; no bot strength
  or collision privileges were changed to retain the former outcome.
- Sixty simulated seconds with sixteen-ball diagnostic fixtures at 2/3/4/6/16
  seats completed without collision caps. This fixture repairs defences and is
  a stress workload, not a natural-match pacing study.

Rendered examples: [desktop demotion](reviews/m09/replay-tokens-collisions/desktop-demoted.png),
[phone demotion](reviews/m09/replay-tokens-collisions/phone-demoted.png),
[desktop six-seat zero balance](reviews/m09/replay-tokens-collisions/desktop-6-tokens-0.png),
[phone six-seat zero balance](reviews/m09/replay-tokens-collisions/phone-6-tokens-0.png),
and [rotated phone](reviews/m09/replay-tokens-collisions/phone-landscape-zero.png).
The folder also includes 2/4-seat views and a muted
[natural six-seat level-100 gameplay capture](reviews/m09/replay-tokens-collisions/gameplay.webm).

Reproduce the main checks:

```sh
pnpm exec vp check
pnpm exec vp test run
PAGES_BASE_PATH=/ pnpm exec vp build
PAGES_BASE_PATH=/ PLAYWRIGHT_RENDERER=hardware pnpm exec playwright test \
  tests/progression.spec.ts tests/progress-reset.spec.ts tests/replay-tokens.spec.ts \
  tests/serve-curve.spec.ts tests/default-roster.spec.ts tests/briefing-timing.spec.ts \
  tests/debug-levels.spec.ts --workers=1
```

Run CPU-heavy unit and browser suites separately. A concurrent run exceeded
existing timeouts; the isolated staged snapshot passes all 660 tests without
changing timeout limits. The first browser run passed 36/37; its hard-coded roster
assumption was corrected and all 37 passed on rerun.

## Measured cost and limits

Matched production-build captures use the existing sustained sixteen-ball,
six-seat diagnostic fixture at High quality, fixed resolution and identical
seeds. Each build/view has one shortened ten-second active sample after a
half-second warm-up. These are preliminary cost checks, not a sixty-second
P01 baseline or an affected-Windows-machine retest. Phone and tablet profiles
emulate viewport, touch and DPR on this Mac; they do not emulate mobile GPUs,
Safari, thermals or battery.

| View                   | Frames before / after | Simulation p95 before / after | Frame p95 before / after |
| ---------------------- | --------------------- | ----------------------------- | ------------------------ |
| Desktop 1280×900       | 601 / 601             | 0.3 / 0.4 ms                  | 16.7 / 16.8 ms           |
| Phone 390×844, DPR 3   | 601 / 600             | 0.3 / 0.4 ms                  | 16.7 / 16.7 ms           |
| Tablet 820×1180, DPR 2 | 600 / 600             | 0.3 / 0.4 ms                  | 16.8 / 16.7 ms           |

All six captures held sixteen balls throughout and reported no browser errors
or frame intervals over 33.4 ms. Simulation p99 changed from 0.4 to 0.7 ms on
desktop, 0.4 to 0.6 ms on phone emulation, and 0.5 to 0.8 ms on tablet emulation.
This adds measurable CPU work while keeping display pacing near 60 Hz on this
machine. One short sample per view does not establish a broad performance result.

Serve the pre-collision checkpoint on port 5180 and the updated production build
on port 5179, then run:

```sh
node tooling/review-ball-collision-cost.mjs
```

Raw compressed reports and the readable summary live beside the rendered
evidence in [the evidence folder](reviews/m09/replay-tokens-collisions/).
The reports retain their actual served bundle identities; the before source is
the exported token checkpoint `3758ce9`, and the after source is the physics
checkpoint plus the raised demotion sign.

Physical Windows Chrome and iPad/iPhone Safari validation remain open. The build
retains its existing large-chunk advisory. No push, remote workflow or deployment
was performed.

Local feature commits: `3758ce9` (tokens/demotion) and `5c2bbf3` (spin/collisions).

**REVIEW REQUIRED — M09**
