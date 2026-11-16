# Performance diagnosis when our machine stays fast

Proposed 16 November 2026, then authorised for local implementation by the owner.
This refines the existing P01–P04 track in
[PLAN.md](../PLAN.md#older-machine-optimisation-track). Runtime tooling, the approved
200 ms score buffer and requested shadow removal are recorded in the
[implementation review](PERFORMANCE_DIAGNOSTICS_REVIEW.md). It does not authorise
push, deployment or milestone progression. The remaining optimisation work follows
affected-player evidence.

We can use an affected player's browser as the test machine. Our first useful
result is an identifiable build and a repeatable slow scenario with a local
report. A faster run on our Mac is a comparison, not a reason to close the issue.

## What we already have

The current source provides a bounded local frame recorder, asynchronous GPU
queries where supported, quality presets, adaptive resolution, a production-build
benchmark and raw samples. See [the baseline guide](PERFORMANCE_BASELINE.md),
[Windows review](WINDOWS_FEEDBACK_REVIEW.md) and
[previous optimisation](PERFORMANCE_OPTIMISATION_REVIEW.md).

The earlier available-machine measurements suggested substantial rendering cost,
but did not reproduce the reported roughly 15 FPS Windows case. Recent wall,
reflection, curve and arena changes also mean those measurements are historical.
We should rebaseline the exact build players run before attributing the current
reports to either old or new changes.

Source inspection identifies these gaps:

- Players currently need DevTools to copy `window.__citadelPerformance()`.
- Its 1,800-frame window is a frame-count limit, not a guaranteed 60-second run.
  It records started/unpaused sessions without per-sample phase or visibility
  metadata. The external runner assigns phase by polling once per second.
- The runner takes the revision from the checkout running it, not from the served
  bundle. Local builds embed `local` unless a revision is supplied. Neither proves
  which source an affected player loaded.
- GPU measurements are sparse and may repeat; the frame samples do not identify
  their measurement age. Their distribution is not a set of independent timings.
- Frame context lacks morphs, impacts, resource counts and graphics-setting
  changes. Timed simulation/audio/render work does not account for every part of
  the main-thread frame, including status updates after rendering.
- Earlier stress captures peaked below sixteen balls. The current automated
  runner accepts only 2/4/6 seats, omitting the enlarged three-player layout.

These are reasons to improve the evidence, not findings about the players' cause.

## Audio-specific report: approximately 70 FPS with stuttering sound

The owner reports one player seeing about 70 FPS while hearing stuttering audio.
This is reported evidence, not a reproduced result. Track it separately from the
roughly 15 FPS graphics report. A high average frame rate does not establish
even scheduling or successful audio-buffer delivery.

Source inspection before implementation supplied a concrete hypothesis:
`audio/tone-engine.ts` created a Tone context with 40 ms look-ahead and a 15 ms ticker interval. The installed Tone
version defaults to 100 ms look-ahead. `audio/schedule-window.ts` rejects score
steps less than 2 ms ahead of the native audio clock, including overdue steps.
The guard avoids a burst of backlogged attacks, but can leave missing notes if
callbacks arrive late. This does not prove it explains this player's symptom.
The native context requests `interactive` latency; synthesis/output deadlines
are a separate possible source of crackling or whole-output dropouts.

First ask whether the symptom is missing notes, crackling/distortion or complete
brief cut-outs; whether it affects music, effects or both; and the browser/device
and speaker/headphone connection. Preserve the original setup, then make these
small comparisons under the same game conditions:

1. Music off, effects on; then music on, effects off. Allow existing tails to
   finish. Ordinary mute controls help isolate the audible source but do not
   guarantee that the unused audio graph stopped doing work.
2. If Bluetooth is involved and another output is already available, compare
   built-in speakers or wired audio. This tests the output path without assuming
   Bluetooth caused the fault.
3. Repeat the affected case at Low graphics quality. Improvement would support
   shared CPU/scheduling pressure as a lead; unchanged audio leaves the audio
   engine or output path worth investigating.

Extend the first report checkpoint with requested versus actual scheduling
headroom, rejected-late/duplicate step counts, callback gaps, context state
changes, sample rate, and available base/output latency. Distinguish scheduled
notes being dropped from audio rendering missing a buffer deadline. The existing
`audioMs` field measures main-thread session work; it does not measure the native
synthesis graph or all asynchronous Tone callbacks. Do not invent an underrun
counter when the browser cannot expose one, or interpret deliberate musical rests
and ducking as dropouts.

A developer diagnostic should replay the same audio cues with a cheap/static
renderer and with normal graphics, then compare scheduling headroom and actual
sound. The original proposal was to compare 40 ms score look-ahead with 100 ms.
The implemented diagnostic compares 40 ms with the owner-approved 200 ms setting. Separately compare native-context
`interactive` and `balanced` latency requests if the evidence points to output
buffer pressure; changing the Tone wrapper alone does not recreate the underlying
native context. Measure hit/serve/swish response and beat/visual alignment so a
more resilient music schedule does not silently make live feedback sluggish.

For a willing desktop tester, use the
[Chrome WebAudio metrics](https://developer.chrome.com/docs/devtools/webaudio)
and an [audio-aware trace](https://web.dev/articles/profiling-web-audio-apps-in-chrome)
to distinguish late callbacks, an overloaded audio graph and output-device timing.
The [audio scheduling guide](https://web.dev/articles/audio-scheduling) explains
why scheduling headroom is needed. Add controlled-stall scheduler tests and
real-time audio checks with graphics running; an offline-rendered music file
cannot establish that live scheduling is resilient. Preserve the guard against
backlogged mono attacks and the existing musical arrangement.

For this symptom, the report and diagnostic comparison should prioritise audio
scheduling and output evidence alongside frame timing, rather than starting with
a graphics-only optimisation.

## 1. Make a slowdown easy to report — first implementation checkpoint

Add **Save performance report** in Pause/Settings, using the existing recorder
and download mechanism. Keep collection bounded and lightweight; no gameplay HUD
or automatic upload. Preserve the recent active-play window before menu/background
activity can obscure it. Ask for one optional description: consistently slow,
intermittent freezes, delayed controls, audio stutter, or deterioration after several minutes.

The report should contain:

- A schema version and build identity embedded in the served bundle: source
  revision plus an identifier for the actual build. Mark dirty/local builds
  explicitly. Compare this with the intended test build before any experiment.
- Available browser/OS information, renderer/graphics capabilities, CSS viewport,
  DPR and actual drawing-buffer dimensions. Unavailable values remain unknown.
  Ask separately for device model, power/charging state and refresh rate if known;
  these are not all reliably discoverable from a web page.
- Quality, reduced effects, actual resolution scale and its recent changes, audio
  state, level, arena variant, original/live seats, ball count, match/supply seeds,
  simulation tick and elapsed simulation versus real active time.
- Per-frame phase/visibility, CPU stage costs, intervals, fresh GPU query samples
  with age/validity, draw calls and available renderer resource counts. Record
  start, score, spawn, elimination, morph, victory, resize and quality-change
  markers on the same timeline.
- Median, p95/p99 intervals, worst stall and counts/time above 33, 50, 100 and
  250 ms. Keep startup, playing, morphing, results and hidden-tab samples separate.
  A frame gap with no attributed work remains unexplained.

The player's initial request is small: reproduce the usual problem, pause and
save the file, then voluntarily share it with a device/browser description.
Do not ask everybody to install software, change graphics settings, record video
or run a profiler. Capture their original setup before requesting comparisons.

Acceptance: a nontechnical player can export without DevTools; reports identify
the loaded build; menu/background time cannot contaminate active-play summaries;
unsupported APIs are handled; buffers and downloads have bounded lifetime.
Measure recorder-on/off overhead on available hardware. Unit-test report schemas,
window overflow, phase boundaries, GPU freshness, export/lifecycle and paused
capture. Run a real browser export flow. Capture tooling can proceed even while
one particular reported Windows PC remains unavailable.

## 2. Give volunteers a repeatable comparison

Build an explicit diagnostic mode sharing the production simulation and renderer,
with isolated state and an obvious Exit. It must never alter saved progress,
bests, preferences or the player's current match.

Start with an approximately two-to-three-minute comparison: normal six-player
play at the existing quality, followed by the same scripted workload at Low.
Use fixed seeds, supply seed and scripted inputs, reset between passes, warm up,
and collect at least 60 seconds of active play per pass. Repeat in reverse order
on a willing affected player to distinguish warming/cache/thermal effects from
quality changes. Record actual workload and duration; a timeout or early ending
is an incomplete case rather than a passing result.

High versus Low is a triage signal because the preset changes multiple features.
Follow it with shorter developer-controlled, one-variable comparisons:

| Comparison                                                                       | What it helps investigate                                                                          |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Fixed render scale 1.0 versus 0.5, same CSS viewport                             | Pixel/bandwidth/graphics cost; this quarters pixel count                                           |
| Wall reflections, floor reflection, bloom and shadows individually disabled      | Which rendering pass matters; keep the liked floor reflection unless evidence warrants a trade-off |
| Production simulation without drawing; drawing a controlled moving-state fixture | Simulation/bot work versus presentation work; label both as diagnostic fixtures                    |
| Audio engine/scheduling actually disabled versus enabled                         | Audio work; volume zero alone is not an engine-off experiment                                      |
| Fresh load, first Start, repeated Start, elimination/morph, rematch              | Compilation, allocation, geometry/resource rebuilding and lifecycle stalls                         |
| Repeated matches for 10–15 minutes                                               | Resource growth, accumulating work, power/thermal or scheduling changes                            |

Freeze adaptive resolution during controlled comparisons and report the fixed
buffer size; test adaptation separately afterwards. Freeze all other settings.
Reject pairs with materially different workloads. Use a supported 16-ball fixture
that maintains its advertised stress for the full interval; do not imply it is a
natural match. Cover 2/3/4/6 seats, classic and rounded boards, normal play and
morphs, with the same scenario IDs on every machine.

## 3. Turn the reports into a cause

Group reports by symptom and measured behaviour rather than treating every slow
player as the same bug. Compare one affected machine with an unaffected one on
an identical build and scenario, then compare changes within each machine.

| Evidence                                                     | Next investigation; no automatic conclusion                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Much faster at fewer pixels                                  | Graphics passes, bandwidth and render-target sizes; inspect CPU submission and GPU evidence   |
| Low render scale barely helps but scene/pass removal does    | Draw submission, geometry updates or per-object/pass costs                                    |
| High simulation time that tracks actors/balls                | Bot prediction, collision loops and allocations                                               |
| Stalls align with first Start or morph markers               | Shader compilation, buffer creation/disposal, wall/hull/reflection rebuilding                 |
| Costs or resource counts grow across rematches               | Leaked/retained resources and repeated setup; compare a fresh reload                          |
| Frame gaps are large while measured CPU/GPU work stays small | Unmeasured main-thread work, compositor/presentation or browser/OS scheduling; obtain a trace |

For one willing affected desktop player, collect a short runtime performance
trace around the problem after obtaining a lightweight baseline. We can load and
inspect the saved file locally. Chrome supports
[saving and sharing traces](https://developer.chrome.com/docs/devtools/performance/save-trace).
A trace has overhead and may include URLs or machine details; let the player
inspect it before sharing. A recording without screenshots/source contents is a
reasonable first capture, with deeper capture only if needed.

Expand CPU timing to cover the complete frame and split rendering work only
where a trace points. Never add CPU and GPU duration: they overlap. GPU queries
remain asynchronous, sparse and invalidated when disjoint; see the
[WebGL timer-query specification](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/).

Acceptance: reproduce a classified problem in a named scenario on at least one
affected device, or explicitly record the missing evidence. Prioritise a measured
cause and a before/after experiment before changing gameplay or visuals.

## 4. Reproduce locally and protect the fix

Use CPU throttling to expose expensive main-thread paths, larger render buffers
to stress graphics, and controlled software-rendered runs as a separate fallback
case. These are useful stressors, not replicas of a Windows GPU or a phone.
[Chrome documents device emulation as an approximation](https://developer.chrome.com/docs/devtools/device-mode#limitations).
A Windows VM can help find platform/browser differences; its virtual graphics
path must be labelled. Responsive screenshots and cloud browser correctness
checks do not validate real graphics performance.

Arrange access to at least one physical Windows laptop with integrated graphics,
preferably one already affected. Borrowing a known affected device or a short
screen-share with its owner is more useful initially than purchasing arbitrary
hardware. Keep power mode, screen/viewport, graphics acceleration and competing
workloads recorded; vary one at a time after the original-state baseline.

Fix the largest supported cause in one reversible checkpoint. Re-run the same
scenario on the affected device and a normal device; compare CPU/GPU/frame-time
distributions, worst stalls, memory/resource behaviour and visuals. Keep physics,
input sensitivity and game progression intact. If a quality fallback is warranted,
preserve readability and make the visual trade-off reviewable.

Add deterministic unit/replay/lifecycle tests and the relevant browser flows.
Track draw/resource counts and workload coverage as structural regression signals.
Use frame-time gates only on controlled hardware with an agreed tolerance; shared
CI timings remain diagnostic. Set device-specific frame and stall targets after
measuring the baseline, with 60 FPS as the existing product aim. A fix is accepted
when the affected player confirms improvement and the matched evidence supports
it; the original inaccessible device remains unverified until retested.

## Proposed order and immediate result

1. Implement the one-click report and accurate build/context capture; stop for review.
2. Obtain a report from at least one affected volunteer and one unaffected run.
3. Add the smallest scripted comparison needed for that report; expand the matrix
   as useful evidence arrives.
4. Diagnose and fix one measured cause, then retest that affected machine.

This removes the dependency on reproducing every player's slowdown on the owner's
Mac. It also keeps report collection useful if problems have several causes.
P01 still has open real-device evidence; this proposal does not complete P02 or M10.
