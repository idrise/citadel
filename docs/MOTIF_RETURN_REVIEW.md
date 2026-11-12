# Returning melody and bar colour

The original two-bar call-and-answer is now the recurring anchor. It opens the first groove (bars 4–5) and returns for the first two bars of every eight-bar phrase (8–9, 16–17, 24–25 and onward). Returning bars keep the original lead pitches, attack rhythm and D-minor/B-flat harmony across all four round variants. The intervening bars retain the newer authored melody shapes and longer harmonic journey.

Each bar has a small, deterministic change in filter brightness, note length, stereo placement and echo mix. The returning tune can therefore feel slightly different without losing its identity. Echo stays between 13% and 30%, stereo placement within ±12%, and articulation within 88–112% of the section's usual duration. No extra effect chain or per-note synth allocation is introduced; the existing melodic delay and a persistent lead panner do the work.

Quiet, sparse chord-aware harmony now supports some one-ball melody notes. Surrounding bars alternate bell accents, short answers, occasional single-note FM brass and space. Those fills stay quieter than the lead. Higher ball counts still add their fuller harmony, arpeggio, acid and chord-brass layers. Added bell accents skip the full arpeggio tier, preventing duplicate attacks on the same monophonic voice.

The muted-hat → snare → driving-kick introduction, build breath, drop timing, live hit/breach feedback, music pause/mute/teardown and audio-clock boundary are retained. Composition never changes simulation, input, ball timing or match RNG.

## Auditions

- [One ball: home tune and departures](reviews/music/motif-return/one-ball-home-and-departure.wav): 16 seconds from the first groove, with quiet harmony and bar colour. The original pair appears at the start and returns around 7.1 seconds.
- [Three balls: layered drop and return](reviews/music/motif-return/layered-drop-and-return.wav): 20 seconds from the drop. The original pair opens the excerpt and returns around 14.1 seconds amid the fuller arrangement.

These are offline renders of the actual score and synth graph, with no gameplay hits added. The [audio report](reviews/music/motif-return/audio-report.json) records nonzero output, peaks below 0.41, and no browser errors. Auditions are review exports, not game assets.

## Checks

`vp check` is clean and **449 unit tests across 72 files pass**. Root and Pages production builds pass. Native Chromium passes **3/3 root audio checks** and **5/5 Pages audio/Retry checks**, covering audible output, pause/mute/restart/teardown, unavailable audio, second-ball layering and desktop/touch scene Retry. `git diff --check` is clean. The existing ~967kB main-chunk advisory remains.

Unit coverage pins every original attack and pitch on returning bars across four variants, verifies the harmonic reset, distinguishes eight neighbouring bar colours, bounds quiet harmony and audio parameters, and checks monophonic voice ownership across the layered score. Subjective balance and recognition of the tune remain for listening review. Physical iPad/iPhone validation remains open.

Local demo: `http://localhost:5177/`; same-network mobile: `http://192.168.50.177:5177/`. The scene Retry and open triangle lanes are recorded in [their review](SCENE_RETRY_GAP_REVIEW.md).

**REVIEW REQUIRED — M09**
