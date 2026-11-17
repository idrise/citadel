> **Later on 17 November:** the crowd graph was removed after owner feedback. This audit records the graph before removal. See [crowd removal review](CROWD_REMOVAL_REVIEW.md) for the current change and its comparison.

# Audio resource audit — 17 November 2026

The question is whether the sound engine has enough time to render each native
audio buffer, not just whether game frames or note scheduling are keeping up.
The Windows benchmark supports a native-output deadline problem; it does not
establish whether synthesis cost, OS scheduling, the audio backend or the output
device causes it. The owner reports that Low graphics did not improve the sound.
No production audio setting, arrangement, instrument or game rule was changed by
this audit. The original benchmark is not included in the commit.

## Scheduling and native output are different budgets

The supplied Windows/Chrome 157 Radeon 680M capture identifies clean revision
`8661bc1`, build `96221715a88c41d9`. Both sixty-second four-ball passes reached
identical final simulation state at 1080×580. After subtracting warm-up counters,
High reported 2,019 native underrun events and Low 76. Both reported zero rejected
late music steps. Minimum score scheduling headroom was 144.3/150.5 ms against
the approved 200 ms look-ahead. Native base latency was 10 ms in both passes;
output latency was approximately 32–40 ms. The report does **not** contain audio
thread render capacity or native callback-buffer size.

These observations distinguish a working scheduling horizon from an unhealthy
native playback path. The exported `audioMs` is not synthesis-thread CPU time.
Increasing score look-ahead again cannot be assumed to fix native underruns.
The user heard no improvement in Low despite the smaller counters. Coarse native
counter durations are not a measured recording of audible silence, and their
reported totals do not align exactly with wall time in this capture.

The original root JSON is no longer present in this checkout; the audit verified
the lossless copy retained under `/tmp` against its original SHA-256:
`674735ae661d9ec3c6dd78c8ae77fb88a214f5e28aeb9b374a125969a697cb54`.
No reconstruction, modification, staging or commit of that input was performed.

## Source audit

- `tone-engine.ts` wraps one gesture-owned native context. The unused Tone
  default is closed. Context creation and teardown remain owned by the music
  session; prior real-browser lifecycle tests verify closure on restart.
- Tone 15.1.22 uses its worker ticker at 15 ms and 200 ms scheduling look-ahead.
  The installed `Context` source shows that a supplied native context is reused;
  changing the wrapper's `latencyHint` would not recreate the native buffer.
- `mobile-context.ts` creates that native context with `latencyHint: interactive`.
  This favours low latency. Balanced latency already has an isolated diagnostic
  comparison which constructs a fresh native context.
- There are no custom ScriptProcessor nodes, convolvers or HRTF panners in the
  authored graph. Synths use native Web Audio nodes; moving the ticker into
  another worker is not a way to reserve native rendering CPU.
- The graph is substantial: the crowd alone has four banks of six FM voices,
  72 formant filters and 24 vibrato LFOs started continuously, plus each bank's
  noise/whistle/clap paths. Other branches include polyphonic fat-oscillator
  lead/pads, bass/sub, reactive brass/harmony/answers, impacts, delays, filters,
  compressor/limiter and a continuously owned paddle swish. Voice counts are
  bounded, but bounded does not mean cheap.
- Muting a gain does not dispose the graph. No instrument bank was removed or
  lazily constructed during this audit; doing so without measurement could
  alter sound or move a large allocation stall onto the first audible event.

## Measuring the audio renderer

`tooling/profile-audio-resources.mjs` uses Chromium's WebAudio DevTools domain to
sample the native audio renderer once per second while the existing diagnostic
page runs its seeded workload. It records callback buffer frames/sample rate,
render quantum, callback mean/variance, render capacity, context lifecycle,
inspected native node/parameter counts, and the normal benchmark's scheduling and
native playback counters. Contexts are reported separately for each pass.

A protocol documentation trap matters here: the schema describes percent, but
Chromium actually returns a **ratio**. Its
[callback reporter](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/audio/audio_callback_metric_reporter.cc)
divides render duration by callback interval, and
[DevTools](https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/panels/web_audio/WebAudioView.ts)
multiplies by 100 when displaying it. The summary follows the implementation;
unit tests cover this conversion, actual buffer durations, separate contexts,
ignored latency requests and unknown/invalid metrics.

One-second samples cannot guarantee that every callback met its deadline. Node
counts include stopped/retained native objects awaiting garbage collection and
must not be called simultaneous active voices or proof of a leak. Inspection
adds overhead; compare with the uninspected benchmark too. The profile includes
warm-up, while benchmark start/end counters delimit the measured play window.

Run on the affected Windows computer using the same Chrome installation where
possible (Playwright must already be installed in the checkout):

```sh
node tooling/profile-audio-resources.mjs --url=https://citadel.davidjelliott.com/ --channel=chrome --comparison=custom --change=balanced --output=audio-balanced
node tooling/profile-audio-resources.mjs --url=https://citadel.davidjelliott.com/ --channel=chrome --comparison=custom --change=drawing --output=audio-without-drawing
```

The default runs use the diagnostic's sixty-second passes. `--seconds=30` makes
an explicitly shortened developer run. `--comparison=quality` repeats High/Low.
The tool uses document-local input, never native pointer lock/fullscreen, writes
only to the requested local output directory and uploads nothing. Default output
is `/tmp/citadel-audio-resources`; use an explicit path on Windows. Raw samples are
compressed; `summary.json` omits the bulky per-frame array.

## Results and limits

Preliminary twenty-second High/Low probes on the available M2 Pro showed sampled
median renderer load around 15–21%, peaks below 30%, with 256-frame callbacks at
32 kHz (8 ms). Both use the same actual native callback buffer. This establishes
local headroom in those samples, not adequate headroom on the affected Windows
computer. An exploratory balanced comparison overlapped the unit suite and is
excluded from the final isolated comparisons.

The checked-in evidence records shortened isolated interactive/balanced and
drawing-on/off comparisons. These are developer capacity checks, not complete
sixty-second performance baselines or proof that the audible Windows fault is
fixed. The requested hint and actual callback buffer/latencies must be compared;
the browser can choose a different buffer or effectively ignore a hint.

Final isolated results on the M2 Pro (30 simulated seconds per pass, 32 kHz):

| Comparison / pass     | Actual callback buffer | Sampled capacity median / max | Native underruns |
| --------------------- | ---------------------- | ----------------------------- | ---------------: |
| Latency / interactive | 256 frames, 8 ms       | 15.3% / 28.5%                 |                0 |
| Latency / balanced    | 320 frames, 10 ms      | 19.4% / 35.2%                 |                0 |
| Drawing / on          | 256 frames, 8 ms       | 15.8% / 32.5%                 |                0 |
| Drawing / off         | 256 frames, 8 ms       | 22.6% / 71.8%                 |                0 |

All passes completed with zero late score steps, matching simulation workloads,
closed contexts, valid captures and no page/protocol errors. These are sparse
lifetime samples, not averages over every callback; order, inspection and normal
system scheduling can affect them. Drawing off did not remove the synthesis
workload. There is no Mac underrun reproduction to use as proof of a Windows fix.
The balanced request changed the actual buffer only modestly on this machine.

Raw profiles and readable summaries are in
[reviews/audio-resources](reviews/audio-resources/). `vp test run` passed all 613
tests; the focused capacity-summary suite passed three tests. `vp check` and the
production build passed; the existing large-chunk advisory remains. No rendered game
review is required for this developer-only tooling change. The affected Windows
DSP-capacity profile and audible confirmation remain pending.

On the affected machine, sampled capacity near/above 100% alongside underruns
would support reducing measured synthesis work. Underruns with low sampled graph
cost would leave callback scheduling, backend/driver/device and missed sparse
spikes as leads. Drawing off is an actual renderer-off comparison. Balanced
latency is an actual new-context comparison. Neither is a reason to change the
200 ms score horizon or every player's live feedback latency without evidence.

The browser exposes no application-level CPU-core reservation or driver-priority
switch for Tone. The practical controls are audio graph workload, when work is
created/scheduled and the native latency request; see
[Tone's performance guidance](https://github.com/Tonejs/Tone.js/wiki/Performance).
