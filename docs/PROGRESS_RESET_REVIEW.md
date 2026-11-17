# Won-level Best and progress reset

Best now means the highest real level won. It starts at zero; entering a level,
unlocking a higher challenge, losses and debug navigation never raise it. Winning
level 100 records 100. Every view uses the saved number directly: the initial
one-level display subtraction would have been wrong after skipped promotions or
at the ceiling.

Version 4 saves store the won peak independently of the bounded recent-result
window. Version 1/2 win records are retained. Version 3 stored reached/unlocked
levels, so migration recovers its highest retained winning result; older victories
outside the 16-result window cannot be reconstructed reliably. Migration preserves
the current challenge, result history, loss streak and settings.

**Reset progress** in Settings clears the current level, Best, recent results,
round count, loss streak and demotion. It exits debug mode and returns to a fresh
level-1 title without recording the abandoned attempt. Audio, guide, sensitivity
and graphics preferences remain intact. Restart remains a separate action which
preserves progress. The short-screen panel places sliders in columns and uses two
button rows; accessible targets and rendered controls use the same bounds.

## Checks and evidence

- `vp check --fix`: formatting, lint and TypeScript pass.
- `vp test run`: 627 unit tests in 114 files pass. Coverage includes only-win updates,
  skipped levels, level 100, loss/demotion, old-save migration, peaks surviving history
  rollover, literal displayed Best, reset target spacing and short-screen layouts.
- Root and `/citadel/` production builds pass with the existing large-chunk advisory.
- 16 selected production Chromium browser scenarios pass: actual win/save/reload,
  desktop/touch reset, debug reset, progression, ordinary Restart and settings/status.
  Virtual input stays inside the page through `tests/fixtures.ts`.
- Five final `/citadel/` production browser checks pass: actual win/save/reload,
  desktop/touch reset, debug reset and production startup/refresh.

Reviewed screenshots are in [`reviews/m09/progress-reset/`](reviews/m09/progress-reset/):
[desktop Settings](reviews/m09/progress-reset/desktop-reset-settings.png),
[phone Settings](reviews/m09/progress-reset/phone-reset-settings.png),
[short landscape](reviews/m09/progress-reset/desktop-reset-settings-568-320.png),
[small square](reviews/m09/progress-reset/desktop-reset-settings-320-320.png),
and the level-1 title with Best 00 after reset on desktop and phone.

The live local demo remains **http://127.0.0.1:5179/**. Open Settings to try Reset
progress. This deliberately clears the saved progression on that local origin.
No full browser-suite or physical-device Safari run is claimed. No push or deployment.
M09 remains awaiting owner review.
