# Desktop playtest record

11 November 2026 · candidate 0.1.0 · local desktop gate, awaiting review.
This separates user feedback from automated flow/stability checks. External
tester sessions and a public Pages URL are **not yet collected**.

## Feedback already received

| Source                  | Observation                                                                  | Response / next check                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Project owner, hands-on | Early ball felt dull; wanted speed and accumulating pressure.                | Approved size/speed increase and timed additions retained. M06 still needs comparative pacing evidence.               |
| Project owner, hands-on | Bat could not attack above/bank off either adjacent wall; two-seat end gaps. | Curved aiming and geometry-derived full reach delivered in M02/M05. Existing browser/unit regression checks retained. |
| Project owner, hands-on | Felt good; arena lacked real depth, neon edges and surroundings.             | Solid walls, live perspective, reflections, restrained bloom and exterior grid retained; M07 corrects edge stepping.  |
| Project owner, hands-on | Could not perceive swipe curve.                                              | Stronger visible curvature, direction bands and curved forecasts delivered; still worth testing during fast catches.  |
| Project owner, hands-on | Music too simple; needed staged journey, harmony and event coupling.         | Accepted adaptive music detour retained; M07 adds positive score attribution and ascending FM cheers.                 |
| Project owner, hands-on | Morphs travelled too far and lagged deaths.                                  | User chose regular layouts with minimal movement. M05 reduced motion and retained retarget deadlines.                 |
| Project owner, latest   | Scoring against an opponent sounded disappointed; outer-wall edges stepped.  | M07 success/loss auditions and matched before/after frames ready for owner review; no approval assumed.               |

## Recorded scripted observations

- M08 fresh production URL, six seats/human seat 5/standard bots/seed 2026:
  **67.69s**, human survival **57.58s**, six returns, five rival pieces broken,
  fifth place, zero collision caps. [Actual JSON](reviews/m08/six-seat-round.json).
  Sparse scripted human input, emulated time, music off, reduced effects on.
- Existing M05 scripted coverage completes twelve rounds across 2–6 seats,
  including ten across 2/4/6, plus rematches. See [M05 evidence](M05_REVIEW.md).
  Its twelve bot-only wall-revision rounds finished in **31.37–109.71s** with zero
  caps; [bot report](reviews/m05/walls/bot-rounds.json). These are stability runs,
  not a human timing distribution. Do not combine them into a playtest median.
- The fresh result's personal counters reconcile with exported damage. Reload,
  blocked storage and losing network after startup do not prevent play. Offline
  reload is not promised: this is not a service-worker installation.
- Native High-quality 1280×900 opening sample on M2 Pro measured 16.7 ms median /
  16.8 ms p95. [Report](reviews/m07/native-performance.json). Dense late-game,
  low-end devices, Safari and mobile need separate performance review.
- Software WebGL passes three focused checks (bloom/reduced, camera/input, quality
  and preferences). The new quality test initially exceeded 60s; cheaper countdown
  setup and bounded preset samples pass with a 180s allowance. This renderer is
  slow here; the complete software suite and CI run have not been verified.

## Repeatable local checks

```sh
pnpm check
pnpm test
PAGES_BASE_PATH=/citadel/ pnpm build
PLAYWRIGHT_RENDERER=hardware pnpm test:browser --workers=1
pnpm dev
```

Open the dev URL, or run `pnpm preview --host 127.0.0.1` and open `/citadel/`.
Use a fresh browser context or clear only the `citadel.solo.v1` preference key.
Select 6 players, any fortress, Standard bots. Play, move/serve, pause/focus away,
resume, finish, **Export round**, then Rematch. Verify the cursor is released in
menus and there is no visible HUD during play. Try Low/Medium/High in Settings.

For evidence with the dev server running:

```sh
node tooling/review-edges.mjs /tmp/citadel-edges
node tooling/review-native.mjs /tmp/citadel-native.json
node tooling/review-music-audio.mjs /tmp/citadel-audio
node tooling/review-desktop.mjs /tmp/citadel-desktop
```

The last script records 32s of actual gameplay/audio and menu PNGs. Review media
are exports only, never runtime assets. Browser test results include the six-seat
JSON and result screenshot. See [M07](M07_REVIEW.md) and [M08](M08_REVIEW.md).

## Optional external protocol — pending

With an authorised published URL or a local session, ask a few desktop testers
for three rounds each: 2, 4 and 6 players at Standard, defaults first. Let them
find Play and controls without coaching; offer help if stuck. No accounts needed.
Export each round locally and request the file only with their agreement.

Record browser/device, initial players, settings, duration, survival, returns,
pieces broken, whether they rematched voluntarily, and a brief confusion quote.
Ask: What caused the last lost piece? Could you aim or curve intentionally?
Could you follow simultaneous balls and changing walls? Was success audibly
different from loss? Did you want another round? Do not infer understanding from
winning alone. Record participant labels without names or personal details.

No external responses are currently recorded. Next changes should follow those
observations. Proposed checks are M06's 2/4/6 pacing comparison, scoring-cue mix
and late-game visibility; they are **not approved gameplay changes**. Keep mobile
and networking behind the desktop review gate.
