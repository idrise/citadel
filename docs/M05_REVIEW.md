# M05 — 2–6 seats and a changing arena

Status: **Awaiting review**, 11 November 2026. M03/M04 are approved to advance;
the music detour was accepted for now. This milestone includes the user's added
request for the board to change shape gradually after elimination. M06 remains
unstarted: default ball speed, interval/cap, spin and optional relief are retained.

## Play and review

Open the local game (`pnpm dev`, normally http://127.0.0.1:5173). Choose **Players**,
then **Settings → Bot difficulty / Your fortress**. Play captures the mouse.
Restart repeats the seed; Rematch advances it. Settings survive both. Changing
players or fortress starts a fresh round and closes Settings. There is still no
visible HUD during play. Escape opens pause controls and **Round statistics**;
results show placements, remaining pieces, duration and your elimination time.
Developer statistics are tucked inside that report.

- [Two seats](reviews/m05/arena-2.png), [four seats](reviews/m05/arena-4.png),
  [six seats](reviews/m05/arena-6.png).
- [Triangle](reviews/m05/arena-3.png), [pentagon](reviews/m05/arena-5.png).
- [24-second live morph/gameplay clip](reviews/m05/gameplay-morph.mp4), music muted.
  Normal play was fast-forwarded to the first elimination before recording;
  the recorded transition then runs in real time without editing match state.
- Transition stills: [start](reviews/m05/morph-start.png),
  [six seconds](reviews/m05/morph-6s.png), [settled](reviews/m05/morph-18s.png).

The ten-round fun gate remains **your** review: try three two-seat rounds, four
four-seat rounds and three six-seat rounds, varying difficulty. Judge whether
moves remain readable/defendable during a morph, whether the rectangle feels too
narrow, and whether the three difficulties feel usefully different. Automated
rounds below establish operation, not human enjoyment or approval.

## Shared geometry and transitions

A per-match polygon now supplies the walls, fortress anchors, inward bisectors,
rail limits, spawn/serve positions, aiming, forecasts and physical colliders.
The renderer uses that same boundary for the deep plinth, full-height walls and
clipped floor/rear-wall reflections. Camera fitting uses the actual polygon's
vertices, avoiding wasted framing space around pentagons/hexagons. The view stays
behind the selected fortress; camera motion remains independent of mouse input.
Each of the six seats has a distinct colour and geometric mark.

| Initial seats | Floor                | Provisional proportions                                            |
| ------------- | -------------------- | ------------------------------------------------------------------ |
| 2             | Rectangle            | 12 × 22 units; defenders at opposite short-end midpoints           |
| 3             | Equilateral triangle | Circumradius 13; pieces inset slightly deeper for corner clearance |
| 4             | Square               | Original 18 × 18 geometry and stationary return feel               |
| 5             | Regular pentagon     | Circumradius 14                                                    |
| 6             | Regular hexagon      | Circumradius 15                                                    |

After a real elimination, the next layout corresponds to the surviving count.
Seat IDs, colours, remaining health, music phrases and serve ownership persist;
survivors are never renumbered. The first surviving ID anchors the target layout's
rotation. Eliminated actors stop defending immediately.

The transition takes **at least eight playing seconds**, longer for a large move.
Smooth easing bounds fortress translation to **1.5 units/s**. Convex polygon
interpolation keeps the boundary valid. Live balls move with the changing floor
coordinates, retaining flight velocity/speed and spin rather than being swept
by an advancing wall. Piece bodies and bat targets travel with their fortress;
ordinary spring gathering, collisions, movement/serve limits and match clocks
continue. Relative mouse targets are rebased with the changing bisector, including
within each fixed step. There is no pause, health refill, hit-stop or music timing
in this mechanism.

A second elimination retargets from the **current** geometry, without snapping
back to the previous polygon. Two survivors settle into the rectangle. A final
elimination ends the match immediately; the result does not wait for a morph.
Walls temporarily acquire extra corners/supports during interpolation, then
settle to the target polygon's normal count. That intermediate appearance and
the floor-coordinate carrying rule are provisional choices for this review.

## Bots and results

Bots read visible balls and surviving physical pieces. They estimate a rail
intercept, add seeded angular error, and bias the contact toward a visible rival.
A waiting bot keeps its chosen serve target moving with the floor rather than
selecting another rival each transition tick. They submit the same versioned intent as the human and obey the same bat speed,
collision, serve deadline and optional relief rules. Their approximation does
not promise exact prediction of curves, occlusion or future moving walls.

| Difficulty | Reaction interval | Prediction horizon | Aim error before rail clamp |
| ---------- | ----------------- | ------------------ | --------------------------- |
| Beginner   | 380–660ms         | 140ms              | ±1.0 rad                    |
| Standard   | 220–400ms         | 220ms              | ±0.75 rad                   |
| Expert     | 100–180ms         | 420ms              | ±0.19 rad                   |

Serve hesitation also varies. Standard retains the previous baseline's parameters;
the other profiles change reaction, prediction and accuracy rather than ball or
paddle speed. Unit measurements with identical visible threats verify distinct
reaction rates and lower Expert error.

Results rank stable IDs by authoritative elimination order, with the survivor
first. A human who falls early can keep watching, or use Escape → Restart. The
existing seeded elimination-serve fallback and stable final-hit policy remain.
Music now has six separate player parts. A scheduler guard skips overdue notes
if the main thread stalls, preventing repeated mono attacks at one native audio
time; this does not alter gameplay or the authored musical grid.

## Validation actually run

- `pnpm check`: formatting, lint and strict types pass without warnings.
- `pnpm test`: **235 tests in 37 files pass**. Added coverage includes every
  layout's symmetry, eight-piece clearance and bat extremes; direct rival aiming;
  high-speed polygon walls; eight-ball runs; retargeting/revenge serves; bounded
  transition movement; held input and unchanged previous states; results; bot
  difficulty; expanded music parts and stale audio scheduling.
- The original seven square replay digests remain unchanged. A new morph fixture
  reproduces the complete changing state at **30/60/144 FPS**.
- `PAGES_BASE_PATH=/citadel/ pnpm build`: passes. Initial chunk **896.48 kB /
  245.39 kB gzip**; lazy music **271.75 kB / 66.58 kB gzip**. The existing >500kB
  initial-chunk warning remains.
- `PLAYWRIGHT_RENDERER=hardware pnpm test:browser --workers=1`: **21 pass**.
  This includes twelve complete scripted desktop rounds across all layouts,
  ten specifically across 2/4/6 (3/4/3 rounds), rematches and settings persistence,
  every human seat, captured steering, pause, Pages paths and actual audio output.
- Twelve additional seeded **bot-only** engineering runs cover all layouts and
  all difficulties. All finish, with **zero collision caps** and ball clearance
  within the current polygon. Durations **33.11–112.16s**, which are not human
  pacing evidence. [Report](reviews/m05/bot-rounds.json).
- The live six-to-five recording reaches a settled five-seat boundary without
  page errors. Its emulated RAF intervals are capture metadata, not performance
  evidence. [Capture log](reviews/m05/live-stats.json).
- A separate **native, unemulated** ten-second RAF sample at 1280×900 on Apple
  M2 Pro/Chromium 158, six seats, human seat six, music/bloom/reflections enabled:
  **16.7ms median / 16.7ms p95**, audible output RMS up to **0.0403**, no page errors.
  This is a short steady-arena sample, not a performance guarantee during every
  morph or on other hardware. [Native report](reviews/m05/native-stats.json).

Reproduce the engineering reports:

```sh
pnpm exec vpx tooling/review-layouts.ts > /tmp/citadel-layouts.json
# With pnpm dev running, opens native Chromium locally:
node tooling/review-native.mjs /tmp/citadel-native.json
```

The first browser pass exposed overdue audio callbacks; the scheduler guard fixed
that failure. A later seat-selection test assumed Settings stayed open across a
new-round seat change; it now follows the actual UI. The final full suite passes.

Desktop Chromium on the host GPU is the verified target. The complete software-
WebGL suite, Safari/mobile and human ten-round fun review remain unverified.
Multiple elimination retargeting may prevent a shape fully settling before the
next death; that is intentional, but needs feel review. Reduced motion freezes
the decorative camera orbit and bloom; the real gameplay boundary still moves.
No new pacing scheme, public infrastructure, `gh`, push or deployment was performed.
The separate user edit in AGENTS remains unstaged.

Implementation checkpoints: `67ddd15`, `b63db58` and `7618c47`.

**REVIEW REQUIRED — M05.**
