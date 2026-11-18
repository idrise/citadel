# Container protection — 18 November

Implementation checkpoint: `2bcf36e`.

Every surviving human or bot now gets **two playing seconds of container
invulnerability after losing a container**. The remaining bank pulses in its
owner's colour. Protected containers rebound balls at their actual circular
surfaces; they remain solid and cannot lose another point. Protected hits do not
refresh the timer, reset rally acceleration, change striker credit or consume the
ball. Ordinary damage still gives the damaged survivor the revenge serve.

Protection starts at the swept impact's time inside the fixed tick, so simultaneous
hits against the same bank cost only one container. The solver checks the real
impact time at expiry, including a hit later in the same tick. A final container
still eliminates its owner. Other defenders remain independently vulnerable.
A pickup added during protection shares the bank's current deadline without
extending it. New rounds and Restart have no inherited protection.

The pulse uses simulation time: three soft cycles over the window, with a visible
tint between peaks. Pause freezes both the deadline and pulse. Expiry restores the
normal dark containers. Reduced effects uses a steady tint; Low graphics retains
the cue without bloom. Body/trim emissive values and existing neon uniforms are
shared by the bank and updated once per defender. There are no new meshes,
colliders, render passes or per-frame material allocations. Other banks retain
their own materials. Shield rebounds use the existing bounded sparks and neutral
ricochet sound, without awarding a musical hit streak or damage/success cues.

Matched native Chromium captures use a staged **real swept hit** and ordinary
fixed-step simulation through expiry. Phone evidence is emulation on the host
GPU, not a physical-device check. See the [pulse clip](reviews/m09/container-protection/pulse.webm)
and [simulation measurements](reviews/m09/container-protection/report.json).

| View    | 2 seats                                                                  | 4 seats                                                                  | 6 seats                                                                  |
| ------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Desktop | [protected](reviews/m09/container-protection/desktop-2-human-bright.png) | [protected](reviews/m09/container-protection/desktop-4-human-bright.png) | [protected](reviews/m09/container-protection/desktop-6-human-bright.png) |
| Phone   | [protected](reviews/m09/container-protection/phone-2-human-bright.png)   | [protected](reviews/m09/container-protection/phone-4-human-bright.png)   | [protected](reviews/m09/container-protection/phone-6-human-bright.png)   |

Also: [dim pulse](reviews/m09/container-protection/desktop-6-human-dim.png),
[expired](reviews/m09/container-protection/desktop-6-human-expired.png),
[protected bot](reviews/m09/container-protection/desktop-6-bot-bright.png),
[Low graphics](reviews/m09/container-protection/phone-6-low-bright.png) and
[reduced effects](reviews/m09/container-protection/desktop-6-reduced-bright.png).

Checks actually run:

- `vp check`: format/lint/types pass.
- `vp test run`: 694 tests across 120 files pass. New regressions cover all seats,
  same-tick contacts, exact sub-tick expiry, renewed damage after expiry, rebounds,
  striker/rally/serve ownership, pickups, elimination, reset/countdown, legacy
  fixtures, paused pulse timing, material sharing and neutral contact feedback.
- Nine native root browser checks pass: real human damage/protection, pause freeze,
  Restart, desktop/phone replay tokens and demotion/retry, scene results and restart.
- Nine native `/citadel/` browser checks pass: protection, audio playback/mute/pause,
  viewport/refresh and minimal scene controls. All input uses `tests/fixtures.ts`.
- Root and Pages production builds pass with the existing large-chunk advisory.
  `git diff --check` passes.
- Thirty-six authored visual/timing samples report zero collision caps; every
  protected fixture loses exactly one container. All captures and the pulse clip
  report zero page errors.
  The source checkpoint is also checked from an exported staged snapshot.

Local demo: <http://127.0.0.1:5181/>. Reload, lose a container, then watch the bank
pulse and rebound further shots until the window ends. Try Low graphics and
pausing mid-pulse. The normal result, rematch and difficulty study still await
owner review; physical Safari/Windows validation is not claimed.

Reproduce rendered evidence with a root development server:

```sh
pnpm exec vp dev --host 127.0.0.1 --port 5181 --strictPort
node tooling/review-container-protection.mjs http://127.0.0.1:5181
```

This implements the owner's renewed protection request, superseding the earlier
record that the proposal had been removed from TODO. No push, deployment or later
milestone was performed.

**REVIEW REQUIRED — M09**
