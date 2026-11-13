# Pre-signoff TODO tweaks

The new TODO entries are authorised for incremental local review. The owner selected symmetrical level-specific shapes. M09 remains awaiting review; these tweaks do not authorise publishing or a later milestone.

## 1. Elimination feedback — ready for review

Every eliminated fortress now produces a larger pooled breakup: glowing solid fragments, a brief local core and an expanding ground shockwave. Twelve/22/32 instanced fragments follow the effect budget; reduced motion retains a quieter stationary fading ring. Effects freeze on pause, expire in 1.25 seconds and clear on a new round.

A generated low bass impact and filtered brown noise replace the small elimination tone. There are no recorded sound assets. Simultaneous deaths coalesce the monophonic impact; mute, volume, existing audio scheduling and the limiter remain in place. [Rival eliminated](reviews/m09/elimination/rival-eliminated.wav) and [player loss](reviews/m09/elimination/player-loss.wav) are review exports, not runtime assets. Both actual-graph renders are audible and peak below 0.32 without browser errors.

A kill credited to the human's last-struck ball triggers three short victory-style fireworks above the eliminated side. Bank shots retain credit; bot kills and self eliminations do not trigger the player reward. The existing four-burst firework pool is reused. A final winning kill proceeds into the full victory celebration.

[Desktop player kill](reviews/m09/elimination/desktop-4-player.png), [phone player kill](reviews/m09/elimination/phone-6-player.png), [bot kill](reviews/m09/elimination/desktop-4-bot.png), and [reduced effects](reviews/m09/elimination/phone-4-player-reduced.png) are authored real last-container impacts through damage, attribution and presentation code. Ten renders cover desktop/phone 2/4/6, bot credit and reduced effects. Their [report](reviews/m09/elimination/report.json) records zero browser errors and collision caps.

Unit tests cover pool bounds, event immutability, pause/expiry/reset, reduced and low budgets, last-striker attribution through banks, the short firework lifecycle and synth scheduling/coalescing/disposal. Final check counts are recorded in PLAN.md.

## 2. Bowed paddle and contact aiming — ready for review

The physical front now has a tighter bow: radius 1.55 instead of 2.2. Its angle is adjusted to keep the standard bat's original end-to-end span, rather than narrowing it. Rendering, collision, forecasts, bot shot planning and wall fitting all share those dimensions. The bounded contact-position steering contribution rises from 0.32 to 0.45 radians. Centre contacts stay straight; shoulders and ends create a broader, mirrored aiming fan. Speed is retained and swipe-induced flight curvature remains separate.

Five parallel incoming shots are checked at every seat in every arena. A strike three-quarters across the standard bat now sends the ball roughly 39 degrees left/right; the middle stays on the bisector. The [centre preview](reviews/m09/paddle-aim/desktop-4-centre.png) and [left preview](reviews/m09/paddle-aim/desktop-4-left.png) show the actual forecast, not a drawn ideal path. Ten authored 2/4/6 desktop/phone poses have zero browser errors; [report](reviews/m09/paddle-aim/report.json).

The tighter bow exposed an old half-bat sector cap, which left wall banks unreachable. All layouts now fit actual surface clearance across the full legal sector. Non-triangle bats can still catch wall-hugging balls, and triangle lanes retain their deliberate 0.7-unit passage. Width progression and the 50ms pointer target contract remain tested.

Expected geometry-dependent test fixtures were updated: the moving-end fixture follows the actual rounded end, the wide/narrow-bat fixture uses the new arc, and curved supply targets are placed where a swipe is still useful (straighter 0.6-radian targets can now be aimed with contact position alone). Original reviewed M03/M04 logs remain untouched. The [new trace set](reviews/m09/paddle-aim/replays.json) records prior digests alongside current ones; 30/60/144-FPS replay equivalence, wall-only traces, contact order and zero collision caps remain checked.

## 3. Held-ball threats — ready for review

Every held ball now has a larger energy envelope, a pulsing coloured ring, a soft expanding ring and two short directional chevrons. The chevrons follow the actual holder's current serve aim, including bots; they stop before a wall and are not a guaranteed flight forecast. The warning clears on launch, hides during title/reading screens and leaves active balls and colliders unchanged.

Reduced motion uses a static ring and one chevron. The effect is batched into two instanced draws even with sixteen queued balls, with stable geometry/materials and no new lights. It reads only ball age and visible aim, so pause freezes it and match state/RNG remain untouched.

[Rival holding a serve](reviews/m09/ready-charge/desktop-4-rival.png), [phone neighbour](reviews/m09/ready-charge/phone-6-rival.png), [your held serve](reviews/m09/ready-charge/desktop-4-human.png) and [after launch](reviews/m09/ready-charge/desktop-4-launched.png) show the actual renderer. Ten 2/4/6 desktop/phone and reduced poses plus two launch comparisons report zero browser errors. Unit coverage checks aim following, launch clear, pause, reduced mode, sixteen-ball bounds and input-state immutability. Complete mobile 2/6-seat launch/rotation/interruption rounds pass.

## 4. Continuous board presentation — ready for review

Back, Retry, Next Level and roster changes now start with the currently visible outline and actor poses. The victory star retains its notches at the first return frame. The central winner and remaining containers travel back to their next homes; revived players and replacement health emerge from zero scale. Marks, lights, rail visibility and star camera framing interpolate alongside them. The same renderer/canvas remains mounted, and new-round effects/event tracking always reset. Reduced motion intentionally skips the motion.

A presentation-only ordered outline matcher replaces combinatorial corner selection and avoids a convex hull, which would erase star notches immediately. Endpoint boundaries stay exact and all sampled star-to-layout transitions remain ordered. Simulation collision geometry is untouched by this presentation change; the introduction holds play until the target is ready.

[Star](reviews/m09/board-transition/desktop-6-0.png), [returning board](reviews/m09/board-transition/desktop-6-0.7.png), [next arena](reviews/m09/board-transition/desktop-6-1.4.png) and [phone return](reviews/m09/board-transition/phone-6-0.7.png). Eighteen actual viewport captures cover 2/4/6 desktop/phone with zero errors and a constant canvas. Unit checks cover all title pairs, rapid retargeting, pause, reduced mode, star boundaries, actor/light/health continuity and source immutability. All 474 unit tests pass; root build and scoped check pass. Browser title, real win, Back and Retry checks cover the session wiring.

## 5. Symmetrical level shapes — ready for review

Classic, Wide and Faceted families rotate in ten-level bands. Wide opens each side into a regular extra facet; Faceted uses a shallower bevel. Two-player variants remain symmetrical octagons around the original rectangle. Fortresses keep their positions and every seat receives identical geometry. All shapes are convex, so wall collisions, bot forecasts, placement, reflections and camera framing use the same authoritative edges. The family stays frozen through eliminations and retries; the next level morphs into it during its reading window. Level 100 retains classic walls and sixteen balls.

Level 10 announces WIDE ARENA, level 20 FACETED ARENA, level 30 CLASSIC ARENA, then the pattern repeats. Shape changes join existing ball/pickup/width/bot messages without exceeding two change lines. [Wide phone arena](reviews/m09/arena-variant/phone-4-wide.png), [faceted six-player arena](reviews/m09/arena-variant/desktop-6-faceted.png), [classic](reviews/m09/arena-variant/desktop-4-classic.png). Eighteen desktop/phone 2/4/6 renders report zero errors.

All 478 unit tests pass, including rotational symmetry, convexity, actual bat/container clearance, seeded deterministic bot flight in all layouts, zero collision caps and family/width persistence through elimination. The old triangle test now checks its original three corners within the expanded six-edge variants; the classic travel improvement and all triangle ball corridors remain checked. Eight root browser difficulty/reading-window cases pass. Scoped check and root build pass; physical-device play remains open.

## Remaining entries

- Stronger curve and spin-sensitive bounces.
- Verify existing bat-size difficulty progression.
- Pickup rebound and clearer bank transfer.
- Minimal scene-rendered settings.

Local stable demo: `http://localhost:5179/` (refresh to load the latest completed checkpoint).

**REVIEW REQUIRED — M09**
