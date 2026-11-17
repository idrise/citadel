# Elite bots: difficult and fallible

The previous level-100 profile combined a physics-tick reaction with zero jitter,
zero aim error, a one-second forecast and the full 16 rad/s human pointer speed.
It could plan accurate attacks and execute them with almost no room for error.

The level-80 and level-100 anchors in
[`levels.ts`](../apps/web/src/simulation/levels.ts) now keep meaningful reaction
and accuracy limits. Levels 1–60 retain their original bot tuning, and all level
profiles still improve monotonically between the anchors.

| Level-100 setting       | Before   | After                              |
| ----------------------- | -------- | ---------------------------------- |
| Reaction                | 8.3ms    | 110ms                              |
| Extra random delay      | 0        | Up to 80ms                         |
| Catch aim error         | 0        | ±0.225 radians, approximately ±13° |
| Prediction horizon      | 1 second | 0.5 seconds                        |
| Paddle speed cap        | 16 rad/s | 4.8 rad/s                          |
| Serve-delay multiplier  | 0.45     | 0.85                               |
| Tactical sophistication | 1        | 1                                  |

Bots still use curved returns, wall banks and opportunistic targeting. Their serve
error also remains nonzero and stable while aiming; they do not reroll it every
frame to converge on a perfect shot. Human mouse/touch movement remains 16 rad/s.
Ball pressure, bat dimensions, supplies, progression and player-count formulas are
unchanged. No forced damage, scripted losing decision, human-specific targeting
or special collision exception was added.

## Seeded evidence

`tooling/review-elite-bots.ts` reproduces the post-change report. The before report
was captured against the original profile before editing. Both are in
[`reviews/m09/elite-bots/`](reviews/m09/elite-bots/).

The collision fixture sends a real active ball toward an intact container and
runs normal bot control and physics. Across seeds 1–24 in each of the 2/4/6/12-seat
arenas:

- Before: 96 saves, no goals.
- After: 49 saves and 47 actual scored hits, with no unresolved shots or collision caps.

These are controlled scoring opportunities, not a natural-match save percentage.
A separate 32-seed regression checks positive/negative, stable elite serve errors.

The same fixed level-60 proxy loses all nine paired level-100 samples before and
after, so the new bots remain substantially stronger than that controller. Its
survival time varies by seed and layout; this small sample does not establish a
human win rate. The proxy motor is capped at its own bot level, below the human
input cap.

A stronger but still fallible level-100 proxy demonstrates legal wins in 2- and
6-player samples. A selected seed-20 regression also wins the authored twelve-player
level 100 in approximately 28.12 playing seconds, with normal health, supplies,
serves and collisions. This selected example proves a winning execution exists;
it is not an unbiased win-rate estimate. The proxy observes the same public-state
bot inputs, retains normal aim error and uses a 4.8 rad/s movement cap. Zero collision
caps occurred in all recorded trials.

The pre-existing signed-pickup fixture now uses seed 20 for its positive-swipe
example: the old perfect-bot seed now misses, as intended by this change. It still
asserts a genuine signed return, collection event and extra health; both curve
signs remain covered.

## Validation and local review

- `vp check --fix`: formatting, lint and TypeScript pass.
- `vp test run`: 637 unit tests in 115 files pass, including continuous level ramps,
  finite elite movement, deterministic replay, real misses/saves, imperfect serving,
  signed curves/pickups, a full twelve-player win and capture/seat-reset regressions.
- Root and `/citadel/` production builds pass with the existing large-chunk advisory.
- Initial elite/input checks pass. The final 33 native Chromium root integration
  scenarios pass after the debug fix, covering rapid debug navigation, changing
  rosters, ordinary Restart, progress reset, wins/demotions and all elite layouts.
- Browser input uses `tests/fixtures.ts` and document-local virtual input.
- Thirteen final `/citadel/` checks pass: rapid stepping/capture, keyboard/mouse/touch
  serving, 2/4/6/12-seat elite gameplay and production startup/refresh.

Reviewed screenshots show live level-100 gameplay with
[2](reviews/m09/elite-bots/elite-level-100-2.png),
[4](reviews/m09/elite-bots/elite-level-100-4.png),
[6](reviews/m09/elite-bots/elite-level-100-6.png) and
[12 players](reviews/m09/elite-bots/elite-level-100-12.png).
A short [desktop gameplay capture](reviews/m09/elite-bots/elite-level-100-desktop.webm)
shows the introduction, opening play and pause using scripted keyboard input.

## Quick debug stepping

The owner's follow-up requests +/− stepping without Settings. Debug resets previously
released and re-requested mouse capture; a browser rejecting immediate re-capture
then opened the pause panel. The regression reproduces that failure entirely inside
the document, without native pointer lock or system mouse movement.

The session now reuses its adapters, clears held input and resets the controlled
fortress while preserving active/pending capture during debug navigation. Repeated
capture calls are idempotent. Rapid forward/backward steps, including a shrinking
roster, keep Settings closed and saved progression unchanged. Genuine unexpected
capture loss still opens pause, and ordinary Restart/reset releases capture.

The owner concurrently changed early roster overrides. Those working-copy hunks
remain untouched and uncommitted; roster tests now follow authored configuration.
Local implementation commits: `28d58f5` (elite bots), `b2488ce` (debug stepping).

The live local demo remains **http://127.0.0.1:5179/**; refresh to load the new
profile. The authoring values remain together in `BOT_ANCHORS` for further tuning.
Human playtesting must judge whether this feels very hard but fair. No human
completion, physical phone/Safari check, complete browser suite or M06 pacing
validation is claimed. No push or deployment was performed. M09 awaits review.
