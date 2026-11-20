# CITADEL teaser and screenshots

- **Video:** [citadel-teaser-v4-1080p60.mp4](citadel-teaser-v4-1080p60.mp4),
  1920 × 1080, 60 fps, 38.82 seconds, stereo AAC, fast-start H.264.
- **Screenshots:** three 2560 × 1440 PNGs: [two-player duel](citadel-01-two-player.png),
  [curved hit](citadel-02-curve-shot.png), and [sixteen-player arena](citadel-03-sixteen-players.png).
- **Download:** [all three screenshots](citadel-screenshots.zip).

## The edit

| Time       | Footage                                                                      |
| ---------- | ---------------------------------------------------------------------------- |
| 0–7.1s     | Actual title screen, slowly pushing toward CITADEL                           |
| 7.1–14.1s  | Active two-player duel, including three capsule breaks                       |
| 14.1–17.6s | A single-ball curved return that breaks a capsule, shown at 75% speed        |
| 17.6–21.2s | Level 100 starting with one capsule: five eliminations and board reshaping   |
| 21.2–28.2s | Sixteen-player arena, with ten capsule breaks in the selected sequence       |
| 28.2–35.3s | Normal three-capsule level 100, reaching sixteen balls and four eliminations |
| 35.3–38.8s | Return to the game's title; no added captions                                |

The one-capsule level-100 setup was requested specifically for the transition
shot. It changes only that capture fixture; the game keeps its normal starting
health. The transition take moves from ten survivors to five, with board morphs
active for 197 of its 212 frames. The regular level-100 match uses its normal
twelve-player starting roster; the excerpt shows its later sixteen-ball pressure.

The curve highlight comes from unmodified seeded bot play (level 63, seed 1),
not an authored ball position. Its 1.46 rad/s curved return is tracked through
the actual capsule hit. A brief slowdown makes the flight and break readable;
music and sound effects keep their normal pitches.

## Look and sound

Capture uses the game's High renderer at a 1280 × 720 Retina viewport with
pixel ratio 2, producing 2560 × 1440 source frames. The original export used
pixel ratio 1 and omitted the score-driven light pulses. Those differences are
corrected: the real score's kick/pad envelopes now drive the game's bloom and
exterior grid on one continuous clock. No bloom power or game shaders were
changed. A [matched comparison](review/render-parity.png) shows the running game
on the left and the capture renderer on the right. Source sRGB transfer metadata
is retained in the video encoding.

One separate, uninterrupted render of the game's original soundtrack spans the
whole video. Gameplay clips contribute their original event sound effects and
paddle swishes, reconstructed from the captured simulation timestamps. No
Settings panels or added promotional text appear.

Both audio stems render at 48 kHz. This fixes the first export's mixed-rate
cached-wave bug, which had produced an additional detuned synth voice. Actual
synth probes and the exported score are checked against their intended pitch.

The opening's clap-like sound came from dynamic loudness normalisation boosting
the quiet hi-hat intro roughly 35 dB more than the later track. The final mix uses
fixed gain and a peak limiter with automatic makeup gain disabled, preserving
the original quiet intro. `levels-check.json` compares its intro/groove balance
with the source score and rejects an excessive boost.

## Reproduction

With a local Vite server on port 5190:

```sh
node tooling/capture-teaser.mjs http://127.0.0.1:5190 /private/tmp/citadel-teaser-v4-work
node tooling/refresh-teaser-audio.mjs http://127.0.0.1:5190 /private/tmp/citadel-teaser-v4-work
node tooling/assemble-teaser.mjs /private/tmp/citadel-teaser-v4-work artifacts/citadel-teaser
```

`--shot=curve-left`, `--shot=level100-intro` and `--shot=end` support individual
shot revisions. Replacing one shot also updates its recorded events; refresh
the audio before assembling. `--preview` captures framing samples. Raw clips
and separate stems remain outside the repository in the temporary work folder.

This is deterministic frame capture, not a real-time device performance result.
Browser controls remain document-local, without native pointer lock, fullscreen
or the system mouse. Production game code, saved progress and preferences are
unchanged. These assets were captured from 1.0.0, before the 1.0.1 patch-version
bump. Committing the media does not publish it to itch.io or deploy the game.

## Validation

All 782 unit tests across 134 files pass, along with `vp check` and `vp build`.
The build retains its existing large-chunk advisory. The final movie fully
decodes and has 2,329 frames at 60 fps, sRGB transfer metadata and 48 kHz audio.
The actual-synth pitch regression and full exported-score probe pass. The
intro's relative level differs from the source by only 0.42 dB. Final sampled
frames, board transitions, render parity and all three screenshots were
visually reviewed. Capture reports record no browser errors or collision caps.
