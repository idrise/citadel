# Music detour — dark, driving synth techno

Status: **Awaiting review**, 11 November 2026. This is a user-authorised detour
from the M03/M04 review, drawing a first music pass forward from M07. It does
not approve those milestones or complete the full M07 sound/presentation gate.

## Listen and play

Reload the game, then **Play**. Music starts with that click. **Settings → Music**
mutes it, and **Music volume** sets its level (default 45%). Settings survive
Restart, Rematch and fortress changes in the current page. Pause, focus loss and
capture loss silence the soundtrack; Resume continues its musical position.
Restart/Rematch create a fresh composition and close the old audio context.

[Listen to the 34-second preview](reviews/music/preview.wav). This review fixture
uses the same synth voices and director as the game: scripted hits grow a melody,
a loss at about 15.65s strips it back, and the first global drop arrives around
27.83s. It is an audition, not a recorded human playtest. The game never loads
this WAV or any other recorded music/sample asset.

## Musical behaviour

- Tone.js **15.1.22**, lazy-loaded after Play, with a separate TypeScript director.
  The sound is synthesised kick, filtered saw bass, metallic FM lead/accents,
  sparse high harmony and noise hats, with light delay, compression and limiting.
- **138 BPM**, four-on-the-floor kick, D-minor-pentatonic pitch palette. Each
  paddle hit plays a short live accent without waiting for the next grid point.
  Successful returns extend that defender's phrase up to sixteen notes; later
  hits revise the existing phrase. A seven-note phrase repeats independently
  over the four-beat rhythm. Shot direction helps select the pitch.
- Your phrase leads the arrangement; bots contribute quieter live accents and
  keep their own bounded phrases. After human elimination, the strongest living
  phrase becomes the focus. Damage resets only the damaged defender's phrase
  and plays a falling synthesized impact; the underlying beat continues.
- Four-hit streaks bring bass/hats, eight-hit streaks add sparse high responses.
  Separately, elapsed match time and ball count increase global musical energy.
  A four-bar percussion build and one-beat breath precede each **16-bar drop**,
  so hearing a drop does not require a sixteen-hit streak. Tempo remains fixed.
- Live hits use a separate bounded voice pool from sequenced lead/harmony, so
  look-ahead scheduling does not hold a collision accent behind future notes.
  Live accents are scheduled 5ms ahead of the audio context, plus normal device
  output latency. Desktop synthesis is bounded to six live-hit voices, four
  damage voices and one voice for each sequenced instrument.

## Beat-driven rendering

Kick scheduling records audio-clock timestamps. The renderer reads a bounded
attack/decay envelope on that timeline, so scheduling a future kick does not
flash the scene early. This is not an animation-frame beat timer.

- Bloom strength breathes from **0.25 up to 0.31**, without changing bloom radius
  or exposure. Exterior grid lines brighten by at most **12%**.
- The envelope rises over 12ms and decays over about 140ms. There are no camera
  kicks, shakes, geometry scaling or ball/paddle colour changes from the music.
- Mute, zero volume and audio failure suppress the pulse. Reduced effects
  suppress it completely and retain the existing direct rendering path.
- Reviewed [rest](reviews/music/beat-rest.png) and
  [kick pulse](reviews/music/beat-peak.png) at the same fixed arena/camera pose.
  The captured pulse was 0.684; mean pixel change was about 0.86/255. Reduced
  beat-on/off PNGs were byte-identical. [Measured data](reviews/music/visual-stats.json).

**Music never controls gameplay.** It only receives match events and a small
read-only summary; no music setting, cue, beat, build or drop enters match
options, simulation, bot choices, input or spawning. In particular, the proposal's
ball convergence and faster gameplay at a drop were deliberately omitted in
accordance with the user's explicit constraint.

## Validation

- Vite+ formatting, lint and strict TypeScript checks pass without warnings.
- **176 unit tests in 28 files pass**, including phrase growth/reset/cap, per-seat
  focus, deterministic musical cues, independent global drops, lifecycle races,
  unavailable audio, pause/mute and beat bounds. A 2,400-tick comparison produces
  an identical authoritative match while the music director and beat lights react.
  Audio settings are also explicitly excluded from simulation options.
- **14 production Chromium browser checks pass** on the host GPU. The audio
  checks tap the actual output through an analyser: no context before Play,
  nonzero audio while playing, silence after pause/mute, resume, closed contexts
  after Restart, persisted settings, and captured gameplay with unsupported audio.
  The existing full-round/rematch, controls and Pages-path checks still pass.
- Pages build passes: initial game chunk **879.74 kB / 240.00 kB gzip**, music
  chunk **256.45 kB / 63.16 kB gzip**, loaded on demand. The existing large-game-
  chunk warning remains.
- Offline 34s mono preview at 44.1kHz has peak **0.222** and RMS **0.0264** at the
  default mix level, with no clipping or browser page errors.
  [Audio measurements](reviews/music/audio-stats.json). This verifies generated
  output, not a claim of subjective listening approval.

To regenerate an audition while `pnpm dev` is running:

```sh
node tooling/render-music-preview.mjs /tmp/citadel-music-preview.wav
```

Tone's [official scheduling guide](https://github.com/Tonejs/Tone.js/wiki/Transport)
explains the audio-time callbacks used by this prototype. Tone code is isolated
inside `audio/tone-*`; composition and lifecycle tests do not require an audio device.

## Review and remaining work

Judge whether a catch feels like playing a note, whether your phrase is audible
among bot accents, and whether the kick/brightness pulse stays pleasant through
repeated rounds. Melody selection, mix, thresholds and drop length are provisional.
The first pass has no advanced stereo arrangement, device-specific mastering,
mobile/Safari validation, multiplayer audio or gameplay changes on musical drops.
The full software-WebGL suite was not rerun; desktop native Chromium was used.

No `gh`, push or deployment was performed. Existing unrelated AGENTS and M05
layout-morphing edits remain unstaged.

**REVIEW REQUIRED — music detour (M03/M04 remain awaiting review).**
