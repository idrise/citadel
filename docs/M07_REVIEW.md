# M07 — legibility, impact and sound

**Current scene/feedback revision:** [title, fireworks, ball ownership and independent capsule audio](SCENE_PRESENTATION_REVIEW.md).
Its native media and current checks supersede the earlier result presentation and
neutral-enemy sound examples; the wall-fidelity evidence below remains relevant.

**Latest amendment:** [corner-cap rotation and revised loss/cheer sounds](M07_CORRECTIONS.md)
addresses the owner's subsequent review. Its live and mixed auditions supersede
the original audio examples below; it includes current cap screenshots and checks.

Status: **Awaiting review**, 11 November 2026. Implementation and local checks
complete; visual feel and musical taste need human review. M06's pacing comparison
has not been performed. Ball speed, spin, health, spawn interval and match rules
retain their approved values.

## Audit against the plan

| Requirement                                                  | Delivery / evidence                                                                                                                                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thick luminous geometry with genuine height                  | Existing extruded walls, bevels, floor/rear reflections, 38° live perspective and exterior grid retained. Edge fidelity corrected below.                                                       |
| Spin feedback                                                | Existing rotating direction bands, coloured trails and curved dotted prediction retained; trail budgets now follow quality.                                                                    |
| Impact and destruction                                       | Pooled bat/wall sparks added; existing physical-piece fracture, expanding ring and revenge arc retained. Elimination and victory get distinct fortress rings.                                  |
| Serve, ricochet, breach, elimination, tension, victory audio | New short FM cues extend the adaptive 136 BPM music. Rising success gesture and audience distinguish human scoring from own damage. Ball-count harmony/arp/brass and staged build/drop remain. |
| Restraint at density                                         | Bounded pools, coalesced musical events and quality budgets; eight-ball presentation fixture plus existing simultaneous-ball physics tests. No hit-stop or music-driven physics.               |
| Low / Medium / High                                          | Menu presets below; reduced effects overrides all three.                                                                                                                                       |
| Pure gameplay and safe lifecycle                             | No visible HUD; input capture, focus/pause, teardown and rematch remain tested. Explicit pause also cuts the final cheer immediately.                                                          |

Optional shot-ownership markings were not approved; no new ownership overlay was
added. The read-only observer used for audio/statistics does not change the ball,
its serve allocation or simulation RNG.

## Outer-wall stepping

The wide-edge shader interpolated its pixel distances through perspective. It
now cancels that interpolation and uses derivative-based feathering, so the
coverage stays measured in screen pixels. Solid wall geometry also lost native
canvas antialiasing when rendered into the bloom composer's default unsampled
target. The HDR target now uses up to four MSAA samples, bounded by hardware;
Medium uses two. Resize/DPR changes resize the composer too. Bloom strength,
radius, exposure, camera, wall depth and crease threshold are retained.
[Three.js documents render-target samples and their default of zero](https://threejs.org/docs/pages/RenderTarget.html).

Matched **1280×900, DPR 1** frames use identical geometry, camera and exposure:

| Seats | Before                                   | Corrected                              | Reduced effects                            |
| ----- | ---------------------------------------- | -------------------------------------- | ------------------------------------------ |
| 2     | [Before](reviews/m07/edges/2-before.png) | [After](reviews/m07/edges/2-after.png) | [Reduced](reviews/m07/edges/2-reduced.png) |
| 4     | [Before](reviews/m07/edges/4-before.png) | [After](reviews/m07/edges/4-after.png) | [Reduced](reviews/m07/edges/4-reduced.png) |
| 6     | [Before](reviews/m07/edges/6-before.png) | [After](reviews/m07/edges/6-after.png) | [Reduced](reviews/m07/edges/6-reduced.png) |

The baseline substitutes the shader from `b2b2358` and the old unsampled composer.
These are frozen presentation fixtures, not gameplay captures. The additional
[eight-ball six-seat frame](reviews/m07/edges/6-dense.png) checks visual separation
without claiming a live eight-ball playtest. [Render report](reviews/m07/edges/render-stats.json):
four composer samples in corrected frames, direct native antialiasing in reduced
mode, no page errors. No image upscaling or post-capture smoothing.

| Budget                 | Low      | Medium   | High (default) |
| ---------------------- | -------- | -------- | -------------- |
| Maximum DPR            | 1        | 1.5      | 2              |
| Bloom / reflections    | Off      | On       | On             |
| Composer MSAA          | Bypassed | Up to 2  | Up to 4        |
| Shards per breach      | 3        | 7        | 10             |
| Trail samples per ball | 0        | Up to 12 | Up to 20       |
| Sparks per impact      | 0        | 3        | 6              |

Reduced effects uses Low budgets, stops camera/beat animation and suppresses
moving revenge flourishes; outcome rings fade without expansion. Every mode
keeps balls, eight physical pieces, input and simulation intact. The zero-trail
budget has a regression test ensuring finite transforms.

## Success sounds

Listen to [human success](reviews/m07/audio/success.mp3) and
[own piece lost](reviews/m07/audio/loss.mp3). These are generated auditions, not
runtime assets. Successful human attacks get three ascending FM notes and a
higher, rising synthetic audience. Own damage keeps its descending cue. Bot-only
and unattributed breaches get a quiet neutral cue; self-damage earns no cheer.
The last launch/return owns credit until a new revenge launch changes it; wall
banks retain credit. Per-ball tracking handles simultaneous balls independently.

Returns still quantise to 32nds; success gestures use eighths, with bounded
coalescing. All gameplay outcomes remain immediate. Audio failure/mute is
contained. Final victory can finish its two-second sound tail while results
appear; explicit pause, focus loss, mute or teardown can cut it.

[PCM measurements](reviews/m07/audio/audio-stats.json) pass: success peak 0.145,
RMS 0.0152; own-loss peak 0.0336, RMS 0.00196. Full arrangement peak 0.435 and
no reported render errors. Measurements establish audible, unclipped synthesis;
they do not substitute for a human mix review.

## Checks and limits

- `pnpm check`: formatting, lint and strict TypeScript pass without warnings.
- `pnpm test`: **258 tests in 44 files pass**, including unchanged seven physics
  goldens and 30/60/144 FPS replay checks. No simulation behavior was changed.
- Production `/citadel/` build and **25 native Chromium browser checks pass**.
  Includes full rounds across all layouts, focus/input, mute, rematch, preference
  reload, all quality presets, offline continuation and blocked storage.
- Three focused software-WebGL checks also pass across the initial run and
  corrected-test rerun: full-size bloom/reduced effects, camera/input independence,
  and quality/preferences/offline progress. The new quality test initially hit
  its 60s budget; it now runs the countdown on Low, samples each full preset for
  100ms and allows 180s. Its software rerun takes about a minute. Software rendering
  remains slow; this is functional coverage, not a frame-rate claim.
- [Native sample](reviews/m07/native-performance.json): six seats, human seat 5,
  1280×900, High with music/reflections/bloom, Apple M2 Pro, Chromium 158;
  596 RAF intervals, **16.7 ms median / 16.8 ms p95**, live audio RMS >0.
  This is a ten-second opening sample, not a full-match or low-end-device guarantee.
- [Current real-time gameplay with sound](reviews/m08/desktop-gameplay.mp4),
  [canvas still](reviews/m08/desktop-gameplay.png). No page/console errors in
  [capture report](reviews/m08/desktop-capture.json). The capture records existing
  nonfatal Three.js shadow fallback and Tone scheduling advisories.

Reproduce fixtures with `pnpm dev`, then `node tooling/review-edges.mjs /tmp/citadel-edges`.
Audio: `node tooling/review-music-audio.mjs /tmp/citadel-audio`.
Performance: `node tooling/review-native.mjs /tmp/citadel-native.json`.
Safari/mobile and a full software-WebGL suite remain unverified. Review wall
diagonals during motion, incoming-ball visibility, sparkle restraint and scoring
versus loss feedback. No push, deployment or `gh` usage.

**REVIEW REQUIRED — M07.**
