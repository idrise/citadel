# Bat movement: air texture — 18 November

The bat now makes a soft, filtered rush of air. The pitched FM oscillator and its
modulation sweep are replaced by one pink-noise source through a broad, low-resonance
band-pass filter. Speed controls brightness and loudness; the existing bat position
controls stereo placement. Gentle movement is supported without the sharp increase
in loudness at full speed. The sound releases quickly when the bat stops.

Compare the same slow stroke, fast reverse flick and alternating movements:
[old FM sound](reviews/m09/bat-air/before-swishGesture.wav) /
[new air sound](reviews/m09/bat-air/after-swishGesture.wav).
With music at 20% and effects at 100%:
[before](reviews/m09/bat-air/before.wav) /
[after](reviews/m09/bat-air/after.wav).

The existing effects bus, saved volume controls, pause/mute handling and steering
input remain. One owned noise/filter/gain/panner chain replaces the FM chain;
steering allocates no new voices or nodes. The same audio context is used. No
additional timers, score changes or gameplay changes are introduced. A broad CPU
or physical-device performance comparison is not claimed.

The actual instruments, score director, effects compressor and final limiter were
rendered in Chromium at rest, slow/ordinary/maximum speeds, during alternating
strokes, with quiet music and muted. The 100ms peak RMS window avoids diluting
brief sounds with the silent tail. Noise levels vary slightly across renders.

| Movement             | Old peak-window RMS | New peak-window RMS |
| -------------------- | ------------------: | ------------------: |
| Slow (1 rad/s)       |             0.00257 |             0.00745 |
| Ordinary (3.2 rad/s) |             0.01774 |             0.01600 |
| Fast (16 rad/s)      |             0.18293 |             0.04831 |

Ordinary steering stays within about 1dB of its old RMS level, while maximum-speed
movement is about 11.6dB softer. The new alternating-stroke capture peaks at 0.213;
all seven fixtures stay below 0.99, and rest/mute are exact silence. These are
fixture measurements, not proof of subjective balance on every speaker/headphone.
The before render uses local revision `98d5735`. Baseline routing accepts both
Vite's `.ts` URLs and historical extensionless imports, so the matching old
parameters and old voice are used together. Raw results:
[before](reviews/m09/bat-air/before.json) /
[after](reviews/m09/bat-air/after.json).

Validation: all 699 unit tests, formatting/lint/types and root production build
pass; the existing large-chunk advisory remains. Regressions cover finite bounded
parameters, both movement directions, idle silence, timed smoothing, graph reuse,
noise routing and teardown. Five production Chromium audio/Settings checks pass,
including audio unlock, pause/resume, mute, restart, saved mixes and touch controls.
Input remains inside the page through `tests/fixtures.ts`. Physical-device listening
and the affected Windows audio performance issue remain unverified.

Reproduce with the existing development server at http://127.0.0.1:5181/:

```sh
node tooling/review-effects-balance.mjs --air-swish --before
node tooling/review-effects-balance.mjs --air-swish
```

Reload the local game and compare slow movements with fast flicks, then try the
usual lowered music and maximum effects mix. The new timbre needs owner listening
review. No push or deployment is authorised. REVIEW REQUIRED — M09.
