# Victory star — M09 amendment

12 November 2026. The owner requested a star-shaped board with the final player's
paddle and containers in the centre, and explicitly requested a visible morph.
M09 remains **Awaiting review**; M10 has not started.

## Behaviour

When the rules declare one surviving player, the current floor, plinth and walls
morph continuously into a five-point star over **2.8 seconds**. The winner's actual
paddle turns towards the camera and moves inward; surviving containers settle into
a compact formation in the centre. Broken containers stay broken. This works for
a human or bot winner and begins from the exact current outline, including an
unfinished elimination morph.

The board stays bright while this happens. Result lettering appears after the
morph; rematch/settings become available at **4.5 seconds**. Existing human-win
fireworks and audio continue. Balls, trails and defence rails clear from the
finished scene. The camera includes acute wall tips and the plinth on phones.
Reduced motion shows the finished star immediately and retains the same victory
hold. Pause holds the presentation clock.

This is a rendering transformation. The final arena, winner, remaining health,
RNG, ticks, statistics and replay data remain unchanged. The outline shares rays
through every source and star corner, avoiding a replacement-board crossfade.
Signed wall joins handle the concave corners. Floor reflections follow the new
outline; wall reflection captures stop during victory to avoid invalid captures
across the concave boundary. Settled geometry is cached, including when the
session supplies a new events wrapper each frame.

## Rendered evidence

Native Chromium GPU captures use the real viewport and procedural assets.
The staged fixtures explicitly create a finished match; they demonstrate
presentation rather than claiming a played win. The production browser check
separately completes an unedited seeded human win and verifies held controls,
frozen statistics, result settings and rematch.

- [Morph animation](reviews/m09/victory/morph.webm).
- 2 seats: [start](reviews/m09/victory/arena-2-start.png), [middle](reviews/m09/victory/arena-2-middle.png), [star](reviews/m09/victory/arena-2-star.png).
- 4 seats: [start](reviews/m09/victory/arena-4-start.png), [middle](reviews/m09/victory/arena-4-middle.png), [star](reviews/m09/victory/arena-4-star.png).
- 6 seats: [start](reviews/m09/victory/arena-6-start.png), [middle](reviews/m09/victory/arena-6-middle.png), [star](reviews/m09/victory/arena-6-star.png).
- [Bot winner](reviews/m09/victory/bot-winner.png), [reduced motion](reviews/m09/victory/reduced-star.png).
- Phone emulation: [star hold](reviews/m09/victory/mobile-star.png), [rematch](reviews/m09/victory/mobile-rematch.png).
- [Actual played victory](reviews/m09/victory/live-star-hold.png).
- [Fixture report](reviews/m09/victory/report.json): no browser errors.

## Checks run

- `./node_modules/.bin/vp check`: formatting, lint and strict types pass.
- `./node_modules/.bin/vp test run`: **321 tests / 54 files pass**. New tests cover
  exact outline endpoints, intermediate geometry, all 2–6-seat winners,
  central placement, scattered containers, health visibility, finite concave
  meshes, hidden balls/rails, frozen state, caching, reduced motion, rematch
  timing and a finish during an elimination morph.
- `PAGES_BASE_PATH=/ ./node_modules/.bin/vp build`: root build passes.
- `PAGES_BASE_PATH=/citadel/ ./node_modules/.bin/vp build`: Pages build passes.
- Native production Playwright: desktop title, actual human victory/rematch, and
  complete 2/6-seat mobile matches through rotation, interruption and rematch.
  Four flows pass at both root and `/citadel/` base paths.
- `node tooling/review-victory-morph.mjs /tmp/citadel-victory-morph-final`:
  final native captures/video pass. One earlier fixture attempt failed because
  importing CSS as a module activated a development hot-reload WebSocket that
  Chromium blocked under its local-network policy. The isolated capture now
  loads the same stylesheet directly; the clean rerun has no browser errors.

The existing bundle-size advisory remains (main chunk about 932 kB minified).
These are Chromium and emulated-phone checks, not physical Safari/device or M10
performance certification. No push or deployment was performed.

## Try locally

Open <http://localhost:5176/>, play any player count and watch the final elimination.
The existing board should become a star as the winner moves inward; the completed
star should remain visible before AGAIN appears. Also try a bot win, a phone
viewport and Reduced effects & motion. The animation above provides an immediate
preview without playing a match.

**REVIEW REQUIRED — M09**
