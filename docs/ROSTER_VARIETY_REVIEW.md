# Roster ceiling and level variety

Local M09 experiment: choose **2–16 players** in the scene title. Sixteen is a test ceiling, not a final recommended limit. One human faces up to fifteen bots. Existing saves remain valid, extended roster choices persist, and results retain the actual seat identities. This work does not authorise publication or M10.

Levels now mix **Classic, Wide, Faceted, Compact and Spacious** arenas. The first six introduce Classic → Wide → Faceted → Compact → Wide → Spacious; later blocks vary the order. The final two levels retain classic geometry so level 100 can keep its Extra Ball / Elite Bots briefing. Every family remains symmetrical, convex and deterministic. Compact/Spacious scale the complete geometry, including fortress anchors; ball speed and bat width retain their own level ramps. Shape changes are announced during the held-ball reading window.

The expanded rosters use moderately larger polygons, with a wider legal serve fan so adjacent banks remain reachable. Collision, forecasts, bot targets, input, camera, walls and placement use that same geometry. A bounded ordered matcher handles large elimination/retarget outlines, preserving the original small-arena regression traces. Star transitions fit within 48 pooled wall sections. New/retiring actors travel from/toward the current board centre rather than appearing beyond an expanding boundary. The renderer and canvas remain mounted throughout.

The camera follows the displayed arena size while preserving relative steering and fixed menu placement. Six representative live point lights remain allocated at every roster size; the human is included. Above six players the single floor capture supplies reflections, avoiding a wall-capture pass for every extra side. Sixteen distinct seat colours/names are available. Gameplay sound, effect and ball pools remain bounded.

[Sixteen-player desktop](reviews/m09/roster-variety/desktop-16-compact.png), [phone with sixteen balls](reviews/m09/roster-variety/phone-16-sixteen-balls.png), [eight-player wide](reviews/m09/roster-variety/desktop-8-wide.png), [spacious four-player board](reviews/m09/roster-variety/phone-4-spacious.png), and [star returning to sixteen](reviews/m09/roster-variety/transitions/phone-16-0.7.png). Forty-two layout views cover both new families at 2/4/6 and all five families at 8/12/16, plus eight stress captures and six transition frames. They report zero browser errors.

## Checks and measurement limits

All **501 unit tests / 87 files** pass. New coverage checks every supported roster and family for rotational symmetry, convexity, real bat/container clearance and adjacent-bank serve reach; sixteen-ball deterministic runs and collision caps; large simultaneous eliminations/retargeting; save/result round trips; fixed lighting, camera clipping, star notches and actor birth/retirement. Small-arena golden traces remain unchanged. Scope checks and the root production build pass.

Twenty selected root browser scenarios have passing coverage (nineteen initially plus a touch-authored mobile rerun), covering 8/12/16 controls, level feedback, debug isolation, progression and the new roster bound. The phone fixture now uses actual taps before its keyboard debug shortcut, instead of selecting mouse mode via a synthetic menu click. Final title/roster transition checks are recorded in PLAN.md. The preceding scene-settings checkpoint separately covers all 69 original browser scenarios.

The [local report](reviews/m09/roster-variety/report.json) records isolated, warmed **120-frame** samples after fifteen warm-up frames, running actual sixteen-ball level-100 bot simulation. Both desktop and phone-sized Chromium profiles use this machine's **Apple M2 Pro Metal renderer**. All median/p95 frame intervals are approximately 16.7–16.8ms; sixteen-player simulation/submission p95 costs rise to around 10–11ms each. These are separate sampled CPU costs, not values to add into a single-frame latency. All runs retain sixteen balls and zero collision caps. A first overlapping-browser sample was replaced by the isolated measurements.

This is a short local rendering check, not a sustained performance guarantee or physical iPhone/iPad evidence. Sixteen seats are visibly denser, especially in portrait. Compare **8, 12 and 16** in actual play before selecting the final limit. Use keyboard **+ / −** to compare level layouts without saving results; **Backspace** returns to your saved challenge. Existing bundle-size advice and physical Safari validation remain open.

Stable local review: `http://localhost:5179/` (refresh for the latest completed checkpoint).

**REVIEW REQUIRED — M09**
