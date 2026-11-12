# Bloom colour balance

## 12 November: balance the extracted glow

The earlier threshold correction made all seat colours eligible for bloom, but
their extracted light was still uneven: equally powered gold contributed almost
four times the luminance of violet. The bloom extraction now uses peak intensity
for a common cutoff and adjusts the glow's luminance while preserving its hue.
The adjustment is bounded and fades toward neutral colours; the underlying scene,
simulation, reflections and reduced-effects rendering are unchanged.

Matched native screenshots: [2 seats](reviews/m08/bloom-balance/2-after.png),
[4 seats](reviews/m08/bloom-balance/4-after.png), and
[6 seats before](reviews/m08/bloom-balance/6-before.png) /
[after](reviews/m08/bloom-balance/6-after.png). The
[GPU report](reviews/m08/bloom-balance/report.json) measures the six equal-powered
seat colours: extracted luminance spread falls from 3.95:1 to 1.14:1; dim
controls stay excluded and RGB ratios are preserved. Reflections, geometry and
perceived brightness can still vary with colour and camera position.

## Previous threshold correction

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
