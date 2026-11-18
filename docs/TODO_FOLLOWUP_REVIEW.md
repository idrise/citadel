# 18 November TODO follow-up

Local code checkpoints: `5a42330` (collisions), `31c7c84` (Settings),
`31a8166` (percussion).

The four remaining TODOs are implemented for local M09 review: Settings spacing
and button alignment, repeated bat contacts, percussion balance and removal of the
guide toggle. Demo: <http://127.0.0.1:5181/>. The owner's existing `levels.ts`
roster overrides are preserved and excluded from these commits.

Settings now reserves room for the header and slider lettering, centres the
Level/Best heading and uses the same two-column grid for both footer rows. Resume
and Restart retain equal widths, equal baselines, a 12px gap and 24px bottom inset.
Short landscape screens place sliders in columns; touch omits sensitivity. The
retired guide button, action, accessible status and saved preference are removed.
Old guide choices are ignored without losing volume or sensitivity settings.
Live play keeps guides off.

Two failing collision regressions established concrete pass-through cases. After
a bat return, a ball-to-ball impulse could send the ball back through that same
bat within one 120Hz tick: the solver previously suppressed that bat for the
whole tick. A new pair impulse now permits another bat contact. The curved-face
sweep also recovers entering overlaps and separates the ball by its penetration
depth, while ignoring departures. Tests cover both faces and all three bat profiles,
plus repeated contacts in 2/4/6-seat arenas. A 100ms frame stall produces exactly
the same state and returns as twelve ordinary ticks, including moving human aim
and maximum paced ball speed. The fixed clock and bat dimensions are unchanged.
These are reproduced defects; the tester's exact missed shots were not recorded,
and their cause cannot be established from the report alone.

The drum voices now sit forward of the lead while retaining the existing phrases,
accents, kick ducking and independent effects bus. Instrument changes in dB:

| Voice            |    Before |     After |
| ---------------- | --------: | --------: |
| Kick             |       -10 |        -7 |
| Closed/open hat  | -21 / -23 | -17 / -19 |
| Clap             |       -14 |       -11 |
| Snare noise/body | -18 / -22 | -13 / -18 |
| Crash            |       -19 |       -17 |
| Lead / arpeggio  |  -4 / -15 |  -7 / -16 |

Matched offline renders use the actual synth graph, seed 2026, the normal 0.45
master volume and four-ball score layers. The 14-second drop's percussion RMS
rises 0.0221 → 0.0312 (about 3.0dB); the melodic stem falls 0.0241 → 0.0206
(about 1.3dB). Mixed RMS rises 0.0354 → 0.0398 and peak falls 0.408 → 0.382
(about -8.3dBFS), retaining clipping headroom. Intro/build/drop and isolated stems
were measured; noise synth samples vary slightly between runs. Damage feedback
keeps its previous gain. Audio routing/timing/disposal tests and the live-browser
mute, pause and restart checks pass. Musical balance still needs owner listening
on their speakers/headphones.

Compare [before](reviews/m09/todo-followup/before-drop.wav) and
[after](reviews/m09/todo-followup/after-drop.wav). Raw levels:
[before](reviews/m09/todo-followup/before-mix.json),
[after](reviews/m09/todo-followup/after-mix.json).

Rendered evidence uses native Chromium on the available Mac. Phone and tablet
are emulated viewports/touch, not physical devices. All automated input stays in
the page through `tests/fixtures.ts` or the same virtual-input hook.

| View    | 2 seats                                          | 4 seats                                          | 6 seats                                          |
| ------- | ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| Desktop | [image](reviews/m09/todo-followup/desktop-2.png) | [image](reviews/m09/todo-followup/desktop-4.png) | [image](reviews/m09/todo-followup/desktop-6.png) |
| Phone   | [image](reviews/m09/todo-followup/phone-2.png)   | [image](reviews/m09/todo-followup/phone-4.png)   | [image](reviews/m09/todo-followup/phone-6.png)   |

Also: [tablet](reviews/m09/todo-followup/tablet-6.png),
[short landscape](reviews/m09/todo-followup/landscape-6.png),
[320px square](reviews/m09/todo-followup/square-6.png),
[gameplay clip](reviews/m09/todo-followup/gameplay.webm) and
[target bounds](reviews/m09/todo-followup/settings-report.json).
The 320px-square desktop layout fits all controls but scales long slider labels
small; ordinary phone portrait and touch landscape retain larger lettering.

Checks actually run:

- `vp check`: formatting, lint and types pass.
- `vp test run`: 667 tests across 117 files pass, including long seeded matches,
  deterministic replay/arena fixtures and the new collision/audio regressions.
- Native root production browser suite: 16 Settings/restart/progress/music/scene
  checks plus one phone/tablet menu-size check pass.
- Root and `/citadel/` production builds pass; the existing large-chunk advisory
  remains. Twelve native Pages-path viewport/refresh/Settings/restart/guide-removal browser checks pass.
- Nine screenshot scenarios report zero page errors; ten before/after offline
  audio auditions pass level/headroom assertions. Gameplay capture reports zero
  page errors. `git diff --check` passes.
- Code checkpoints are checked from exported staged snapshots so uncommitted
  roster tuning cannot mask missing dependencies.

Reproduce with a root development server:

```sh
pnpm exec vp dev --host 127.0.0.1 --port 5181 --strictPort
node tooling/review-todo-settings.mjs http://127.0.0.1:5181
node tooling/review-todo-mix.mjs http://127.0.0.1:5181 --before
node tooling/review-todo-mix.mjs http://127.0.0.1:5181
```

The baseline audio runner loads only the two original instrument modules from
local revision `cabef60`; it does not change the working tree. `--screens-only`
refreshes Settings captures without replacing the gameplay recording. The checked-in
clip is compressed to 960×540 VP9; the runner records 1280×720.

Try Settings in portrait and short landscape, compare the music auditions, then
play a busy multiball level and check close bat saves. Physical iPad/iPhone Safari,
the reported Windows machine and subjective music/gameplay review remain open.
No push, deployment or later milestone is authorised or performed.

**REVIEW REQUIRED — M09**
