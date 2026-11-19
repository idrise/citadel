# Bat movement: brief electronic glide — 19 November

The owner reported that the continuous air sound resembled shuffling papers in
play. This revision removes the noise source and broad-band filter entirely.
One reusable sine voice plays a short, rounded electronic glide on deliberate
strokes. Its 15ms attack softens the onset and it finishes at zero after 140ms.
Ordinary steering remains audible; movements below 1.6 rad/s stay quiet.

[Hear it during actual play](reviews/m09/bat-glide/gameplay.webm), recorded with
music at 20%, effects at 100%, small corrections, repeated strokes and a final rest.
The clip uses native real-time audio, unchanged gameplay and document-local input;
the human remains alive with three containers and there are no page errors.
It is a listening candidate, not a claim of owner approval or physical-device balance.

Input packets are grouped into strokes: continuous movement produces one cue,
same-direction strokes rearm after an 80ms rest, and reversals have a 180ms minimum
interval. Short gaps between mouse packets neither retrigger nor cut up a cue.
Pause and mute retain their existing bus gates; no score or simulation timing changes.
The graph is one oscillator, gain and panner, with no per-stroke voice allocation.
No CPU performance claim is made from this structural change.

Matched offline comparisons use the previous air implementation at local revision
`57974aa`, with the actual director, instruments and output limiter:
[old isolated strokes](reviews/m09/bat-glide/before-swishGesture.wav) /
[new isolated strokes](reviews/m09/bat-glide/after-swishGesture.wav), and
[old music/effects mix](reviews/m09/bat-glide/before.wav) /
[new music/effects mix](reviews/m09/bat-glide/after.wav).
The eight-second mix includes repeated movement, short packet gaps, ball hits,
damage, supplies and victory cues. Raw results are in
[before.json](reviews/m09/bat-glide/before.json) and
[after.json](reviews/m09/bat-glide/after.json).

All seven fixtures remain below the 0.99 checked peak bound; rest, mute and tiny
corrections produce silence. Ordinary movement measures about 0.017 peak-window
RMS, comparable to the prior air sound; maximum speed is about 0.024. The full
mix peaks around 0.58. The existing 100ms peak-window measurement supports short
cues without averaging in a long silent tail. Measurements do not establish taste.

Validation: all 707 unit tests, format/lint/types, release and local builds pass.
Five production Chromium audio/Settings checks pass, covering unlock, pause,
mute, restart, saved mixes and touch layout. Tests cover stroke grouping, packet
gaps, rest/reversal timing, finite input, envelope termination and graph reuse/teardown.
The existing bundle-size advisory remains; physical-device listening and the
reported Windows audio performance issue are not verified.

Reproduce with the development server and built local copy running:

```sh
node tooling/review-effects-balance.mjs --glide-swish --before
node tooling/review-effects-balance.mjs --glide-swish
node tooling/review-bat-gameplay.mjs http://127.0.0.1:5182
```

Reload http://127.0.0.1:5182/ to try it. No push or deployment is authorised.
REVIEW REQUIRED — M09.
