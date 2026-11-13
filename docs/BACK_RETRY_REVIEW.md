# Back and Retry after a loss

The early-elimination scene menu now offers **Back** and **Retry**. Back returns to the CITADEL title on the same canvas; Retry starts the saved next attempt immediately. The old Watch action and compact watching state are removed.

Back resets the abandoned round to a paused title preview, preserving player count, selected fortress, saved challenge level and any demotion. It disposes the old round's input and music, recreates them for the fresh preview, and retains the existing title-transition path. Start begins the new attempt normally. Neither navigation action records an extra loss. The scene menu retains neon geometry with invisible semantic targets for mouse, keyboard and touch access.

Bots continue while the loss menu is displayed; choosing Back ends that round locally. Existing pause/settings behavior is retained.

## Rendered evidence

Six authored fixtures cover desktop and phone layouts at 2/4/6 players, with zero browser errors. The [capture report](reviews/m09/back-retry/report.json) lists the samples. These show the actual scene controls without replacing a live match outcome.

- [Phone: Back and Retry](reviews/m09/back-retry/phone-4-spectator.png)
- [Desktop: Back and Retry](reviews/m09/back-retry/desktop-6-spectator.png)
- [Actual desktop Back result](reviews/m09/back-retry/desktop-back-to-title.png) and [actual phone Back result](reviews/m09/back-retry/phone-back-to-title.png), captured by the production browser checks after a real elimination.

## Verification

`vp check --fix` is clean; **449 unit tests across 72 files pass**. Unit coverage verifies Back/Retry geometry, labels, level/demotion lettering and finger-sized targets within narrow, rotated and desktop viewports.

The root production browser selection passes **10/10**, covering real early loss with both mouse and touch, each navigation action, the same canvas, retained roster/fortress/level, no duplicate recorded loss, restored title/Start, frozen preview simulation and existing title/menu flows. The Pages browser loss-navigation selection passes **4/4**, exercising both actions with mouse and touch. Both production builds pass with the existing ~967kB main-chunk advisory. `git diff --check` is clean.

Local demo: `http://localhost:5177/`; same-network mobile: `http://192.168.50.177:5177/`. Physical iPad/iPhone review remains open.

**REVIEW REQUIRED — M09**
