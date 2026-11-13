# CITADEL — PLAN.md

**Status:** Shared design in progress; confirmed rules and provisional prototype experiments distinguished below.  
**Updated:** 13 November 2026\
**Genre:** Fast, competitive, polygon-arena paddle/ball survival  
**Target:** Understandable, tense matches that usually resolve in approximately **two minutes**. Difficulty is ramped as the game goes on.
**Players:** 2–6 seats, initially **one human and the remaining seats filled by bots**  
**Delivery order:** **Desktop browser + mouse + bots → mobile browser + touch + bots → multiplayer P2P → secure public matchmaking**  
**Hosting:** Static game on GitHub Pages; Cloudflare matchmaking/signalling only in the final phase

> **Product rule:** Prove that the game is fun against bots *before* spending time finding human testers, building mobile controls, or running network infrastructure. The first externally playable build is a single-player-versus-bots desktop web game.

---

## 1. Product vision and decisions

This takes inspiration from the immediacy of *Warlords*, the luminous geometry and motion of *Geometry Wars*, and the depth, edge treatment and controlled bloom associated with *Tron*. This is a 3D presentation over 2D gameplay. The camera must feel alive through a restrained orbit/tilt/breathing motion, while preserving camera-independent relative input. Camera movement is presentation-only and must never steer a stationary mouse or alter simulation. It must be an **original-looking game**, not a remake using existing franchise assets.

One player occupies each defensive sector of a shared arena. Each player has a **thick, curved paddle** moving along a fixed arc in front of **three initial visible, destructible containers**, with extra containers collected from temporary falling supplies. Balls travel across the arena. Paddles return them to play and can impart spin. A ball must **physically collide with a remaining health piece** to destroy it. That piece disappears with a clear graphical flourish; the ball bursts and returns to the **damaged defender's paddle** for a revenge serve, provided they survive. Passing the paddle or crossing its rail alone causes no damage. Losing all remaining containers eliminates a player. **Last survivor wins.**

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
| Camera | **Perspective RTS view**, behind the selected human fortress, about 38° down with a gentle live orbit |
| Artwork | Procedural geometry only; **no surface textures** |
| Visual style | Dark frosted reflective volumes with saturated neon tracing their edges, localised bloom and softened procedural reflections |
| Health | Three initial physical containers; hit landed supply containers with the last-struck ball to add health. Supplies arrive during the opening minute, then stop. Survivors grow slightly and spring together after damage |
| Damage | Physical collision destroys exactly the struck health piece with a graphical flourish; no nearest-piece substitution |
| Next serve after damage | Damaged defender receives the ball for a revenge serve if still alive; elimination fallback remains open |
| Elimination/winner | No health left = eliminated; last survivor wins |
| Aiming | Captured relative mouse movement; keyboard alternative; touch later |
| Presentation | Full viewport Three.js scene, no visible HUD or surrounding copy during play; scene title/count/Start and victory/rematch; compact Pause settings |
| Serving | Mouse click / Space / Enter initially; mobile tap later |
| Pacing | Adrenaline first: start with one ball and add balls over time; roughly two minutes remains a tuning target |
| Current ball tuning | Radius 0.187 (10% larger), speed 24 units/s (double the first prototype); provisional extra-ball interval 15s and cap four |
| Shot reach | Every defender can attack both adjacent rivals and bank off both walls beside their bat |
| Client/runtime | Strict TypeScript; Three.js/WebGL; fixed-step 2D simulation |
| Offline hosting | GitHub Pages (static HTML/CSS/JS only) |
| Multiplayer | WebRTC DataChannels; one browser is authoritative host; *no dedicated simulation server* |
| Matchmaking | Later: Cloudflare Workers + Durable Objects, queues by preferred total player count |
| Security | Public broker treated as untrusted/abusable from its first public release |

**Superseded direction:** The older plan suggested Colyseus/Node as a central authoritative game server and introduced multiplayer before mobile. Both are **replaced** by the order and P2P architecture above. Keep the simulation independent so a dedicated authoritative server remains a possible future response to cheating or scale, but **do not build one now**.

### Intentionally unresolved design choices

Do not quietly make these permanent rules without a review:

1. **Shot attribution:** The user requested visible last-hit attribution during M07/M08: balls and trails now take the last striker's colour, with coral for the default human. Review readability and success feedback in play. Attribution never determines the post-damage serve recipient: the damaged surviving defender still receives the revenge serve.
2. **Serve allocation:** Choose fair initial serves and the recipient after an eliminating hit. Prototype default: seeded initial selection; after an elimination, choose a surviving seat by seeded selection, unless the match has ended. These defaults need review. Ordinary non-eliminating damage always gives the damaged defender the serve.
3. **Damage geometry:** Choose whether health pieces are crystals, blocks, spheres or another distinctive extruded form at the M01 review. Every one must be individually readable.
4. **Escalation tuning:** User feedback during M01 explicitly calls for a 10% larger ball, double its initial speed and timed additions of extra balls for adrenaline. Prototype default: radius 0.187, speed 24, one initial ball and another every 15 playing seconds, capped at four. The 15-second interval and cap are provisional tuning choices. M06 revisits pacing evidence; it must preserve this agreed direction unless reviewed with the user.
5. **Two-player layout proportions:** Rectangle defenders are at the centres of opposite short ends, not two corners of a four-player arena. Tune length/width experimentally.
6. **Ties and the final simultaneous hit:** Define a deterministic policy, then validate its feel.
7. **End-of-life fortress:** After elimination the paddle stops defending and no health remains. M05 now gradually changes the arena to the surviving player count, usually over 2.8 seconds with a bounded-speed extension for large retargets, preserving identities and moving the floor coordinates of live balls. During that change, empty sectors remain traversable and current outer walls rebound balls. A further elimination retargets from the current shape; final victory is immediate. Transition dimensions/speed and floor carrying are provisional until M05 review; seeded eliminating-hit serve allocation remains unchanged.

### Prototype intuitions — provisional, to be judged by playing

These are starting experiments authorised for the prototype, not permanent design decisions:

- **Feel:** Start with precise, responsive defence and deliberate contact-position aiming, then explore escalating arcade pressure. The balance between precision, survival and targeting rivals is still open.
- **Movement:** Accumulate captured horizontal mouse deltas into a bounded bat-angle target, with a maximum paddle speed; start without pronounced acceleration lag. A late save should initially feel like moving too late rather than fighting momentum. Keyboard uses the same speed limits.
- **Aiming and bat curvature:** The bat's curved face is independent of its travel rail: rail radius 4.4, bat-face radius 2.2 and half-angle 0.48 radians. Rendering and swept collision use the same shape. Contact normals plus a bounded contact-offset adjustment govern returns. Serve aiming generally doubles the paddle-centre angle relative to the bisector (3.5× in the narrow triangle), capped to an inward ±1.45-rad fan. Bat travel is fitted against the real curved shape and current wall planes in every layout, leaving 0.015 units beyond its physical thickness; no ball-radius margin or two-player corner-sector cap. This permits attacks and wall banks without unreachable rail-end gaps. A short serve guide shows one wall rebound; defenders may intercept it. Actual serve direction has no random spread. The user-requested M03/M04 swipe experiment now uses a maximum 1.4 rad/s curve decaying at 1.8/s (under 45° total), with 100ms of fading recent-motion tolerance and visible spin bands/trail. This replaces the initially imperceptible curve at the user's request; speed and held-bat aim remain intact and it awaits review.
- **Piece placement and gaps:** User feedback replaces the long fixed health arc with a compact two-row formation inside the fortress. A destroyed piece leaves a real gap, but remaining pieces can subsequently move into that space under damped spring attraction and soft separation. Only an actual collision with a surviving piece causes damage; never substitute nearest-piece damage. Survivors gradually grow by 3.5% of their original size per loss, capped at 24.5%. Visible position and scale must match authoritative moving colliders. Initially paddles can intercept from either side so returning balls do not require an invisible exception. Review whether deeper rebounds are interesting or confusing.
- **Aim help:** M02 user clarification selects a dotted forecast from the nearby ball through a bounce off the stationary current bat and onward toward the next impact. Use actual fixed-step trajectory samples, show bounce/end markers, and leave room for future curved shots. Consider the earliest incoming ball within 8.4 units of the human fortress anchor, with a 0.45-second incoming horizon and up to 0.9 seconds after contact / one bank. Freeze current actor poses for this conditional forecast; it is not a guaranteed destination. Keep Neither / Preview only / Pressure slowdown only / Both choices. Preview only is the proposed default following this feedback.
- **Approach slowdown:** M02 feedback rejects routine delay. Keep optional **pressure-only relief**, off by default: detect two separated incoming catches within 0.45 seconds which demand a rapid move, and arm only the later arrival. It retains normal speed until the near-defence band, then uses a bounded 55% travel factor. Preserve the first catch's timing and ordinary bat responsiveness; maintain the existing speed cap. Latched relief can survive the first catch, and clears on departure/contact/exit/disable/elimination. Exclude paths already intercepted by another object and avoid triggering for shots one bat pose can cover. Apply equally to humans/bots; compare neither / preview / pressure-only / both. Thresholds remain reviewable and must be revisited with future spin.
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

For 3–6 seats, derive fortress anchors, arc centre, rail radius, allowed paddle angles, wall endpoints and ball spawn locations from a single polygon specification. M05 uses this per-match specification for every consumer and transitions it gradually as seats are eliminated; stable seat IDs retain their colours/health rather than being renumbered. A fortress sits *behind* its curved defence rail, towards its vertex/anchor. Balance the angle/radius and shielding opportunity by geometry, not by eyeballing each arena separately. M01 established the four-player square. M05 delivers all five layouts for review before desktop release.

### Rendering contract

- **No image textures, decals, sprites, photographed materials, raster skyboxes or HDRIs in the game world.** Use procedural meshes, extrusion, curves, emissive geometry, material properties, optional analytic shaders and instancing. An image atlas is permitted **only** if measured to improve particle performance. Bloom, antialiasing and reflection render targets are technical buffers, not artwork. Procedurally captured neon light cards may provide rough-metal reflections; do not add image/HDRI assets.
- Use a gently animated **perspective RTS camera** over genuinely extruded 3D geometry. The camera sits behind the selected human fortress, looking toward the arena centre at about 38° above the playing plane. Changing human seat rotates the view and selects the correct translucent foreground walls. Gameplay physics stays 2D in a separate coordinate plane. Captured relative mouse input is independent of camera projection. Motion is bounded to roughly ±1.7° yaw, ±0.9° tilt and ±0.45% zoom, with long smooth cycles. Freeze the current pose on pause or reduced effects/motion without snapping or accumulating a hidden jump. Camera motion cannot change the bat target. This supersedes the earlier orthographic view.
- Paddles, arena borders, health pieces and balls have visible **thickness, bevels and height separation**. The M01 baseline includes a deep raised plinth, taller health pieces/bats, directional/contact shadows and **restrained bloom**, not just emissive colours. Use solid, bevelled, full-height outer walls with translucent camera-facing panels so incoming balls stay visible. Rear interior faces and the floor capture softened actual scene reflections. Use a custom antialiased edge shader to boost creases where adjacent face normals differ by at least 35°, initially 3–4.5 CSS pixels wide; do not trace coplanar triangulation or smooth facets. Walls have opaque extruded caps, shoulders, feet and supports around recessed faces, initially 2.22 units high and 0.96 units deep. Keep glow contribution restrained as edge width increases, and preserve ball readability behind opaque structure with a faint occluded-ball ghost. Genuine 3D height is an M01 requirement, not deferred aesthetic polish for M07. Reduced effects disables bloom.
- Surround the raised arena with a subdued procedural neon ground grid, below the plinth, stretching into the distance. Use finer cells with stronger major lines, distance fading and derivative filtering to suppress distant aliasing. Keep the grid static in world space and outside camera-framing bounds; reduced effects retains it without bloom.
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
- Paddles move along a bounded arc with limited angular speed and optional tunable acceleration; start with responsive tracking as described above. The requested bat angle is a **target**, not an instantaneous teleport. An off-centre contact can aim a shot even when the paddle is stationary.
- Paddle movement can impart **spin/curvature** based on tangential paddle velocity, contact offset and incoming direction. Curvature has bounded magnitude and decay; zero-spin must behave predictably. Make dangerous trajectories legible; show shot attribution only if it adds useful information without clutter.
- Damage requires a swept collision with an intact health piece at its current simulated position and radius; sweep relative to piece movement, not just its end position. Destroy exactly that piece, emit its destruction effect, consume the active ball and put it into a short attached/ready-to-serve state at the damaged defender if they survive. Crossing the defence arc or a missing piece causes no damage. Resolve simultaneous piece contacts deterministically; one ball can destroy at most one piece before returning. If the defender is eliminated, apply the explicitly labelled prototype serve fallback above; never attach a ball to an eliminated seat or serve after match end.
- Elimination at zero health; removed players can spectate. Edge cases include last piece lost simultaneously, serve recipient eliminated while another ball is active/returning, balls trapped near geometry and no survivors.
- No random competitive power-ups in the default rule set; randomness (including bots/serves if needed) uses a seed and can be replayed.
- Start each round with **one ball**, then add one every **15 playing seconds** to a provisional default cap of **four**, as requested during M01 hands-on feedback. Ball radius is **0.187** and speed **24 units/s**, respectively 10% larger and twice the initial prototype values. Expose arrival interval (5–30s) and cap (1–8) in the experiment panel. Pausing/countdown never advance arrivals. Balls do not collide with each other in this prototype. One click launches at most one queued ball, while each ball still has an automatic deadline; eliminating a defender reassigns their pending serves. Keep zero-spin behaviour and all ball IDs deterministic.
- Keep player count and assistance choices compact. Bot strength follows saved adaptive levels 1–100, with a level card before the opening ball; there is no difficulty selector. Starting health is three containers, augmented by temporary collectible supplies. Keep pacing experiments in the existing advanced panel.

### Input progression

**Desktop now:** Start/Resume captures the mouse using Pointer Lock. Horizontal relative movement changes a bounded target angle on the curved track, independent of screen edges and camera motion; primary click launches an attached ball. A/D or Left/Right steer; Space/Enter launch. Escape/P pauses and releases capture; focus loss or browser capture loss also pauses and clears input. Resume requires an explicit click. The Three.js canvas fills the viewport with no visible HUD or surrounding text during play. Render the CITADEL title, 2–6-player −/+ controls, Start and win/loss/rematch in the Three.js scene. Retain nonvisual accessible status and the compact Pause settings panel by explicit user choice. A human victory keeps presentation alive with neon-shader fireworks and a finite musical resolution; it never opens an automatic DOM result popup. Pause controls sit in a small corner panel; H hides/restores them for unobstructed screenshots while simulation remains paused. The human can choose a fortress in Settings while testing geometry.

**Mobile:** Pointer Events and capture support relative drag and tap-to-launch. Drags, long presses and cancellations do not serve. The procedural title/results use phone-sized layouts, and a safe-area pause button provides settings access. Canvas gestures suppress page scrolling; settings remain scrollable. Rotation clears a held drag, and backgrounding pauses until explicit resume. M09 review determines whether a dedicated launch target is needed.

**12 November pointer-response amendment:** The owner explicitly requested almost
immediate mouse following even if it increases the movement limit. Human mouse
and touch targets now follow at up to 16 rad/s; keyboard and bot movement remain
3.2 rad/s. This supersedes the earlier identical-cap experiment. Swept collisions
still use actual simulated paddle movement.

All devices feed the same versioned **`PlayerIntent`** (e.g. desired angle or angular motion + `launch`). The simulation applies identical movement caps regardless of device.

### Bots are first-class, not placeholders

Bots arrive **before** advanced polish and before mobile/networking:

- One human can fill any seat in a 2–6 player local game; all other seats are bots.
- Bots use the **same public game state and intent interface as a human**, with no wallhack/future-state privilege beyond a limited, explicit prediction horizon.
- Include a basic intercept/deflect controller in M01 so the interaction can be played immediately; refine it in later milestones. Give bots reaction delay, imperfect estimates, bounded paddle speed and sensible serve timing. The owner now requests **100 adaptive levels**, replacing configurable Beginner/Standard/Expert choices. Start at level 1 and persist progress locally. Wins advance at least one level, with calibrated streak jumps capped at five; three consecutive losses at a challenge demote one level and reset the streak. Wins reset losses; level 1 is the floor and 100 the ceiling. Time away never changes the level or skill weighting. Announce demotions on results and at the next introduction. Level 100 uses the strongest legal visible-state controller with no deliberate error; earlier levels use slower, less accurate prediction, serve aim and shot/curve planning. Show LEVEL 01 as reflected world geometry rising from and sinking into the floor during the existing opening countdown. Each attempt also freezes the level-driven ball cap (1–16), arrival interval (12–2 s), ball speed (14–34), pickup budget (0 until level 5, rising to 7) and physical bat width (135% down to 70% of standard). Extra balls unlock at 8/15/21/28/34/41/48/54/61/67/74/81/87/94/100; pickups unlock at 5/20/35/50/65/80/95. All players share the width, and player settings cannot override this progression.
- Bot randomness is seeded for repeatable test runs. Instrument who takes damage, causes deflections, survives and wins, plus mean/median duration. Bots must not all make exactly the same decisions.
- Use separate match test seeds, not hand-scripted victories. One human vs five bots must be playable locally with **no network or account**.
- The same bots can later fill unoccupied multiplayer seats, take over a disconnect or support practice. Their behaviour belongs in the pure simulation module (`apps/web/src/simulation` initially; extract `packages/simulation` when useful), not networking/UI.

### Pacing hypothesis

A **two-minute match** is the product target, not a fixed timer that awards a winner. Aim for an understandable opening, increasing pressure and a decisive final stretch. At M06 compare at least three ramps (increasing speed, adding balls, changing defensive pressure, hybrid), guard against infinite rallies, and test whether two-player and six-player games both end naturally. A playtest median near **120 seconds** is the initial hypothesis; do not turn a bot-only result into a claim about human retention. With three initial containers each, a two-seat match needs at least three damaging hits to produce a winner; six seats need at least fifteen, plus collected supplies. The new supply/progression rules require renewed human pacing review. Do not assume one speed/ball-count ramp fits every arena. Report distributions separately by player count, including human survival time, rally length and time spent waiting to serve. Do not make the opening prototype meet the two-minute target at the expense of understandable play.

---

## 4. Prove the idea before expanding it

### First genuinely playable milestone: **M01**

Build a small four-player game immediately: one human, three basic bots, one initial ball with timed additions, physical health pieces, revenge serves, elimination and rematch. Use modest procedural 2.5D presentation. M02–M04 refine controls, physics and rules; M05 broadens the proven interaction to all five layouts and meaningful bot difficulties. Immediately evaluate: "Would I voluntarily play three more rounds?" If not, fix the core interaction before expanding layouts, advanced polish, mobile or multiplayer.

### First release candidate for outside feedback: **M08**

A static URL with a procedural 3D **CITADEL** title, **START**, −/+ total-player controls (2–6), and a scene rematch after a brief celebration. Initially share with a few friends *only when wanted*, for feel feedback—not for organising multiplayer sessions.

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
      ├─ React Pause settings + nonvisual status; title/results are scene geometry
      ├─ Three.js/WebGL2 (procedural 2.5D rendering)
      ├─ Desktop mouse + keyboard / later mobile touch adapter
      ├─ Pure fixed-step simulation
      │   ├─ Arena/rails/collision
      │   ├─ Balls, spin, health, elimination, escalation
      │   └─ Bots (all non-human seats)
      └─ Local session statistics / replay diagnostics
```

Preferred stack: **strict TypeScript + Vite+**, pnpm as the package manager, React for Pause settings/nonvisual status, Three.js/WebGLRenderer and composer/bloom, Vite+'s Vitest integration with co-located tests, Playwright for browser flows, and GitHub Actions for CI/Pages deployment. Prefer Vite+'s integrated format/lint/typecheck tooling rather than maintaining a parallel ESLint/formatter setup. Use `vp dev`, `vp check`, `vp test` and `vp build`; project-local invocation through `pnpm exec vp` is acceptable. Pin the toolchain/runtime and commit the lockfile. If an actual compatibility blocker requires standalone tools, document it and review the exception rather than silently abandoning Vite+. Use small composable pure functions, immutable state transitions where practical, straightforward functional modules and no large framework of abstract classes. WebGL2 is the primary compatibility target; WebGPU is not required.

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

**Current position:** On 12 November 2026 the owner explicitly requested full M09 after finding mobile menus too small. M09 is **Awaiting review**: larger procedural title/result layouts, finger-sized controls, touch gestures, safe-area handling, rotation/background lifecycle and complete emulated mobile matches across 2–6 seats are delivered. The owner also authorised much faster mouse following; pointer targets now use a 16 rad/s cap while keyboard and bots retain 3.2 rad/s. Physical phone/Safari validation and M10 performance work remain outstanding. M08 public verification and M06 pacing comparisons remain open. No push or manual deployment is authorised.

Check a milestone only when implemented, validated and approved. A delivered milestone awaiting review remains unchecked; the ledger records that distinction.

- [x] **M01** — First playable four-player prototype, Vite+ scaffold, CI and Pages workflow.
- [x] **M02** — Responsive controls, contact aiming and preview/slowdown comparison.
- [x] **M03** — Collision stress cases, deterministic physics and replay fixtures.
- [x] **M04** — Physical destruction, revenge serves, elimination and result rules.
- [x] **M05** — All 2–6-seat layouts and tuned bot difficulties.
- [ ] **M06** — Spin, multiple balls and pacing decision.
- [x] **M07** — Visual legibility, effects, sound and in-arena cues.
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

### M03/M04 archived work record — Approved

- **Milestones:** Relevant M03/M04 work **Approved to advance** on 11 November 2026 by the user's explicit request for M05; previously combined at their request. M02 approved at `854276b`; its evidence remains in `docs/M02_REVIEW.md`.
- **User scope:** “The feel is good so far … flourish and a little curve by moving the bat into the ball. Interpret as you wish.” This authorises combining these milestones and pulling a small swipe curve/destruction polish forward; it does not authorise a new pacing system or other layouts.
- **Latest feedback:** The original spin was difficult to trigger or see. Strengthen the path, permit a brief real-swipe timing window, and show spin on the ball. The user accepted this work to advance to M05; detailed tuning choices remain provisional.
- **Task checklist:**
  - [x] Audit existing CCD/rule coverage; add focused stress, impact-order, replay and render-rate fixtures for remaining M03 gaps.
  - [x] Add a bounded, decaying movement-driven curve, preserve speed and stationary returns, and keep the forecast on the same integrator.
  - [x] Cover final-piece/same-tick/serve-recipient/result edge cases and retain the documented revenge-serve behavior.
  - [x] Replace the small generic damage puff with a readable, procedural, pause-safe/reduced-effects flourish.
  - [x] Run checks, inspect rendered effects/curve examples and document the combined handoff; leave later milestones unstarted.
  - [x] Address spin visibility: stronger curve, 100ms recent-motion tolerance, rotating directional bands and a longer trail; verify actual captured mouse brushes.
- **Evidence:** `docs/M03_M04_REVIEW.md`; 165 unit tests in 25 files, 12 native Chromium browser checks, Pages build and Vite+ checks pass. Seven replay fixtures match across 30/60/144 FPS; five all-bot rounds finish with zero collision caps. Native screenshots and local videos reviewed.
- **Review choices:** Swipe strength/timing tolerance, spin-band readability, breakup/return clarity, seeded elimination fallback and lower-ball-ID final-hit policy remain provisional. M05 now implements the user's layout-morphing note; see its current record below.
- **Constraints:** No added input lag, routine slowdown, hit-stop, artwork textures, remote deployment, push or `gh` usage. Local commits remain frequent. Full M06/M07 remain out of scope; M05 has its own authorised work record.

### M05 archived work record — Approved

- [x] Generate 2–6-seat layouts from one geometry model and thread it through physics, aiming, input and rendering.
- [x] Morph live walls/fortresses gradually after elimination, retaining identities, health, relative control and active balls.
- [x] Add seeded Beginner/Standard/Expert bots with bounded perception/reaction errors and normal intents.
- [x] Add player-count/seat/difficulty selection, results and menu-only developer statistics.
- [x] Validate geometry, CCD, transitions, replay and full rounds/rematches; capture 2/4/6 layouts and gameplay; report ten-round evidence honestly.

- **Evidence:** `docs/M05_REVIEW.md`; 246 unit tests in 40 files, all 22 distinct production native Chromium checks (full run plus focused rerun), Vite+ checks and Pages build pass. Twelve scripted desktop rounds (ten across 2/4/6), twelve seeded bot-only runs with zero collision caps, all-layout screenshots and a real-time six-to-five clip. Latest wall/reach evidence and replay review are in `docs/M05_WALL_REVIEW.md`; human fun approval remains pending.
- **Latest amendments:** User chose regular layouts with minimal movement, requested quicker catch-up and reported bat-end gaps. See `docs/M05_WALL_REVIEW.md`: target rotation minimises survivor travel, matched corners avoid extra temporary walls, and mitered joins/posts track the true outline. Geometry-derived travel reaches both end walls in all layouts; serves remain inward.
- **Transition intuition:** Normally 2.8 seconds, smooth easing, maximum fortress translation 6 units/s. Retargets keep the remaining time, adding only what is needed for the speed bound. A convex moving boundary carries live ball floor coordinates without changing flight velocity/spin; targets and physical pieces follow the fortress. Retarget from the current shape after another elimination. Identity/health/serves persist; the final survivor ends the match immediately. Review fairness, intermediate supports, dimensions and difficulty before considering these permanent.
- **Checkpoints:** `67ddd15` simulation/input; `b63db58` rendering, setup/results, audio compatibility and validation tools; `7618c47` stable bot serve targets during morphs; `80e95b8` minimal/faster wall transitions and full bat reach. No push, deployment or `gh`; the separate AGENTS edit remains unstaged. M06/M07 were unstarted at the M05 handoff.

### Current milestone work record — M07 Approved / M08 local build approved, publication pending

**User approval, 11 November 2026:** “I think 7 and 8 are good.” This approves
M07 and the delivered M08 desktop implementation, including the latest title and
result legibility corrections. M07 is checked complete. M08 retains its open
publication/public-verification tasks and is In progress until those are done;
approval is not evidence of a successful public deployment. External feedback is
still uncollected. Do not start M09, change pacing, push or deploy from this approval.

**Subsequent M07 bloom correction — visual review pending:** The user reported
little glow on the right of the six-player arena. The luminance-only bloom cutoff
rejected saturated colours at emission levels where lime/gold passed. A
cyan-calibrated peak-channel floor now preserves their halos without a blanket
increase in strength or wall haze. Native GPU assertions cover all six colours
and dim-surface rejection; matched 2/4/6 before/after captures are recorded in
`docs/BLOOM_COLOUR_REVIEW.md`. Vite+ check, 284 unit tests / 49 files, Pages build
and four focused production browser checks pass. Gameplay/audio remain unchanged.
This is a follow-up correction to the approved presentation, not a new milestone;
public deployment remains unverified and no push is authorised.

**Latest title amendment:** The user accepted the title geometry and requested a
darker background and placement relative to the camera. `2318be7` separates the
camera-mounted 3D foreground from arena framing, so changing 2–6-player layouts
and background camera motion cannot move the controls. The user subsequently found
end-of-round text unreadable because dimming was title-only. Title, win and loss
menus now share the darker backdrop, keeping foreground lettering bright and
restoring normal brightness for gameplay. Both composer and direct/reduced paths
are covered. 282 unit tests and four focused production browser checks pass for
this correction, following the previous full 27-check run. Native clicks confirm
identical control bounds across every count. Updated screenshots and layout data:
`docs/SCENE_PRESENTATION_REVIEW.md`. Subsequently approved as recorded above; no push, deployment or `gh`.

**11 November checkpoint — delivered locally:**

- [x] Complete 2–6-player solo matches, responsive captured controls, physical eight-piece health, revenge serves, visible swipe spin and minimal-movement arena transitions.
- [x] Deliver thick neon geometry, corrected wall caps/edge fidelity, reflections, exterior grid and effects presets.
- [x] Build layered original techno with event-aligned effects and presentation-only beat lighting; distinguish own loss, rival capsule breaks, credited success and victory.
- [x] Replace landing/result popups with procedural scene menus and victory fireworks; keep advanced settings in Pause.
- [x] Anchor scene controls to their own camera, dim all visible menu backgrounds and restore normal gameplay brightness.
- [x] Provide local preferences, round-statistics export, review captures and repeatable desktop checks.
- [x] Record latest validation: Vite+ check, 282 unit tests / 48 files, `/citadel/` production build and four focused native Chromium browser checks pass. The preceding revision passed the full 27-check browser suite; that full suite was not rerun after the final dimming correction. Existing large-bundle warning remains.

**First-publish checklist — not yet performed:**

12 November visual correction: the owner reported uneven fortress bloom. The
extraction now balances glow luminance across seat hues; native 2/4/6 captures
and measured GPU output are recorded in `docs/BLOOM_COLOUR_REVIEW.md`. Review
the result in play; no gameplay rules or publication status changed.

12 November: the owner reported the full software-WebGL browser suite taking
minutes and a controls test failing on GitHub Actions. CI and Pages now run the
production startup/refresh browser smoke test instead; the full suite remains a
local check. The smoke test passed locally at both `/` and `/citadel/` with
software WebGL (23.4s and 22.4s respectively); `vp check` and 284 unit tests
passed. The revised workflow still needs a GitHub run and public verification.

- [ ] Owner enables Pages for `idrise/citadel`: Settings → Pages → Build and deployment → Source: **GitHub Actions**. The existing workflow supplies the build; no generated starter workflow is needed.
- [ ] Confirm repository Actions policy permits the workflow's `actions/*` and `voidzero-dev/setup-vp` actions, and `main` remains the default branch. If configured, the `github-pages` environment must permit `main` deployments.
- [ ] User explicitly authorises the first push. Local commits and this setup checklist do not authorise pushing or manually running a deployment.
- [ ] After that push, confirm **CI** and **Publish GitHub Pages** succeed, then record the deployment's actual URL and commit.
- [ ] Verify a freshly opened public URL: assets/audio load, 2/4/6-player selection, Start, captured controls, complete win/loss flow, readable results, Pause settings and rematch. Expected default URL: `https://idrise.github.io/citadel/`; not yet verified live.
- [x] Record the user's M07/M08 local-build approval separately from deployment success; received 11 November 2026.
- [ ] Record external desktop feedback when available. M06 pacing study and M09 touch remain unstarted.

The user rejected the abrupt DOM landing/result panels and requested a procedural
Citadel title over the arena, +/− selection for 2–6 players, Start, and neon
fireworks for a human victory. Their explicit follow-up retains advanced settings
in Pause. Replace visible title/results with scene geometry; keep React only for
the requested pause settings and invisible accessibility/status composition.
Every rival capsule needs a reliable break cue, balls must show their last
striker's colour, and the default human colour changes from arena cyan to coral.

- [x] Identify and separate rival capsule breaks from the shared wall-ricochet throttle; protect outcomes in dense sound batches.
- [x] Deliver procedural 3D title, bounded count controls, Start and smooth scene-based win/loss/rematch flow.
- [x] Add pooled neon-shader victory fireworks while keeping the arena/camera alive after simulation ends; respect pause/reduced effects.
- [x] Colour balls/trails by the same read-only last-striker observer as scoring; distinguish the human from arena cyan.
- [x] Validate real wins, all-layout start/rematch/controls, exported results and native sound; provide current screenshots and gameplay evidence.

**Current evidence:** `docs/SCENE_PRESENTATION_REVIEW.md`; latest checks are recorded above, with High/Low victory screenshots in `docs/reviews/m08/anchored-menu/`. A native, unedited 35.96s two-player Standard human win exports zero collision caps; 2/4/6 titles, owned balls, fireworks and a movie are recorded. Eight live feedback auditions include neutral enemy breaks; native six-seat High sampling measures 16.7ms median/p95 on M2 Pro. Checkpoints: `551f559` reliable breach cues, `643f704` scene UI/ownership, `6727aac` victory coda/native controls, `2318be7` fixed camera-relative menus and darker title, `df309ef` readable win/loss backgrounds. Pause settings, reduced mode, scoring and physics goldens remain intact. No push, deployment or `gh`; preserve the separate AGENTS edit. Stop for review.

The preceding M07/M08 checklist and evidence below remain the baseline. These
amendments do not authorise M06 pacing changes, M09, publishing, pushing or `gh`.

- [x] Audit M07 against delivered effects/audio; complete effects quality presets and useful event sounds without changing pacing.
- [x] Correct wall-edge aliasing through the actual post-processing path; inspect matched 2/4/6 renders and reduced effects.
- [x] Give successful human attacks positive harmonic/cheer feedback distinct from own damage, using read-only event attribution.
- [x] Polish minimal Play/setup/help/build menus, preserving pure fullscreen gameplay, captured input and restart/rematch.
- [x] Add local-only statistics export and resilient persisted solo preferences.
- [x] Revalidate Pages workflow/project path against `idrise/citadel`, without push or `gh`. Pages was disabled at the last repository check; its setting has not been refreshed during this plan checkpoint. No public deployment has been verified.
- [x] Complete local tests, fresh six-seat round/rematch, screenshots/audio evidence and `docs/PLAYTEST.md`; distinguish scripted evidence from tester feedback.
- [x] Receive the user's visual/audio/fun approval of M07 and the local M08 build, 11 November 2026.
- [ ] Collect optional external desktop playtests; none claimed so far.
- [ ] Verify the actual public build after publishing is enabled and authorised. No deployment performed in this task.

- **Evidence:** `docs/M07_REVIEW.md`, `docs/M08_REVIEW.md`, `docs/PLAYTEST.md`. Vite+ checks, 258 unit tests in 44 files, Pages build and all 25 native Chromium production checks pass. Three focused software-WebGL checks pass across initial/rerun checks after correcting the quality smoke test's render budget. Fresh six-seat scripted round: 67.69s, human survival 57.58s, zero collision caps; exported JSON reconciles totals. No human timing/retention claim.
- **Presentation:** Screen-linear, derivative-antialiased edges plus multisampled HDR bloom targets; Low/Medium/High budgets, pooled impact/outcome cues and original FM event sounds. Matched 2/4/6 frames and an eight-ball presentation fixture; ten-second native High opening sample on M2 Pro: 16.7ms median / 16.8ms p95. Runtime remains procedural.
- **Checkpoints:** `f729bd1` score attribution and positive FM gestures/cheers; `0c84d6b` M07 rendering/effects/audio lifecycle; `c916b98` M08 menus/export/preferences. Review evidence is a separate local checkpoint.
- **Latest review amendments:** User reported unrotated cuboid caps, inaudible own damage and a negative-sounding enemy breach with no recognisable cheer. `7e425f2` aligns corner posts with the live corner bisector and fits their rotated footprint. `a5a9f96` gives own damage the falling vowel/stronger impact, and scoring an opening/rising vocal stack, claps and whistle. Separate voice pools and brief score ducking keep those responses distinct. `docs/M07_CORRECTIONS.md` supersedes the previous auditions with live native and full-mix evidence. 272 unit tests, five focused production browser checks and the Pages build pass; gameplay/physics goldens unchanged. M07/M08 remain Awaiting review.
- **Limits:** M06 comparison unstarted; no external testers, Safari/mobile, full software-WebGL suite, public build, push or `gh`. Existing large initial bundle and nonfatal Three.js/Tone advisories documented. Preserve the separate AGENTS edit. Stop at REVIEW REQUIRED — M07 / M08; do not start M09.

### Music detour — Accepted for now

- **Authorisation/latest direction:** User requested stronger experience-to-music coupling, researched layering methods, beat/sub-beat-aligned bat sounds and an FM audience when a ball physically damages a piece. Further steering requests harmonies/instruments as balls increase and a **muted hats → snare → driving kick** opening. This replaces the previous immediate-kick/melody opening. The 90s DJ-style journey to a drop remains the structural direction.
- **Delivered checklist:**
  - [x] Quiet staged intro at 136 BPM; kick around 7s, melodic space/build and first drop around 28s.
  - [x] Ball-driven layers on bar boundaries: 2 harmony/organ, 3 arpeggio/acid, 4 FM brass. Bounded families for 5–8 balls; chord-aware voicings and interlocking rhythms.
  - [x] Per-player phrases and streak-driven percussion/responses/fills; damaged defender's performance parts reset.
  - [x] Audio-grid bat notes (32nds, 5–60ms), eighth-note answers/arrival cues, and a pooled FM/formant crowd on authoritative piece hits. Dense breaches coalesce; final cheer can finish after results without delaying victory.
  - [x] Preserve audio-clock bloom/grid waves, mute/volume, reduced mode, pause/focus/teardown and graceful failure handling.
  - [x] Research notes, isolated crowd, one-to-four-ball comparison, real-game audio/video, 193 unit tests, 15 native Chromium checks and Pages build evidence.
- **Defaults/evidence:** `docs/MUSIC_REVIEW.md`; `fbc2499` contains this revision. Music on at 45%, Beat lighting on unless reduced mode suppresses it. Current auditions live under `docs/reviews/music/interactive/`; these are review exports, never game assets. Default ball interval remains 15s.
- **Permanent boundary:** Music observes events only. Musical quantisation delays sounds, never collisions, rules, inputs, health, spawning or RNG. No music-driven camera motion. User accepted the detour for now and requested M05; full M06/M07 remain unstarted.

### Progress / approval ledger

13 November pre-signoff TODO tweaks: the owner authorises the five newly added
TODO entries, with incremental local review as each lands: elimination spectacle
and synthesized sound / player-credit fireworks; a more strongly curved paddle
front for skill-based impact aiming; an obvious held-ball threat effect; continuous
board transitions across title, round and victory states; and level-specific arena
shape variations. These are amendments to the current local M09 review, not approval
of M10 or remote publication. Keep each item separately reviewable and record its
checks and rendered evidence. The owner selected symmetrical shape variations.
First entry is implemented locally: instanced elimination destruction, a generated
bass/noise explosion, and three short pooled fireworks for actual player-credited
kills. `docs/PRESIGNOFF_TWEAKS_REVIEW.md` records the review. Checks: clean scoped
format/lint/types, 467 unit tests / 77 files, 9/9 root browser loss/audio/scene checks,
root production build and ten desktop/phone renders. Both synthesized auditions
have nonzero output, peaks below 0.32 and zero browser errors. Existing large-chunk
advisory and physical-device review remain. Remaining four entries are in progress.

13 November reading-time / isolated-input follow-up: the owner requests longer
level messages at a reasonable reading speed and confirms the game must wait
before moving. Budget all visible words at 180wpm, add 0.5s to notice the copy,
reserve at least 2s fully raised, then add separate 0.4s rise / 0.45s sink and
round upward to a quarter-second. A nine-word extra-ball/demotion-risk briefing
lasts 4.5s; the first-level message lasts 5.25s. The session sets its authoritative
pregame countdown at Start; balls stay ready and playing time stays zero until
it ends. Pause freezes that countdown. The pure simulation's default 1.5s remains
for standalone fixtures; browser sessions set their calculated duration explicitly.
The owner also reported automated tests disturbing the system mouse. The native
run was stopped. All browser specs now use an enforced document-local input hook
for capture/fullscreen and synthetic movement through the real adapters; no native
pointer lock or system mouse movement is needed. See `docs/BRIEFING_TIMING_REVIEW.md`
and `docs/reviews/m09/briefing-timing/`. Implementation: `d72b3e7`.
Validation: 463 unit tests / 75 files pass. All 65 root browser scenarios have
passing coverage: 60/65 initially, then all five corrected test expectations pass
on rerun. The final Pages selection passes 21/21. Changes account for countdown vs playing time, capture-origin resets,
clamped flick setup and the longer real-time wait. The native run stopped at the
owner's request is excluded from those totals. Scoped format/lint/type checks pass;
global format checking reports the owner's concurrent TODO edits, left intact.
Root/Pages builds pass with the existing ~970kB main-chunk advisory. Six authored
late-hold renders and a phone clip report zero browser errors. M09 awaits review.

13 November level-briefing amendment: the owner requests feedback beneath the
reflected LEVEL string when a key challenge parameter changes, plus clear advance
notice of whether losing the coming attempt causes demotion. World-space captions
now announce extra balls, pickup introduction/budgets, cumulative bat-width and
bot-reaction milestones, and speed increases between them. Level 100 calls out its
extra ball and elite bots. Comparison uses the actual previous same-arena attempt,
so skipped levels retain unlocks and retries do not falsely announce an upgrade.
Each introduction also states LOSS RETRIES LEVEL NN, LOSS DROPS TO LEVEL NN on the
third-loss attempt, or LEVEL 01 IS THE FLOOR. These stakes are frozen per attempt,
with the same challenge/arena rules as actual progression. Existing demotion-result
text is retained. Captions rise/sink and reflect with the level; the countdown and
existing easy-to-hard physics/bot ramp are retained. See `docs/LEVEL_BRIEFING_REVIEW.md`
and `docs/reviews/m09/level-briefing/`. Validation: clean `vp check --fix`,
456 unit tests / 73 files, 16/16 root production browser checks and 12/12 Pages
checks. Both builds pass with the existing ~969kB main-chunk advisory; ten authored
renders have zero browser errors. Physical-device readability remains open.
Local implementation: `c546258`. M09 awaits review.

13 November loss-navigation correction: the owner found Watch confusing because
it only hid the result card, and requested Back/Retry. The scene loss menu now
renders BACK and RETRY. Back resets the abandoned match to a paused title preview
on the same canvas, retaining the selected player count, fortress and saved next
challenge level/demotion. Start is available again; Retry still starts immediately.
The obsolete watching state is removed from session, rendering and review fixtures.
Neither action records an extra result. See `docs/BACK_RETRY_REVIEW.md` and
`docs/reviews/m09/back-retry/` for the rendered 2/4/6 desktop/phone controls and checks.
Local implementation: `0a2bc62`. Validation: clean `vp check --fix`, 449 unit
tests / 72 files, root production browser selection 10/10 and Pages loss-navigation
selection 4/4. Both builds pass with the existing ~967kB main-chunk advisory. Six
rendered fixtures report zero browser errors. Physical iPad/iPhone review remains
open. M09 awaits review; this correction does not authorise later milestones or publishing.

12 November returning-melody amendment: the owner likes the new musical variety
but requests regular returns to the original tune, with small per-bar instrument,
effect and harmony changes. The original call/answer now opens the first groove
and returns for two bars in each eight-bar phrase, with original notes/rhythm and
canonical harmony shared across every round variant. Newer melodies remain between
returns. Bounded filter, echo, pan and articulation changes colour each bar;
sparse quiet one-ball harmony and bell/answer/FM accents support the tune while
ball tiers retain their fuller orchestration. The staged hats/snare/kick opening,
build/drop timing, live feedback and simulation/audio-clock separation remain.
See `docs/MOTIF_RETURN_REVIEW.md` and `docs/reviews/music/motif-return/` for actual
graph auditions and validation. This is an explicit audio follow-up, not approval
of a later milestone or public deployment. Local implementation: `a18235c`.
Validation: clean `vp check`, 449 unit tests / 72 files, root and Pages production
builds, 3/3 root browser audio checks and 5/5 Pages browser audio/Retry checks.
Two actual-graph auditions have nonzero output, peaks below 0.41 and zero browser
errors. The existing ~967kB main-chunk advisory remains; subjective listening and
physical-device review remain open. M09 awaits review.

12 November scene-Retry / triangle-gap correction: the owner rejected the visible
React retry card and clarified that the triangle bats still almost sealed the
walls. The earlier inset widened travel but its 0.015-unit fitting margin let the
bat close the gap again. Current triangle anchors are 2.6 units inward, with a
0.7-unit skin-to-wall passage at every legal bat pose. The ball diameter is 0.374;
swept-circle tests prove the lane remains passable at both travel limits for all
three seats and levels 1/50/100. The requested gap interpolates through elimination
morphs; other layouts keep their existing wall reach. The owner permitted a larger
triangle if needed. The present geometry has sufficient room with these lanes, so
the wall outline remains unchanged; matched bot samples inform the pacing review.
Watch/Retry and loss/demotion lettering now use scene meshes and neon edge shaders.
The visible React card and its CSS are removed; invisible semantic hit targets
remain consistent with the existing scene controls. Choosing Watch leaves a small
scene Retry control while simulation continues. See `docs/SCENE_RETRY_GAP_REVIEW.md`
and `docs/reviews/m09/scene-retry-gap/` for rendered comparisons, pacing samples
and validation. Local checkpoints: `2c79309` gap geometry; `779a37c` scene UI.
Validation: clean `vp check --fix`, 445 unit tests / 71 files and 21/21 native root
browser checks. Fourteen Pages scenarios have passing coverage: 13/14 on the
selection run, then the new touch Retry check passes after correcting a test-only
assumption that changing fortress leaves Settings open. Both production build
bases pass with the existing ~966kB main-chunk advisory. Twelve authored
2/3/4/6 desktop/phone captures have no browser errors; eighteen matched bot samples
finish within 120 seconds with zero collision caps. Level-one median time moves
from 91.5s to 62.9s; this is a small bot-only sample, not a human pacing verdict.
Physical iPad/iPhone validation remains open. M09 awaits review.


12 November triangle / rally follow-up: the owner added two further TODO items.
Three-seat fortress anchors now sit 1.2 units inward from the unchanged wall tips;
physical wall fitting permits roughly 40–90% more bat travel depending on level
width. The same geometry is used when an elimination reaches three survivors.
Each active scoreless ball retains normal level speed for eight seconds, then gains
5% of base speed per second to a bounded 1.75×. A scored container hit resets that
ball and its next serve; other balls retain their own pressure. Pauses, countdown
and ready time do not advance the clock. Supply collection does not reset it.
Bots and forecasts share the rule. These explicit requests authorise the tuning
follow-up without approving the broader M06 pacing study or the M10 device gate.
See `docs/TRIANGLE_RALLY_REVIEW.md` and `docs/reviews/m09/triangle-rally/` for
comparison poses, actual rally/score samples and validation. Initial local
checkpoints: `e1daa8b` triangle clearance and `7007842` rally pressure.
Validation: clean `vp check --fix`; 439 unit tests / 70 files, unchanged replay
goldens, and maximum-pressure sixteen-ball stress in all five layouts pass.
The broad root browser run passed 58/59; the fixed-time early-loss assumption was
replaced with actual elimination observation and passes on rerun. The new rally
pause/reset check also passes: all 60 distinct root scenarios have passing coverage
across those runs. Eight final Pages-path checks pass, including complete 2–6-seat
mobile matches. Both build bases pass with the existing ~964kB main-chunk advisory.
Rendered 2/3/4/6 views and a natural rally movie/report have no browser errors;
`git diff --check` passes. Physical-device validation remains open; M09 awaits review.


12 November mobile-feedback / sixteen-ball amendment: the owner requested every
item in `TODO.md`, a sixteen-ball level 100 and an extra ball every 5–10 levels.
The live cap now unlocks every 6–7 levels; four-ball and higher challenges reach
the cap by 30 seconds of play (two-second arrivals at level 100). The renderer,
queued serves and last-striker observer support all sixteen balls. A natural
seed-one Chromium capture shows sixteen balls at 30.49 seconds with zero collision caps.

All nine TODO implementation items are delivered locally: Citadel naming;
larger safe portrait framing; spatially tracked, floor-growing wall pillars and
reusable bounded beam buffers; shorter 88–150px full-travel touch steering;
reflected floor title; mobile audio routing/gesture/interruption recovery;
longer seeded score phrases and FM bat swish; immediate Watch/Retry after human
elimination; and measured mobile render-cost reductions. Mobile retains bloom
and one floor reflection with bounded pixel ratio and no shadow/MSAA passes.
Instanced trails and stable light counts reduce allocations, draw calls and
roster/elimination shader changes. The measured six-seat mobile draw count fell
from 1,107 to 491 (56%); physical iPad/iPhone stall resolution still needs tester
confirmation. This explicit feedback request authorises these performance fixes,
but does not complete or automatically start the full M10 physical-device gate.

Current review/evidence: `docs/MOBILE_FEEDBACK_REVIEW.md` and
`docs/reviews/m09/mobile-todos/`. Validated checkpoints: `883a070` for sixteen-ball
pressure and `20df7ca` for audio/touch/early-retry. Final validation:
`vp check --fix` is clean; 422 unit tests / 68 files pass.
The broad native root browser run passed 58/59; a stale level-40 idle-survival
assumption was moved to level 10 and the final focused root rerun passed 15/15,
covering that scenario plus changed title/mobile layouts. All 59 distinct root
scenarios have passing coverage across those runs. The Pages production build
passed 26/26 selected checks. Native Chromium/WebKit frame/audio samples and
morph/pressure captures have no browser errors. Both build bases pass with the
existing ~963kB main-chunk advisory; `git diff --check` is clean. Rendering checkpoint:
`511ba4b`. M09 awaits review; M06 human pacing, M08 public verification and
M10 physical-device validation remain open.


12 November combined-difficulty amendment: the owner added ball count, pickup
count, ball speed and bat size to the saved 100-level curve, with supplies unlocked
at level 5. Round-frozen profiles now ramp from one ball, no pickups, speed 14 and
135% bat width to eight balls, seven pickups, speed 34 and 70% width. Ball and supply
unlocks alternate; speed/width interpolate and arrival intervals shorten. Physical
bat arcs, collision, wall limits, previews and blur copies stay aligned, including
morphs. Obsolete pacing controls are removed. Eight-ball waiting queues are separated
and contained. See `docs/DIFFICULTY_CURVE_REVIEW.md` for the full curve, natural
2/4/6/mobile frames, level-five pickup gate, eight-ball video, 406 unit tests,
58 native root browser checks and 12 Pages checks. Initial implementation checkpoint:
`88931f9`; queue correction: `82feaea`. M09 awaits review. Early bot-only
one-ball games can exceed the 90-second sample; human pacing/Safari validation
remain open. No push, deployment or later milestone is authorised.


12 November three-loss ladder / floor-sign amendment: the owner removed inactivity
judgment and requested one-level demotion after three losses, clear demotion feedback,
progressive bot skill and reflected level lettering rising from the arena floor.
Three consecutive losses now demote and reset; wins clear the loss streak. Version-two
progress preserves intentional demotions across reloads, with legacy migration.
Calendar weighting is removed. Accelerated wins are capped at five levels to avoid
large overshoots. Serve aim and shot/curve planning now scale alongside existing
reaction, error, forecast and speed tuning. LEVEL 01 rises, reflects and sinks on
the existing 1.5-second countdown; reduced motion remains static. See
`docs/LEVEL_LADDER_REVIEW.md` for 2/4/6/mobile frames, video, 385 unit tests,
52 native root browser checks, six Pages progression checks and bounded bot samples.
Implementation checkpoint: `72735a8`. M09 awaits review. Physical Safari and M06 human pacing/calibration remain open;
no push, deployment or later milestone is authorised.


12 November retry-level correction: the owner clarified that losing must retry the
same level played. Losses now retain that level for direct Retry and early Play
again; recorded finishing places only temper future upward calibration. Older
loss-demoted saves restore the last attempted level automatically. Inactivity
relief remains available for returning players. Validation: 372 unit tests plus
five production progression checks at root and five at the Pages path, including
a real level-two defeat, direct level-two retry, reload and old-save repair.
See `docs/FAST_PROGRESSION_BOTS_REVIEW.md` and its retry screenshot. M09 awaits
review; no push or deployment is authorised.

12 November fast-progression / bot-tactics follow-up: level-one wins now always
advance to two, every later win advances at least one level, and sustained wins
retain rapid adaptive calibration. NEXT / RETRY is available after a 0.9-second
result beat and starts the next countdown directly on the same canvas, with the
saved level, settings and input gesture preserved. Waiting still permits the full
victory-star morph. Numeric bots aim serves and returns at available pickups and
choose signed brushes through ordinary paddle/curve physics. See
`docs/FAST_PROGRESSION_BOTS_REVIEW.md` for 2/4/6/mobile captures, curved-pickup video,
370 unit tests, 49 full native root browser checks, a final progression recheck,
nine Pages-path checks and bounded bot-only samples. Level-100 bot-only endgames
remain long; the M06 human pacing gate and physical phone/Safari validation remain
open. M09 awaits review. Local implementation checkpoint: `2b74c87`. No push or
deployment is authorised.


12 November pickup/title follow-up: the owner reported repeated pickup sites,
collected containers intersecting existing health, and snapping player-count
previews. Ordinary attempts now have fresh independent pickup seeds, collection
uses free positions and maintains separation while settling, and previews morph
over 0.85 seconds on a persistent canvas with fixed menu controls. Rapid retargets,
clamped fortresses, reduced motion, unchanged selections and input/audio/effects
reset are covered. See `docs/PICKUP_TITLE_REVIEW.md` for 2/4/6/mobile frames,
production video, real varied pickup sites, measured container clearance, 357 unit
tests, 49 native root browser checks and eight Pages-path checks. M09 awaits review; no push or deployment is
authorised. Implementation checkpoint: `587dc05`.

12 November adaptive progression and supply amendment: the owner explicitly
authorised 100 saved adaptive levels, rapid calibration from recent performance,
levels moving backwards after losses/inactivity, and a level introduction before
the opening ball. The bot selector is replaced by a bounded recent-result model,
with highest-level legal prediction and saved personal results. A further authorised
rule change starts each fortress with three containers; ball hits collect landed
falling supplies for the last striker. Provisional drops run from 4 to 52 seconds,
with no new drops at/after 60 seconds. See `docs/PROGRESSION_AND_SUPPLIES_REVIEW.md`
for implementation, 2/4/6/mobile/reduced rendering, video, 348 unit tests, 45 native
production browser checks and Pages-path verification. Strong bot-only endgames
can run beyond two minutes; human loss is saved immediately and permits retry.
The broader M06 human pacing gate remains open. M09 awaits review; M10,
multiplayer and publication remain unauthorised. Local implementation checkpoint:
`66c70a0`; final corrections/evidence are recorded with this review amendment.

12 November victory-star amendment: the owner requested a visible morph when
only one player remains. The current floor/plinth/walls now become a five-point
star over 2.8 seconds while the winner's actual paddle and surviving containers
move into the centre. The board stays bright until rematch controls appear at
4.5 seconds; reduced motion shows the settled star immediately with the same
hold. Human and bot wins are supported, including a finish during an arena morph.
Final simulation/replay state remains frozen. See `docs/VICTORY_MORPH_REVIEW.md`
for 2/4/6, phone, bot and reduced captures, animation video, 321 unit tests and
native desktop/mobile production checks at root and Pages base paths. M09 awaits
owner review; M10 and publication remain unauthorised.

12 November ball presentation amendment: the owner requested stronger visual
impact and readable spin. Balls now have a 35% larger visible shell, bright core,
dark procedural rotating seams, owner-coloured aura and stronger comet tail.
Signed surface and band rotation follow actual spin; the occlusion ghost shares
the surface pose. Collision radius remains 0.187 and simulation is unchanged.
See `docs/BALL_PRESENTATION_REVIEW.md` for rendered 2/4/6, crowded/mobile/reduced
views, video and 308 unit / eleven native browser checks. Awaiting owner review;
this does not start M10 or authorise publication.

12 November opacity amendment: the owner said the simple historical bat copies
look great but are too strong. Their body/outline opacities are reduced to
20/14/9/5 percent, retaining the same history and movement. M09 awaits review.

12 November bat-trail revision: the owner reported the shader blur still was not
working and explicitly requested a few historical renders of the bat, nothing
special. The effect now draws 2/3/4 faded copies of the full body and neon outline
on Low/Medium/High, using actual stored poses. Reduced motion disables it. The
custom smear/mask shader and its GPU-mask fixture were removed. See
`docs/PADDLE_MOTION_REVIEW.md` for native 2/4/6 captures, movement video and checks.
M09 still awaits review; gameplay and mouse input are unchanged by this revision.

12 November sound follow-up: the owner requested louder sound effects and audible,
distinct wall/paddle bounces. Dedicated low wall knocks and brighter bat pings
now use the live bus at higher levels; wall cues retain successive fast bounces.
See `docs/BOUNCE_AUDIO_REVIEW.md` for before/after auditions, a dense music mix,
307 unit tests and native audio lifecycle checks. Simulation and music volume
are unchanged. This amendment awaits review; it does not start M10.

12 November fullscreen follow-up: touch Start/Resume request document fullscreen,
menu controls allow entry/exit, and browser fullscreen exit pauses play. A relative
manifest and Apple standalone metadata support Home Screen launch where element
fullscreen is unavailable. See `docs/M09_TOUCH_REVIEW.md` for root/subpath checks,
303 unit tests, fullscreen/touch browser checks and phone-emulated captures.
Physical-device browser chrome remains unverified; M09 still awaits review.

12 November follow-up: the owner requested less mouse travel and reported an
inner-bat bloom flash without readable motion blur. Baseline mouse gain is now
25% higher. The trail uses instanced samples and masks the live bat footprint;
GPU checks confirm zero trail pixels inside it. See `docs/PADDLE_MOTION_REVIEW.md`
for 2/4/6 renders, tests and remaining visual-review limits. M09 awaits review.

12 November follow-up: the owner requested paddle motion blur and reported
inconsistent mouse control. Short arc-following exposure samples and immediate
mouse reversal from the actual bat angle are delivered for review. Raw mouse
deltas are requested with browser fallback. See `docs/PADDLE_MOTION_REVIEW.md`
for 2/4/6 renders and checks; M09 remains In progress and no push is authorised.

| ID | Stage | Reviewable deliverable | Status | Approval | Commit |
|---|---|---|---|---|---|
| M01 | **First playable** | Four-seat prototype: human + bots, physical damage, revenge serve, rematch | Approved | 11 Nov 2026: user requested continuation | 415b2df; earlier checkpoints in Git |
| M02 | Desktop core | Refine responsive controls, contact aiming, preview/slowdown experiments | Approved | 11 Nov 2026: feel good; user requested M03/M04 | 854276b |
| M03 | Desktop core | Real ball physics, swept collisions and deflections | Approved | 11 Nov 2026: user requested M05 | fe06ce3; earlier checkpoints and review docs |
| M04 | Desktop core | Harden physical damage, revenge serves, elimination and result rules | Approved | 11 Nov 2026: user requested M05 | 8fe9f47, 711d15d; review docs |
| M05 | **Solo expansion** | All 2–6-seat layouts, tuned bot difficulties, full solo validation | Approved | 11 Nov 2026: brilliant; user requested M08 | 67ddd15, b63db58, 7618c47, 80e95b8; docs/M05_REVIEW.md |
| M06 | Solo proof | Spin/ball tuning and evidence-based 2-minute escalation | Not started | — | — |
| M07 | Solo proof | Geometry-first effects, audio, readable visual cues and feel | Approved | 11 Nov 2026: “I think 7 and 8 are good.” | f729bd1, 0c84d6b, 551f559; docs/M07_REVIEW.md and docs/SCENE_PRESENTATION_REVIEW.md |
| M08 | **Desktop validation gate** | Public-ready static solo build, playtests and decision | In progress | 11 Nov 2026: local build approved; public verification outstanding | 643f704, 6727aac, 2318be7, df309ef; docs/SCENE_PRESENTATION_REVIEW.md; public verification pending; initial tester feedback recorded |
| M09 | Mobile | Touch steering, tap launch and responsive layouts | Awaiting review | 12 Nov 2026: full M09 requested; approval pending | docs/M09_TOUCH_REVIEW.md; complete emulated 2–6-seat matches; physical-device review outstanding |
| M10 | **Mobile validation gate** | Mobile GPU/performance/accessibility and real-device tests | Not started | — | — |
| M11 | Multiplayer | WebRTC host/client prototype with local/manual signalling | Not started | — | — |
| M12 | Multiplayer | Cloudflare private-room signalling, invitations and reconnect | Not started | — | — |
| M13 | Multiplayer security | Broker security primitives, limits and abuse test harness | Not started | — | — |
| M14 | **Public matchmaking** | Secure exact-size player pools, random matching and bot fallback | Not started | — | — |
| M15 | Multiplayer beta | Network fault tolerance, multi-browser load test, rollout decision | Not started | — | — |

### PHASE A — Desktop browser; human versus bots

#### M01 — First playable four-player prototype

**Implement:** Scaffold strict TypeScript with Vite+ and a procedural Three.js view, keeping simulation independent. Add the required GitHub Actions CI and Pages publishing workflows described above. Build only the four-corner square: one human, three basic bots using normal intents, one initial ball with timed additions, curved responsive paddles, contact-position aiming, walls and physically collidable health pieces per fortress (originally eight; the 12 November amendment now starts at three with supplies). Include swept collision for supported prototype speeds, visible piece destruction, return to the surviving damaged defender, tunable serve deadline, elimination, a basic winner/result and immediate rematch. Use the labelled seeded elimination-serve fallback and empty-sector wall rebounds. Add captured relative mouse/keyboard input, a gently animated 38° perspective camera, readable 3D extrusion and full-height walls, a raised base, softened floor/wall reflections, directional shadows and restrained bloom. Fill the viewport; keep diagnostics nonvisual and settings in minimal menus. Include a short conditional aim-preview toggle and an approach-slowdown toggle, initially off; keep these simple experiments. No advanced spin, other layouts, networking or elaborate polish.

**Acceptance:** One person can play and rematch complete four-player rounds without editing state. Physical hits destroy only the contacted piece; gaps cause no automatic damage; a surviving damaged defender receives the next serve; eliminated seats never receive serves; a winner ends serving. Focus loss pauses solo play and clears held inputs. Run focused geometry, collision, damage, serve and elimination tests plus typecheck/lint/build. Provide a four-seat screenshot, a short gameplay capture and a local demo. The tilted view must visibly show arena height, side faces and bloom while keeping threats readable; a technically 3D but visually flat board does not satisfy this gate. Identify the missing sketch rather than claiming reference fidelity. Validate the production asset base and inspect the CI/Pages workflow configuration; report actual remote-run/deployment evidence only when available.

**Review:** Does movement feel responsive, can returns be aimed, are destruction and revenge serves satisfying, and do gap rebounds make sense? Compare preview/slowdown settings in play. Record limitations rather than treating this as release-ready physics. **STOP: REVIEW REQUIRED — M01.**

#### M02 — Refine controls and deliberate aiming

**Implement:** Iterate on the M01 interaction from hands-on feedback. Refine captured-relative-mouse-to-arc mapping, speed caps, optional acceleration, contact-angle range, keyboard steering, click/Space/Enter launch, focus, resize and selection of any of the four seats. Compare preview only, slowdown only, both and neither; report preferences and tradeoffs, then propose defaults for review. Slowdown changes simulation identically for bots and humans; the preview is informational. Touch remains excluded.

**Acceptance:** Boundary clamps, movement limits, launch semantics and any slowdown restoration/non-stacking rules are tested. No free teleporting saves or misleading guaranteed-path preview. Demonstrate deliberate centre/edge returns. **Review:** Choose responsive feel and whether either assistance experiment earns a place. **STOP: REVIEW REQUIRED — M02.**

#### M03 — Harden ball physics and paddle contact

**Implement:** Extend the existing fixed-step swept collision system to stress speeds, corners, grazing hits, moving paddles, health-piece gaps and rebounds from behind the defence. Define deterministic impact ordering and bounded collision iterations. Add impact logs, seeded replay fixtures and frame-rate independence checks. Cover isolated single-ball fixtures and the existing timed multi-ball mode; do not add complex spin.

**Acceptance:** No tunnelling in documented stress scenarios; no physics-dependent render frame rate; repeated fixtures reproduce impact ordering; balls cannot become permanently trapped in empty fortresses. **Review:** Are rebounds predictable and readable at useful play speeds? **STOP: REVIEW REQUIRED — M03.**

#### M04 — Harden destruction, revenge serves and match rules

**Implement:** Refine physical-piece damage and destruction feedback. Test ties, simultaneous events, final-piece hits, elimination serve allocation, automatic-launch timing, result/rematch and optional spectating. Review the provisional elimination fallback explicitly. Track last-hit attribution separately if useful; it never overrides the damaged defender's next serve. Test health-zone returns and empty-sector behaviour rather than treating the defence arc as a damage boundary.

**Acceptance:** One ball damages at most one physically contacted piece before returning; misses and gaps do not destroy another piece; all serve/death/tie cases are covered; no post-victory launches. **Review:** Does losing a piece remain clear, does revenge serving preserve momentum, and what should happen after an eliminating hit? **STOP: REVIEW REQUIRED — M04.**

#### M05 — Expand the proven solo game to 2–6 seats

**Implement:** Extend arena generation to rectangle, triangle, pentagon and hexagon alongside the square. Support one human in any seat and bots in the others. Refine seeded intercept/deflect bots with reaction delay and imperfect prediction. The originally delivered Beginner/Standard/Expert settings are superseded by the 12 November saved 1–100 progression amendment. Add player-count selection, basic results and developer statistics. Provide readable containers and consistent rules in every layout (currently three initial containers plus collectible supplies). Keep only essential visual polish; follow the established GitHub Pages publishing policy.
When a player dies, then the board slowly morphs to the new layout, not so quickly that it makes it impossible to defend. This way the player count is dynamic.

**Acceptance:** Play and rematch full 2/3/4/5/6-seat games locally; symmetry/rail geometry tests cover all layouts; provide 2/4/6 screenshots and gameplay capture. Bots use normal input intents and exhibit meaningful skill differences. **Major review gate:** Play ten rounds across 2/4/6. If the idea is not fun, iterate rather than continue. **STOP: REVIEW REQUIRED — M05.**

#### M06 — Curved shots, multiple balls and **pacing design gate**

**Implement:** Add measured paddle spin and bounded curving trajectories. Extend the M01 multi-ball foundations and tune the approved timed-addition direction using evidence across layouts, revenge serves and simultaneous contacts. Revalidate any approved approach slowdown and preview under multiple-ball pressure. Add a tuning interface and replay harness. Create `docs/MATCH_PACING.md` comparing **at least three** escalation systems, test the best two, run seeded bot benchmarks by arena size, and report distribution of match length and damage. Propose (do not silently lock) a default escalation curve and anti-stall rule.

**Acceptance:** Zero-spin behaves normally; replayable fixtures hold for simultaneous balls; bot-only pacing data is clearly labelled. **Review:** Pick escalation, ball counts, spin limits and approximate 2-minute profile based on evidence. **STOP: REVIEW REQUIRED — M06.**

#### M07 — Legibility, impact and arcade character

**Implement:** Implement only the approved escalation. Polish luminous thick-edged geometric materials, useful shot-attribution marks if approved, spin trails, paddle sparks, struck-piece fracture/burst, elim/victory states and restraint under high ball density. Add *original generated/synthesised* sound cues (serve, ricochet, breach, elimination, rising tension), volume/mute and readable in-arena cues, preserving pure gameplay without an overlaid HUD. Provide Low/Medium/High effects options. No textures outside the permitted particle optimisation exception.

**Existing music work:** Build on `docs/MUSIC_REVIEW.md` rather than replacing the detour prototype. Retain music mute/volume and pause/teardown handling; review its musical mix and pulse subtlety. Audio observes gameplay only; musical drops never trigger gameplay changes.

**Acceptance:** Ball and health remain trackable at 2/4/6 players; screenshots show genuine 2.5D depth; desktop feel and sound enhance rather than hide gameplay; tests still pass. **Review:** Is this visually recognisable and pleasant at speed? **STOP: REVIEW REQUIRED — M07.**

#### M08 — **Desktop browser MVP release and idea-validation gate**

**Implement:** Make a procedural 3D **CITADEL** title above the arena using the neon edge shader, −/+ total-player controls bounded to 2–6, and **START**. Keep winning in the scene with neon-shader fireworks, a resolving musical phrase and scene rematch controls; keep loss/results in the scene too. Retain compact solo settings, help, statistics and local export in Pause by explicit user choice. Colour balls/trails from the read-only last-striker observer and distinguish the default human from arena cyan. Every rival capsule needs a reliable break sound independent of wall throttling. Keep gameplay pure fullscreen canvas; any controls help or build/version information belongs in menus. Revalidate the M01 GitHub Pages workflow and asset base against the actual repository URL; verify the deployed build when repository publishing is enabled. Follow the established publishing trigger policy rather than introducing a new per-release approval prompt. Write `docs/PLAYTEST.md` with repeatable scripted checks, observations and optional external feedback prompts. Add Playwright desktop smoke tests and a simple local stats export.

**Acceptance:** Complete one-human-versus-five-bots match from a freshly opened desktop URL; clean startup, no console-breaking errors, no account, clear replay. Document what a few testers find confusing, actual match times and the next design changes. **Decision:** Go to mobile only if the core interaction has earned it. **STOP: REVIEW REQUIRED — M08.**

### PHASE B — Mobile touch; still one human versus bots

#### M09 — Responsive touch interaction

**Implement:** Add a touch input adapter over the identical `PlayerIntent` interface. Implement relative-drag steering, tap-to-launch (separate gesture thresholds and cancellation), optional large launch button, pointer capture and touch-specific hints. Fit the arena and menus to portrait and landscape orientations, safe areas and small screens; handle orientation changes and background/foreground transitions.

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

**Every phase:** Vitest unit/property fixtures for polygon geometry, paddle limits, ball collisions, deterministic event ordering, physical health damage, revenge-serve allocation, elimination and bot decisions. Stage coverage with implemented features: M01 covers the four-player prototype; cover timed multi-ball pressure in M01 and expand to all layouts at M05; further pacing/spin work belongs to M06. Playwright desktop flows for initial play through rematch. Seeded logs and a locally replayable test scenario for regressions.

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

Potential extensions **only after validation**: campaign-like bot challenges, time-trial/solo survival, daily seeded challenge, spectator/replay links, cosmetics made from procedural geometry, community tournaments, host migration, region-aware queueing and optional relay-only privacy mode.

---

## 10. Next action

**Review M09** using `docs/BRIEFING_TIMING_REVIEW.md`, `docs/LEVEL_BRIEFING_REVIEW.md`, `docs/BACK_RETRY_REVIEW.md`, `docs/MOTIF_RETURN_REVIEW.md`, `docs/SCENE_RETRY_GAP_REVIEW.md`, `docs/TRIANGLE_RALLY_REVIEW.md`, `docs/MOBILE_FEEDBACK_REVIEW.md` and `TODO.md`, especially the sixteen-ball ramp, portrait framing, wall/pillar morphs, short touch steering, reflected title, mobile audio and immediate Retry. Re-test Safari standalone on the reported iPad and iPhone; desktop WebKit evidence does not close the physical-device gate. M09 awaits owner approval; do not begin M10 automatically. M08 still needs public-site verification and M06 remains unstarted. No push, manual deployment or `gh` is authorised.
