# M07 corrections — corner caps and breach sounds

11 November 2026 · awaiting user review. Addresses the owner's report that cuboid
end caps were unrotated, own damage was inaudible and enemy breaches still sounded
like a disappointed bend. Supersedes the earlier M07 breach auditions.

## Corner caps

Posts previously kept a world-axis rotation while polygon walls rotated. Their
diagonal now follows each corner's bisector: faces align at right angles and
share the angle at other polygon corners. Setback follows the rotated footprint,
keeping posts outside both physical wall planes. Retraction follows changing
corners during a morph. Collision geometry is unchanged.

Current native frames: [two players](reviews/m07/corrections/2-caps.png),
[four](reviews/m07/corrections/4-caps.png), [six](reviews/m07/corrections/6-caps.png).
Compare the earlier [six-seat caps](reviews/m07/edges/6-after.png). Six unit cases
cover every layout at three rotations plus an actual six-to-five morph, checking
diagonal alignment and mesh clearance throughout.

## Loss versus success

- **Your loss:** falling electronic vowel, stronger impact and a higher audible
  register. The earlier isolated loss RMS was 0.00196; the revised cue is around
  0.015. The falling bend belongs here.
- **Your credited score:** ascending FM notes and an opening, rising crowd vowel.
  Root/fifth/octave voices sit in a lower vocal register; noise, two claps and a
  whistle add an audience texture. Both pitch and vowel resonances rise, avoiding
  the former closing-vowel drop.
- Both briefly lower the arranged music so feedback can be heard over the drop.
  Separate loss/cheer pools prevent old falling automation colouring a later
  cheer. Simultaneous losses coalesce into a bounded audible gesture; scoring
  still has its own response. Pause/mute remain effective.

Listen to **native output through the live music session**:
[your score](reviews/m07/corrections/success-live.mp3) ·
[your loss](reviews/m07/corrections/own-loss-live.mp3).
Also audition them against the four-ball drop:
[score in music](reviews/m07/corrections/success-mix.mp3) ·
[loss in music](reviews/m07/corrections/own-loss-mix.mp3).
These recordings are review exports, never runtime assets. No gameplay timing,
health, ball speed, spawning, attribution rules or RNG changed.

## Verification

- **272 unit tests / 46 files pass**, including actual rule-generated score/loss
  routing for all six human seats, rising versus falling contours, simultaneous
  loss/cheer scheduling and corner geometry. Physics goldens are unchanged.
- Vite+ formatting/lint/types and the production `/citadel/` build pass. Existing
  large-chunk warning remains. Initial JS 907.71 kB / 249.30 kB gzip; lazy audio
  273.70 kB / 67.14 kB gzip.
- Five focused production native Chromium checks pass: audio unlock/audibility,
  pause/mute/restart, audio failure fallback, added-ball layering, bloom/reduced
  rendering and camera/input independence. The full 25-check run belongs to the
  preceding M08 handoff; it was not unnecessarily repeated for this amendment.
- [Live report](reviews/m07/corrections/live-audio.json): actual launch/damage rule
  events through the observer, music session, conductor and native Tone engine;
  human seats 0 and 5, success/loss/mixed breaches. All six auditions have peak
  window RMS **0.033–0.037**, running audio contexts, `playing` status and no page
  errors. The arranged score is silent to expose missing event output. This is a
  deliberate rule fixture, not a recording of human play or full collision/input flow.
- [Offline DSP report](reviews/m07/corrections/audio-stats.json) covers the full
  arrangement, isolated cues and four-ball mixed auditions, with no clipping or
  browser errors. Human listening remains the review gate.

Reproduce with `pnpm dev`, then
`node tooling/review-breach-feedback.mjs /tmp/citadel-breaches` and
`node tooling/review-music-audio.mjs /tmp/citadel-audio`.
The live recorder sums sources feeding the owned native destination, rather than
mistaking Tone's separate silent destination output for the complete mix.

Reload the local game before comparing; an already-created audio graph must be
replaced to use the revised instruments. Corner checkpoint: `7e425f2`; sound and
live-review checkpoint: `a5a9f96`. Local
commits only; no push, deployment or `gh`. The user's AGENTS edit remains unstaged.

**REVIEW REQUIRED — M07 / M08.**
