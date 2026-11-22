# Contributing to CITADEL

[README.md](README.md) is the player-facing description, also displayed on Reddit.
Keep development and publishing instructions here. [DOCS.md](DOCS.md) summarises
gameplay, tuning, artwork and outstanding validation; [PLAN.md](PLAN.md) owns
the design and milestone approval gates.

## Local setup

Use Node **24.11.1** (`.node-version`) and pnpm **11.5.3**. The local Vite+ CLI is
included; a global `vp` installation is optional.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Desktop web/itch controls use captured relative mouse movement; Reddit uses mouse
position inside the embedded game. Touch uses relative dragging and tap to serve.
A/D or arrows steer; Space/Enter serves; Escape/P pauses. Focus loss pauses and
clears input. On iPhone, Share → Add to Home Screen gives a standalone view;
recreate existing shortcuts if the icon needs refreshing.

Keyboard +/− steps through unranked debug levels without opening Settings.
Backspace restores the saved challenge at the title. Debug attempts never save
results or change personal bests.

## Checks

```sh
pnpm check
pnpm test
pnpm build
```

`check` runs formatting, lint and strict TypeScript through Vite+. `test` runs
game regressions and an explicit list of relevant build/publishing checks.
CI, Pages and itch use this fast selection, with two workers in CI. Teaser
generation, selected clip outcomes and media review do not gate releases.
Long gameplay tests are opt-in:

```sh
pnpm exec vp test run --tagsFilter=soak
```

Browser checks use full Chromium and manage their own production preview:

```sh
pnpm exec playwright install chromium
PAGES_BASE_PATH=/citadel/ pnpm build
PAGES_BASE_PATH=/citadel/ pnpm test:browser
```

Use `PLAYWRIGHT_RENDERER=hardware pnpm test:browser --workers=1` for a local
host-GPU review. CI uses software WebGL and a short startup/refresh and Settings
smoke selection; the full browser suite is a separate local check. Match
`PAGES_BASE_PATH` between build and preview/tests (`/` for a root site).

Automated browser input must stay inside the page: use `tests/fixtures.ts` and
`window.__citadelTestInput`. Standalone reviewers must install the same virtual
input hook before starting a game. Never use native pointer lock, fullscreen or
the system mouse in automation. Viewport emulation is not physical-device proof.

## Build targets

| Command             | Output                                                | Purpose                                      |
| ------------------- | ----------------------------------------------------- | -------------------------------------------- |
| `pnpm build`        | `dist/`                                               | Static browser / GitHub Pages release        |
| `pnpm build:itch`   | `dist-itch/`                                          | Portable HTML5 release, relative asset paths |
| `pnpm build:reddit` | `dist-reddit/client/`, `dist-reddit/server/index.cjs` | Devvit Web package                           |
| `pnpm build:local`  | `dist-local/`                                         | Optimised local diagnostic build             |

Release builds hide Report/Test actions and omit rolling frame capture. Local
diagnostics are enabled by the explicit development/local-debug build profile,
not a hostname, query parameter or saved preference. Reddit hides diagnostics
even in development. Build identity is embedded for reproducible reports.

```sh
pnpm build:local
pnpm preview:local --host 127.0.0.1 --port 5182
```

For browser checks against that output, use
`CITADEL_BUILD_MODE=local-debug pnpm test:browser` with a matching Pages base path.

## Module ownership

- `apps/web/src/app/`: React composition, persistence and accessible DOM targets.
- `apps/web/src/simulation/`: pure fixed-step geometry, physics, rules and bots.
- `apps/web/src/input/`: browser adapters producing versioned player intents.
- `apps/web/src/session/`: loop, focus/pause and adapter composition.
- `apps/web/src/rendering/`: Three.js presentation and GPU resource lifecycle.
- `apps/web/src/audio/`: musical direction, lifecycle and lazy Tone.js synthesis.
- `apps/web/src/reddit/`, `apps/reddit/`: SDK launcher and post-creation backend.
- `tooling/`: build helpers, reproducible benchmarks and manual review tools.
- `tests/`: production-browser checks and page-local virtual input fixtures.

Simulation must not depend on React, Three.js or the DOM. Keep entry points as
composition and modules focused on one responsibility; extract shared packages
only when a real consumer or boundary benefits. World artwork is procedural;
marketing images belong outside the game scene.

## Physics fixtures and manual captures

Reviewed physics data lives in `tooling/fixtures/physics/`. The replay test
retains the pre-escape impact log and escape-enabled digests, including stable
results at 30/60/144 rendering FPS. Historical paddle/spin comparison tools use
the earlier golden logs in the same directory. Never overwrite a golden merely
to make a failing test pass; inspect and review changed impacts first.

```sh
pnpm exec vpx tooling/replay-physics.ts
pnpm exec vpx tooling/review-layouts.ts
```

The first prints candidate replay JSON; the second is a seeded all-bot benchmark,
not a human playtest. Manual review scripts write captures under ignored
`artifacts/reviews/`. Run the initial capture before modes that read a previous
report, such as `review-rosters.mjs --performance-only` or audio before/after
comparisons. Delivered teaser assets remain in
[artifacts/citadel-teaser/](artifacts/citadel-teaser/README.md). Historical captures
were removed from the working tree; use Git history for previous reports.

## GitHub Pages

`.github/workflows/ci.yml` checks, tests and builds PRs and `main` pushes,
including the Reddit package build. `.github/workflows/pages.yml` validates
the production Pages build and publishes `dist/` on `main` pushes or an
intentional default-branch manual run. It obtains the asset base from Pages
metadata and runs browser checks before upload.

One-time setup: repository **Settings → Pages → Build and deployment → GitHub
Actions**. An authorised default-branch push can then publish automatically.

## itch.io publishing

`.github/workflows/itch.yml` tests the portable build under `/uploads/citadel/`
and uploads that exact artifact with Butler on `main` pushes or an intentional
default-branch manual run. No `ITCH_IO_TARGET` means publishing is skipped.

1. Create an itch project with **Kind of project: HTML**.
2. [Install Butler](https://itch.io/docs/butler/installing.html), run `butler login`
   and sign into an account allowed to upload to the project.
3. In [itch.io API keys](https://itch.io/user/settings/api-keys), copy the key
   whose source is **wharf**, created by Butler. On macOS it is also stored at
   `~/Library/Application Support/itch/butler_creds`. This is an itch API key used
   by Butler; never commit it or paste it into chat.
4. In repository **Settings → Secrets and variables → Actions**, set:

   | Type     | Name              | Value                                        |
   | -------- | ----------------- | -------------------------------------------- |
   | Secret   | `BUTLER_API_KEY`  | Butler/wharf key                             |
   | Variable | `ITCH_IO_TARGET`  | `username/game-slug`, without URL or channel |
   | Variable | `ITCH_IO_CHANNEL` | Optional; defaults to `html5`                |

   Equivalent GitHub CLI commands (the secret command prompts for the key):

   ```sh
   gh secret set BUTLER_API_KEY
   gh variable set ITCH_IO_TARGET --body 'your-name/citadel'
   ```

5. After the first upload, mark that channel **This file will be played in the
   browser** in itch's Edit game page. Butler cannot set this flag. Use Click to
   Play, a resizable/fullscreen embed and mobile support. Visibility and artwork
   are configured separately; an upload does not make the page public.

Only `dist-itch/` is uploaded, with the commit SHA as Butler's user version. The
key is supplied only to the upload step; no interactive login runs in CI. Match
an existing HTML5 channel when updating a project. Missing keys, failed checks
or authentication errors stop publication; removing the target disables uploads.
See [Butler CI authentication](https://itch.io/docs/butler/login.html) and
[HTML5 uploads](https://itch.io/docs/creators/html5).

For a manual ZIP, build then archive the **contents** of `dist-itch/`, with
`index.html` at the archive root and Finder metadata excluded.

## Reddit / Devvit

The official SDK and CLI are pinned to **0.15.4**. Devvit upload versions are
separate from the game's package version. Local preview:

```sh
pnpm build:reddit
pnpm preview:reddit --host 127.0.0.1 --port 5194 --strictPort
```

Open `http://127.0.0.1:5194/reddit.html`. Local Play opens the game directly;
inside Reddit it calls the SDK's `requestExpandedMode`. Source development uses
`pnpm dev:reddit` and the same path. The backend is bundled CommonJS; Reddit hosts
it, so no separate application server or itch API key is needed.

1. Create/choose an app at [Reddit for Developers](https://developers.reddit.com/new).
   Set `devvit.json`'s `name` to a registered slug owned by your account; do not
   assume the checked-in name is available. If Reddit offers a starter scaffold,
   generate it in an empty directory and carry the name into this repository.
2. Authenticate using `pnpm reddit:login`; verify with `pnpm exec devvit whoami`.
   Keep credentials outside source control.
3. `pnpm reddit:upload` builds and uploads a private version. It does not submit
   the app for public review.
4. `pnpm reddit:playtest YOUR_TEST_SUBREDDIT` installs on a community you moderate.
   Alternatively configure `dev.subreddit`; the SDK can create a development
   subreddit. Playtest initially builds both outputs, then watches the client;
   restart after backend or configuration changes.
5. Use the moderator menu's **Create a CITADEL game post** action. Check the
   launcher and gameplay on Reddit desktop and mobile before public submission.

`pnpm exec devvit publish` is a separate public-review submission after playtest
approval. CI checks and builds the package on pull requests. After validation
passes on a default-branch push or intentional default-branch manual CI run, a
separate job uploads a private app version. Uploads are serialised and are never
run for pull requests. No public review submission runs automatically.

For CI authentication, run the local login above, then add the **entire** token
file as a repository Actions secret without printing it:

```sh
gh secret set DEVVIT_AUTH_TOKEN < "$HOME/.devvit/token"
```

The secret is passed only to `tooling/publish-reddit.sh`, which checks it exists,
verifies the account with the pinned CLI and runs `reddit:upload`. No credential
file is written by the workflow. Authentication/build/upload failures fail the
job. The app name must already be registered to the authenticated account; finish
initial registration locally before relying on CI. If credentials stop working,
repeat login and replace the secret. Devvit assigns upload versions independently
of the game package version.

The default entry is the lightweight launcher; `game`, `_gameplay` and
`_direct_launch` point to the full game. Embedded mouse controls span the legal
bat arc without pointer lock; touch never requests browser fullscreen. Progress
uses browser-local storage and may reset between app-version origins; it does
not sync across devices. Account-backed saves are not implemented. Redis is
enabled because the SDK requires it for menu actions; external HTTP is disabled.

```sh
PLAYWRIGHT_RENDERER=hardware pnpm test:reddit --workers=1
```

These dedicated browser checks cover the SDK launcher effect and sandboxed
desktop/touch controls with native pointer lock/fullscreen rejected. They are
excluded from the regular browser suite. A real authenticated Reddit playtest
is still required to validate installation and host responses. See the official
[configuration](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_configuration),
[CLI](https://developers.reddit.com/docs/guides/tools/devvit_cli) and
[platform overview](https://developers.reddit.com/docs/capabilities/devvit-web/devvit_web_overview).

## Working agreement

Follow [AGENTS.md](AGENTS.md). Add useful unit coverage for code changes and run
checks appropriate to the affected behavior. Report actual checks and limits.
Read PLAN.md before work; milestone requests cover one milestone and stop for
review. Implementation or milestone approval does not authorise a commit.
Ask before committing; push, manual deployment and use of `gh` require explicit
authorisation. Preserve unrelated working-copy changes.
