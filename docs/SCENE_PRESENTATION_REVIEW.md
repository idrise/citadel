# Scene title, victory and shot feedback

## Camera-relative title amendment

The owner approved the title geometry and requested a darker background and fixed
placement when changing player count. `2318be7` moves the solid lettering/buttons
into a separately lit, camera-mounted 3D foreground. Its perspective and responsive
layout are independent of the arena camera's fit, rotation and polygon size. The
same foreground camera projects the invisible accessible click targets.

The title's world background uses 0.14 linear gain while the foreground retains
its neon brightness. Starting play smoothly restores normal world gain; reduced
effects uses the direct renderer with a black veil and immediate transitions.
Gameplay and victory retain normal brightness. The foreground is composited after
the world and does not appear in the arena's floor reflections.

Current screenshots: [2 players](reviews/m08/anchored-menu/title-2.png),
[4](reviews/m08/anchored-menu/title-4.png), [6](reviews/m08/anchored-menu/title-6.png),
[reduced effects](reviews/m08/anchored-menu/title-reduced.png),
[narrow window](reviews/m08/anchored-menu/title-narrow.png),
[restored gameplay brightness](reviews/m08/anchored-menu/gameplay.png).

[Native layout report](reviews/m08/anchored-menu/layout.json) records identical
rectangles for every control at all five player counts, repeated plus clicks at
the same pixel, idle camera movement and successful Start capture. At 1280×900,
Start remains **x505, y298, 271×49 px**. No page errors. Unit checks also cover
different camera poses, responsive bounds and brightness restoration.

Current validation: **280 unit tests / 48 files**, **27 production native Chromium
checks**, Vite+ check and `/citadel/` build pass. Initial JS is 919.17 kB / 253.66 kB
gzip; the existing large-chunk warning remains. No physics, sound, pacing or input
rules changed. Local commits only; no push or deployment. Current title screenshots
supersede the earlier world-anchored title placement below. The earlier winning
movie remains evidence of the preceding victory/music flow. Review remains pending.

11 November 2026 · **Awaiting review — M07 / M08**. This supersedes the previous
DOM landing/result presentation. The user explicitly chose to keep advanced
settings in Pause. M06 pacing and M09/mobile remain unstarted.

## Play and finish in the arena

**CITADEL** is original angular, bevelled, extruded geometry floating above the
arena. It uses the wall's neon edge shader and appears in the floor reflections.
The − / + controls select **2–6 players**, with disabled end limits; **START** is
a solid scene button. Shapes are generated from authored stroke paths, with no
font file, artwork texture or image atlas.

The visible title, count and results are rendered in Three.js. Invisible semantic
button targets project from the same 3D buttons, keeping pointer/keyboard access
aligned under the live camera and window resizing. Their positions use whole
CSS pixels to avoid subpixel target jitter. React retains the requested compact
Pause settings and nonvisual status; active play has no visible HUD.

A human victory leaves the arena visible, eases the framing upward and launches
neon fireworks. Solid shards and batched outlines use the same custom shader;
four pooled bursts hold up to 28 shards each, with two draws per burst per render
pass. Lower quality reduces the shard budget. Bursts continue for roughly nine
seconds; **YOU WIN** emerges and **AGAIN** becomes available after 3.5 seconds.
A bot victory shows **ROUND OVER** in the scene. Neither result opens a popup.

The rules still finish immediately and cannot score again. Camera/effects/audio
use presentation clocks afterward. Pause freezes the celebration; returning from
settings preserves free mouse control for scene buttons. Reduced effects shows
the static outcome with immediate controls and suppresses fireworks. Restart
retains the opening seed; Again advances it and returns to the title.

Screens: [2 players](reviews/m08/scene/title-2.png),
[4](reviews/m08/scene/title-4.png), [6](reviews/m08/scene/title-6.png),
[fireworks](reviews/m08/scene/fireworks.png),
[scene result](reviews/m08/scene/victory.png).
Watch the [native winning sequence with sound](reviews/m08/scene/victory.mp4).

## Whose shot, and which sound?

The default fortress is **Coral**, distinct from the arena's cyan. Each active
ball's body, occluded ghost and trail use the last striker's colour. The same
read-only observer supplies audio credit and personal statistics; wall banks keep
ownership and real launches/returns change it. A ready revenge ball displays its
recipient's colour. Spin keeps its rotating directional bands.
[In-play ownership frame](reviews/m08/scene/owned-ball.png).

The unreliable enemy sound had a concrete cause: bot-only/unknown breaches were
routed as quiet ricochets and could be swallowed by the wall-sound throttle.
**Every enemy capsule break now has an independent FM fracture/crack cue**, even
when another bot owns the ball. Human-credited attacks add rising notes and a
cheer; own damage retains the stronger falling vowel. Outcome sounds receive
priority in dense queues. Simultaneous breaks within one 32nd share a bounded
gesture; an unrelated wall tick cannot suppress it.

[Enemy break audition](reviews/m08/scene/enemy-break.mp3) and
[live audio report](reviews/m08/scene/breach-audio.json): eight native auditions
cover score/loss/neutral enemy/overlap for human seats 0 and 5. Neutral-break peak
window RMS is **0.0125**, with no audio failure or page errors. The review fixture
uses actual rule events and the live session/engine, with the score silent to
expose missing feedback; it is separate from the natural-match capture.

Winning also gets a finite closing musical phrase, with up to six seconds for
the tail. A cheer plays for winning even if the final rival hit itself. Mute,
focus loss, Pause and teardown can still cut the outro immediately.

## Checks actually run

- `pnpm check`: formatting, lint and strict TypeScript pass without warnings.
- **278 unit tests in 48 files pass**. Includes solid lettering/depth, projected
  controls, count limits, delayed rematch, pooled neon fireworks/pause/reduced
  mode, ownership colours, independent breach throttles, dense cue priority and
  the finite victory score. All existing physics goldens remain unchanged.
- **27 production native Chromium checks pass** in the full run. The two scene
  checks also pass after the final framing amendment, covering victory settings /
  return without pointer recapture. Other checks retain all-layout rounds/rematches,
  bank reach, mute/focus, preference reload, local export and offline continuation.
- A real-time **35.96s** two-seat Standard match, seed 2026, human seat 0, High
  effects/music on, reaches a human win through normal idle input. No state edits
  or emulated clock. [Actual export](reviews/m08/scene/winning-round.json): five
  pieces remain, 12 human returns, four credited rival breaks and zero collision
  caps. Rival self-hits are not falsely credited to the human. This is scripted
  regression evidence, not a human fun or pacing study.
- [Native scene log](reviews/m08/scene/live-scene.json): shot ownership changes,
  no page errors, audible post-win coda (RMS about 0.003 at 2–3.5s), then silence
  after the tail. The movie records the last part of that actual match and its
  continuing celebration. No visible result popup appears.
- [Native performance](reviews/m08/scene/native-performance.json): six seats,
  human seat 5, 1280×900, High, music/reflections/bloom on, M2 Pro / Chromium 158;
  597 intervals, **16.7ms median / 16.7ms p95**, audible output, no page errors.
  This ten-second opening sample is not a full-match or low-end-device guarantee.
- Production `/citadel/` build passes: initial JS **917.93 kB / 253.20 kB gzip**;
  lazy audio **274.64 kB / 67.35 kB gzip**. Existing >500 kB chunk warning remains.

An initial win-test read waited on the removed final ball; a non-waiting DOM
snapshot fixes that harness issue. A native review also exposed continuously
moving fractional hit rectangles; pixel alignment fixes native activation. The
final native capture and production checks exercise the corrected interaction.
Full software-WebGL, Safari/mobile and external tester sessions remain pending.

Reproduce with `pnpm dev`, then
`node tooling/review-scene-victory.mjs /tmp/citadel-victory`,
`node tooling/review-breach-feedback.mjs /tmp/citadel-breaches`, or
`node tooling/review-native.mjs /tmp/citadel-native.json`.
Review media are exports only, never game assets.

Checkpoints: `551f559` breach reliability; `643f704` scene UI/ownership;
`6727aac` musical finish, native controls and eased victory framing. No push,
deployment or `gh`. The separate AGENTS edit remains unstaged. Judge title
legibility, fireworks restraint, colour readability and the break/cheer balance
in play before approving.

**REVIEW REQUIRED — M07 / M08.**
