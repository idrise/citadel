# Bloom colour balance

The six-player view exposed a colour-dependent cutoff: the standard Three.js
high-pass filter measures linear luminance against 1.05. At equal emission power,
lime and gold pass while coral, amber, violet and rose can be rejected entirely.
This is a bloom selection issue rather than missing lights on one side of the arena.

The new extraction uses the greater of luminance and **0.52 × strongest channel**.
The floor is calibrated to the existing cyan wall colour's luminance/peak ratio
(approximately 0.518). This admits saturated neon without the broad wall haze
produced by a raw peak-channel cutoff. It preserves the extracted RGB hue; it does
not force all colours to appear equally bright. Threshold, radius, overall strength,
beat modulation, tone mapping and direct/reduced rendering remain unchanged.

Matched native Chromium captures use identical meshes, camera, exposure, HDR buffers
and four-sample antialiasing:

| Players | Before                                   | After                                  |
| ------- | ---------------------------------------- | -------------------------------------- |
| 2       | [Before](reviews/m08/bloom/2-before.png) | [After](reviews/m08/bloom/2-after.png) |
| 4       | [Before](reviews/m08/bloom/4-before.png) | [After](reviews/m08/bloom/4-after.png) |
| 6       | [Before](reviews/m08/bloom/6-before.png) | [After](reviews/m08/bloom/6-after.png) |

[GPU output report](reviews/m08/bloom/report.json) compares the compiled old and new
filters on all six linear RGB colours at peak emission 2.2, plus dim controls at
0.2. Previously only lime/gold survived; now all six retain their input RGB values.
Every dim control remains black. The native review script asserts those results
and reports no page or console errors. Reproduce with the local Vite server running:

```sh
node tooling/review-bloom.mjs /tmp/citadel-bloom http://127.0.0.1:5175
```

Vite+ check, **284 unit tests / 49 files**, `/citadel/` production build and four
focused native production browser tests pass. Browser checks cover bloom/reduced
effects, camera-independent input, title controls and actual victory/result flow.
The existing large-bundle warning remains. The full browser suite was not rerun.
Simulation and audio are unchanged. Local correction awaiting visual review;
M07's earlier approval and M08's pending publication tasks remain recorded in the plan.
