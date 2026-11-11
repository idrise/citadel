# Neon Citadel

A local-first paddle arena, built with strict TypeScript, React, Three.js and Vite+.
The M01 prototype plays a four-fortress round: one human versus three bots, physical
health pieces, revenge serves, timed ball additions and rematch. It is awaiting review.

## Develop

Use Node **24.11.1** (pinned in `.node-version`) and pnpm **11.5.3**.
A global Vite+ install is optional: the repository supplies the local `vp` CLI.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Play locally

Click **Play** to capture the mouse. Move left/right to steer your curved bat;
click or press Space to serve. A/D or Left/Right also steer. **Escape/P** pauses
and releases the cursor. Focus loss or capture loss pauses and clears held input;
click **Resume** to recapture and continue. While paused, **H** hides/restores the
small corner controls for screenshots. Settings are available in the menus.
The scene fills the viewport, with no visible HUD or surrounding text during play.

Each hit destroys the actual piece struck. The damaged survivor gets the revenge
serve. Surviving pieces grow slightly and gather into a compact formation using damped springs.
A ball can pass through any current gap; the outer walls rebound it back into play. Aim toward
either end of your arc to bank off the walls beside your bat. The serve guide
shows the first wall bounce; opponents can intercept it.

Rounds start with one ball and add another every 15 playing seconds, up to four.
The Settings menu exposes the interval/cap, a conditional return preview,
approach slowdown (off by default), reduced effects and the auto-serve deadline.
The new ball size/speed and bank-shot reach reflect the initial hands-on feedback.
The live perspective camera sits behind your selected fortress at about 38° over
solid raised walls and a deep 3D arena. Foreground panels are translucent to keep
balls visible; rear faces and the floor reflect actual moving geometry with a
soft frosted finish. Thick opaque wall caps, feet and supports frame the recessed
faces. A custom shader widens edges where faces meet at 35° or more, giving bold
neon outlines without lighting flat-face triangle seams. A faint ball ghost
keeps rebounds readable when a solid cap blocks the camera. Dark faces and
restrained bloom keep the glow concentrated on the edges.
Pieces occupy compact staggered rows and grow by 3.5% per loss (up to 24.5%), with
visible geometry matching the moving collision bodies. Relative mouse input is
independent of camera motion. Reduced effects/motion disables bloom/reflections
and holds the current camera pose without a snap.

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

The browser tests use full Chromium (its headless shell does not support Pointer Lock)
and start and stop a production preview automatically. For manual inspection:

```sh
PAGES_BASE_PATH=/citadel/ pnpm preview --host 127.0.0.1
```

Open the displayed server URL at `/citadel/`. For a custom domain or user site,
use `PAGES_BASE_PATH=/` when building and previewing. Browser tests accept the same
variable. No history router is installed; later room links must remain static-host compatible.

## Module ownership

- `apps/web/src/app/`: React composition, DOM UI and styles.
- `apps/web/src/rendering/`: Three.js presentation and GPU resource lifecycle.
- `apps/web/src/simulation/`: pure fixed-step geometry, collisions, rules and bots.
- `apps/web/src/input/`: browser input adapters emitting versioned player intents.
- `apps/web/src/session/`: local loop, focus/pause and adapter composition.
- `tooling/`: build helpers, tests and a reproducible all-bot benchmark.
- `tests/`: production-browser smoke tests.

Simulation must not depend on React, Three.js or the DOM. Input adapters translate
browser events; rendering owns camera projection and GPU resources. Keep the entry point and app component as composition only;
prefer focused modules over a large game class. Create shared packages when there
is a real consumer or boundary that benefits from them, not empty placeholder packages.

To reproduce the seeded all-bot timing run:

```sh
pnpm exec vpx tooling/benchmark.ts
```

This reports bot-only simulation results, not human playtest evidence. See
[the M01 review](docs/M01_REVIEW.md) for validation, limitations and review prompts.

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
