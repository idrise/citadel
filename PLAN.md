# NEON CITADEL — PLAN.md

**Status:** Shared design in progress; confirmed rules and provisional prototype experiments distinguished below.  
**Updated:** 10 November 2026  
**Genre:** Fast, competitive, polygon-arena paddle/ball survival  
**Target:** Understandable, tense matches that usually resolve in approximately **two minutes**. Difficulty is ramped as the game goes on.
**Players:** 2–6 seats, initially **one human and the remaining seats filled by bots**  
**Delivery order:** **Desktop browser + mouse + bots → mobile browser + touch + bots → multiplayer P2P → secure public matchmaking**  
**Hosting:** Static game on GitHub Pages; Cloudflare matchmaking/signalling only in the final phase

> **Product rule:** Prove that the game is fun against bots *before* spending time finding human testers, building mobile controls, or running network infrastructure. The first externally playable build is a single-player-versus-bots desktop web game.

---

## 1. Product vision and decisions

This takes inspiration from the immediacy of *Warlords*, the luminous geometry and motion of *Geometry Wars*, and the depth, edge treatment and controlled bloom associated with *Tron*. This is a 3D presentation over 2D gameplay. Subtle camera movement is a later visual experiment; begin with a stable camera so aiming stays predictable. It must be an **original-looking game**, not a remake using existing franchise assets.

One player occupies each defensive sector of a shared arena. Each player has a **thick, curved paddle** moving along a fixed arc in front of **eight visible, destructible health pieces**. Balls travel across the arena. Paddles return them to play and can impart spin. A ball must **physically collide with a remaining health piece** to destroy it. That piece disappears with a clear graphical flourish; the ball bursts and returns to the **damaged defender's paddle** for a revenge serve, provided they survive. Passing the paddle or crossing its rail alone causes no damage. Losing all eight pieces eliminates a player. **Last survivor wins.**

The desired game loop is simple: **move → aim a deflection → launch/return → survive escalating pressure → rematch**. A non-gamer should understand the fundamental objective within one round, without reading a manual.

### Explicit decisions from design discussions

| Area | Decision |
|---|---|
| Primary validation | One human versus **1–5 bots**; no other people needed |
| First platform | Desktop web, primarily mouse input |
| Next platform | Mobile web, touch drag and tap-to-launch |
| Final platform phase | Online multiplayer, followed by random matchmaking |
| Player counts | Exactly 2, 3, 4, 5, or 6 total participants |
| Arena topology | 2: rectangle; 3: triangle; 4: square; 5: pentagon; 6: hexagon |
| Camera | **2.5D**, tilted orthographic view, with visible extrusion and depth |
| Artwork | Procedural geometry only; **no surface textures** |
| Visual style | Dark world, thick sharply legible luminous edges and restrained but striking bloom |
| Health | Eight separate visible pieces behind each player's curved defence arc |
| Damage | Physical collision destroys exactly the struck health piece with a graphical flourish; no nearest-piece substitution |
| Next serve after damage | Damaged defender receives the ball for a revenge serve if still alive; elimination fallback remains open |
| Elimination/winner | No health left = eliminated; last survivor wins |
| Aiming | Mouse movement first; keyboard alternative; touch later |
| Serving | Mouse click / Space / Enter initially; mobile tap later |
| Pacing | Roughly two minutes; challenge ramps over time, not an instant artificial win |
| Client/runtime | Strict TypeScript; Three.js/WebGL; fixed-step 2D simulation |
| Offline hosting | GitHub Pages (static HTML/CSS/JS only) |
| Multiplayer | WebRTC DataChannels; one browser is authoritative host; *no dedicated simulation server* |
| Matchmaking | Later: Cloudflare Workers + Durable Objects, queues by preferred total player count |
| Security | Public broker treated as untrusted/abusable from its first public release |

**Superseded direction:** The older plan suggested Colyseus/Node as a central authoritative game server and introduced multiplayer before mobile. Both are **replaced** by the order and P2P architecture above. Keep the simulation independent so a dedicated authoritative server remains a possible future response to cheating or scale, but **do not build one now**.

### Intentionally unresolved design choices

Do not quietly make these permanent rules without a review:

1. **Shot attribution:** The damaged defender receiving the next serve is confirmed and supersedes return-to-attacker/owner. Whether last-hit attribution needs a visible ball mark remains open; it must not determine the post-damage serve recipient.
2. **Serve allocation:** Choose fair initial serves and the recipient after an eliminating hit. Prototype default: seeded initial selection; after an elimination, choose a surviving seat by seeded selection, unless the match has ended. These defaults need review. Ordinary non-eliminating damage always gives the damaged defender the serve.
3. **Damage geometry:** Choose whether health pieces are crystals, blocks, spheres or another distinctive extruded form at the M01 review. Every one must be individually readable.
4. **Escalation:** Do not decide in advance that speed, extra balls, shrinkage or a hybrid is best. Experiment with these at M06.
5. **Two-player layout proportions:** Rectangle defenders are at the centres of opposite short ends, not two corners of a four-player arena. Tune length/width experimentally.
6. **Ties and the final simultaneous hit:** Define a deterministic policy, then validate its feel.
7. **End-of-life fortress:** After elimination the paddle becomes non-defending and no health remains. Prototype default: balls continue through the empty sector and rebound from the outer wall. Validate escape/stall cases and serve allocation after eliminating hits.

### Prototype intuitions — provisional, to be judged by playing

These are starting experiments authorised for the prototype, not permanent design decisions:

- **Feel:** Start with precise, responsive defence and deliberate contact-position aiming, then explore escalating arcade pressure. The balance between precision, survival and targeting rivals is still open.
- **Movement:** Track the pointer closely with a maximum paddle speed; start without pronounced acceleration lag. A late save should initially feel like moving too late rather than fighting momentum. Keyboard uses the same speed limits.
- **Aiming:** Centre contacts return approximately along the paddle's inward normal; contacts toward either end create wider outgoing angles. Tune a bounded angle range in play. Add movement-driven spin later, after basic aiming feels good.
- **Gaps:** Destroyed pieces leave genuine holes. A ball passing through a hole continues until another physical collision, including the outer wall; never substitute damage to a nearby piece. Initially paddles can intercept from either side so returning balls do not require an invisible exception. Review whether deeper rebounds are interesting or confusing.
- **Aim help:** Try a short, conditional outgoing-direction preview for an imminent paddle contact. It describes a hit at the current paddle position, not a guaranteed future trajectory. Keep an off switch and compare assisted/unassisted play.
- **Approach slowdown:** Expose a developer toggle, off initially, for bounded slowdown near a paddle when a ball is approaching from the arena side. Use one shared simulation rule for humans and bots. Make it non-stacking, restore normal speed on leaving the region or hitting the paddle, and avoid repeated slow/fast boundary flicker. Compare preview only, slowdown only, both and neither; multiple-ball legibility is a later gate.
- **Serve rhythm:** Click to launch during a short ready window, followed by automatic launch to prevent indefinite holding. The deadline is tunable; test whether it gives a satisfying revenge opportunity without breaking the rally's rhythm.
- **Early elimination:** Prototype a clear result with immediate rematch available; spectating bots is optional. Record time until human elimination separately from total match length.

The first useful review is hands-on: does moving feel right, can the player place a return deliberately, and is breaking a piece satisfying? Avoid resolving every tuning question in prose before testing.

---

## 2. Arena geometry and presentation

### Topology

| Seats | Arena | Defender positions |
|---|---|---|
| **2** | Rectangle | Midpoints of opposite **short** sides; inward-facing curved rails |
| **3** | Equilateral triangle | Three vertices, centred on inward angle bisectors |
| **4** | Square | Four corners, matching the supplied layout sketch |
| **5** | Regular pentagon | Five vertices |
| **6** | Regular hexagon | Six vertices |

For 3–6 seats, derive fortress anchors, arc centre, rail radius, allowed paddle angles, wall endpoints and ball spawn locations from a single polygon specification. A fortress sits *behind* its curved defence rail, towards its vertex/anchor. Balance the angle/radius and shielding opportunity by geometry, not by eyeballing each arena separately. Begin with the four-player square in M01. Add and test the other four layouts in M05; all five must be covered before the desktop release.

### Rendering contract

- **No image textures, decals, sprites, photographed materials, raster skyboxes or HDRIs in the game world.** Use procedural meshes, extrusion, curves, emissive geometry, material properties, optional analytic shaders and instancing. An image atlas is permitted **only** if measured to improve particle performance. Bloom and antialiasing render targets are technical buffers, not artwork.
- Use an **orthographic camera tilted approximately 25–35° away from top-down** as a starting point, then tune by sight. Gameplay physics stays 2D in a separate coordinate plane, regardless of camera angle.
- Paddles, arena borders, health pieces and balls have visible **thickness, bevels and height separation**. This must not look like a flat 2D vector drawing with glow pasted on top.
- Thick edges and high-contrast silhouettes remain crisp under bloom. Strongest visual emphasis: ball → defended opening → paddle → remaining health.
- Make each player distinct by **colour plus a geometric mark/shape**, not by colour alone. Include reduced-bloom/reduced-flash options.
- Effects are geometry-first: line arcs, sparks, shards, rings, ball trails and impacts. Particle instancing is encouraged. Don't polish every effect before the basic game is fun.
- M01 requires a four-seat screenshot and desktop gameplay capture. Once other layouts arrive in M05, screenshots of **2, 4 and 6 seats** are mandatory at relevant visual gates, along with a desktop gameplay capture. Camera framing must eventually support narrow/mobile screens without hiding the threats.

The previously discussed sketch is a **layout reference**, not a requirement to render flat. It is not currently present in this workspace: do not claim a visual match without seeing it. Until it is available, use the written corner positions and health-behind-curved-rail relationship, and identify this limitation at review.

---

## 3. Gameplay and simulation contract

### Core simulation

- Pure TypeScript, fixed timestep; prefer a **120 Hz physics step as a starting experiment**, and measure it. `nextState = step(state, inputs, dt)` contains gameplay decisions; rendering and sound consume events/state but do not determine collisions.
- 2D ball movement, swept/continuous collision detection against polygon walls, moving curved paddles and the actual remaining health-piece collision shapes. The defence rail is not a damage trigger. Fast balls must not tunnel. Define deterministic ordering for multiple impacts in one step and cap collision iterations to prevent loops.
- Paddles move along a bounded arc with limited angular speed and optional tunable acceleration; start with responsive tracking as described above. Pointer position is a **target**, not an instantaneous teleport. An off-centre contact can aim a shot even when the paddle is stationary.
- Paddle movement can impart **spin/curvature** based on tangential paddle velocity, contact offset and incoming direction. Curvature has bounded magnitude and decay; zero-spin must behave predictably. Make dangerous trajectories legible; show shot attribution only if it adds useful information without clutter.
- Damage requires a swept collision with an intact health piece. Destroy exactly that piece, emit its destruction effect, consume the active ball and put it into a short attached/ready-to-serve state at the damaged defender if they survive. Crossing the defence arc or a missing piece causes no damage. Resolve simultaneous piece contacts deterministically; one ball can destroy at most one piece before returning. If the defender is eliminated, apply the explicitly labelled prototype serve fallback above; never attach a ball to an eliminated seat or serve after match end.
- Elimination at zero health; removed players can spectate. Edge cases include last piece lost simultaneously, serve recipient eliminated while another ball is active/returning, balls trapped near geometry and no survivors.
- No random competitive power-ups in the default rule set; randomness (including bots/serves if needed) uses a seed and can be replayed.
- Start with **one ball for the quickest readable prototype**. Keep the sim model capable of **1–8 balls** and add them only when the gameplay justifies it. More balls are not automatically better.
- Provide configuration for player count, bot difficulty, ball count, spin strength, paddle width, ball speed and starting health (eight default). Keep the main menu very small; put experimental knobs in a developer/advanced panel.

### Input progression

**Desktop now:** Pointer movement selects a position on the player's curved track; primary click launches an attached ball. A/D or Left/Right steer; Space/Enter launch. Handle lost focus and pointer leaving the canvas. The human can choose which fortress/seat to control while testing geometry.

**Mobile later:** Use Pointer Events and pointer capture; relative drag is the first touch experiment, and **tap** launches. Distinguish tap and drag to avoid accidental serves. Test an optional dedicated large launch target if tapping while steering proves awkward. Disable scrolling/zoom gestures only over the active game surface; respect safe areas, rotation and reduced-quality mode.

All devices feed the same versioned **`PlayerIntent`** (e.g. desired angle or angular motion + `launch`). The simulation applies identical movement caps regardless of device.

### Bots are first-class, not placeholders

Bots arrive **before** advanced polish and before mobile/networking:

- One human can fill any seat in a 2–6 player local game; all other seats are bots.
- Bots use the **same public game state and intent interface as a human**, with no wallhack/future-state privilege beyond a limited, explicit prediction horizon.
- Include a basic intercept/deflect controller in M01 so the interaction can be played immediately; refine it in later milestones. Give bots reaction delay, imperfect estimates, bounded paddle speed and sensible serve timing. Difficulty levels: **Beginner / Standard / Expert**, tuned by skill parameters rather than cheating.
- Bot randomness is seeded for repeatable test runs. Instrument who takes damage, causes deflections, survives and wins, plus mean/median duration. Bots must not all make exactly the same decisions.
- Use separate match test seeds, not hand-scripted victories. One human vs five bots must be playable locally with **no network or account**.
- The same bots can later fill unoccupied multiplayer seats, take over a disconnect or support practice. Their behaviour belongs in `packages/simulation`, not networking/UI.

### Pacing hypothesis

A **two-minute match** is the product target, not a fixed timer that awards a winner. Aim for an understandable opening, increasing pressure and a decisive final stretch. At M06 compare at least three ramps (increasing speed, adding balls, changing defensive pressure, hybrid), guard against infinite rallies, and test whether two-player and six-player games both end naturally. A playtest median near **120 seconds** is the initial hypothesis; do not turn a bot-only result into a claim about human retention. With eight pieces each, a two-seat match needs at least eight damaging hits to produce a winner; six seats need at least forty. Do not assume one speed/ball-count ramp fits every arena. Report distributions separately by player count, including human survival time, rally length and time spent waiting to serve. Do not make the opening prototype meet the two-minute target at the expense of understandable play.

---

## 4. Prove the idea before expanding it

### First genuinely playable milestone: **M01**

Build a small four-player game immediately: one human, three basic bots, one ball, physical health pieces, revenge serves, elimination and rematch. Use modest procedural 2.5D presentation. M02–M04 refine controls, physics and rules; M05 broadens the proven interaction to all five layouts and meaningful bot difficulties. Immediately evaluate: "Would I voluntarily play three more rounds?" If not, fix the core interaction before expanding layouts, advanced polish, mobile or multiplayer.

### First release candidate for outside feedback: **M08**

A static URL with a **Play vs Bots** button, selectable total players (2–6), and instant rematch. Initially share with a few friends *only when wanted*, for feel feedback—not for organising multiplayer sessions.

**Instrument locally without a backend:** round duration, chosen arena, ball count, human-versus-bot wins, number of replays, deaths by breach location, paddle-hit rate and pause/focus interruptions. Display diagnostics in a developer panel; avoid invasive telemetry or requiring accounts. For external tests, opt-in anonymous metrics or a short voluntary feedback form can be considered separately.

**Validation questions (decision gates, not promises):**

1. Can someone understand the paddle/health/ball-return rule within a round?
2. Is aiming with the mouse gratifying and is deliberate spin learnable?
3. Does the physical hit feel deserved, is the destroyed piece obvious, and does the revenge serve feel like a useful response?
4. Is the game still legible with 4 and 6 defenders?
5. Do repeat games feel meaningfully different rather than random or exhausting?
6. Does ramping produce typical rounds around two minutes without punishing good defence arbitrarily?
7. Are bots beatable but worth replaying, with difficulties perceptibly different?

**Suggested provisional go/no-go tests:** Complete at least ten solo sessions across 2/4/6 layouts; confirm no stuck balls or broken elimination/serve logic. Ask a handful of optional desktop testers to play three rounds each; record confusing moments and whether they choose to rematch. Adjust thresholds based on actual feedback. If the loop does not work, **rework the core prototype and M02–M07** rather than pushing on to mobile or public networking.

---

## 5. Technical architecture

### Phase A and B: entirely local, static game

```text
GitHub Pages / static dev server
  └─ Browser
      ├─ React menus + HUD (normal DOM/CSS)
      ├─ Three.js/WebGL2 (procedural 2.5D rendering)
      ├─ Desktop mouse + keyboard / later mobile touch adapter
      ├─ Pure fixed-step simulation
      │   ├─ Arena/rails/collision
      │   ├─ Balls, spin, health, elimination, escalation
      │   └─ Bots (all non-human seats)
      └─ Local session statistics / replay diagnostics
```

Preferred stack: **strict TypeScript + Vite+**, pnpm as the package manager, React for menus, Three.js/WebGLRenderer and composer/bloom, Vite+'s Vitest integration with co-located tests, Playwright for browser flows, and GitHub Actions for CI/Pages deployment. Prefer Vite+'s integrated format/lint/typecheck tooling rather than maintaining a parallel ESLint/formatter setup. Use `vp dev`, `vp check`, `vp test` and `vp build`; project-local invocation through `pnpm exec vp` is acceptable. Pin the toolchain/runtime and commit the lockfile. If an actual compatibility blocker requires standalone tools, document it and review the exception rather than silently abandoning Vite+. Use small composable pure functions, immutable state transitions where practical, straightforward functional modules and no large framework of abstract classes. WebGL2 is the primary compatibility target; WebGPU is not required.

**GitHub Pages notes:** Vite must use the correct asset base for a project subpath, or deploy to a custom root domain. For private room URLs later, choose a static-host-friendly router (hash routes, query links, or a verified fallback), not an assumed SPA server rewrite. Browser-side environment variables are public; never ship broker/TURN secrets in client assets.

### GitHub Actions and GitHub Pages — required from M01

Create `.github/workflows/ci.yml` and `.github/workflows/pages.yml` with the M01 scaffold, rather than waiting until M08:

- **CI:** Run on pull requests and default-branch pushes. Set up the pinned Vite+ toolchain with `voidzero-dev/setup-vp` at an exact release or commit, install locked dependencies, then run `vp check`, non-interactive unit tests and `vp build`. Add browser smoke tests as they become available.
- **Pages:** Support manual `workflow_dispatch` and default-branch pushes. Build and validate the selected revision before publishing; PRs never publish. Use the official `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages` actions, with a deployment job depending on a successful build/check/test job. Pin action versions at implementation time.
- Publish only the game build output directory. Use `contents: read` by default and grant `pages: write` / `id-token: write` only to the deployment job. Use the `github-pages` environment, deployment concurrency and a reported site URL.
- Configure the Vite asset base for the actual repository Pages path; verify a production preview under that path, including assets and refresh/navigation. Never hardcode a guessed repository owner or URL.
- The publishing workflow is explicitly requested. Once the repository and Pages are configured and publishing is enabled, successful default-branch pushes or an intentional manual run publish the game. Do not introduce another per-release approval prompt. Creating/pushing a remote repository or changing its settings still requires an instruction covering that action; this plan edit itself does not perform those actions.
- M01 review must distinguish a locally validated workflow from an actual successful GitHub run and live-site check. If no remote exists yet, deliver the workflow and record the missing repository/Pages setup honestly.

References: [Vite+ commands](https://www.viteplus.dev/guide), [Vite+ CI setup](https://www.viteplus.dev/guide/ci), [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Recheck supported versions when implementing.

### Phase C: P2P gameplay + minimal Cloudflare control plane

```text
                        GitHub Pages
                       static game bundle
                              |
              +---------------+---------------+
              |               |               |
         Browser A        Browser B        Browser C ... (2–6)
         elected host      peer client      peer client
         sim + bots        input/render     input/render
              |<========== WebRTC DataChannels ==========>|
              |                                              
              +------ Cloudflare Worker API -----------------+
                             |
                    Durable Objects
                    matchmaking queues
                    room/signalling lifecycle
```

- **One browser is authoritative for each match.** It executes the same simulation as offline, including bots and match timing. Other players send bounded input intents, render state with interpolation and predict *only* local non-authoritative paddle presentation where useful.
- **Star topology for six seats:** Five peer connections to the host is the preferred initial design, not 15 fully meshed connections. The host pays additional outbound traffic/CPU. Test realistic consumer connections and mobile constraints.
- **WebRTC DataChannels:** Consider an unreliable/unordered channel for frequent state snapshots and a reliable/ordered channel for important round events and resync. The precise protocol is decided via latency tests. Authenticate each negotiated channel with a match-specific token after signalling; never believe a client-reported hit, damage or winner.
- **Cloudflare is not the simulation server:** Workers/Durable Objects handle admission, queueing, match allocation, ephemeral session tokens and WebRTC offer/answer/ICE exchange only. Once connected, simulation packets go client-to-client or through TURN when P2P fails.
- **STUN/TURN:** STUN assists NAT traversal; TURN is needed for some restrictive networks. TURN can incur bandwidth charges. Direct P2P may reveal players' network addresses to other peers; a **relay-only privacy option** trades cost/latency for hiding direct IP candidates. Treat connection failure explicitly in the UI; don't claim universal P2P reachability or zero cost.
- **Host selection:** Prefer a connected, stable, low-latency browser; all selection inputs are untrusted hints. Test what happens when it quits, sleeps or loses connectivity. For a ~2-minute casual match, a clear match-abandoned fallback may be preferable to complicated migration initially. Later host migration must carry an authoritative snapshot, input sequence, ownership and match clock, and handle divergent peers.
- **Limits:** An authoritative P2P host can cheat by manipulating its runtime. A secure matchmaking broker reduces abuse **of the broker**, not cheating **inside the hosted match**. Do not introduce public ranked ladders or prizes that imply trustworthy competitive results until this is solved.

### Repository shape

```text
apps/
  web/                 Vite + React + Three.js; offline first
  broker/              Cloudflare Worker + Durable Objects (only in late phase)
packages/
  arena/               Pure polygon/rail/fortress geometry
  simulation/          Fixed-step physics, health, bots, pacing, replays
  protocol/            Types, validators, message versions (added for networking)
  testing/             Optional shared replay/load fixtures (only if useful)
docs/
  MATCH_PACING.md      Created during M06
  PLAYTEST.md          Created during M08
  SECURITY.md          Created during M13
AGENTS.md              Working conventions, if used with Codex
PLAN.md                This file
```

Only create a package when it reduces real coupling. **Do not create an `apps/server` Colyseus application** as a dependency of the agreed design.

### Nonfunctional criteria

- Local play works offline after assets have loaded; networking failures cannot affect solo mode.
- Desktop aims for **60 FPS**, measured on real hardware; 120 Hz simulation is a candidate, not a promise. Establish mobile performance budgets during mobile milestones.
- Snapshot/replay tests detect unintended gameplay changes. Use explicit event IDs and deterministic tie-break ordering. Cross-browser determinism is a test target, not assumed guaranteed.
- Performance and accessibility: reduced bloom, motion and particles, clear health indication, keyboard-only path, muted sound support and contrasting player identifiers. Full mobile quality decisions happen after desktop validation.

---

## 6. Milestone sequence and approval gates

### Operating contract for Codex or another implementation agent

1. Read `PLAN.md` (and `AGENTS.md` if present). A request to **"do the next milestone"** selects work using the checklist and resume rules below; it does not require the user to remember an ID. Work on that one milestone only; do not silently implement future milestones.
2. Begin with a short implementation checklist. Keep functions focused, strict TypeScript enabled, tests near code, and no unrelated refactors.
3. Run typecheck, lint, relevant tests and production build. Start a usable local demo when appropriate. Never report a test passed unless it ran.
4. Report changes, commands, results, failures, known limits and specific user-review questions. Include screenshots or short recordings when applicable.
5. Finish with **`REVIEW REQUIRED — Mxx`**. **Stop**. Only the user can approve or request amendments; do not self-approve or begin the next milestone.
6. Make frequent scoped local commits at coherent checkpoints during implementation; commits do not require milestone approval and do not imply it. Record relevant commit IDs and approval separately in the ledger. Explicit `APPROVE Mxx` is sufficient; asking to do the next milestone while Mxx is awaiting review also approves Mxx and authorises the next milestone. In the latter case, finish recording Mxx, commit any remaining task changes, then proceed with the next milestone in the same turn. Approval alone does not authorise starting another milestone. **Never push or manually trigger a remote deployment unless the user explicitly asks.** Milestone requests, approvals and local commits are not permission to push. See `AGENTS.md` for the concise working agreement.
7. No purchasing, public service deployment, secrets creation in shared code, production data migration or unapproved external account actions. The requested GitHub Pages publishing workflow follows the authorisation and trigger policy above; new Cloudflare resources still need explicit authorisation.
8. Preserve the no-textures rule, polygon topology, local-first progression and architecture. Implementation convenience is not permission to reverse those decisions.

**Invocation examples:** `Do the next milestone` or `Implement M01 only from PLAN.md. Follow its acceptance criteria and stop at REVIEW REQUIRED.`

### Milestone checklist and resume rules

**Current position:** M01 in progress — repository scaffold delivered; playable prototype remains. **Next: resume M01.** Update this line whenever work changes state.

Check a milestone only when implemented, validated and approved. A delivered milestone awaiting review remains unchecked; the ledger records that distinction.

- [ ] **M01** — First playable four-player prototype, Vite+ scaffold, CI and Pages workflow.
- [ ] **M02** — Responsive controls, contact aiming and preview/slowdown comparison.
- [ ] **M03** — Collision stress cases, deterministic physics and replay fixtures.
- [ ] **M04** — Physical destruction, revenge serves, elimination and result rules.
- [ ] **M05** — All 2–6-seat layouts and tuned bot difficulties.
- [ ] **M06** — Spin, multiple balls and pacing decision.
- [ ] **M07** — Visual legibility, effects, sound and HUD.
- [ ] **M08** — Desktop MVP release readiness and playtest validation.
- [ ] **M09** — Responsive touch interaction.
- [ ] **M10** — Mobile performance and usability validation.
- [ ] **M11** — WebRTC multiplayer prototype.
- [ ] **M12** — Private rooms and signalling.
- [ ] **M13** — Broker security foundation.
- [ ] **M14** — Public matchmaking.
- [ ] **M15** — Multiplayer reliability and rollout decision.

When asked to **"do the next milestone"**:

1. Read this checklist, the ledger and the current files. Reconcile any stale status against actual evidence; never infer completion from files alone.
2. Resume the lowest-numbered unfinished milestone if it is `In progress` or `Changes requested`. If none is active or awaiting review, start the first unchecked milestone.
3. If the previous milestone is `Awaiting review`, the user's request to move to the next milestone counts as approval to advance, provided its required checks passed and no required acceptance work remains. Record that approval before continuing. Report outstanding failures and finish that milestone instead if it is incomplete; do not treat the request as waiving failures.
4. Set the chosen row to `In progress`, update the current-position line and make a short task checklist from that milestone's acceptance criteria.
5. At handoff, record `Awaiting review` (or `Changes requested`/`Blocked` when accurate), evidence paths, commands/results and remaining issues in the work record below. Keep its checkbox unchecked until approved.
6. On approval, set `Approved`, check the box, record approval/commit and advance the current-position line. Work on no more than the one newly selected milestone per request.

**Allowed ledger statuses:** `Not started`, `In progress`, `Awaiting review`, `Changes requested`, `Blocked`, `Approved`. A blocker must state the concrete dependency and the next useful action.

### Current milestone work record

- **Milestone:** M01, scaffold portion only (requested separately on 10 November 2026).
- **Implemented / remaining:** Pinned Vite+/pnpm/Node toolchain, strict TypeScript, modular React shell and procedural Three.js stage, resource cleanup, local unit/browser tests, CI and Pages publishing workflows. Remaining: actual arena/rails/paddles, input, simulation, physical health, bots, revenge serves, elimination and rematch. No M01 acceptance or approval implied by scaffolding.
- **Checks and evidence:** `pnpm check` passed (format/lint/typecheck); `pnpm test` passed (17 tests); `PAGES_BASE_PATH=/citadel/ pnpm build` passed; `pnpm test:browser` passed (3 Chromium cases: project-path load/refresh, narrow viewport, unavailable WebGL2 fallback); both workflow YAML files parsed; `git diff --check` passed. Rendered screenshot reviewed at `test-results/scaffold-production-app-lo-dc453-e-GitHub-Pages-project-path-chromium/scaffold-desktop.png` (generated, ignored). Local dev: `pnpm dev`.
- **Review decisions / blockers:** React retained for DOM UI after user discussion. Use `gh` only after asking; never push without explicit instruction. GitHub workflow runs, repository Pages settings and live deployment are unverified and unchanged. Build reports a >500 kB chunk warning for the combined React/Three.js bundle; consider splitting renderer loading as the app grows.
- **Next action:** Resume M01 gameplay when requested. Scaffold commit: `8de11d5`; follow-up workflow/documentation commit recorded in Git history.

### Progress / approval ledger

| ID | Stage | Reviewable deliverable | Status | Approval | Commit |
|---|---|---|---|---|---|
| M01 | **First playable** | Four-seat prototype: human + bots, physical damage, revenge serve, rematch | In progress | — | 8de11d5 (scaffold) |
| M02 | Desktop core | Refine responsive controls, contact aiming, preview/slowdown experiments | Not started | — | — |
| M03 | Desktop core | Real ball physics, swept collisions and deflections | Not started | — | — |
| M04 | Desktop core | Harden physical damage, revenge serves, elimination and result rules | Not started | — | — |
| M05 | **Solo expansion** | All 2–6-seat layouts, tuned bot difficulties, full solo validation | Not started | — | — |
| M06 | Solo proof | Spin/ball tuning and evidence-based 2-minute escalation | Not started | — | — |
| M07 | Solo proof | Geometry-first effects, audio, readable HUD and feel | Not started | — | — |
| M08 | **Desktop validation gate** | Public-ready static solo build, playtests and decision | Not started | — | — |
| M09 | Mobile | Touch steering, tap launch and responsive layouts | Not started | — | — |
| M10 | **Mobile validation gate** | Mobile GPU/performance/accessibility and real-device tests | Not started | — | — |
| M11 | Multiplayer | WebRTC host/client prototype with local/manual signalling | Not started | — | — |
| M12 | Multiplayer | Cloudflare private-room signalling, invitations and reconnect | Not started | — | — |
| M13 | Multiplayer security | Broker security primitives, limits and abuse test harness | Not started | — | — |
| M14 | **Public matchmaking** | Secure exact-size player pools, random matching and bot fallback | Not started | — | — |
| M15 | Multiplayer beta | Network fault tolerance, multi-browser load test, rollout decision | Not started | — | — |

### PHASE A — Desktop browser; human versus bots

#### M01 — First playable four-player prototype

**Implement:** Scaffold strict TypeScript with Vite+ and a procedural Three.js view, keeping simulation independent. Add the required GitHub Actions CI and Pages publishing workflows described above. Build only the four-corner square: one human, three basic bots using normal intents, one ball, curved responsive paddles, contact-position aiming, walls and eight physically collidable health pieces per fortress. Include swept collision for supported prototype speeds, visible piece destruction, return to the surviving damaged defender, tunable serve deadline, elimination, a basic winner/result and immediate rematch. Use the labelled seeded elimination-serve fallback and empty-sector wall rebounds. Add mouse/keyboard input, stable tilted camera, modest luminous geometry and minimal diagnostics. Include a short conditional aim-preview toggle and an approach-slowdown toggle, initially off; keep these simple experiments. No advanced spin, other layouts, networking or elaborate polish.

**Acceptance:** One person can play and rematch complete four-player rounds without editing state. Physical hits destroy only the contacted piece; gaps cause no automatic damage; a surviving damaged defender receives the next serve; eliminated seats never receive serves; a winner ends serving. Focus loss pauses solo play and clears held inputs. Run focused geometry, collision, damage, serve and elimination tests plus typecheck/lint/build. Provide a four-seat screenshot, a short gameplay capture and a local demo. Identify the missing sketch rather than claiming reference fidelity. Validate the production asset base and inspect the CI/Pages workflow configuration; report actual remote-run/deployment evidence only when available.

**Review:** Does movement feel responsive, can returns be aimed, are destruction and revenge serves satisfying, and do gap rebounds make sense? Compare preview/slowdown settings in play. Record limitations rather than treating this as release-ready physics. **STOP: REVIEW REQUIRED — M01.**

#### M02 — Refine controls and deliberate aiming

**Implement:** Iterate on the M01 interaction from hands-on feedback. Refine pointer-to-arc mapping, speed caps, optional acceleration, contact-angle range, keyboard steering, click/Space/Enter launch, focus, resize and selection of any of the four seats. Compare preview only, slowdown only, both and neither; report preferences and tradeoffs, then propose defaults for review. Slowdown changes simulation identically for bots and humans; the preview is informational. Touch remains excluded.

**Acceptance:** Boundary clamps, movement limits, launch semantics and any slowdown restoration/non-stacking rules are tested. No free teleporting saves or misleading guaranteed-path preview. Demonstrate deliberate centre/edge returns. **Review:** Choose responsive feel and whether either assistance experiment earns a place. **STOP: REVIEW REQUIRED — M02.**

#### M03 — Harden ball physics and paddle contact

**Implement:** Extend the existing fixed-step swept collision system to stress speeds, corners, grazing hits, moving paddles, health-piece gaps and rebounds from behind the defence. Define deterministic impact ordering and bounded collision iterations. Add impact logs, seeded replay fixtures and frame-rate independence checks. Keep one ball and no complex spin.

**Acceptance:** No tunnelling in documented stress scenarios; no physics-dependent render frame rate; repeated fixtures reproduce impact ordering; balls cannot become permanently trapped in empty fortresses. **Review:** Are rebounds predictable and readable at useful play speeds? **STOP: REVIEW REQUIRED — M03.**

#### M04 — Harden destruction, revenge serves and match rules

**Implement:** Refine physical-piece damage and destruction feedback. Test ties, simultaneous events, final-piece hits, elimination serve allocation, automatic-launch timing, result/rematch and optional spectating. Review the provisional elimination fallback explicitly. Track last-hit attribution separately if useful; it never overrides the damaged defender's next serve. Test health-zone returns and empty-sector behaviour rather than treating the defence arc as a damage boundary.

**Acceptance:** One ball damages at most one physically contacted piece before returning; misses and gaps do not destroy another piece; all serve/death/tie cases are covered; no post-victory launches. **Review:** Does losing a piece remain clear, does revenge serving preserve momentum, and what should happen after an eliminating hit? **STOP: REVIEW REQUIRED — M04.**

#### M05 — Expand the proven solo game to 2–6 seats

**Implement:** Extend arena generation to rectangle, triangle, pentagon and hexagon alongside the square. Support one human in any seat and bots in the others. Refine seeded intercept/deflect bots with reaction delay, imperfect prediction and Beginner/Standard/Expert parameters. Add player-count selection, basic results and developer statistics. Provide eight readable pieces and consistent rules in every layout. Keep only essential visual polish; follow the established GitHub Pages publishing policy.

**Acceptance:** Play and rematch full 2/3/4/5/6-seat games locally; symmetry/rail geometry tests cover all layouts; provide 2/4/6 screenshots and gameplay capture. Bots use normal input intents and exhibit meaningful skill differences. **Major review gate:** Play ten rounds across 2/4/6. If the idea is not fun, iterate rather than continue. **STOP: REVIEW REQUIRED — M05.**

#### M06 — Curved shots, multiple balls and **pacing design gate**

**Implement:** Add measured paddle spin and bounded curving trajectories; 1–8 ball handling with revenge serves, sensible initial serves, elimination reassignments and multiple attached-ball handling. Revalidate any approved approach slowdown and preview under multiple-ball pressure. Add a tuning interface and replay harness. Create `docs/MATCH_PACING.md` comparing **at least three** escalation systems, test the best two, run seeded bot benchmarks by arena size, and report distribution of match length and damage. Propose (do not silently lock) a default escalation curve and anti-stall rule.

**Acceptance:** Zero-spin behaves normally; replayable fixtures hold for simultaneous balls; bot-only pacing data is clearly labelled. **Review:** Pick escalation, ball counts, spin limits and approximate 2-minute profile based on evidence. **STOP: REVIEW REQUIRED — M06.**

#### M07 — Legibility, impact and arcade character

**Implement:** Implement only the approved escalation. Polish luminous thick-edged geometric materials, useful shot-attribution marks if approved, spin trails, paddle sparks, struck-piece fracture/burst, elim/victory states and restraint under high ball density. Add *original generated/synthesised* sound cues (serve, ricochet, breach, elimination, rising tension), volume/mute and a readable HUD. Provide Low/Medium/High effects options. No textures outside the permitted particle optimisation exception.

**Acceptance:** Ball and health remain trackable at 2/4/6 players; screenshots show genuine 2.5D depth; desktop feel and sound enhance rather than hide gameplay; tests still pass. **Review:** Is this visually recognisable and pleasant at speed? **STOP: REVIEW REQUIRED — M07.**

#### M08 — **Desktop browser MVP release and idea-validation gate**

**Implement:** Make a polished **Play vs Bots** landing experience, quick total-player selector, controls hint, restart/rematch, build/version indicator and solo-only settings. Revalidate the M01 GitHub Pages workflow and asset base against the actual repository URL; verify the deployed build when repository publishing is enabled. Follow the established publishing trigger policy rather than introducing a new per-release approval prompt. Write `docs/PLAYTEST.md` with repeatable scripted checks, observations and optional external feedback prompts. Add Playwright desktop smoke tests and a simple local stats export.

**Acceptance:** Complete one-human-versus-five-bots match from a freshly opened desktop URL; clean startup, no console-breaking errors, no account, clear replay. Document what a few testers find confusing, actual match times and the next design changes. **Decision:** Go to mobile only if the core interaction has earned it. **STOP: REVIEW REQUIRED — M08.**

### PHASE B — Mobile touch; still one human versus bots

#### M09 — Responsive touch interaction

**Implement:** Add a touch input adapter over the identical `PlayerIntent` interface. Implement relative-drag steering, tap-to-launch (separate gesture thresholds and cancellation), optional large launch button, pointer capture and touch-specific hints. Fit the geometry/HUD to portrait and landscape orientations, safe areas and small screens; handle orientation changes and background/foreground transitions.

**Acceptance:** Touch gameplay does not scroll the page or confuse drags with launches; all arenas can be played with bots; layout does not crop threat areas. **Review:** Is it genuinely playable one-handed or two-handed on a phone? **STOP: REVIEW REQUIRED — M09.**

#### M10 — **Mobile performance and usability gate**

**Implement:** Profile real mobile devices, tune bloom/render target resolution, geometry instancing, pixel ratio and effects presets. Add reduced motion/flash, high contrast, accessible controls/focus and reasonable audio handling. Test Safari iOS and Chrome Android where devices are available; report anything untested rather than claiming coverage. Measure heat, battery/performance constraints, tab suspension and input latency.

**Acceptance:** Clear 2/4/6-player layouts and playable matches on the tested devices; publish measured frame times and fixes. **Decision:** Only begin networking when desktop and touch versions of the *same* offline game work. **STOP: REVIEW REQUIRED — M10.**

### PHASE C — Multiplayer and broker; last

#### M11 — WebRTC multiplayer proof without public infrastructure

**Implement:** Prototype two connected browsers first, then up to six. Use **host-authoritative** client-side physics in one browser, peer input intents and snapshot/event synchronisation over WebRTC DataChannels. Support manual copy/paste signalling or a local test-only signalling harness so no Cloudflare resource is required. Use the pure existing simulation; keep bots filling non-human seats. Add diagnostic latency, message sequence, packet loss and divergence tools.

**Acceptance:** Two real browsers see one consistent 2-minute match; six-browser automated/simulated tests exercise all seats; a hostile client cannot directly declare damage or victory. Test jitter and offline-mode regression. **Review:** Does latency compromise ball/paddle feel? **STOP: REVIEW REQUIRED — M11.**

#### M12 — Cloudflare private rooms and signalling

**Implement:** Add Cloudflare Worker API and room Durable Objects (hibernating WebSocket signalling), guest admission, short-lived session IDs, six-character invite code/URL, copy/share link, ready-up, host assignment, bot-fill option, disconnect handling and timeboxed reconnect. Use Cloudflare only for coordination and ICE signalling; no ball physics in the Worker. Keep routes compatible with GitHub Pages static hosting. Integrate configurable STUN/TURN and explicit connection failure states; do not store long-lived TURN credentials in the public bundle.

**Acceptance:** An approved deployment can create a private room; two remote users join via link and play; late/expired/invalid links fail safely; session cleanup runs; no account needed. Basic protections are present, but **no publicly discoverable matchmaking queue yet**. **Review:** Can a nontechnical invitee join without instructions? **STOP: REVIEW REQUIRED — M12.**

#### M13 — **Security foundation before exposing open matchmaking**

**Implement:** Create `docs/SECURITY.md` containing threat model, trust boundaries, data-retention policy, cost budget and incident/disable procedure. Harden broker Worker/DO endpoints with schema validation, bounded payloads, strict state-machine transitions, route-specific quotas, anonymous short-lived credentials, single-use match tickets, short expiries, idempotent join/cancel/reconnect, per-session active-queue limits, and server-side Cloudflare Turnstile validation for untrusted queue entry or suspicious reuse. Use Worker rate limits for coarse protection, plus DO-atomic limits for strict per-session/global invariants. Secure WebSocket origin checks as a defence-in-depth measure, **not** authentication. No credential or secret in client code.

**Security test cases:** automated join floods, rapid reconnects, queue churn, fake ready signals, replayed/expired tickets, forged membership/host messages, oversized or malformed SDP/ICE data, conflicting double-joins, repeated room allocations, idle sessions, high-cost requests, IPv4/IPv6 changes and many users behind one mobile NAT. Verify quotas and cleanup under concurrency. Add operational kill switches and cost monitoring.

**Acceptance:** Every public write action has an abuse policy; all privileged state changes are broker-validated; repeated attacks are bounded and observable. Test with fake clients and report limits honestly. **No public quick match until M13 is approved. STOP: REVIEW REQUIRED — M13.**

#### M14 — **Public random matchmaking by preferred player count**

**Implement:** Add **Quick Match** for exactly 2, 3, 4, 5 or 6 **total** participants. Maintain separate waiting pools per requested count; do not silently move someone from six to four. A Durable Object owns each relevant queue/shard and atomically forms a complete group, reserves seats, issues single-use match-bound connection tickets and assigns a host. Start with one queue per count; introduce region-aware pools only when population and measurements justify it (avoid fragmenting an already-small user base). Support cancellation, heartbeat/TTL, ready deadlines, early departures and reconnect. Prevent multiple open entries from one issued session. Show honest queue size/waiting feedback without exposing a player list/IP addresses.

**Bots and low-population policy:** Allow a **clearly labelled user choice** between *humans only* and *fill empty seats with bots after a configurable wait*. A six-seat match with one human and five bots is allowed only when bot fill is chosen; never imply bots are random humans. Existing local bot logic runs on the chosen match host. A bot replaces a disconnected player if permitted by match rules. Do not claim a perfect six-human match unless six real users are committed.

**Acceptance:** Six simultaneous users selecting six form one match; users selecting 2 and 4 remain in their own pools; concurrent joins/cancels never assign a user twice; expired slots release; bot-filled matches are clearly marked. Run synthetic queue and abuse/load tests before opening access. **STOP: REVIEW REQUIRED — M14.**

#### M15 — Multiplayer beta, reliability and rollout decision

**Implement:** End-to-end test real desktop/mobile combinations, 2–6 connections, mixed bots, STUN-only/TURN-required conditions, adverse latency, disconnects, sleep/wake, host disappearance, match ending, rematch and queue return. Evaluate host migration; implement it only if it is clearly less risky than transparent early termination for casual play. Simulate suspicious peers; document the **P2P host-cheating limitation** and IP privacy trade-offs. Measure broker operations, WebSocket usage, TURN egress/cost and connection failure rates. Add fault logging with minimal retained data, alerts/quotas and a tested shutdown switch. Keep solo mode functional when the broker is down.

**Acceptance:** Reproducible load/chaos reports, no orphaned queues, bounded spend, understandable failure states and a documented beta rollback procedure. Public rollout requires explicit approval, not merely passing tests. **STOP: REVIEW REQUIRED — M15.**

---

## 7. Security and privacy policy for the later broker

The matchmaking service will be an **open internet target**. Security is a condition of publishing Quick Match, not polish added later.

| Threat | Control / important limit |
|---|---|
| Scripted bot joins | Cloudflare Turnstile with mandatory **server-side** token verification when used; session quotas and risk-triggered challenges. Turnstile is not proof of a unique human. |
| Request floods | WAF/rate limits at edge; per-route/per-identity quotas. Cloudflare Worker rate-limit bindings are **approximate**, so strict invariants live in Durable Objects. |
| Sybil/fake players | Ephemeral identities, single active queue entry per session, cooldowns and bounded resource cost. Cannot guarantee one human per anonymous identity. |
| Replay/forged invites | Cryptographically random high-entropy tokens, short TTL, single-use match tickets, binding to room and admitted identity. Human-friendly room codes are **locators**, not the only authorisation secret. |
| Queue races | Server-owned state transitions and atomic seat reservation; idempotent operations, no direct client writes to internal queue state. |
| Fake matches/ready/host | Only broker chooses seats and host; channel authentication; don't trust client-supplied membership. |
| SDP/ICE abuse | Strict message types/sizes/rates; drop excess candidates, reject unknown session state, enforce handshake timeouts. |
| DoS/cost abuse | Max queue/room lifetimes, bounded WebSockets, alarms/cleanup, strict worker budget and operator kill switch. |
| Griefing/abandonment | Progressive reconnect/cooldown policies that avoid unfairly punishing flaky networks; bots may replace leavers. |
| Client-side cheating | Host has final gameplay authority; tampering cannot be fully prevented without a trusted server. No ranked/paid competitive stakes initially. |
| Privacy / IP address | P2P ICE can reveal network addresses; optional TURN-relay-only mode, short retention, no public player listing. |
| Token theft / secret leakage | HTTPS/WSS, secure cookie or carefully handled short-lived credentials, no secrets in static JS, avoid URL-logged auth secrets. |

Cloudflare documentation to check when implementing (product behaviour and plan limits can change):

- Durable Objects + hibernating WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Workers + Durable Objects overview: https://developers.cloudflare.com/durable-objects/
- Workers rate limiting and its approximate nature: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Turnstile server validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- WebRTC `iceTransportPolicy: 'relay'`: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection
- GitHub Pages static publishing: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

---

## 8. Testing matrix and evidence

**Every phase:** Vitest unit/property fixtures for polygon geometry, paddle limits, ball collisions, deterministic event ordering, physical health damage, revenge-serve allocation, elimination and bot decisions. Stage coverage with implemented features: M01 covers the four-player prototype; expand to all layouts at M05 and multiple balls at M06. Playwright desktop flows for initial play through rematch. Seeded logs and a locally replayable test scenario for regressions.

| Dimension | Minimum cases |
|---|---|
| Players / arena | 2 rectangle, 3 triangle, 4 square, 5 pentagon, 6 hexagon |
| Human/bots | One human + 1/2/3/4/5 bots; later mixed human/bot online |
| Ball count | 1, 2, 4, 6, 8 (including simultaneous contacts) |
| Physics | Head-on, tangent, corners, max speed, wall/paddle/arc coincidence, spin off/on |
| Health | Actual struck piece, gap traversal without damage, last piece, simultaneous contacts, revenge serve, eliminating hit, pending serve recipient eliminated |
| Sessions | Ready, launch, score, elimination, finish, rematch, focus lost, restart |
| Desktop | Mouse aim/click, keyboard alternatives, resized window, reduced effects |
| Mobile (Phase B) | Tap vs drag, orientation, safe areas, pointer cancellation, app backgrounding |
| Multiplayer (Phase C) | 2–6 browsers, high RTT, loss, relay-only, host drops, reconnect, malformed intents |
| Broker (Phase C) | 2–6 separate queues, race conditions, churn, rate limits, forged credentials and bot floods |

**Gate evidence format:** `implementation summary` + `tests actually run` + `2/4/6 screenshots when relevant` + `known failures` + `what the user should try` + `REVIEW REQUIRED — Mxx`.

## 9. Explicit exclusions until later approval

No public rankings or prize competitions; no account/social system; no in-game purchases; no pay-to-win; no intricate power-ups; no elaborate cosmetics; no gamepad-first design; no team modes; no native mobile app wrapper; no arbitrary sudden-death health deletion; no central always-on physics server; no server-side replay archive; no persistent player tracking; and **no public matchmaking before both the core game and broker security have been approved**.

Potential extensions **only after validation**: campaign-like bot challenges, time-trial/solo survival, daily seeded challenge, spectator/replay links, cosmetics made from procedural geometry, community tournaments, adaptive bot difficulties, host migration, region-aware queueing and optional relay-only privacy mode.

---

## 10. First action

**Start revised M01 only when implementation is requested.** Build a playable four-player square in the browser: one human, three basic bots, one ball, responsive curved paddles, eight physical pieces per fortress, visible destruction, revenge serves and immediate rematch. Include simple preview/slowdown experiments for hands-on comparison. Keep enough procedural thickness and luminous edges to communicate the intended style, using a stable camera.

Judge the rally and damage loop before spending milestones on five layouts or presentation polish. The sketch is currently unavailable; follow the written layout and disclose that limitation. Do not silently proceed beyond the M01 review; prepare CI and Pages publishing under the established trigger policy. The remaining roadmap follows only after the core interaction proves worthwhile.
