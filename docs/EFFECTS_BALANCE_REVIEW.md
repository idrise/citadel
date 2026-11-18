# Gameplay effects volume — 18 November

Effects now get +5dB of bus gain (about 1.78× amplitude) and their own compressor,
so the score cannot compress gameplay cues. The existing music gain and score
compression are retained. Both buses still feed the existing final limiter.
The already loud elimination explosion has a matching -5dB source trim, preserving
its earlier level while bringing up wall/paddle hits, damage, serves, pickups,
victory cues and paddle swish. Saved slider values and true mute are preserved.

This adds one bounded native compressor; no voices, timers, samples or contexts
are added. Scheduling and live input latency settings are unchanged. A broad
resource/performance comparison was not run for this one-node change.

The actual director and synth graph were rendered with music at 20% and SFX at
100%, plus a dense sixteen-impact/damage/elimination burst with both volumes at
100%. Baseline modules are taken from local commit `5ffd980` without changing the
working tree. The strongest 100ms RMS window measures short cues without diluting
them with trailing silence. Noise-based cues vary slightly between renders.

| Cue               | Before RMS | After RMS |  Change |
| ----------------- | ---------: | --------: | ------: |
| Wall              |     0.0203 |    0.0361 | +4.99dB |
| Paddle            |     0.0433 |    0.0768 | +4.99dB |
| Serve             |     0.0090 |    0.0160 | +4.99dB |
| Player damage     |     0.0802 |    0.1422 | +4.97dB |
| Rival breach      |     0.0429 |    0.0752 | +4.88dB |
| Pickup collection |     0.0122 |    0.0216 | +4.99dB |
| Elimination       |     0.1999 |    0.2007 | +0.04dB |
| Music alone       |     0.0326 |    0.0326 | +0.00dB |

The mixed example peaks at 0.567; the dense burst with full music peaks at 0.985.
All fifteen after cases remain below the checked 0.99 peak bound, and SFX mute
renders exact silence. Higher preliminary boosts failed this peak check and were
reduced. These are measurements of the captured fixtures, not a guarantee for every
possible overlap or output device. Compare [before](reviews/m09/effects-balance/before.wav)
and [after](reviews/m09/effects-balance/after.wav); raw levels are in
[before.json](reviews/m09/effects-balance/before.json) and
[after.json](reviews/m09/effects-balance/after.json).

Validation: `vp check`, all 669 unit tests across 117 files and the root production
build pass. The existing chunk-size advisory remains. Unit regressions cover
independent compression routing, boosted/muted slider gains, teardown and the
explosion's peak budget. Five native Chromium production-browser music/Settings
checks pass, including pause/mute/restart, independently saved levels and touch
settings. Input remains inside the page through `tests/fixtures.ts`.

Reproduction (root development server):

```sh
pnpm exec vp dev --host 127.0.0.1 --port 5181 --strictPort
node tooling/review-effects-balance.mjs --before
node tooling/review-effects-balance.mjs
```

The normal local demo is <http://127.0.0.1:5181/>. Reload the page to hear the new
mix with the existing saved slider values. Review the regular hit cues with music
lowered, then try busy multiball play. Physical-device listening and the reported
Windows output issue remain unverified. The owner's roster tuning is preserved
outside this change; no push, deployment or milestone advancement is authorised.

18 November bat-movement follow-up: the owner found the swish too quiet after the
bus correction. Its speed-driven source gain now ranges up to 0.3 instead of
0.075: +12.04dB (four times amplitude), with the same speed curve, timbre, stereo
position, smoothing and silence threshold. Other cues and bus settings retain
their previous tuning. Ordinary 3.2rad/s movement now measures 0.0177 peak-window
RMS instead of 0.00444; maximum 16rad/s movement measures 0.1829 instead of 0.0458.
Maximum isolated peak is 0.426, the normal-speed music mix peaks at 0.146, and SFX
mute is exact silence. Five matched before/after cases cover slow, ordinary and
maximum speed, music and mute. These measured fixtures stay unclipped; physical
speaker/headphone listening remains for owner review.

Compare the movement with music [before](reviews/m09/bat-swish/before.wav) and
[after](reviews/m09/bat-swish/after.wav), with raw
[before](reviews/m09/bat-swish/before.json)/[after](reviews/m09/bat-swish/after.json)
measurements. Reproduce using `node tooling/review-effects-balance.mjs --swish --before`
then `node tooling/review-effects-balance.mjs --swish` with the same root dev server.
The swish baseline restores only `paddle-swish.ts` from local revision `42aa1c3`.
`vp check`, all 671 unit tests, the root production build and `git diff --check`
pass; the existing chunk-size advisory remains. New regressions cover normal-speed
audibility, silence/dead-zone/invalid input, signed-speed symmetry, monotonic gain
and maximum-speed bounds. No new browser gameplay run was needed for this single
synth parameter change; the five browser passes above belong to the preceding
bus amendment. No push or deployment was performed.

**REVIEW REQUIRED — M09**
