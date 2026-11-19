# Bat swipe: smooth unpitched air pass — 19 November

The owner heard the short sine glide as a tom drum. This revision removes the
oscillator and pitched body. The swipe is a filtered pink-noise pass with a smooth
75ms rise and a longer fall, reaching exact silence after 280ms. A high-pass filter
reduces the low body; a broad, non-resonant low-pass sweep keeps the harsh top down.

This also differs from the earlier rejected paper-like continuous noise: it uses
one complete, smooth swell per deliberate stroke rather than gating noise with
every mouse packet. Tiny corrections stay silent. The minimum retrigger interval
is now 300ms, so the 280ms swell finishes before another can start. The existing
80ms rest rearm and direction-change grouping remain.

[Actual gameplay recording](reviews/m09/bat-whoosh/gameplay.webm) uses 20% music,
maximum SFX, small corrections, repeated strokes and rest. The human remains alive
with three containers; no page errors occur. Compare isolated strokes
[before](reviews/m09/bat-whoosh/before-swishGesture.wav) /
[after](reviews/m09/bat-whoosh/after-swishGesture.wav), or the music/effects mix
[before](reviews/m09/bat-whoosh/before.wav) /
[after](reviews/m09/bat-whoosh/after.wav).

19 November volume follow-up: the owner requested a quieter swish. Its source
amplitude is now halved (-6.02dB), with the timbre, envelope, stroke grouping,
stereo, other effects and saved volume settings retained. Ordinary and fast
captures measure approximately -6.1/-6.2dB against the preceding unpitched version;
noise varies slightly between renders. The audio files and real-game clip below
have been refreshed. All 708 unit tests, format/lint/types, release/local builds
and seven offline audio fixtures pass. No additional broad browser suite was
needed for this source-gain-only change.

The owner subsequently selected 0.25 and then 0.125 source multipliers. Unit gain
expectations and the offline review floor now match 0.125; all 708 unit tests and
format/lint/types pass. The recordings and measurements below retain the preceding
0.5 multiplier and were not regenerated for this test-only follow-up.

The actual graph was rendered at rest, with tiny corrections, ordinary and fast
strokes, repeated strokes, a complete game mix and SFX mute. Rest, tiny corrections
and mute are silent. Ordinary movement measures about 0.012 peak-window RMS and
fast movement about 0.019; the mixed fixture peaks at 0.566, below the 0.99 check.
Raw results: [before](reviews/m09/bat-whoosh/before.json) /
[after](reviews/m09/bat-whoosh/after.json). The baseline is local revision `b00feae`.
Noise measurements vary slightly between renders; these checks do not prove taste.

All 708 unit tests, format/lint/types, release/local builds and five production
Chromium audio/Settings checks pass. Unit coverage includes envelope endpoints,
smooth rise/fall, no resonant/pitched source, packet-gap handling, retrigger bounds,
finite parameters, graph reuse and disposal. Native real-time capture uses the
same document-local input hook as tests. The existing bundle-size advisory remains.
There are two filters and one reused noise voice; no per-stroke nodes are allocated.
No broad CPU comparison or physical-device listening is claimed.

Reproduce with the development and built local servers running:

```sh
node tooling/review-effects-balance.mjs --whoosh --before
node tooling/review-effects-balance.mjs --whoosh
node tooling/review-bat-gameplay.mjs http://127.0.0.1:5182 docs/reviews/m09/bat-whoosh
```

Reload http://127.0.0.1:5182/ to try the current sound. Listening approval remains
with the owner. No push or deployment is authorised. REVIEW REQUIRED — M09.
