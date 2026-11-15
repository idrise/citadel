# Health-piece rendering optimisation

15 November 2026. The owner requested low-hanging performance improvements
while P01 remains blocked on unavailable Windows and physical mobile devices.
The original cap and base of each health piece used the same material and always
moved together, but were submitted separately, each with its own outline. Their
geometry is now combined once when a seat's health-piece factory is created.
Body, trim, outlines, shadows and shared resource disposal remain intact; the
simulation and its collision shapes are untouched. Pickups use the same factory.

## Production comparison

The following are matched 60-second active samples at seed 51 in headless
Chromium 158, Apple M2 Pro, ANGLE Metal, High quality. Before samples are from
`docs/reviews/performance-p01/`; after samples are in
`docs/reviews/performance-p02/`. The JSON records `9f6eb30` as the base revision;
the measured build also included the then-uncommitted health-piece optimisation.

| Scenario                            | p95 draw calls before → after | Render CPU p95 before → after | Frame p95 before → after | GPU p95 before → after |
| ----------------------------------- | ----------------------------: | ----------------------------: | -----------------------: | ---------------------: |
| Desktop, six seats, level 1         |                   1,089 → 972 |                  8.3 → 8.0 ms |           16.7 → 16.7 ms |         15.7 → 16.3 ms |
| Phone-shaped, six seats, level 100  |                     665 → 619 |                  5.9 → 6.0 ms |           16.7 → 16.7 ms |           4.8 → 5.9 ms |
| Tablet-shaped, six seats, level 100 |                     667 → 619 |                  6.7 → 6.3 ms |           16.7 → 16.8 ms |         10.1 → 10.1 ms |

The desktop baseline repeat had 1,089 calls and 8.4 ms render CPU p95.
One after-change desktop interval was marginally above 33.4 ms; the other two
captures had none. There were no browser errors or collector overflows. The
level-100 runs restarted twice and peaked at 14 balls. The p95 GPU values are
periodically sampled and repeated between queries, and vary between runs. The
reduced draw counts are clear, but these samples do not establish an FPS or GPU
speedup: the Mac was refresh-rate limited and some measured costs increased.
Emulated phone/tablet viewports use the Mac GPU, not mobile hardware.

## Visual and functional review

`arena-2.png`, `arena-4.png` and `arena-6.png` in
`docs/reviews/performance-p02/` show the same fixed 2/4/6-player scene fixture
used before the change. The six-player full-effects image's normalized pixel
RMSE against the before image was 0.00225; rounding, transparent sorting and
bloom can produce differences after combining meshes. The compared images were
visually inspected, including dense-ball and reduced-effects cases. A production
phone screenshot is included as `phone-play.png`. Chromium touch, camera and
reduced-effects checks passed. These rendered checks do not validate physical
mobile Safari or the reported Windows machine.

Unit tests verify original trim vertex positions, dimensions and crease count,
plus shared geometry/material lifetime. The full unit suite, `vp check`, root
production build, selected browser tests and `git diff --check` passed. The
production build continues to report its existing large-chunk advisory. P01's
Windows, physical-device and sustained sixteen-ball evidence remains open.
