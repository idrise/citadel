# Remove the synthetic crowd — 17 November 2026

The owner reports never hearing the crowd and considers its cost unjustified.
The crowd graph is removed completely, including cheer cue generation,
conductor bookkeeping, its score-ducking bus, and the unused vowel-shape code.
There is no dormant crowd bank or mute-only replacement.

This deletes four banks of six main FM voices and their 24 continuously started
vibrato LFOs, 72 formant filters plus four air filters, four whistle FM voices,
noise/clap paths, panners and crowd delay. Native inspection confirms total graph
filters fell from 96 to 20, stereo panners from 31 to 6, wave shapers from 28 to 3
and delays from four to three. These are native node-type counts, not a claim
that every inspected object was continuously doing audible work.

Damage still plays through the existing drum voice. Wall/paddle impacts,
breaches, success, victory, elimination, serving and arrivals keep their existing
voices, timing and mix ownership. The music no longer ducks for a removed crowd
cue or personal loss. Kick/bass ducking, score breath/open, the authored score,
ball layers, victory outro, independent volumes and 200 ms music look-ahead
remain. No gameplay or progression code changed.

## Matched resource checks

Two isolated production captures on the same M2 Pro use the same six-seat
four-ball seeded fixture, 1080×580 viewport, 32 kHz native context and 256-frame
(8 ms) callback buffer. Each pass measured thirty simulated seconds, so these
are shortened developer comparisons, not full sixty-second baselines. Inspector
sampling and normal system variation affect individual values.

| Pass             | Sampled capacity median before → after | Sampled capacity p95 before → after |
| ---------------- | -------------------------------------- | ----------------------------------- |
| High graphics    | 18.8% → 9.9%                           | 26.0% → 14.2%                       |
| Drawing disabled | 16.9% → 12.0%                          | 56.6% → 36.1%                       |

All before/after passes completed with identical final simulation state, zero
late music steps, zero recorded native underruns and no page/protocol errors.
The remaining graph is measurably smaller and these Mac samples show lower load.
The original Windows stutter still needs affected-device verification; removing
this graph is not proof that every native-output problem is resolved.

Compressed raw captures and readable summaries are in
[reviews/crowd-removal](reviews/crowd-removal/). The before capture identifies
`96221715a88c41d9`; the after capture identifies local input `d5e9c788112a6337`.
An additional development-entry-path fix changes subsequent build identity but
not audio behaviour: Vite's dependency scanner now receives absolute HTML entry
paths, matching the production build's intended entries.

## Audio and regression checks

- Full unit suite: 618 tests passed. Added bus-routing tests verify retained
  damage, impact, success/victory, arranged/event answers, mix controls,
  kick ducking, score breath/open and resource teardown.
- Real native-clock rule-event auditions cover scored damage, own damage,
  rival-only damage and overlapping losses for human seats 0 and 5. All eight
  cases stayed playing, exceeded the existing audibility threshold and emitted
  no browser errors. Representative [success](reviews/crowd-removal/success.webm)
  and [damage](reviews/crowd-removal/damage.webm) recordings are retained.
- Five native Chromium browser checks passed for actual music output,
  pause/resume/mute, restart teardown, unavailable audio, ball layering,
  persisted settings and touch rotation.
- The initial offline validation flagged success because its old whole-clip RMS
  threshold averaged a brief cue across 4.5 seconds of mostly silence. Added a
  tested 100 ms peak-window RMS measurement for that transient; the sound itself
  keeps its existing volume. Tests distinguish sustained cues from isolated
  clicks, handle stereo power and reject invalid samples.
- All ten offline auditions passed: drums, bass, melody, full/no-hit score,
  isolated success/loss, mixed success/loss and ball layers. Full-mix peak was
  0.405 (no clipping); the success cue passed the short-window check without a
  volume change. Tooling no longer requires a deleted crowd stem. Historical
  crowd exports remain archived and are marked superseded in the music review.

`vp check`, root/project production builds and the Pages-path browser smoke passed; the existing large-chunk
advisory remains. The development server's earlier dependency-scan entry error
was corrected while bringing up the audio audition. No push or deployment is
part of this local change; the original Windows input is not committed.
