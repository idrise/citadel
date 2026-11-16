# Performance reports and audio scheduling review

Implemented locally on 16 November 2026 at the owner's request. This adds evidence
collection and a measured scheduling improvement; affected-player verification
remains open. No push or deployment was performed. P01 is not accepted, and
M09/M10 and later optimisation gates remain unchanged.

## Player workflow

Reproduce the usual problem, pause, then choose **REPORT** (accessible name:
**Save performance report**). Share the downloaded JSON voluntarily, with a short
description of the device, browser, charging/power mode and speakers/headphones.
Nothing uploads automatically. No DevTools or software installation is needed.

The report embeds the served bundle's revision, dirty flag and source-input
fingerprint, plus the current game seeds, tick, level and board. It includes a
bounded recent frame window, per-phase summaries, event markers, drawing-buffer
and renderer context, resource counts, quality settings and audio diagnostics.
Menu/countdown/background frames do not enter active-play summaries. GPU
percentiles count unique fresh asynchronous results; unavailable/disjoint readings
stay unknown. CPU submission and GPU execution overlap and must not be added.

Pause preserves the earlier frames, audio counters, graphics context and settings.
Leaving the menu open or changing settings there cannot replace that capture.
Resuming starts a new live capture. Frame buffers, event buffers and download URLs
have bounded lifetimes. A 1,800-frame game window is not a guaranteed minute.
`frameCpuMs` includes recorder and presentation/status work. `audioMs` measures
synchronous main-thread work, not Tone callbacks or native DSP.

**TEST** opens a separate diagnostic page. It imports no progress/preferences
store, never writes local storage and cannot advance the campaign or mutate the
paused match. Start it with a click and keep the tab visible. Stop or backgrounding
ends the run as incomplete and releases its renderer and audio context. Results
and an optional description stay local until the player saves/shares a report.

## Repeatable comparisons

The standalone page offers High/Low graphics, old/current music scheduling, a
custom one-variable comparison and a ten-minute repeated-match soak. Custom
comparisons cover half render scale, bloom, floor reflection, wall reflections,
drawing, an actual disabled audio engine, and a separately constructed native
context requesting balanced latency. Production still requests interactive
latency; the diagnostic does not silently change player preferences.

Choose 2/3/4/6 players, classic/rounded boards, four balls, sustained sixteen balls
or a scripted elimination/morph (at least three players). These are authored
fixtures using production physics/bots, repaired defences and resets every 24
simulated seconds. They are not natural matches or complete input replays.
Adaptive resolution is disabled. Each pass resets both seeds and the same tick
sequence. Reports retain final state, actual simulation/wall duration, measured
ball range, morph samples, audio availability and workload comparability. Different
final workloads must not be interpreted as a valid paired comparison.

Graphics passes use five seconds of warm-up and sixty seconds of measured
simulation each. Wall time is also recorded; suspended/dropped simulation time is
not silently counted as completed work. Audio passes use five seconds of warm-up
and twenty-five seconds of controlled interruptions each. A `?seconds=2` developer
run is explicitly marked as not meeting the normal duration requirement. The
10-minute soak has a bounded 18,000-frame recent window, not an unbounded trace.

Run the production review with document-local input:

```sh
PAGES_BASE_PATH=/ ./node_modules/.bin/vp build
./node_modules/.bin/vp preview --host 127.0.0.1 --port 4175 --strictPort
node tooling/review-performance-diagnostics.mjs --url=http://127.0.0.1:4175/ --output=/tmp/citadel-review
```

The runner accepts `--comparison=audio`, `--seats=3`, `--shape=rounded`,
`--workload=morph` and `--reverse=true`. Run comparisons separately from other
browser tests. The older `tooling/performance-baseline.mjs` now accepts three
players and uses each frame's phase and the served build identity.

## Audio evidence and change

The owner approved **200 ms** score look-ahead. Tone's ticker remains 15 ms.
Music is scheduled ahead of the native audio clock; the existing stale/duplicate
attack guard remains in place. Live hit/serve responses retain their short
native-clock grid and the swish path stays immediate. Beat visuals are evaluated
at audible time. Musical arrangement, simulation timing and live control response
were not deliberately changed.

In the real-time native Chromium comparison with graphics and sixteen balls,
both passes experienced 54 deliberate 80 ms main-thread interruptions:

| Score look-ahead | Accepted steps | Rejected late steps | Minimum headroom | Native underrun events |
| ---------------- | -------------: | ------------------: | ---------------: | ---------------------: |
| Previous 40 ms   |            243 |                  28 |         -54.5 ms |                      0 |
| Approved 200 ms  |            271 |                   0 |         102.6 ms |                      0 |

Both ran 25 measured simulated seconds, held sixteen balls, reached identical
final simulation state, produced nonzero PCM at the native output tap, and closed
every audio context afterwards. This reproduces and protects against missed
scheduled music notes under these stalls. It does not establish that the affected
player's brief whole-output cut-outs have the same cause.

Reports separate late scheduling from optional native `AudioContext.playbackStats`:
underrun events/duration, total duration and latency statistics, all durations in
seconds. That experimental API updates coarsely and may be unavailable or
restricted; missing data stays `null`. The
[Web Audio draft](https://www.w3.org/TR/2026/WD-webaudio-1.1-20260922/#AudioPlaybackStats)
defines these native counters. Zero reported underruns on this Mac does not rule
out output-device/Bluetooth faults on another machine. Neither silent musical
rests nor ordinary mute controls establish buffer starvation or graph teardown.

If cut-outs remain, collect the original setup's report first. Compare music and
effects separately, then Low graphics, and any already available wired/built-in
output. Use the balanced-latency diagnostic as a controlled experiment. A willing
affected desktop tester can collect an
[audio-aware Chrome trace](https://web.dev/articles/profiling-web-audio-apps-in-chrome)
and [WebAudio metrics](https://developer.chrome.com/docs/devtools/webaudio).

## Shadows and available-machine evidence

At the owner's request, shadow rendering is disabled globally. Lights and meshes
no longer request shadow casting/receiving, and the obsolete directional shadow
projection configuration is removed. Floor/wall reflections and lighting remain.
This is a requested resource reduction, not a claim that shadows caused the audio
symptom. The diagnostic cannot re-enable shadows.

An isolated native Chromium run on the available M2 Pro completed both sixty-second
sixteen-ball passes with identical final simulation state and fixed resolution.
Both held exactly sixteen balls throughout the measurement window and reported
zero late music steps and zero native underruns. The served input fingerprint was
`c023e8bde9bfc3cb` (local changes on `ae50b5d`). No browser tests ran alongside this
capture. An earlier exploratory capture run alongside browser tests was not used as this baseline.

| Preset | Frame-gap p95 / p99 | Render CPU median | GPU median (121 unique samples) |
| ------ | ------------------- | ----------------- | ------------------------------- |
| High   | 16.7 / 16.8 ms      | 5.9 ms            | 10.4 ms                         |
| Low    | 16.7 / 16.8 ms      | 2.2 ms            | 2.6 ms                          |

Both remained display-limited on this Mac; this does not establish the affected
Windows bottleneck or quantify a before/after shadow-removal speedup. Full raw
samples and readable summaries are included. Approximate measured wall time was
60 seconds per pass plus five seconds of warm-up; simulated work was exactly
60 seconds per pass.

A separate **shortened** three-player rounded-board run exercised the scripted
three-to-two-player morph for 21 simulated seconds per preset, with 251 rendered
morph frames in each pass and identical final state. It exposed a first-morph
render-CPU spike of 256.5 ms on High and 202.3 ms on Low (frame gaps 250/200 ms).
Both audio passes still reported zero late steps and zero native underruns. This
is an unresolved rendering stall, not a passing seamless-transition result, and
not a sixty-second sustained baseline. Its location in renderer submission makes
first-use compilation/resource rebuilding a lead for a focused trace; no cause is
claimed without that trace. The raw frames and rendered morph are retained for
the next measured optimisation checkpoint.

The isolated recorder microbenchmark alternates recording on/off for five
500,000-frame loops. Recording cost about 0.04–0.05 microseconds per frame in Node
on this Mac, versus about 0.004–0.008 without recording. Snapshotting the 1,800-frame
window took about 1–2 ms. These are recorder-only costs, not a whole-game
instrumentation-overhead result or a measurement on the affected device.

## Evidence and validation

Evidence is under [reviews/performance-diagnostics](reviews/performance-diagnostics/):
compressed raw audio samples, readable summaries, recorder overhead, desktop and
mobile settings, and standalone diagnostic captures. Decompress raw JSON with
`gzip -dc <filename>.json.gz`.

The staged audio checkpoint independently passed `vp check` and 576 unit tests;
the staged shadow checkpoint passed checks and 577 tests. The integrated suite
passed 596 tests. Real browser checks covered real PCM output, music unlock,
pause/mute/resume, second-ball layering, unavailable audio, context teardown,
pre-pause report preservation including settings changes, separate-tab navigation,
comparison duration/ball count, deterministic final state, storage isolation,
Stop/background interruption, narrow screens, WebGL fallback and touch rotation.
Root and `/citadel/` production builds passed with the existing large-chunk advisory.
The Pages-path smoke passed all three checks for refresh, report export/new-tab
navigation and comparison lifecycle.

Affected Windows hardware, physical mobile devices, a full manual listening
assessment, reverse-order graphics repeats, and an actual ten-minute soak remain
unverified. The available Mac is not a substitute for an affected-player report.
