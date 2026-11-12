# Scene Retry and a passable triangle gap

Watch and Retry now use the same scene rendering approach as the title/result controls: solid geometry, dark button bodies and the neon crease shader. The visible React result card and its styling are removed. Invisible semantic hit targets retain touch, mouse and keyboard access. Loss/level/demotion lettering is also drawn in the scene.

A human elimination releases captured input and immediately exposes scene Watch/Retry while the bots keep playing. Watch collapses the controls to a small scene Retry button; Retry starts the saved next challenge directly. The spectator board stays bright and active. Watch state belongs to the session, and pause hides the scene controls while the existing settings panel is open.

See [phone Watch/Retry](reviews/m09/scene-retry-gap/phone-6-spectator.png), [desktop Watch/Retry](reviews/m09/scene-retry-gap/desktop-4-spectator.png), and the [compact spectator Retry](reviews/m09/scene-retry-gap/desktop-6-watching.png).

## Triangle correction

The previous change moved each fortress inward by 1.2 units but allowed the bat to travel back to within **0.015 units** of the wall. That gave more travel without guaranteeing a useful scoring gap.

Fortress anchors now sit **2.6 units inward** from the existing triangle tips, and all legal bat poses reserve at least **0.7 units between the bat's outer skin and every wall**. A ball's diameter is 0.374 units. This leaves enough space for an actual ball to pass, with useful spare clearance. Containers, rails, bats, serve origins, markers, bots and input limits share the new anchor. The required gap blends continuously during elimination morphs.

The owner permitted enlargement if necessary. The current board has sufficient space once the lane is reserved, so the outer wall dimensions remain unchanged. Other arena layouts retain their existing reach.

Compare [the previous triangle](reviews/m09/scene-retry-gap/desktop-3-previous.png) with [the open-lane triangle](reviews/m09/scene-retry-gap/desktop-3-gap.png). Both are authored level-one poses with every bat at its clockwise travel limit. Phone comparisons, two-player context and four/six-player spectator layouts are included in the [capture report](reviews/m09/scene-retry-gap/report.json).

Unit coverage casts a real ball circle through the nearest wall lane for every triangle seat, both travel limits and levels 1/50/100. It checks both bat and wall collision results, rather than treating a visible gap as sufficient. Arc sampling verifies the full physical bat skin remains clear.

## Pacing sample

A controlled Node bot-only comparison uses the same three seeds and level rules on the previous and current triangle geometry. These are small simulation samples, not human playtest results; individual games can be longer with either layout.

| Level | Previous median | Current median |
| ----- | --------------- | -------------- |
| 1     | 91.5s           | 62.9s          |
| 50    | 18.0s           | 18.5s          |
| 100   | 21.1s           | 14.5s          |

All eighteen samples finish within the 120-second limit with zero collision caps. The [raw results](reviews/m09/scene-retry-gap/pacing.json) include every seed. This supports keeping the current board size for review, rather than claiming every round is guaranteed to shorten.

## Verification

`vp check --fix` is clean; **445 unit tests across 71 files pass**. The native
root production selection passes **21/21**, covering scene retry, full desktop
and mobile matches, roster morphs and rally behavior. The Pages selection initially
passed 13/14: the new touch test expected Resume after changing fortress, but that
selection already closes Settings. Correcting the test to respect the existing
flow makes the remaining touch Watch/Retry case pass on rerun, covering all **14
selected Pages scenarios**. Both root and Pages builds pass. Twelve authored
renders report zero browser errors; the pacing sample reports zero collision caps.
`git diff --check` is clean.

Existing physical iPad/iPhone validation remains open. The existing large main-chunk advisory remains a build limit.

Local demo: `http://localhost:5177/`; same-network mobile: `http://192.168.50.177:5177/`.

**REVIEW REQUIRED — M09**
