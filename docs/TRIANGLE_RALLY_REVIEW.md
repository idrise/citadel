# Triangle clearance and scoreless rallies

> The [scene Retry and triangle-gap correction](SCENE_RETRY_GAP_REVIEW.md) supersedes the 1.2-unit inset described below: the current inset is 2.6 with a guaranteed 0.7-unit lane. Rally rules are unchanged.

The two additional TODO items are implemented locally as M09 feedback follow-ups. Review tuning in play before approval.

## Triangle layout

The triangle walls remain at radius 13. Each fortress anchor moves **1.2 units inward**, to radius 11.8. Its rail, bat, containers, launch origin, marker, bot targeting and touch limits share the authoritative anchor. Three-seat defenders may now use the full rail sector; the actual curved bat still has to fit every wall plane, including its rounded ends and thickness. Other layouts retain their existing anchor positions and travel caps.

Total usable angular travel increases from about **18.6° to 35.1°** with the wide level-one bat, **28.3° to 44.5°** at level 50, and **36.7° to 52.5°** at level 100. This is roughly 40–90% more movement. The inset applies both to initial three-player games and elimination morphs that reach three survivors. Health remains behind the rail, and the unchanged walls frame the same playing surface.

Compare the [previous pose](reviews/m09/triangle-rally/3-before-1.png) with the [new pose](reviews/m09/triangle-rally/3-after-1.png), both at the legal clockwise limit with the wide level-one bat. Opposite-limit poses and unaffected [two](reviews/m09/triangle-rally/2-after-1.png), [four](reviews/m09/triangle-rally/4-after-1.png) and [six](reviews/m09/triangle-rally/6-after-1.png) player views are included. These are deliberately authored comparison poses, not claimed gameplay outcomes.

## Rally pressure

Every ball in normal graded play tracks its own **active-flight time since its last score**:

- First **8 seconds**: normal level speed.
- Thereafter: add **5% of that base speed per second**.
- Maximum: **1.75×** base speed, reached after 23 active seconds. At level 100 this is 59.5 units/s.
- A real container hit ends that ball's rally, returns it for the normal revenge/fallback serve and resets its timer. Its next launch uses normal level speed. Other active balls retain their independent rally pressure.
- Waiting to serve, countdown and paused time do not count. Paddle/wall rebounds preserve pressure. Collecting a supply does not count as a scored container hit and keeps the rally running.

Speed increases smoothly through the existing fixed-step swept physics. Spin and shot direction retain their normal rules. Bots, pressure relief and return forecasts account for the same acceleration. The ramp does not depend on owner, render frame rate or audio. The fixed-speed option remains available only for existing internal replay fixtures; there is no extra product setting.

A [natural two-player bot sample](reviews/m09/triangle-rally/natural-rally.png) and [report](reviews/m09/triangle-rally/report.json) show flight increasing from level-one speed 14 to about **20.56 units/s**, five actual container scores with serve resets, and zero collision caps. The [rally movie](reviews/m09/triangle-rally/natural-rally.webm) follows rising speed through the first score and revenge reset. No live outcomes were injected. The 1.75× ceiling is a reviewable tuning choice that keeps pressure inside the tested collision-speed range.

## Verification

`vp check --fix` is clean; **439 unit tests across 70 files pass**. Both root
and Pages production builds pass with the existing ~964kB main-chunk advisory.
The broad native root run passed 58/59 checks; its early-loss test still assumed
elimination at exactly 67 seconds. That check now observes actual elimination and
passes on rerun. The new natural-rally/pause/reset browser scenario also passes,
covering all **60 distinct root scenarios** across these runs. The final Pages-path
selection passes **8/8**, including the new rally check, early retry and complete
2/3/4/5/6-seat mobile matches. `git diff --check` passes; the rendered review reports
zero browser errors and zero collision caps in its natural sample.

Coverage includes all level widths at both triangle travel limits, a four-to-three morph, damage/serve reset, multiball independence, pickups, real wall/bat/container collisions at maximum pressure, sixteen fully accelerated balls in all five layouts, immutable source state, forecast agreement and 30/60/144 FPS consistency. Existing physics replay goldens remain unchanged.

Local demo: `http://localhost:5177/`; same-network mobile: `http://192.168.50.177:5177/`. The existing physical iPad/iPhone verification remains open; no new device claim is made by these simulation and rendered checks.

**REVIEW REQUIRED — M09**
