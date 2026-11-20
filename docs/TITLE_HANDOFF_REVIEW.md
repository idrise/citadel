# Title handoff and transition continuity — 20 November 2026

Try **http://127.0.0.1:5188/**. Wait for the bots to rally, then press Start.
Visible balls accelerate upward with their existing colour, spin and trails.
The bats ease from their visible demo angles into the opening poses over 0.65
seconds. Capsule protection fades out with the handoff, and the arena posts stay
standing when the outline is unchanged. Normal round countdown and physics timing
are unchanged.

This fixes the previous Start path's immediate presentation reset. The owner
approved the result and requested a local commit on 20 November, superseding
the earlier no-commit instruction. No deployment is authorised.

## Other transitions checked and fixed

- Roster changes, Restart, Back/Retry and Next use the same captured visible
  poses. Starting midway through a roster morph continues from that intermediate
  geometry rather than cancelling it or jumping to the destination.
- Visible balls leave during reset transitions and at victory. New balls and
  their ready halos grow into view over 0.16 seconds after a hidden intro/morph,
  rather than appearing in one frame. Outgoing slots remain occupied for the
  0.8-second exit; rapid retargets do not restart the flight or allocate new meshes.
- Restarts with the same outline no longer retract and rebuild standing posts.
  Actual geometry changes still use the existing retract/reshape/rise sequence.
- Capsule protection blends from the captured displayed tint, including retargets.
- Short impact effects finish naturally during an animated handoff. Event IDs
  rebase independently, so new-round effects are still processed immediately.
- Victory fireworks wind down after leaving the result instead of disappearing
  on a mode change. Reduced effects still clears fireworks and replaces the large
  ball flight with a short, stationary shrink; it retains instant actor layout changes.

The changes are presentation-only. The isolated demo still cannot lose capsules,
and Start still uses the untouched normal opening state, seed, stats and progress.

## Rendered evidence

- [Handoff video](reviews/title-handoff/handoff.mp4)
- [Six-seat ball lift-off](reviews/title-handoff/desktop-6-lift.png)
- [Four-seat bat recentering](reviews/title-handoff/desktop-4-recentre.png)
- [Two-seat lift-off](reviews/title-handoff/desktop-2-lift.png)
- [Settled six-seat intro](reviews/title-handoff/desktop-6-settled.png)
- [Restart midpoint](reviews/title-handoff/restart-midpoint.png)
- [Phone-sized lift-off](reviews/title-handoff/phone-lift.png)
- [Renderer report](reviews/title-handoff/report.json)

Captured in Chromium using the Apple M2 Pro Metal renderer. The reviewer installs
`installVirtualBrowserControls` before opening the game. Its screenshots include
2/4/6 seats and a phone-sized viewport; no native pointer lock/fullscreen or system
mouse movement is used. The video is an H.264 transcode of the recorded canvas
WebM, padded to preserve the aspect ratio when the viewport changes.

## Validation

- `pnpm check`: formatting, lint and strict TypeScript pass.
- `pnpm test`: 751 tests across 128 files pass. New coverage checks exact first-frame
  bat poses and tint, interpolation/freeze/completion, Start during an unfinished
  morph, standing posts on same-outline resets, outgoing ball position/colour/spin/
  trails, rapid retargets, incoming ball/halo reveal and natural fireworks decay.
  Projection checks cover outgoing balls at every arena vertex for 2/4/6/16 seats
  in portrait, landscape and desktop: balls clear the camera before recycling.
- `pnpm build`: passes with the existing JavaScript chunk-size advisory.
- `PLAYWRIGHT_RENDERER=hardware PAGES_BASE_PATH=/ pnpm exec playwright test tests/title-demo.spec.ts tests/title-preview.spec.ts tests/scene-ui.spec.ts --workers=1 --timeout=120000`:
  all 13 checks pass in 28.6 seconds, including a real seeded win/fireworks/rematch,
  Start and Restart at 2/4/6 seats, interrupted roster morphs and opening-seed isolation.
- `PLAYWRIGHT_RENDERER=hardware PAGES_BASE_PATH=/ pnpm exec playwright test tests/early-loss.spec.ts --grep 'an eliminated player' --workers=1 --timeout=120000`:
  both real-elimination Back/Retry flows pass in 15.7 seconds. Total: 15 native-GPU
  browser checks passed for this follow-up.
- `node tooling/review-title-handoff.mjs`: completes with no page errors or
  saved-progress changes; reviewed the rendered lift-off and bat handoff captures.
- `git diff --check`: passes.

Physical iPhone/Safari is untested. Browser verification used the native GPU;
the software-renderer timeout limits recorded in the earlier title-demo review
were not rerun for this amendment. Local commit approved; no push or publication.
