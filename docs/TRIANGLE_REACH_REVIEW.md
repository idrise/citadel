# Three-survivor bat reach

16 November 2026. The bat stopped short of the triangle walls because the previous
correction reserved a 0.7-unit passage even at the ends of travel. Smaller bats
could also hit a 30-degree sector cap inherited from the original corner anchor.

The bat now fits against the real wall planes with the ordinary 0.015-unit skin
clearance. The triangle search extends through the inward half-plane so the
original corner sector cannot stop it prematurely. The fortress remains 2.6
units forward of the corner; its health positions, bat size, bow and rail radius
are unchanged. A centred bat still leaves an open ball corridor. At an end of
travel, the bat can defend that side up to the wall.

The real four-to-three morph with surviving IDs 0/2/3 was used for the authored
comparison poses in `docs/reviews/triangle-reach/`. Both versions use the same
inset anchors. Level-one limits expand from about ±17.85° to ±28.03°. The report
also includes unchanged 2/4/6-player controls, centred poses and both end poses on
desktop and phone-sized rendering. These are authored poses, not natural match
outcomes. Reproduce with:

```sh
node tooling/review-triangle-reach.mjs http://127.0.0.1:5192
```

Unit coverage samples the bat surface at both triangle limits across all 100
levels, including different arena shapes and bat profiles. Further checks cover
centred ball corridors, the retained inset and bat width, physical wall clearance
during four-to-three morphs, and surviving health placement. Browser tests drive
real mouse/touch adapters to both triangle limits and verify ordinary rally play.
Physical phone/tablet and the previously reported Windows performance gates
remain open; this change addresses bat reach.

Validation: 559 unit tests pass, including deterministic collision/replay coverage;
three native Chromium tests pass (both new input checks plus rally play).
`vp check`, root production build and `git diff --check` pass. The build retains
its existing bundle-size advisory. The review fixture reported no browser errors.
