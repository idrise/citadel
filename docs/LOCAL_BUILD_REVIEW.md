# Local diagnostic Settings — 19 November

## Deployment regression correction

The initial `import.meta.env.DEV || mode === "local-debug"` check was unsafe:
`NODE_ENV=development vp build` still sets Vite's DEV flag, even in production mode.
With that environment and `/citadel/`, both Settings checks failed locally before
the fix: desktop had five buttons instead of three and touch exposed a report
button that should have been absent. This reproduces the reported symptom; the
actual remote run environment was not fetched or confirmed.

Vite configuration now supplies `__CITADEL_LOCAL_DIAGNOSTICS__` from the command,
explicit mode and preview state. Release builds disable it regardless of NODE_ENV;
only a development server or explicit `local-debug` mode enables it. The client
uses that compiled flag directly. Build identities include the resolved diagnostic
profile, and the profile helper is part of the source fingerprint.

Both GitHub Actions workflows now explicitly run `vp build --mode production` with
`NODE_ENV=production`. Their browser gate checks startup and opens Settings on both
desktop and emulated touch before upload. Those static Settings tests run without
simulating a match or starting audio. A visible Report or Test fails the release
gate. The existing startup/refresh check remains.

Validation after correction: nine focused tests, all 712 unit tests/124 files and
format/lint/types pass. Root release, Pages release and local builds pass with the
existing large-chunk advisory. Nine Chromium checks pass across three cases:
three Pages checks built with NODE_ENV=development, three local checks built with
NODE_ENV=production (including report download/Test navigation), and the exact
three-check Actions release gate using NODE_ENV=production and software WebGL.
The adversarial Pages case used native rendering; the final Actions case used
portable software rendering. Before/after files are local evidence, not a remote
Actions rerun or proof the public site has updated.

Corrected release renders from the adversarial build:
[desktop](reviews/m09/local-diagnostics/ci-release-desktop.png) and
[touch](reviews/m09/local-diagnostics/ci-release-phone.png).
No push, deployment or remote workflow was triggered. REVIEW REQUIRED — M09.

## Local and release commands

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

Initial validation, before the deployment correction: all 704 unit tests across 123 files, formatting/lint/types, root release,
local and `/citadel/` release builds pass. The existing bundle-size advisory remains.
The mode matrix covers development, explicit local, production and other modes;
rendering tests cover hidden diagnostic targets/meshes, footer width and transitions.

The initial twelve native Chromium browser checks passed: five root release checks, five local
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
