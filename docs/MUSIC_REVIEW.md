> Latest musical follow-up: [returning original melody and subtle bar colour](MOTIF_RETURN_REVIEW.md).

# Music detour — play builds the arrangement

Status: **Accepted for now**, 11 November 2026: the user requested M05. This revision follows the request
for a stronger connection between play, layered instruments and musical effects.
The latest opening direction supersedes the earlier immediate kick/melody:
**muted hats → snare and hints → driving kick → build and drop**.
M03/M04 are approved to advance; full M07 remains unstarted.

## Hear the changes

- [Full adaptive audition](reviews/music/interactive/adaptive-preview.mp3): 74s,
  including the new opening, ball-count progression, quantised hits and breaches.
- [One → two → three → four balls](reviews/music/interactive/ball-layers.mp3): the
  same four-bar groove repeats with successive orchestration tiers, changing
  every **7.06s**. This comparison deliberately skips the intro to isolate layering.
- [FM crowd cheer alone](reviews/music/interactive/fm-cheer.mp3).
- [Actual gameplay with audio](reviews/music/interactive/gameplay-layers.mp4): a
  25s excerpt from a live run. This review run used the existing **10s ball interval**
  to exercise the layers sooner; the game's default remains 15s.

Reload the local game and press **Play**. Settings retains Music, volume and Beat
lighting controls. Reduced effects disables beat lighting. No recorded audio
assets are loaded by the game; all linked files are review exports.

## Research and the chosen approach

The useful combination is **vertical layering** (different instruments following
play), **musical stingers** (short event reactions) and entries at musical
boundaries. These are established adaptive-score techniques covered in
[Berklee's game-audio curriculum](https://online.berklee.edu/courses/game-audio-production-with-wwise).
A shared harmonic progression keeps added parts compatible rather than stacking
unrelated loops. The existing DJ-style section journey remains the backbone.

For the crowd, [UCSD's FM-vocal material](https://msp.ucsd.edu/syllabi/171.13w/06/assignment6.htm)
describes formant peaks and small pitch variation. This prototype uses FM
excitation plus moving vowel filters, staggered onsets and stereo positioning:
an electronic audience texture rather than recorded people or speech.

## What play now contributes

| Balls | Added orchestration                                                                        |
| ----- | ------------------------------------------------------------------------------------------ |
| 1     | Core plucked theme, bass/sub and staged percussion; quiet pads in melodic passages         |
| 2     | A warm triangle/organ-like harmony following the lead, plus pad entries in sparse passages |
| 3     | High FM arpeggios and a resonant square/acid counter-line with interlocking offbeats       |
| 4     | FM brass chord stabs and upper harmonic colour                                             |
| 5–8   | Retain the four bounded instrument families rather than allocating more voices per ball    |

New tiers enter at the **next bar boundary**, up to about 1.76s later at 136 BPM.
An arrival plays an eighth-note-aligned chord cue. Harmony notes are selected
from the current chord, generally a third/fifth below the theme; they are not a
single fixed transposition. The bass, counter-line and brass use different
rhythmic slots and registers.

Your returns still grow a sixteen-note phrase. Four-hit streaks add ghost
percussion; eight add higher responses; twelve add brass fills. These performance
fills can preview a colour before its full ball-count layer arrives. Damage
removes that defender's phrase/performance parts while the authored song and
ball-count layers continue. The leading living phrase takes over after human
elimination. This gives both personal performance and arena pressure a role.

## Impact timing and breach reactions

The audio scheduler supplies an anchor containing audio time and musical step.
Event sounds use that same grid, including after Resume:

- A bat's main FM note snaps forward to the next **32nd**, with **5–60ms** of
  scheduling delay at this tempo, plus device output latency. If it would wait
  more than 25ms, a tiny quiet contact tick sounds after 5ms to retain immediacy.
- Strong human hits get a quieter harmonic answer on the next **eighth note**.
  Main notes and answers fit the harmony at their actual playback position.
- The downward breach impact uses the short grid. The audience swell starts on
  the next eighth, within roughly **226ms** including the scheduling margin.
- The crowd is **two banks of six FM voices**, with upward pitch gestures,
  vibrato, moving vowel resonances, staggered starts, breath/noise and a faint
  whistle. Close breaches share a swell (at most one every two beats), keeping
  multiball from creating an unbounded crowd. The score ducks to 65% briefly
  under it. It is triggered by **actual piece damage**, not merely crossing a rail.
- The final breach gets a two-second result tail. The game declares victory
  immediately; only the audio continues. Mute and Restart can still cut that tail.

Musical sounds may wait briefly; **the collision, input, ball, health change and
result never wait for audio**. Music still only reads game events and a summary.

## The opening and drop

| Time from music start | Arrangement                                                         |
| --------------------- | ------------------------------------------------------------------- |
| 0–3.5s                | Muted pink-noise hats; live gameplay can already add notes          |
| 3.5–7s                | Snare joins, with sparse melodic/bass hints                         |
| Around 7s             | Driving kick and groove enter                                       |
| 14–21s                | Melodic breakdown with space for harmony and active game layers     |
| 21–28s                | Filter/noise rise, denser snare roll and a one-beat breath          |
| Around 28s            | Full drop; orchestration reflects the current balls and performance |
| Afterwards            | Melodic sections, longer builds and subsequent drops continue       |

Bloom/grid waves remain on the audio clock, with the existing separate toggle
and reduced-mode suppression. No new camera, input or gameplay coupling was added.

## Checks and evidence

- `pnpm check`: formatting, lint and strict TypeScript pass without warnings.
- **193 unit tests in 31 files pass**, including bar-bound layer changes, chord
  tones, subdivision timing/delay bounds, pause/resume anchors, crowd coalescing,
  phrase resets, result tail/mute and simulation identity. A regression case
  prevents two coincident performance/pressure hats from retriggering one mono voice.
- **15 production Chromium browser tests pass** on the host GPU. They include
  actual output/silence, pause/mute/resume, cleanup, audio failure, full round/rematch,
  and a new real-time check that the second ball introduces the second music tier.
- Pages build passes: initial chunk **884.57 kB / 241.70 kB gzip**, lazy music
  chunk **271.65 kB / 66.53 kB gzip**. The existing large-game-chunk warning remains.
- The real-time recording reached tiers **1, 2, 3, 4** as balls arrived, with no
  page errors. [Run log](reviews/music/interactive/live-stats.json).
- Full/no-hit mixes, core stems, the layer comparison and crowd alone rendered
  through the synth graph with no page errors or PCM clipping. Melody and bass
  in the groove are within 3dB of drums; the crowd has its own nonzero-output
  threshold. [Audio report](reviews/music/interactive/audio-stats.json).

Reproduce while `pnpm dev` is running:

```sh
node tooling/render-music-preview.mjs /tmp/citadel-adaptive.wav
node tooling/review-music-audio.mjs /tmp/citadel-audio-review
```

Noise synthesis varies between renders; musical logic and game replays remain
repeatable. These output checks do not substitute for subjective listening.
The FM audience is intentionally stylised; its vowel/mix character remains a
review choice. Bluetooth latency calibration, mobile/Safari and the complete
software-WebGL suite remain unverified. The known Tone lazy-voice scheduling
warning and Three shadow-mode deprecation remain; neither caused page errors.

Implementation checkpoint: `fbc2499`. No `gh`, push or deployment was performed.
At that checkpoint AGENTS and the M05 note remained unstaged; M05 now incorporates
the layout note. Older club-only
exports are archived under `reviews/music/club`; use the interactive auditions above.

**Accepted for now; further music refinement remains open.**
