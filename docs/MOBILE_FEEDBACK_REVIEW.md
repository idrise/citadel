# Mobile feedback and sixteen-ball progression

Implemented locally for the requested M09 feedback batch. The full M10 physical-device gate remains open. No push or deployment was requested.

## Progression and flow

Level 100 now permits **16 balls**. The extra-ball unlock levels are **8, 15, 21, 28, 34, 41, 48, 54, 61, 67, 74, 81, 87, 94, 100**: each step takes six or seven levels. Pickups still start at level 5; speed, bat width and bot skill retain the existing hundred-level curves.

A new ball arrives every `min(12, 30 / (cap - 1))` seconds of play, bounded to 12 seconds for the one-ball opening. Four-ball and higher challenges reach their cap by 30 seconds; level 100 adds a ball every two seconds. A round may finish sooner. Current attempt rules stay frozen, and the saved next challenge does not alter the current match.

All sixteen balls have hero shells, signed spin, trails, revenge presentation and independent last-striker credit. Queued serves remain separated and inside the walls in every arena at both travel limits. A [natural seeded Chromium capture](reviews/m09/mobile-todos/difficulty/sixteen-ball-pressure.png) shows sixteen balls (fifteen active, one waiting) at 30.49 seconds of play with zero collision caps. See the [pressure movie](reviews/m09/mobile-todos/difficulty/level-100-pressure.webm) and [report](reviews/m09/mobile-todos/difficulty/render-report.json). The seed is 1; this is ordinary bot play, with no injected outcomes.

An eliminated human gets **Watch** and **Retry level N** immediately. Watch keeps the simulation running and leaves a small Retry button available. Retry starts the next countdown in one click on the same canvas. Intentional mouse release no longer pauses the spectator match. Results are recorded once, and the three-loss demotion rule remains intact.

## Mobile presentation and controls

- Portrait uses a steeper view and a smaller safe wall margin to fill more of the narrow screen. All threats, wall tops and containers remain visible; rotating restores the desktop angle without accumulated drift.
- Full legal bat travel fits an 88–150 CSS-pixel drag, based on the screen's shorter edge. Relative steering, reversal from the actual bat position, pointer capture and tap-only launch remain intact.
- **CITADEL** rises out of the reflected floor, then sinks when Start is pressed. Level signs use the same geometry and effect. Portrait lettering leans toward the camera for readability. Menu controls stay fixed while player count changes.
- Wall pillars follow spatial corner identity rather than rotating hull-array indices. New and retiring pillars grow/shrink from the floor over 0.24 seconds. Beam and crease endpoints deform in place; tiny segments and acute mitres have finite bounds.

Review the [wall morph movie](reviews/m09/mobile-todos/wall-morph.webm), desktop [two](reviews/m09/mobile-todos/desktop-title-2.png), [four](reviews/m09/mobile-todos/desktop-title-4.png) and [six](reviews/m09/mobile-todos/desktop-title-6.png) player titles, and the portrait/landscape Chromium and WebKit captures in [the evidence folder](reviews/m09/mobile-todos/).

## Audio

Audio resumes and primes within the Start/Resume gesture, before the lazy synth import. Where supported, the owned native context requests playback audio routing and restores the previous session policy on teardown. Interrupted contexts no longer claim to be playing; **Enable sound** retries with a fresh explicit gesture, using the same engine/context. Audio failure still leaves the game playable.

This follows the platform guidance for [user-gesture audio activation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices), [interrupted AudioContext state](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state) and [AudioSession playback routing](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type). Desktop WebKit testing does not reproduce an iPhone's physical mute switch, Bluetooth routing or every background interruption.

The score now develops eight authored themes through a 32-bar harmonic journey, with inversions, alternate bass rhythms, phrase answers, fills and four deterministic per-round variations. Ball-dependent instrument families and the muted-hat → snare → driving-kick opening are retained. Audio uses its own clock and never changes gameplay timing.

The FM swish follows actual bat velocity and stereo position. One continuous voice is reused; it brightens with a fast swipe and falls silent at rest, on pause, mute and results. Audition the [soundtrack excerpt](reviews/m09/mobile-todos/soundtrack.wav) and [isolated paddle swish](reviews/m09/mobile-todos/paddle-swish.wav). The [audio report](reviews/m09/mobile-todos/audio-report.json) measures peaks below 0.46 and 0.07 respectively, without clipping.

## Performance investigation

The tester reports an A16 iPad (described as 2023) in Safari standalone and a 2022 iPhone that pauses for seconds. Those physical devices are unavailable here, so a device-level fix is not claimed as verified.

Identified avoidable work and fixes:

| Cost                  | Previous path                                                         | Mobile/current path                                                                            |
| --------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Planar reflections    | Floor plus visible wall captures                                      | One 256px floor capture; no wall targets allocated                                             |
| Raster budget         | Up to 2× device ratio, four-sample bloom targets, directional shadows | At most 1.5×, zero target samples, shadows disabled; bloom retained                            |
| Ball history          | Twenty separate sphere draws per ball                                 | One low-poly instanced trail per ball, with eight pieces on mobile                             |
| Morph crease geometry | Dispose/rebuild creases during every deformation                      | Update existing endpoint/normal buffers; bound short-edge shear                                |
| Floor geometry        | Rebuilt when only camera anchoring changed                            | Retain geometry until the boundary actually changes                                            |
| Lighting changes      | Toggle point-light visibility on eliminations/roster changes          | Keep light count fixed and set inactive intensity to zero, avoiding that shader-variant change |

Matched native Chromium six-player mobile samples dropped from **1,107 to 491 median draw calls per frame** (56% fewer). Both baseline and updated samples met the desktop host's 60 Hz refresh, so this is a reduction in rendering work, not a demonstrated physical iPad frame-rate improvement. The [baseline](reviews/m09/mobile-todos/before/chromium-native.json), [Chromium](reviews/m09/mobile-todos/chromium-native.json) and [WebKit](reviews/m09/mobile-todos/webkit-native.json) reports record native frame timings and nonzero audio output. No emulated clock was used for those measurements.

The [simulation benchmark](reviews/m09/mobile-todos/simulation-timings.json) measures levels 1/50/100 across three seeds. On this development host, level-100 median fixed-tick cost is about 0.18ms and p95 about 1.24ms, including sixteen-ball samples. These timings do not establish iPad CPU performance. The fixed-step clock already drops suspended time rather than replaying an unbounded backlog.

## Validation and review

Final validation: `vp check --fix` reports no warnings, lint errors or type errors;
**422 unit tests across 68 files pass**. The broad root production browser run passed
58 of 59 tests; its remaining test assumed the idle human would still be alive at
level 40 after the faster ramp. Moving that control/arrival test to level 10 made
the intended Restart behavior reproducible. The final focused root rerun passed
**15/15**, including that scenario and every changed title/mobile-layout case.
All 59 distinct root scenarios therefore have passing coverage across these runs.
The Pages subpath production build passed **26/26** selected browser checks.
Both root and Pages builds pass; the existing main-chunk size advisory remains
(about 963kB before gzip). Native Chromium/WebKit captures, sound output and the
morph/pressure reels report no browser errors. `git diff --check` passes.

Unit coverage includes sixteen-ball queues/ownership/rendering, short touch travel, portrait framing, stable corner identity and retirement, crease-buffer reuse, mobile reflection budgets, audio-session ownership, Safari interruption recovery, musical variety and FM parameter bounds. Native browser checks cover real pointer lock, early-loss Watch/Retry, full matches, mobile rotation/fullscreen and production asset bases.

Local demo: `http://localhost:5177/`; same-network mobile demo: `http://192.168.50.177:5177/`. The server binds all interfaces; device/browser support may still require the physical audio activation checks above. Re-test on the reported iPad and iPhone before approving M10. M09 remains awaiting review.

**REVIEW REQUIRED — M09**
