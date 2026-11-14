# Stable title and bottom controls

The title screen uses one centred control stack at every browser width. Player count, Start and Settings keep fixed offsets from the bottom edge; width changes no longer move them into a side column. Normal-height screens place the stack in the bottom third. Short screens tighten vertical spacing while keeping touch targets at least 44px tall. Result actions use the same placement rules.

The solid Citadel title remains in the reflected arena, but its fully raised origin projects near the middle of the screen. A bounded projection step moves it across the floor plane after camera fitting and limits its displayed width. Its rise/sink still moves vertically through the floor. Title tilt and camera framing vary continuously, and the previous aspect-ratio title-camera lift is removed. This replaces the earlier tablet-only correction.

[699px wide](reviews/m09/anchored-menu/mouse-699x600.png), [700px wide](reviews/m09/anchored-menu/mouse-700x600.png), [tablet](reviews/m09/anchored-menu/touch-1024x768.png), [portrait phone](reviews/m09/anchored-menu/title-390.png), and [short landscape](reviews/m09/anchored-menu/touch-844x390.png) show the final renderer. The short-screen stack uses more than a third of the screen to preserve readable controls. Width alone never changes its vertical position or horizontal alignment.

All **521 unit tests / 92 files** pass. New coverage checks identical bottom offsets across widths, centred projected controls, the world-title anchor across 2/6/16 seats and camera motion, bounded lettering width, and retained below-floor animation. Scoped format/lint/types and the root production build pass; the existing bundle-size advisory remains.

The final **15 production Chromium browser checks** pass, covering mouse and touch width/height sweeps, player-count adjustment after resizing, the same mounted canvas, real wins/Next, saved progress, the win-loss reset, pointer response and mobile rotation. Settings and title-preview checks passed in the preceding run. Browser tests keep capture and input inside the page. Physical-device Safari validation remains open.

The progression audit confirms that wins clear losses. The loader now also discards a stale counter when the latest recorded result is a win. A browser fixture restores such a saved win and plays three ordinary losses across reloads: the first two retain level 2; the third demotes to 1. The first draft of that test tried a Back action unavailable on the finished two-player screen; the final test uses page reloads and passes.

Refresh **http://localhost:5179/** and vary the browser width at a fixed height. The controls should stay at the same bottom offsets, with the title near the middle. No publishing has been performed.

**REVIEW REQUIRED — M09**
