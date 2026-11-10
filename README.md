# Neon Citadel

A local-first paddle arena, built with strict TypeScript, React, Three.js and Vite+.
The current scaffold renders a procedural stage; gameplay is still to be implemented.

## Develop

Use Node **24.11.1** (pinned in `.node-version`) and pnpm **11.5.3**.
A global Vite+ install is optional: the repository supplies the local `vp` CLI.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Check and build

```sh
pnpm check
pnpm test
pnpm build
```

`pnpm check` runs formatting, lint and TypeScript checks through Vite+.
`pnpm build` compiles the web app to static HTML, CSS and JavaScript in `dist/`.
No application server is needed in production.

To exercise the GitHub Pages project path locally:

```sh
PAGES_BASE_PATH=/citadel/ pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

The browser tests start and stop a production preview automatically. For manual inspection:

```sh
PAGES_BASE_PATH=/citadel/ pnpm preview --host 127.0.0.1
```

Open the displayed server URL at `/citadel/`. For a custom domain or user site,
use `PAGES_BASE_PATH=/` when building and previewing. Browser tests accept the same
variable. No history router is installed; later room links must remain static-host compatible.

## Module ownership

- `apps/web/src/app/`: React composition, DOM UI and styles.
- `apps/web/src/rendering/`: Three.js presentation and GPU resource lifecycle.
- `tooling/`: build configuration helpers and their tests.
- `tests/`: production-browser smoke tests.

Add input and pure simulation modules with gameplay. They must not depend on React,
Three.js or the DOM. Keep the entry point and app component as composition only;
prefer focused modules over a large game class. Create shared packages when there
is a real consumer or boundary that benefits from them, not empty placeholder packages.

## GitHub Pages

`.github/workflows/ci.yml` checks, tests and builds pull requests and `main` pushes.
`.github/workflows/pages.yml` validates and publishes `dist/` on `main` pushes or a
manual run from the default branch. It obtains the asset base from Pages metadata
and tests that production build in Chromium before uploading it.

One-time repository setup: in **Settings → Pages → Build and deployment**, choose
**GitHub Actions** as the source. Then an authorised push to `main` can publish.
No deployment or repository-setting changes have been performed by this scaffold.
The actual site URL is reported by the deployment job.

Local commits are frequent. Pushing, manually deploying and using `gh` require the
user's explicit instruction. See [AGENTS.md](AGENTS.md) and [PLAN.md](PLAN.md).
