# iOS Home Screen text-selection interruption

20 November 2026 — M09 correction, awaiting physical-device review.

The owner reports that tapping to serve in the installed iOS Home Screen app
opened **Copy / Look Up / Translate / Share**, interrupting the game. Those
options indicate native text selection. The canvas already had `touch-action:
none` and cancelled pointer events, but there was no selection/callout policy or
active Touch Event guard. The native iOS menu itself was not reproduced here.

## Change

- Disable standard and WebKit text selection on the game surface and its
  transparent button controls, and disable WebKit touch callouts. The hidden
  accessible status and native button/range semantics remain available.
- While touch gameplay is enabled, cancel `touchstart`, `contextmenu` and
  `selectstart` on the canvas. The Touch Event listener is explicitly non-passive.
  These listeners do not cancel touches on Settings buttons or sliders, and are
  removed when the input adapter is disposed.
- Keep the existing pointer-based tap/drag, long-press rejection, cancellation
  and one-serve-per-tap behaviour. No simulation or timing rules change.
- Include the mobile browser regression in CI, Pages and itch publishing checks.

Apple documents disabling selection on game-style controls in
[Preparing Your Web Content for iPad](https://developer.apple.com/library/archive/technotes/tn2010/tn2262/_index.html).
WebKit's [canvas selection/callout discussion](https://bugs.webkit.org/show_bug.cgi?id=231161)
also distinguishes touch callouts from selection and describes cancelling the
Touch Event default action. This supports the protection applied here; it is not
proof that every current iOS native gesture has been reproduced in automation.

## Validation

- Added three unit cases that failed before the fix and pass after it. Each
  checks cancellation during play, uninterrupted tap/drag input, release/resume
  and disposal. Existing long-press and cancelled-gesture tests also pass.
- Full unit suite: **767 tests / 129 files pass**.
- `vp check` passes; production Pages and itch builds pass with the existing
  large-chunk advisory.
- Software Chromium: the new regression and the existing touch Settings check
  pass. The existing desktop Settings test exceeded its 30-second limit during
  introduction rendering. The native-GPU rerun passes all three checks (6.3s).
- Desktop WebKit: the same mobile-viewport regression passes (5.8s), including
  computed `-webkit-touch-callout: none`. This used a temporary Playwright config
  selecting WebKit instead of Chromium. It cannot reproduce native Home Screen
  selection sheets or establish physical iPhone behaviour.
- Workflow YAML syntax and `git diff --check` pass. CI itself was not triggered.

Commands run:

```sh
vp test run apps/web/src/input/touch.test.ts
vp test run
vp check
NODE_ENV=production PAGES_BASE_PATH=/citadel/ vp build --mode production
NODE_ENV=production vp build --mode itch
PAGES_BASE_PATH=/citadel/ vp exec playwright test tests/ios-touch.spec.ts tests/settings.spec.ts --workers=1
PLAYWRIGHT_RENDERER=hardware PAGES_BASE_PATH=/citadel/ vp exec playwright test tests/ios-touch.spec.ts tests/settings.spec.ts --workers=1
PAGES_BASE_PATH=/citadel/ vp exec playwright test tests/ios-touch.spec.ts --config /private/tmp/citadel-ios-webkit.config.ts --workers=1
```

The browser regression checks computed selection/callout styles, default-action
cancellation, actual ball release, paddle movement, pause/resume and volume
editing. It uses `tests/fixtures.ts` and `window.__citadelTestInput`, with no native
pointer lock, fullscreen or system mouse interaction. Its native-menu events are
synthetic; they test the guard rather than the operating-system menu itself.

Rendered review: [Chromium gameplay](reviews/ios-touch/chromium-playing.png) and
[WebKit gameplay](reviews/ios-touch/webkit-playing.png); both inspected.
Local demo: `http://127.0.0.1:5189/citadel/` (production build).

## Device retest

After the updated build is deployed with owner authorisation, close and reopen
the installed Home Screen app. Play several serves, including repeated taps,
briefly holding a finger down, a long hold and left/right drags. Check that the
native selection menu never opens, a drag never launches, a long hold does not
launch, and a short tap still launches once. Check Pause, Settings sliders and
Resume too.

The owner authorised committing and pushing this correction to `main`. That push
triggers the configured Pages and itch.io publishing workflows; their success
and the installed-app retest remain separate checks. M09 and the physical-device
review remain open.
