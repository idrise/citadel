# Local diagnostic Settings — 19 November

Report and Test now appear only during development or in an explicit local build.
A normal production build omits both visible labels and accessible hit targets;
Reset progress fills the free row. The action handlers also require the local
build flag. Button visibility follows the compiled build mode, not the hostname,
query string or saved preferences. Other debug navigation and performance
instrumentation retain their existing behavior.

`pnpm dev` keeps the diagnostic actions. A production-optimised local copy uses:

```sh
pnpm build:local
pnpm preview:local --host 127.0.0.1 --port 5182
```

The local version is running at http://127.0.0.1:5182/. These scripts select mode
`local-debug` and output `dist-local/`. Vite reserves the mode name `local` for its
environment-file suffix; the initial attempt with that name was corrected.

`pnpm build` / `vp build` still produce the release in `dist/`. The existing Pages
workflow builds in production mode and uploads only `dist/`. Local output is
separate and ignored by Git, formatting and lint. Build fingerprints now include
the mode so local and release performance reports have distinct identities.
No remote workflow, push or deployment was triggered.

Validation: all 704 unit tests across 123 files, formatting/lint/types, root release,
local and `/citadel/` release builds pass. The existing bundle-size advisory remains.
The mode matrix covers development, explicit local, production and other modes;
rendering tests cover hidden diagnostic targets/meshes, footer width and transitions.

Twelve native Chromium browser checks pass: five root release checks, five local
checks and two Pages-path release checks. Both desktop and emulated touch layouts
retain reachable controls, persisted volume/quality/sensitivity, rotation and the
correct diagnostic visibility. The local cases export actual performance reports
and open the Test page; release cases assert both actions are absent. Graph/pass
report inspection is exercised in local builds; release quality persistence remains
covered alongside unit rendering checks. Physical-device validation is not claimed.

Rendered comparison: [local desktop](reviews/m09/local-diagnostics/local-desktop.png),
[release desktop](reviews/m09/local-diagnostics/release-desktop.png),
[local phone](reviews/m09/local-diagnostics/local-phone.png),
[release phone](reviews/m09/local-diagnostics/release-phone.png).

For a release browser run use the ordinary root/Pages build and test commands.
For the local build, set `CITADEL_BUILD_MODE=local-debug` when running Playwright,
with matching `PAGES_BASE_PATH`. The tests keep all input inside the page.

M09 still awaits owner review. REVIEW REQUIRED — M09.
