# Music detour — club arrangement and visible beat response

Status: **Awaiting review**, 11 November 2026. The user rejected the sparse first
pass as effectively drums only, asked for a deeper 90s DJ-style build/melodic/drop
structure, and wanted the beat response to be visible. This revision replaces
that first arrangement. M03/M04 and the full M07 gate remain unapproved.

## Listen, watch, play

- [74-second stereo audition](reviews/music/club/club-preview.mp3): the actual
  score/synth graph, with scripted hits and damage as musical input.
- [18-second build-to-drop clip](reviews/music/club/club-build-drop.mp4): captured
  from real-time gameplay, including audio from the game's actual output bus.
- Reload the local game and press **Play**. **Settings → Music**, **Music volume**
  and **Beat lighting** control the experience. Beat lighting is disabled by
  **Reduced effects & motion**; the menu now makes that explicit.

The previous `preview.wav` link remains usable and now contains the first 34
seconds of the revised score. These files are review exports only; the game
never loads recorded audio assets.

## The arrangement

The structural reference is the tension, melodic space and release of a 90s club
set. The themes and voicings are authored for Citadel. Sister Bliss's
[discussion of Faithless's synth/pad/bass production](https://articles.roland.com/faithless-breaking-down-classic-tracks-with-sister-bliss/)
was useful context for that palette.

| Music time | Section      | What changes                                                                                   |
| ---------- | ------------ | ---------------------------------------------------------------------------------------------- |
| 0–7s       | Intro        | A clear plucked theme, rolling resonant bass/sub and kick from the opening; percussion joins   |
| 7–14s      | Groove       | Backbeat claps, offbeat open hats, chord voicings and a wider mix                              |
| 14–21s     | Breakdown    | Kick and bass leave room for sustained harmony, the theme and high arpeggios                   |
| 21–28s     | Build        | Filter opens, rising noise and snare rolls become denser; arranged music breathes for one beat |
| 28–42s     | Drop         | Full kick/bass, octave-doubled theme, crash, pumping low end and open hats                     |
| 42–56s     | Melodic      | The harmonic/melodic section returns with rhythmic space                                       |
| 56–70s     | Longer build | Another rising passage leads into the next drop around 70.6s                                   |

Tempo is **136 BPM**. Dm9 / Bbmaj7 / Fadd9 / Csus2 voicings support two original
syncopated melodic calls. Detuned plucks, resonant saw bass, sine sub, soft pads,
FM arpeggios and stereo ping-pong delay give the melodic parts distinct roles.
Closed/open hats, claps, snare/body, rising noise and crash are synthesised too.
The first drop arrives on bar 16, independently of any player's streak.

Melody is now guaranteed from bar one, even with **zero hits**. Player phrases
remain an additional part: a return plays a live FM accent and extends a bounded
sixteen-note counter-melody. Damage resets that defender's phrase, not the authored
song. Your live accents are stronger than bot accents. After human elimination,
the leading survivor's player phrase becomes the focus. Game pressure adds small
ornaments; it never decides whether the core melody exists.

The mix was reviewed as separate drum, bass and melody stems, not just by asking
whether the output was nonzero. In the no-hit opening, melody RMS is **2.72 dB
below drums**, bass is **2.22 dB below drums**. The drop's RMS is about twice the
breakdown's. The full audition peaks at **0.442**, with no PCM clipping at the
default 45% master level. These are output checks, not subjective listening approval.

## Beat rendering

Kick times travel from the audio scheduler through a timestamped envelope into
the viewport. Bloom grows from **0.25 up to 0.51**, keeping radius and exposure
fixed. Exterior grid lines can brighten by **90%**, and an expanding light wave
travels outward across the grid for each kick. Chord entries in kick-free
sections get a quieter light accent.

The pulse has an 18ms attack and roughly 190ms decay, rather than an exposure
flash. There is no camera shake, geometry scaling or music-driven steering.
Mute, zero volume, disabled beat lighting and reduced effects suppress it.

Reviewed [rest](reviews/music/club/rest.png),
[kick](reviews/music/club/kick.png) and
[travelling wave](reviews/music/club/wave.png) at identical arena/camera poses.
Rest-to-kick mean pixel change is **10.42/255**, compared with about 0.86/255 in
the first pass. Reduced beat-on/off captures are byte-identical.
[Measurements](reviews/music/club/visual-stats.json). The live gameplay recording
also reached breakdown, build and drop while playing actual audio, without page errors.

**Music never changes gameplay.** Nothing from music settings, notes, beats,
sections or visual waves enters simulation options, RNG, bot choices, spawning,
ball/paddle motion or input. The authoritative match still reproduces identically
when the music director and lighting react.

## Validation and reproduction

- `pnpm check`: formatting, lint and strict types pass without warnings.
- `pnpm test`: **182 tests in 29 files pass**, covering baseline melody with no
  hits, contrasting sections, accelerating build, breath/drop, bounded scoring,
  per-player phrases, audio lifecycle races, beat timing and simulation identity.
- Pages build passes. Initial game chunk: **882.57 kB / 241.06 kB gzip**;
  lazy Tone/music chunk: **261.44 kB / 64.18 kB gzip**. The existing large-game-
  chunk warning remains.
- **14 production Chromium browser checks pass** on the host GPU. They include
  analyser-confirmed output/silence, pause/mute/resume, cleanup, audio failure,
  preserved beat-lighting settings, full round/rematch and Pages-path loading.
- Full stereo audition plus isolated stems and a **no-hit** audition rendered
  through the real synth graph with no browser errors.
  [Audio report](reviews/music/club/audio-stats.json).
- A 44-second live canvas/audio recording verified the actual game, not only
  an offline composition fixture; the linked clip is a reduced-size excerpt.

With `pnpm dev` running:

```sh
node tooling/render-music-preview.mjs /tmp/citadel-club.wav
node tooling/review-music-audio.mjs /tmp/citadel-audio-review
```

The second command renders stems/full/no-hit versions and fails on missing or
buried melody/bass, clipping or page errors. White-noise synthesis varies between
renders; note selection, section boundaries and game replays remain deterministic.

Desktop Chromium is the reviewed target. Mobile/Safari, Bluetooth output-latency
calibration and subjective mastering remain unverified. Tone emits a scheduling
warning when its lazy detuned-voice construction disposes an internal oscillator;
our note/filter/gain automation supplies explicit audio times. The existing Three
shadow-mode deprecation warning also remains. Neither produced a page error.

No `gh`, push or deployment was performed. Separate user edits in AGENTS and the
M05 layout-morphing note remain unstaged.

**REVIEW REQUIRED — music detour.**
