# Neon Citadel

A local-first paddle arena, built with strict TypeScript, React, Three.js and Vite+.
Choose 2–6 fortresses: one human versus 1–5 bots, with physical health pieces,
revenge serves, timed ball additions and rematch. The arena gradually changes
shape as players fall, normally over 2.8 seconds. M01–M05 are approved.
The [M07 effects/edge review](docs/M07_REVIEW.md) and
[M08 desktop preview 0.1.0](docs/M08_REVIEW.md) record the release work. Further
external playtesting and public deployment verification remain pending; M06's pacing comparison is still unstarted.
An early touch-and-camera build for mobile tester feedback is documented in
[M09 touch review](docs/M09_TOUCH_REVIEW.md); real-device validation is pending.
The latest [scene title, victory fireworks and shot feedback](docs/SCENE_PRESENTATION_REVIEW.md)
replace the former landing/result popups.

## Develop

Use Node **24.11.1** (pinned in `.node-version`) and pnpm **11.5.3**.
A global Vite+ install is optional: the repository supplies the local `vp` CLI.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Play locally

On a touchscreen, drag left or right to move the bat, tap to serve, and use the
pause button in the top corner. Dragging is relative, so you can reposition your
finger without moving the bat. Camera motion pauses with reduced effects.

Use the floating title's **− / +** buttons to choose 2–6 players, then **START**.
The lettering and buttons are procedural 3D meshes.
The title's darker arena background stays separate from its camera-relative
lettering/buttons, so changing the board size keeps controls in place. Normal
brightness returns when play starts. **Settings** opens the compact
Pause panel, offering Beginner/Standard/Expert
bots and any human fortress. Two seats use a rectangle, then triangle, square,
pentagon and hexagon. Eliminations gradually move walls and surviving fortresses
to the new layout, preserving health and relative steering. Wins celebrate in the
arena with neon fireworks, a musical closing phrase and a floating **AGAIN** button.
Other results show **ROUND OVER** in the scene.
Both win and loss text retain the title's darkened backdrop while the foreground
lettering stays bright. Pause has optional Round statistics
and **Export round** for a local JSON summary; nothing is uploaded. How to play and
version/build details stay in Pause.

Click **START** to capture the mouse. Move left/right to steer your curved bat;
click or press Space to serve. A/D or Left/Right also steer. **Escape/P** pauses
and releases the cursor. Focus loss or capture loss pauses and clears held input;
click **Resume** to recapture and continue. While paused, **H** hides/restores the
small corner controls for screenshots. Settings offers 0.5–2× mouse sensitivity
and Neither / Preview only / Pressure slowdown / Both assistance modes. Settings
are saved locally across refresh, Restart, Rematch and seat changes. Restart repeats
the same opening; Rematch starts a new seeded round.
The scene fills the viewport, with no visible HUD or surrounding text during play.
Your default fortress is coral. Active balls and trails carry the last striker's
colour; ready revenge balls show their next server. Banks keep shot credit.

Each hit destroys the actual piece struck. The damaged survivor gets the revenge
serve, with a quick raised return arc. Lost pieces burst into small neon fragments
and an expanding ring. Surviving pieces grow slightly and gather into a compact formation using damped springs.
A ball can pass through any current gap; the outer walls rebound it back into play. Aim toward
either end of your arc to bank off the walls beside your bat. The serve guide
shows the first wall bounce; opponents can intercept it.

Rounds start with one ball and add another every 15 playing seconds, up to four.
The Settings menu exposes the interval/cap, reduced effects and the auto-serve
deadline. Preview only is the default: near your fortress, dots forecast the
ball through your stationary bat's bounce toward the next impact, with bounce
and end markers. Moving actors can change that forecast. Pressure slowdown
remains optional and off. It only helps with later arrivals when two separated
shots demand a fast move; ordinary shots and bat input stay at normal speed.
The same rule applies to humans and bots.
Brush the bat sideways into an incoming ball for a visible, fading curve. A short
100ms tolerance lets a quick flick count just before contact. Rotating cyan/pink
arrow bands show opposite spin directions, with a longer trail tracing the bend.
Spin does not add speed; holding the bat still retains the established contact-position aim.
The dotted forecast follows curved incoming flight and assumes a stationary bat.
The new ball size/speed and bank-shot reach reflect the initial hands-on feedback.
The live perspective camera sits behind your selected fortress at about 38° over
solid raised walls and a deep 3D arena. Foreground panels are translucent to keep
balls visible; rear faces and the floor reflect actual moving geometry with a
soft frosted finish. Thick opaque wall caps, feet and supports frame the recessed
faces. A custom shader widens edges where faces meet at 35° or more, giving bold
neon outlines without lighting flat-face triangle seams. A faint ball ghost
keeps rebounds readable when a solid cap blocks the camera. Dark faces and
restrained bloom keep the glow concentrated on the edges. An exterior neon grid
sits below the plinth, stretching into the distance with fading and filtered
lines. It is a static world surface, so the live camera supplies its perspective
and parallax.
Pieces occupy compact staggered rows and grow by 3.5% per loss (up to 24.5%), with
visible geometry matching the moving collision bodies. Relative mouse input is
independent of camera motion. Reduced effects/motion disables bloom/reflections
and holds the current camera pose without a snap.
Low/Medium/High effects presets control resolution, reflections, bloom and pooled
particles. High is the default; reduced effects overrides it. The bloom path
preserves antialiasing on solid wall edges, alongside the screen-space neon shader.

## Music

Press Play for a 136 BPM adaptive club score. Muted hats open, snare and melodic
hints join, then the driving kick enters. The build leads to a drop around 28s.
Two balls add harmony, three add FM arpeggios/acid counter-line, four add FM brass.
New parts enter on bar boundaries. Returns grow your own phrase and performance
layers; losing a piece resets your part. Your successful attacks get rising FM
notes and a cheering audience; losing your own piece gets a distinct lower cue.
Every rival capsule has its own sharp break cue, including bot-only strikes.
Wall-sound throttling cannot swallow it. Winning gets a short resolving musical
phrase while the arena and fireworks continue, with immediate mute/pause handling.
Bat notes align to 32nds with a short bounded delay; replies/cheers use eighths.
Collisions, movement and results always happen immediately and never wait for music.

Kick beats swell the bloom and send travelling waves over the exterior grid.
**Beat lighting** has its own setting; **Reduced effects & motion** disables it.
Pause/focus loss silences the music; Resume continues it. Music, volume (default
45%) and beat-lighting choices survive round changes. No recorded audio assets
are loaded. See the [music review, layer comparison and crowd audition](docs/MUSIC_REVIEW.md).

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
variable. For a local host-GPU run, use
`PLAYWRIGHT_RENDERER=hardware pnpm test:browser --workers=1`; CI defaults to
software WebGL and runs the production startup and refresh smoke test only. No history router is installed; later room links must remain static-host compatible.

## Module ownership

- `apps/web/src/app/`: React composition, DOM UI and styles.
- `apps/web/src/rendering/`: Three.js presentation and GPU resource lifecycle.
- `apps/web/src/audio/`: pure musical direction, optional audio lifecycle and lazy Tone.js synthesis.
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
pnpm exec vpx tooling/review-layouts.ts
```

This reports bot-only simulation results, not human playtest evidence. See
[the M08 review](docs/M08_REVIEW.md) and [playtest record](docs/PLAYTEST.md) for current
validation and limits; [M05](docs/M05_REVIEW.md) covers layouts;
[M03/M04](docs/M03_M04_REVIEW.md) records physics/destruction; [the M02 comparison](docs/M02_REVIEW.md) records the approved control baseline.
Physics regression logs can be regenerated with `pnpm exec vpx tooling/replay-physics.ts`;
review their impacts before deliberately updating the checked-in golden file.

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
