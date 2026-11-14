# Playtest feedback — 14 November 2026

All six playtest TODOs are implemented locally for review. They were initially
held uncommitted above `02fb6d2`; the owner subsequently authorised focused local
commits. The [plan ledger](../PLAN.md#progress--approval-ledger) records their scopes and IDs. David may
share the existing public playtest link, as explicitly confirmed by the owner.
No external messages, pushes or deployments were performed.

## Changes to try

- **Centred camera:** autonomous yaw, tilt and breathing are removed. Bat movement
  supplies a symmetric shimmy of up to about 1°, with a 3% dead zone and damped
  return to exact neutral. Approaching danger retains up to 2% zoom. Pause and
  reduced motion retain their existing freeze behaviour; steering remains
  independent of the camera.
- **Attentive idle bots:** a bot without an interception or held-serve tactic
  follows a distant active ball with small, infrequent variation, then returns
  to guard when no active ball exists. It uses the ordinary motor and level
  reaction/speed limits. Tactical decisions take immediate priority. Variation
  uses a deterministic per-seat/time hash without consuming gameplay RNG.
- **Bat variety:** five-level blocks use standard, shallow and deeper convex
  bows. The repeating sequence is standard → shallow → deep → standard → deep →
  shallow. Levels 1–5 retain the original profile; compare levels 6 and 11.
  Physical chord width follows the existing difficulty ramp. Every player has
  the same profile; collisions, aiming, forecasts and bot planning share the
  physical geometry. Profile changes appear in the level briefing.
- **Foreground space:** framing reserves roughly 6% viewport height beneath the
  complete front wall and plinth, including maximum danger zoom. Portrait views
  retain existing spare vertical space without an unnecessary shift. The title
  and bottom controls retain their fixed anchors.
- **Upright victory:** the star points toward screen-top, away from the captured
  viewer position. The existing smooth outline morph, centred winner and return
  transition remain in place.

Refresh **http://localhost:5179/** for the production demo. Centre the bat and
wait; try both steering directions and return to centre. Resize through narrow,
square and wide windows. Use **+ / −** to compare unranked levels 1, 6 and 11;
**Backspace** returns to the saved challenge. Watch distant bots during play,
and inspect the star after a win. Testing uses document-local virtual input;
automated tests do not capture the system mouse.

## Rendered evidence

The [render report](reviews/m09/playtest-feedback/report.json) records eighteen
desktop/phone samples across 2/4/6 players and the three profiles. Every sample
has idle movement, unchanged gameplay RNG and zero collision caps. Fifty-two
frames cover those poses, shimmy, title/briefing, and 2/6/16-seat victory morphs
at start, midpoint, finish and reduced-motion finish. There are no browser errors.
These use authored idle/finished states through the ordinary renderer, rather
than claiming live wins. Victory frames advance the presentation at 30Hz so
retiring wall pieces settle naturally.

| Review                               | Desktop                                                             | Phone                                                                |
| ------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Standard bat / foreground            | [Six players](reviews/m09/playtest-feedback/desktop-6-standard.png) | [Six players](reviews/m09/playtest-feedback/phone-6-standard.png)    |
| Shallow bat                          | [Level 6](reviews/m09/playtest-feedback/desktop-6-shallow.png)      | [Level 6](reviews/m09/playtest-feedback/phone-6-shallow.png)         |
| Deeper bat                           | [Level 11](reviews/m09/playtest-feedback/desktop-6-deep.png)        | [Level 11](reviews/m09/playtest-feedback/phone-6-deep.png)           |
| Fixed title/menu anchors             | [Title](reviews/m09/playtest-feedback/desktop-title-padding.png)    | [Title](reviews/m09/playtest-feedback/phone-title-padding.png)       |
| Upright star, last selectable viewer | [Six seats](reviews/m09/playtest-feedback/desktop-star-6-3.4.png)   | [Sixteen seats](reviews/m09/playtest-feedback/phone-star-16-3.4.png) |

Compare the [left shimmy](reviews/m09/playtest-feedback/desktop-camera--0.4.png),
[neutral](reviews/m09/playtest-feedback/desktop-camera-0.png) and
[right shimmy](reviews/m09/playtest-feedback/desktop-camera-0.4.png).
The [briefing frame](reviews/m09/playtest-feedback/desktop-profile-briefing.png)
shows the profile announcement.

Reproduce authored frames with the development server on port 5180:

```sh
node tooling/review-playtest-feedback.mjs http://127.0.0.1:5180
```

## Verification

- The final full unit run passes **539 tests in 95 files**. Coverage checks neutral/dead-zone/return camera motion, inverse input
  projection, the 6% margin at maximum danger zoom, deterministic idle attention
  and immediate tactical priority. Bat tests cover the 100-level width ramp,
  all 2–16-player rosters, five arena families, both width extremes, physical
  contacts, bank returns on both sides and profile preservation through elimination. Renderer tests check
  matching bow geometry, reuse and disposal. Upright-star tests cover every
  selectable viewer, portrait/landscape and reduced motion.
- The complete native Chromium suite initially passed 83 of 86 cases. Three
  stale test assumptions were corrected: the current full briefing needs 4.75s,
  Settings already exposes Restart, and a natural win must be observed before
  its 0.9s button delay. All seven cases in those three files pass on rerun.
  The new debug/profile browser case passes and preserves saved progression.
  This is passing coverage of all 86 cases, rather than one clean full-suite run.
- Full-repository `vp check`, root and `/citadel/` production builds pass. The
  Pages-path viewport/refresh smoke test also passes with CI's software-WebGL
  configuration (one case, 28.1s including setup).
- Eight isolated level-100 stress samples use sixteen balls and 6/8/12/16 seats,
  desktop and phone-sized views, fifteen warm-up and 120 measured frames each.
  The [stress report](reviews/m09/playtest-feedback/stress/report.json) records
  16.7–16.8ms p95 frame intervals, zero collision caps and no browser errors on
  this Mac's M2 Pro Metal renderer. Its layout metadata is inherited from the
  prior roster review; only the eight performance samples are new. These short
  samples do not establish sustained or physical-mobile performance.

Physical iPad/iPhone Safari validation remains open. The existing initial-bundle
size advisory remains. M09 awaits owner review; M10 has not started.

## Settings padding correction

The foreground-framing change did not add space inside Settings. Resume and
Restart now have **24px bottom padding**, increased from 10px to match the side
inset. The panel grows by 16px where space permits, and slider spacing compresses
on short screens. One shared layout keeps the rendered panel and accessible
controls aligned. Both buttons retain 44px targets with separation from sliders
at 320px screen height.

Final production captures: [desktop](reviews/m09/settings-padding/desktop-settings.png),
[phone](reviews/m09/settings-padding/touch-settings-390.png) and
[landscape](reviews/m09/settings-padding/touch-settings-844.png). Projected-geometry
tests check the actual visible bottom margin, target alignment and slider
separation at six screen sizes in both input modes. All four Settings/Restart
browser cases pass. A full unit run alongside Chromium hit the 5s timeout in two
simulation tests; the isolated full rerun passes **540 tests in 95 files**.
The root build passes with the existing bundle advisory. The production demo at
http://localhost:5179/ is refreshed. These changes are committed locally at the owner's subsequent request.

The further 15:02–15:22 Windows Chrome feedback is recorded as five unchecked
proposals in `TODO.md`; those proposals have not been implemented.

## Separate rollback options

Camera centring is isolated in commit `bfa9d1e`, independently of the later
framing, bot, UI and performance changes. The saved patches below remain usable
for a reversible working-tree trial.

Two local patches were saved and checked with `git apply --check --reverse`.
They can undo camera centring or foreground padding independently. Neither
rollback has been applied. Before reversing, preserve any later edits to the
affected files and check the patch again:

```sh
git apply --check --reverse /private/tmp/citadel-playtest-review-2026-11-14/neutral-camera.patch
git apply --reverse /private/tmp/citadel-playtest-review-2026-11-14/neutral-camera.patch
```

Use `foreground-padding.patch` in the same directory to undo only foreground
framing. The centring patch contains only `camera-motion.ts` and its tests;
the padding patch contains only `camera.ts`, its tests and `viewport.ts`.
The patches are temporary local review aids and are not bundled into the game.

**REVIEW REQUIRED — M09**
