# M09 mobile review

## Fullscreen follow-up

The owner reported the board shrinking around browser tabs/address bars. Touch
Start and Resume now request fullscreen on the stable document root, with browser
navigation hidden where supported. The title and Pause menu also offer Full screen /
Exit fullscreen. Leaving fullscreen through the browser pauses an active round;
denied or unsupported requests leave the game usable. ResizeObserver continues to
fit the board after entry, exit and portrait/landscape changes.

Browsers without an element-fullscreen API show Home Screen instructions. The
relative-path web app manifest requests fullscreen display, and Apple standalone
metadata supports launching without Safari's address/tab bars. On iPhone use
Share → Add to Home Screen, enable Open as Web App if offered, and launch the icon.
See [Apple's instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27).

Validation: 303 unit tests, eight distinct fullscreen/touch browser checks, Vite+
check, and builds at `/` and `/citadel/` pass. Fullscreen entry, browser exit,
explicit exit, resume, rotation, denial fallback and relative manifest URLs were
tested in Chromium. [Portrait capture](reviews/m09/fullscreen/mobile.png) and
[landscape capture](reviews/m09/fullscreen/landscape.png) show browser-emulated
fullscreen rendering. Actual Android browser chrome and iPhone Home Screen launch
still need physical-device verification. The existing bundle-size warning remains.

## Responsive mobile build

The owner requested full M09 on 12 November after finding the mobile title and
logo too small. The current build uses a responsive procedural menu: a large
CITADEL title and stacked controls in portrait, with title and controls alongside
each other in landscape. Visible buttons and their semantic hit targets are at
least 44 CSS pixels high on compact screens. Mobile Pause settings use readable
text, scroll within the safe area, and keep Resume reachable. Touch instructions
appear in the title menu. The keyboard-only hide-controls action is hidden on
touch screens to avoid trapping the user without a resume button.

The later mouse sensitivity and inner-bat trail correction is recorded in
[paddle motion review](PADDLE_MOTION_REVIEW.md): baseline mouse travel is 25%
faster and the instanced blur excludes the solid bat footprint.

Touch drag steers, a short tap serves, and drags/long presses/cancelled gestures
never serve. Lifting a finger permits repositioning without a jump. Rotation
discards the held gesture; backgrounding pauses the game and foregrounding waits
for explicit Resume. Canvas gesture suppression leaves the settings panel
scrollable. Safe-area insets keep the game and touch pause button clear of cutouts.

The owner also reported dragging mouse response and explicitly approved raising
the movement limit. Mouse/touch targets now follow at up to 16 rad/s, compared
with the previous 3.2 rad/s. A representative 0.5-radian target is reached within
50ms in unit coverage. Keyboard and bots keep their existing movement rate.
The historical collision replay fixtures explicitly retain their authored 3.2
rad/s pointer speed; their reviewed impact digests remain unchanged.

Current evidence: [small phone title](reviews/m09/release/title-320.png),
[portrait title](reviews/m09/release/title-390.png), [landscape title](reviews/m09/release/title-844.png),
[tablet title](reviews/m09/release/title-1024.png),
[2-player gameplay](reviews/m09/release/play-2-landscape.png),
[4-player gameplay](reviews/m09/release/play-4-landscape.png),
[6-player gameplay](reviews/m09/release/play-6-landscape.png),
[result screen](reviews/m09/release/result-6.png), and
[scripted gameplay video](reviews/m09/release/mobile-gameplay.webm).
All 2/3/4/5/6-seat matches complete and rematch
through normal touch input, with rotation, serving and focus/visibility pause
checks. Match progression uses emulated time and reduced effects; this is
automation, not human playtest evidence.

Validation: Vite+ check, 299 unit tests, a root-path production build and 17
distinct native Chromium browser tests pass (full 16-test run plus focused mouse
and tablet checks after the final layout adjustment). The original bundle-size warning
remains. Physical Android/iPhone, Safari, real cutouts, sustained frame rate and
battery/heat are unverified; M10 owns device performance testing. Owner review
of mobile readability, drag sensitivity and mouse feel remains required.

Reproduce with a root-path production build, then
`PAGES_BASE_PATH=/ PLAYWRIGHT_RENDERER=hardware pnpm exec playwright test tests/mobile-release.spec.ts tests/touch.spec.ts tests/scene-ui.spec.ts tests/controls.spec.ts tests/presentation.spec.ts --workers=1`.
The existing CI smoke gate is retained; the full rendering suite runs locally.

## Earlier tester experiment

12 November 2026: David Brown requested a little camera motion, a zoom as danger
looms and a sideways shimmy when the bat moves. The owner also requested touch
steering early to enable testing. This is a focused M09 experiment, not completion
of the mobile milestone.

The owner's follow-up requests for paddle blur and consistent mouse movement
are recorded in [paddle motion review](PADDLE_MOTION_REVIEW.md).

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
