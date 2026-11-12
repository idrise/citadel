# Early mobile tester build

12 November 2026: David Brown requested a little camera motion, a zoom as danger
looms and a sideways shimmy when the bat moves. The owner also requested touch
steering early to enable testing. This is a focused M09 experiment, not completion
of the mobile milestone.

Drag anywhere on the arena to steer relatively; lift and reposition without a
bat jump. Tap to serve, and use the top-right pause button to pause or change
settings. A drag or cancelled gesture does not serve. The camera gently follows
bat position and zooms up to 2% when an active ball approaches the human fortress.
Both cues are smoothed, presentation-only and frozen by pause or reduced effects.

Chromium phone emulation at 390×844 and 844×390: [2 players portrait](reviews/m09/touch/portrait-2.png),
[2 landscape](reviews/m09/touch/landscape-2.png), [4 portrait](reviews/m09/touch/portrait-4.png),
[6 portrait](reviews/m09/touch/portrait-6.png), [6 landscape](reviews/m09/touch/landscape-6.png).
[Real-time scripted touch gameplay](reviews/m09/touch/mobile-gameplay.webm) runs
for 6.8 seconds; touch events are automated, not a human playtest.

Validation: `vp check`, 291 unit tests, root-path production build, four touch
browser tests and four desktop presentation/control tests passed. The browser
checks used hardware Chromium emulation; no physical phone, Safari, battery or
performance measurements and no complete mobile round were tested. The portrait
arena is small: assess readability and finger sensitivity on an actual phone.
The full mobile milestone and M08 public-site verification remain open.
