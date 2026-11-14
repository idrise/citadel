# Windows playtest feedback — 14 November 2026

The owner authorised the six remaining TODOs, including the added adaptive
resolution request and hiding desktop Pause. The owner subsequently
authorised focused local commits for these and the earlier playtest changes;
the [plan ledger](../PLAN.md#progress--approval-ledger) records their scopes and IDs. Nothing was pushed or
published. This extends the local M09 review.

## Behaviour

- Touch has a readable **PAUSE** control with an 88×44px target. Desktop hides
  that corner button and retains Escape/P, focus-loss pause and capture handling.
- **GUIDE OFF / GUIDE ON** in the procedural Settings header toggles a persisted
  serve-direction marker. It defaults off, including when old preferences had
  preview enabled. The optional marker shows only 2.2 units of the initial
  straight direction while holding a ball. There are no curved, bank, incoming
  or return forecasts. Actual serve curve and bot planning remain intact.
- Quiet procedural lettering shows **LEVEL / player count** and **BEST** during
  play and on the title; Settings repeats current/best inside its header so the panel cannot obscure them on short screens. Debug status is explicit. The peak now
  includes newly unlocked levels and survives demotion. Save version 3 migrates
  older peak-won data conservatively from saved level, best and recent attempts;
  no match history, loss streak or demotion is reset. Starting a real adjusted
  roster challenge can raise the peak; debug navigation never does.
- Trails use a fixed-size time-history ring and preallocated sample buffers.
  At the same view/quality, faster balls retain a longer trail. Spin changes
  the path and marked ball/bands, rather than switching between 8 and 20 trail
  pieces. Phone/quality instance budgets change sampling density, not the
  intended world-space length. Pause, reduced effects, ball replacement and
  score/return transitions keep their existing lifecycle behaviour.
- Resolution targets 60fps through sustained graphics pressure. After warm-up,
  a slow frame average and graphics evidence must persist before a 2.5% scale
  reduction; changes are at least two seconds apart. Recovery uses 1% steps
  after longer headroom. Isolated stalls over 250ms, pause and CPU-heavy
  simulation/audio frames do not trigger a drop. Scale remains within 60–100%
  of the existing quality/device pixel-ratio cap. Resolution changes apply
  before drawing; CSS size, camera framing, controls and physics remain fixed.

## Local stutter investigation

The [performance report](reviews/m09/windows-feedback/performance.json) contains
four 30-second sessions with real audio and ordinary simulation/rendering:
level 7 with one tab, level 7 with five additional static tabs, level 100 with
those tabs, and a phone-sized level-100 view. These are native Chromium on this
Mac, **not Windows or physical mobile**, and static tabs cannot reproduce the
tester's unknown workloads. All report music playing and zero collision caps
and browser errors. P95 frame intervals are 16.7–16.8ms; each run records one or
two larger initial spikes, up to 266.7ms. This does not reproduce an ongoing
Windows hitch or establish a causal link to tab count.

A separate [Chromium trace summary](reviews/m09/windows-feedback/trace.json)
records the six-tab level-7 session. The longest recorded main-thread V8 GC event is 2.688ms;
the largest traced task is a roughly 194ms Start event dispatch. Nested events
are not summed as independent pauses. Its last 120 frames have a 16.7ms p95
interval. Trace instrumentation adds overhead. This narrows the local evidence
to startup work; it does not identify the cause on David's machine.

The change removes the former per-frame trajectory forecasting from rendering
and replaces allocating trail-history updates with fixed buffers. Adaptive
resolution addresses sustained graphics load. Neither is presented as proof
that the reported Windows hitch is cured.

The [resolution pressure capture](reviews/m09/windows-feedback/resolution.json)
uses 1920×1080 CSS pixels at DPR 2. It changes the actual render buffer from
3840px wide to 2880px in ten 2.5% scale steps, retaining a 1920px CSS width
throughout. The complete run includes slow warm-up/load frames (33.4ms p95),
while the final 120 frames reach 16.7ms p95. This is evidence of gradual
adaptation on this hardware, not a universal 60fps guarantee. A
[final frame](reviews/m09/windows-feedback/resolution-pressure.png) preserves
the same scene/control layout.

`window.__citadelPerformance()` returns local rolling evidence: frame interval,
simulation time, main-thread audio scheduling, renderer CPU submission, sampled
asynchronous GPU time when supported, resolution, ball/level context and draw
calls. It keeps at most 1,800 recent frames and 64 spikes, plus lifetime counts;
it never uploads data. CPU submission is distinct from GPU duration. GPU values
are sparse readings from one reusable query, checked only after completion;
unsupported/disjoint queries remain unavailable. See the browser's
[query documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebGLQuery)
and [local trace protocol](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/).

For the Windows retest, play until a hitch occurs and save the local report from
DevTools using `copy(JSON.stringify(window.__citadelPerformance()))`. Also note
Windows/Chrome version, display scale, graphics adapter and which tabs were
active. This is a manual local diagnostic, with no new player-facing HUD.

## Review and reproduction

Refresh **http://localhost:5179/**. On touch, inspect the Pause label, open
Settings, toggle the guide and rotate. On desktop use Escape/P; compare a held
ball with guide off/on, then launch. Compare straight and curved trails as
rallies accelerate. Use **+ / −** to inspect debug levels without changing Best;
**Backspace** returns to the saved challenge.

Authored same-view trail frames use the ordinary renderer and make no claim of
live outcomes: [14 units/s](reviews/m09/windows-feedback/trail-14-straight.png),
[34 units/s](reviews/m09/windows-feedback/trail-34-straight.png),
[59.5 units/s](reviews/m09/windows-feedback/trail-59.5-straight.png), and
[34 units/s with spin](reviews/m09/windows-feedback/trail-34-curve.png).
Final production Settings, level and touch frames live in the same directory.

Unit verification passes 552 tests in 101 files, including guide migration and
straightness, peak-level migration/demotion, debug persistence, status resource
reuse, time-history length at 30/60/120Hz and 8/12/20-instance budgets, short
Settings layouts, bounded diagnostics, asynchronous GPU queries, and resolution
hysteresis/floor/recovery. The initial selected browser run passed 20/21 cases;
its only failure expected save version 2 instead of the new version 3. That
assertion was updated, retaining the loss/demotion checks. All twelve cases in
the corrected progression/settings/new-feedback files pass on rerun; the five
Settings/new-feedback cases pass again after the short-screen header adjustment.
Root and Pages production builds pass, with the existing large-bundle advisory.
The full-repository format/lint/type check passes, including generated reports.
The Pages-path viewport/refresh test passes with CI software WebGL (31.3s
including setup). The stable local production demo is refreshed.

```sh
node tooling/review-stutter.mjs http://127.0.0.1:5180
node tooling/review-stutter.mjs http://127.0.0.1:5180 --trace
node tooling/review-stutter.mjs http://127.0.0.1:5180 --pressure
node tooling/review-trails.mjs http://127.0.0.1:5180
```

Physical iPad/iPhone and David's Windows setup still need hands-on validation.
M09 awaits owner review; no later milestone or deployment is authorised.

**REVIEW REQUIRED — M09**
