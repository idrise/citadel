# Live title-screen experiment — 20 November 2026

The title screen now plays an independent all-bot match behind CITADEL and the
existing Start/Settings controls. Every fortress, including the foreground seat,
uses permanent capsule protection. Balls rebound from the actual protected
capsules; no damage, eliminations, repairs or round resets are needed to keep it
alive. Capsules use a steady version of the existing protection tint.

Try it at **http://127.0.0.1:5188/**. Leave it on the title for a while, open and
close Settings, then press Start. Judge whether the motion feels welcoming and
whether the lettering and buttons remain easy to read. The owner approved the
demo and smooth handoff and authorised a local commit on 20 November. This
does not approve or advance a milestone.

## Evidence

- [Desktop, two seats](reviews/title-demo/desktop-2.png)
- [Desktop, four seats](reviews/title-demo/desktop-4.png)
- [Desktop, six seats and three balls](reviews/title-demo/desktop-6-rally.png)
- [Phone-sized viewport](reviews/title-demo/phone-6.png)
- [Video](reviews/title-demo/title-demo.mp4) / [original WebM](reviews/title-demo/title-demo.webm)
- [Renderer and review report](reviews/title-demo/report.json)

Screenshots and video use the Apple M2 Pro Metal renderer in Chromium, with the
same document-local virtual input hook used by browser tests. The phone image
is a resized browser viewport, not a physical iPhone test. The review recorded
no page errors and no saved-progress changes.

## Behaviour and tuning

- The demo shares the selected roster, arena shape and bat profile. All seats
  run the existing bots. It starts with one ball and adds another every eight
  playing seconds, capped at three, with a base speed of 24 world units/second.
  Existing rally acceleration remains active. Pickups stay off so the original
  three-capsule formations remain readable.
- `session/title-demo.ts` owns its match, fixed clock and observer. The actual
  opening state, gameplay RNG, stats and progress recorder do not advance while
  the title demo runs. Start keeps the existing intro, seed and normal vulnerable
  capsules; event IDs restart while outgoing presentation effects finish naturally.
  See the [smooth handoff follow-up](TITLE_HANDOFF_REVIEW.md) for ball lift-off,
  bat recentering and the wider transition audit.
- Demo events animate impacts and ball colours without feeding gameplay audio
  or music. The title remains silent and never captures input on its own.
- Settings, hidden tabs and unfocused windows freeze demo simulation. Suspended
  time is discarded. The camera stays steady rather than following the foreground
  bot; Start/Settings targets remain fixed during roster transitions.
- Normal two-second protection after real damage is unchanged. Only the isolated
  demo receives an infinite protection deadline, rendered as a finite steady tint.

## Validation

- `pnpm test`: 741 tests pass across 127 files, including 90-second demo runs for
  2/4/6/16 seats, a forced physical capsule hit, immutable opening state, independent
  deterministic demos, pause backlog handling, finite protection rendering and
  live-title transition coverage. The sixteen-seat longevity case exceeded the
  initial five-second runner limit; its explicit timeout is now 30 seconds and
  all assertions pass.
- `pnpm check`: formatting, lint and TypeScript pass without warnings.
- `pnpm build`: production build passes with the existing chunk-size advisory.
- `PLAYWRIGHT_RENDERER=hardware PAGES_BASE_PATH=/ pnpm exec playwright test tests/title-demo.spec.ts tests/title-preview.spec.ts --workers=1 --timeout=120000`:
  all seven checks pass in 15.6 seconds, covering the new demo and existing title
  transitions, fortress clamping, independent pickup seeds and same-roster Settings.
- Default software rendering: all three new demo checks pass; the four older
  preview checks exceed their existing 30-second limits while advancing the fake
  clock or taking screenshots. Those same checks pass on the native GPU above.
  The software-renderer time limits remain a validation limitation.
- `node tooling/review-title-demo.mjs`: native Metal 2/4/6-seat and phone-sized
  captures plus a 26-second video, with no page errors or saved-progress changes.
  The MP4 is a local H.264 transcode of the recorded canvas WebM using ffmpeg.
- `git diff --check`: passes. No browser test used native capture/fullscreen APIs
  or moved the system mouse.

Physical phone performance and Safari remain untested for this experiment.
The local commit is authorised; no push, deployment or platform submission is
authorised or performed.
