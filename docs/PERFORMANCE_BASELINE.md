# Performance baseline and capture guide

P01 is blocked on real-device evidence. A Windows Chrome player reports roughly 15 FPS; the machine
is unavailable to us, so its cause and the effect of any future change remain
unverified. The local measurements below use the host computer's GPU. Emulated
phone and tablet viewports do not emulate a mobile GPU, browser, battery or heat.

## Reproduce the local automated capture

Build and serve the production-optimised local diagnostic version (the server must
remain running). Release builds omit rolling frame capture and its console hook;
the explicit local mode keeps that capture available for measurement:

```sh
PAGES_BASE_PATH=/ pnpm build:local
PAGES_BASE_PATH=/ pnpm preview:local --host 127.0.0.1 --port 4173 --strictPort
```

In another terminal, run one scenario at a time, without other heavy work:

```sh
node tooling/performance-baseline.mjs --device=desktop --level=1 --seats=6 --seconds=60 --output=/tmp/citadel-desktop.json
node tooling/performance-baseline.mjs --device=phone --level=100 --seats=6 --seconds=60 --output=/tmp/citadel-phone.json
node tooling/performance-baseline.mjs --device=tablet --level=100 --seats=6 --seconds=60 --output=/tmp/citadel-tablet.json
```

Choose `desktop`, `phone` or `tablet`, level 1–100, 2/4/6 seats, `--seed=1`
or another unsigned seed, and
`--quality=low|medium|high`. Repeat each comparison at least twice under the
same conditions. Save the JSON outside the repository if it includes machine
information; inspect it before sharing. It contains local raw frame samples,
summary percentiles, renderer/browser/viewport details, phase counts, errors,
startup timing and the tested source revision. The script uses the optimised local diagnostic
bundle, seed 51 by default and the existing document-local virtual controls. It restarts
finished matches with the same seed and level, and attempts to collect 60 seconds
of playing frames, with a bounded timeout. Check `activeMs`, `restarts`, `phases`,
`droppedFramesFromCollector`, peak `balls` and errors: a run is not a sustained
16-ball result unless the samples actually demonstrate that workload. Counts and
phase boundaries are approximate because the game phase is polled once per second.
The initial five seconds are excluded. `menuMs` and `startDispatchMs` include
browser automation and are not pure application startup measurements.

Frame intervals describe visible pacing; simulation, audio and render CPU values
are main-thread work, while the optional GPU timing is asynchronous and represents
periodic measurements repeated across frames. A null GPU value is unknown. GPU
and CPU work overlap and must not be added to explain frame time. The browser may
cap frame rate or use software rendering. Compare matched scenarios, not unrelated
viewports or devices; review distributions and traces, not just average FPS.

## Ask the Windows player for evidence

No installation or account is required. On the exact build being investigated,
record the build/revision or URL, Windows version, PC model, CPU and GPU if
known, Chrome version, display resolution and refresh rate, browser zoom,
window dimensions, power mode, whether plugged in, number of players, level and
quality. Record when the slowdown starts and whether it persists after restart.
In Chrome settings, note whether graphics acceleration is enabled; Chrome's
`chrome://gpu` page can help identify the active renderer and software fallback.
Do not change settings before recording the original state. Compare High and Low
in the same match conditions, then return to the original setting.

In an explicit diagnostic build, while the game is playing, open DevTools Console
and run the following. The public release has no `__citadelPerformance` hook;
use Chrome's Performance recording there, or reproduce in the optimised local build:

```js
copy(JSON.stringify(window.__citadelPerformance(), null, 2));
```

Paste the copied JSON into a local text file for voluntary sharing. It is a
rolling local window (up to 1,800 frames), not a continuous 60-second capture
at 60 FPS, and its total spike count covers the session. Capture once after
slowdown is established, and again with Low quality under comparable conditions.
Optionally save a Chrome Performance recording of a short slowdown, including a
few seconds before it begins. Such files may contain machine details and visited
URLs; inspect before sharing. The diagnostic does not upload anything itself.

For a phone or tablet, record model, OS, browser and version, whether standalone
or browser tab, orientation, quality, battery/charging and whether the device
feels warm. Compare the same scenarios from a fresh launch and after sustained
play. Collect a remote browser profiler trace only if the owner can do so; note
unsupported GPU timing and unavailable devices rather than substituting emulation.

## Preliminary local results — 15 November 2026

Production build at `aeafbdb`, macOS Apple M2 Pro, Chromium 158 headless with
ANGLE Metal, seed 51, High unless noted. These are exploratory measurements,
not results for the Windows report. Raw compressed JSON
is in `docs/reviews/performance-p01/`. Each capture contains at least 60 seconds
of sampled playing frames; zero collector overflows and browser errors were
reported. The phone/tablet runs each restarted twice and reached at most 14 balls,
so they do not cover the planned sustained 16-ball case.

| Scenario                           | Frames | Frame p95 / p99 | Render CPU p95 | GPU p95 | Peak balls | Draw calls p95 |
| ---------------------------------- | -----: | --------------: | -------------: | ------: | ---------: | -------------: |
| Desktop 2 seats, L1                |  3,630 |  16.7 / 16.8 ms |         5.5 ms | 11.7 ms |          1 |            411 |
| Desktop 4 seats, L1                |  3,606 |  16.7 / 16.8 ms |         6.7 ms | 13.0 ms |          1 |            771 |
| Desktop 1280×900 DPR 1, L1, High   |  3,606 |  16.7 / 16.8 ms |         8.3 ms | 15.7 ms |          1 |          1,089 |
| Desktop L1 High repeat             |  3,608 |  16.7 / 16.8 ms |         8.4 ms | 14.8 ms |          1 |          1,089 |
| Desktop 1280×900 DPR 1, L1, Low    |  3,621 |  16.7 / 16.8 ms |         3.7 ms |  5.7 ms |          1 |            357 |
| Phone-shaped 390×844 DPR 3, L100   |  3,656 |  16.7 / 16.8 ms |         5.9 ms |  4.8 ms |         14 |            665 |
| Tablet-shaped 820×1180 DPR 2, L100 |  3,603 |  16.7 / 16.8 ms |         6.7 ms | 10.1 ms |         14 |            667 |
| Tablet-shaped L100, seed 1         |  3,605 |  16.8 / 16.8 ms |         7.1 ms | 13.9 ms |         12 |            649 |

The two-seat run recorded four intervals marginally above 33.4 ms; the other
runs recorded none above that threshold in collected playing frames.
The desktop High/Low comparison suggests substantial presentation cost on this
particular machine, although Low changes several features at once and does not
identify a single expensive pass. The one-ball desktop simulation p95 was
0.3 ms High and 0.4 ms Low; level-100 phone/tablet-shaped simulations were
1.7 ms p95. No inference about the Windows bottleneck follows without its trace.
Both desktop modes were refresh-rate limited, so the similar frame intervals do
not imply the modes cost the same. Startup dispatch was 262–302 ms in these
instrumented runs; isolate and repeat it before assigning a cause.

**Remaining P01 work:** obtain a capture from the affected Windows machine;
repeat more matched measurements and cover isolated graphics and audio
experiments, a genuine sustained 16-ball stress fixture, and physical phone and
tablet/Safari devices. Until then the baseline and P01 acceptance are incomplete.
