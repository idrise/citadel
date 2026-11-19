# Graphics quality slider — 18 November

## 19 November: Low dimming correction

Low's existing black veil blended over display-encoded pixels using a linear gain.
The intended 0.14 linear gain became 0.14 display gain, leaving a white reference
at only about 0.017 linear brightness. The direct path now converts that scalar to
display space before calculating the veil opacity (about 0.41 retained display
gain). This keeps the arena visible beneath Settings and settled result controls.
The linear composer gain, foreground brightness and Medium/High paths retain
their existing behavior. This is an output-space correction, not identical HDR/bloom
output across quality levels.

The correction reuses one Color and the existing veil; no render targets, textures,
bloom/reflection work or draw calls are added. The same direct path covers reduced
effects. Unit regressions check inverse colour conversion for Settings, win and
loss, both reduced-effects modes, normal-play veil omission and renderer-state
restoration after errors. All 718 unit tests, format/lint/types and root/local
builds pass, with the existing large-chunk advisory. Four production Chromium
checks pass: desktop/touch quality Settings, a real Low win after result dimming
settles, and a Low loss/demotion using reduced effects. Screens were reviewed;
physical-device results are not claimed.

Compare [old desktop](reviews/m09/low-dimming/before-desktop.png) /
[corrected desktop](reviews/m09/low-dimming/after-desktop.png) and
[old phone](reviews/m09/low-dimming/before-phone.png) /
[corrected phone](reviews/m09/low-dimming/after-phone.png).
Settled results: [win](reviews/m09/low-dimming/low-victory.png) /
[loss](reviews/m09/low-dimming/low-defeat.png).

Local demo: http://127.0.0.1:5182/. Reload, select Low, then open Settings or finish
an attempt. The dimmed arena should remain visible. No push/deployment occurred.
REVIEW REQUIRED — M09.

Settings now has a persisted three-step Graphics quality slider on desktop and
touch. The scene label shows Graphics Low/Medium/High; the accessible range has
named values and native keyboard controls. Existing saved `effectsQuality`
choices are retained. Changes redraw the current canvas without resetting the
match, input, sound settings or progress.

| Setting                           | Low | Medium  | High    |
| --------------------------------- | --- | ------- | ------- |
| Bloom                             | Off | On      | On      |
| Floor/wall reflection captures    | Off | Off     | On      |
| Metallic environment reflection   | Off | Off     | On      |
| Desktop pixel-ratio cap           | 1   | 1.5     | 2       |
| Phone/tablet pixel-ratio cap      | 1   | 1       | 1.5     |
| Postprocess multisamples, desktop | 0   | Up to 2 | Up to 4 |
| Damage shards                     | 3   | 7       | 10      |
| Trail segments, desktop           | 0   | 12      | 20      |
| Sparks, desktop                   | 0   | 3       | 6       |

High restores the full available presentation. Mobile retains its existing single
floor capture, no wall captures, no multisampling and smaller particle budgets.
The existing reduced-effects preference remains an accessibility override. Shadows
remain disabled, following the earlier explicit shadow-removal request. Adaptive
resolution still responds within the selected quality cap. Reflection targets stay
allocated for fast switching but hidden mirrors do not render capture passes.

The panel keeps its previous height, 100px first-row offset and 24px bottom inset.
Slider rows tighten from 76px to 52px, with a 26px label-to-track-centre offset;
Resume/Restart keep their aligned columns. Touch has three sliders, desktop four.
Short landscape screens use columns. Quality-label meshes are cached, so moving
volume sliders or selecting an existing quality does not recreate lettering.

Matched static boards use native Chromium on the available Mac at DPR 2. Render
work is lower at each step:

| Six-seat view    | Low draw calls | Medium | High | Low / Medium / High drawing buffer |
| ---------------- | -------------: | -----: | ---: | ---------------------------------- |
| Desktop          |            165 |    179 |  633 | 1280×900 / 1920×1350 / 2560×1800   |
| Phone emulation  |            165 |    179 |  345 | 390×844 / 390×844 / 585×1266       |
| Tablet emulation |            165 |    179 |  345 | 768×1024 / 768×1024 / 1152×1536    |

These are actual render submissions for an unchanged board with menus hidden,
not FPS measurements or a diagnosis of the affected browsers. Phone/tablet use
the host GPU and do not establish physical-device performance. First selection of
a quality can compile a different shader variant. Retest on affected browsers to
judge the practical gain. No simulation timing or gameplay rules changed.

Rendered evidence, with Settings padding inspected:

| View             | Low                                                     | Medium                                                     | High                                                     |
| ---------------- | ------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| Desktop, 2 seats | [image](reviews/m09/graphics-quality/desktop-2-low.png) | [image](reviews/m09/graphics-quality/desktop-2-medium.png) | [image](reviews/m09/graphics-quality/desktop-2-high.png) |
| Desktop, 4 seats | [image](reviews/m09/graphics-quality/desktop-4-low.png) | [image](reviews/m09/graphics-quality/desktop-4-medium.png) | [image](reviews/m09/graphics-quality/desktop-4-high.png) |
| Desktop, 6 seats | [image](reviews/m09/graphics-quality/desktop-6-low.png) | [image](reviews/m09/graphics-quality/desktop-6-medium.png) | [image](reviews/m09/graphics-quality/desktop-6-high.png) |
| Phone, 6 seats   | [image](reviews/m09/graphics-quality/phone-6-low.png)   | [image](reviews/m09/graphics-quality/phone-6-medium.png)   | [image](reviews/m09/graphics-quality/phone-6-high.png)   |
| Tablet, 6 seats  | [image](reviews/m09/graphics-quality/tablet-6-low.png)  | [image](reviews/m09/graphics-quality/tablet-6-medium.png)  | [image](reviews/m09/graphics-quality/tablet-6-high.png)  |

Settings: [desktop](reviews/m09/graphics-quality/desktop-6-settings.png),
[phone](reviews/m09/graphics-quality/phone-6-settings.png),
[tablet](reviews/m09/graphics-quality/tablet-6-settings.png),
[short landscape](reviews/m09/graphics-quality/landscape-6-settings.png).
[Raw rendering counts and enabled-effect flags](reviews/m09/graphics-quality/report.json).

Checks actually run:

- `vp check`: format/lint/types pass.
- `vp test run`: 675 tests across 118 files pass. New coverage checks monotonic
  budgets, quality step conversion/clamping, persistence, simulation-option
  independence, compact panel spacing and cached visible quality labels.
- Ten root native Chromium browser checks pass: real rendering flags in exported
  reports at each quality, unchanged paused state/canvas, reload/keyboard choice,
  desktop/touch controls, reset and restart.
- Root production build and `git diff --check` pass. The existing large-chunk
  advisory remains. Nine native Pages-path quality/Settings/viewport/refresh
  checks also pass. Implementation checkpoint: `78c16e6`.
- Eighteen matched quality/view/roster renders report zero page errors. The review
  uses the same document-local virtual-input hook as `tests/fixtures.ts`.

Local demo: <http://127.0.0.1:5181/>. Reload, open Settings, then compare Low,
Medium and High. Try Low first on the affected browser and compare busy gameplay.
Capture reproduction with a root dev server:

```sh
pnpm exec vp dev --host 127.0.0.1 --port 5181 --strictPort
node tooling/review-graphics-quality.mjs http://127.0.0.1:5181
```

This is the owner-requested quality control, not completion of the separate
performance investigation or physical-device gate. M09 remains awaiting review.
No push, deployment or later milestone was performed.

**REVIEW REQUIRED — M09**
