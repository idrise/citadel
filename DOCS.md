# CITADEL project notes

This condenses the former review-document folder. [README.md](README.md)
describes the game for players; [CONTRIBUTING.md](CONTRIBUTING.md) covers setup,
checks and publishing. [PLAN.md](PLAN.md) remains the design and milestone
authority; [TODO.md](TODO.md) retains the feedback checklist.

## Gameplay and progression

The game is one human against bots. Each defender protects physical capsules
with a curved bat. Only hitting a surviving capsule causes damage; shots can
pass through gaps. The damaged survivor receives a revenge serve. Surviving
capsules grow slightly and gather with damped springs; two seconds of protection
after damage prevents immediate repeat losses.

The last survivor wins. Eliminations morph the arena around the remaining
fortresses while preserving identities, ball continuity and steering. Victory
ends in an upright star, fireworks and a resolving musical phrase. After human
elimination, Back returns to the title and Retry starts the saved challenge.

The challenge has 100 levels. Wins advance exactly one level; level 100 stays at 100. Three replay tokens are spent on failed attempts; a further failure at zero
demotes one level. A win or demotion restores three tokens. Best records the
highest level actually won. Progress and preferences are browser-local; debug
levels do not affect them. Reset progress clears challenge history, retaining
sound and control settings.

The current authored opening uses two players in levels 1–2 and four in levels
3–5. Levels 1–20 cap at seven; later levels use the
full 2–16 range, excluding three-player starts. A seeded weighted itinerary
favours six. Two defenders use a rectangle; larger rosters use polygons, with
Classic, Wide, Faceted, Compact, Spacious and Rounded variants. Eliminations can
pass through a triangle. Bat reach uses the real wall planes, including in the
triangle, without moving fortresses backward or reserving an unreachable gap.

Attempts start with one ball and add more, reaching a cap of sixteen at level 100. Supplies start at level 5 and stop arriving after the opening minute.
Scoreless rallies accelerate after eight active seconds, capped at 1.75×;
scoring resets that ball's speed. Flicks add signed, decaying spin to serves and
returns without increasing speed. Ball-to-ball contacts transfer spin. After
four wall bounces without a bat return or serve, subsequent wall contacts add
growing bounded spin to break repeated wall rallies. Bot forecasts use the same
physics. Player-facing trajectory guides are retired.

## Level tuning

Edit [levels.ts](apps/web/src/simulation/levels.ts).
`LEVEL_FORMULAS`, `BOT_FORMULAS` and `BOT_ANCHORS` define curves;
`LEVEL_OVERRIDES` merges only explicitly supplied keys, including bot keys.
Zero is a valid override. Resolved settings remain fixed for the attempt.

| Field                          | Meaning / units                                                       |
| ------------------------------ | --------------------------------------------------------------------- |
| `playerCount`                  | Total human + bots; 2 or 4–16, at most 7 in levels 1–20               |
| `arenaShape`                   | `classic`, `wide`, `faceted`, `compact`, `spacious`, `rounded`        |
| `batProfile`                   | `standard`, `shallow`, `deep`; curvature independent of width         |
| `batScale`                     | Multiplier on the standard bat half-angle                             |
| `ballSpeed`                    | Initial world units/second, before rally acceleration                 |
| `maxBalls`                     | Integer cap 1–16; starts with one                                     |
| `ballInterval`                 | Playing seconds between additions; derived from cap unless overridden |
| `pickupCount`                  | Total opening-minute supply budget                                    |
| `bots.reaction`, `bots.jitter` | Reaction interval and maximum additional delay, seconds               |
| `bots.error`                   | Maximum aiming-error range, radians                                   |
| `bots.horizon`                 | Forecast horizon, seconds                                             |
| `bots.serveScale`              | Serve-wait multiplier                                                 |
| `bots.speed`                   | Bat movement cap, radians/second                                      |
| `bots.tactics`                 | Tactical sophistication, 0–1                                          |

For example, `{ ballSpeed: 18, maxBalls: 2, bots: { reaction: 0.4 } }` changes
only those properties for an overridden level. `PLAYER_WEIGHTS` and `ROSTER_SEED`
control the repeatable roster itinerary without consuming match RNG. The upper
bot anchors deliberately retain fallible aim and 110–190ms reactions, with a
4.8 rad/s movement cap. Bots defend first, consider pickups and curves, and later
look for exposed targets and banks; they never read future human input.

## Presentation and sound

The world uses procedural geometry, neon edges, local bloom, frosted reflections
and a recessed arena over an exterior grid. Menus and lettering are rendered in
the scene with hidden accessible DOM targets. The title background is an
independent all-bot match with protected capsules. Starting clears that demo
into a normal round; it cannot change the player's saved result.

The camera follows bat movement with a small symmetric shimmy and danger zoom,
settling at exact neutral when centred. Input is independent of camera motion.
Portrait framing is steeper with short relative touch steering. Reduced effects
suppresses bloom/reflections and beat lighting and holds the camera pose.
Adaptive resolution responds gradually to sustained load, preserving controls
and simulation. Large rosters keep bounded lights/reflection passes and pooled
effects. iOS touch selection/callouts are suppressed on the game surface.

The procedural 136 BPM electronic score opens with muted hats, adds snare and
melodic hints, then kick/build/drop. More balls add harmony, arpeggios and brass
on bar boundaries; the original theme returns between variations. Audio only
observes gameplay. Collision results never wait for musical quantisation.
Separate music/SFX volumes persist; pause, focus loss and teardown silence both.
Wall and bat impacts have distinct cues, success/damage use different phrases,
and bat movement uses a short smooth unpitched air pass. The rejected synthetic
crowd and its expensive audio graph were removed. Judge changes in the actual
gameplay mix, including low music/max SFX and dense action at maximum music.

## Platform metrics

A typed signal adapter observes session snapshots outside gameplay. Reddit tracks
one journey per real level attempt: readiness, explicit start, first return/score,
monotonic opponent-elimination progress, resume and a single end. Wins/losses use
`game.win`; the attempted level is included in start/outcome details. Score counts
rival capsules credited to the human. Abandonment is separate from a loss. Title
animation, debug attempts and bot spectating do not generate journeys.

`citadel.davidjelliott.com` uses no-op signals and sends no metrics. itch.io also
has no custom tracking and retains its built-in page analytics. Reddit's SDK and
server router exist only in its target; local preview has no live host context.
Only whitelisted level/roster/outcome/score data is added, and analytics errors
cannot stop a game. Reddit approval/allowlisting is required before live events
are accepted; implementation alone does not activate collection. See
[the adapter and journey map](CONTRIBUTING.md#metrics-adapters).

## Diagnostics and performance

Use `build:local` / `preview:local` for Report/Test actions and
`window.__citadelPerformance()`. Public releases omit these tools. Reports
contain build identity, bounded recent active-play samples, frame distributions,
stage timings, resource/audio context and GPU timings when supported. Reports
are local downloads; nothing is uploaded automatically.

For a repeatable capture, serve the local diagnostic build on port 4173:

```sh
node tooling/performance-baseline.mjs --device=desktop --level=1 --seats=6 --seconds=60 --output=/tmp/citadel-desktop.json
node tooling/performance-baseline.mjs --device=phone --level=100 --seats=6 --seconds=60 --output=/tmp/citadel-phone.json
node tooling/performance-baseline.mjs --device=tablet --level=100 --seats=6 --seconds=60 --output=/tmp/citadel-tablet.json
```

Run one capture at a time and repeat matched conditions. Check active duration,
ball peaks, restarts, phases, errors and collector overflow before claiming a
sustained workload. Frame intervals, CPU work and asynchronous GPU samples
describe different things; overlapping CPU/GPU times are not additive. Record
the affected player's device, browser, build, quality, resolution and power
state before changing settings. Distinguish missing notes, distortion and
output cut-outs when investigating audio; an offline render cannot establish
live scheduler reliability. Inspect reports for machine details before sharing.

Historical local Mac measurements did not reproduce the reported roughly 15 FPS
Windows Chrome issue. Phone/tablet viewport emulation does not represent their
GPU, battery, thermals or Safari behavior. Physical iPad/iPhone validation,
standalone iOS selection-menu retesting and affected-Windows evidence remain
open. Do not claim that local desktop tests close those reports.

## Artwork and promotional media

The original square source is [icon_512.png](apps/web/public/icon_512.png).
Browser favicon, Apple 180px and manifest 192/512px icons derive directly from
it. Icons use `purpose: any`; title/button content near the edges is unsuitable
for a maskable crop. Marketing art stays outside the procedural game world.
Landscape art was generated by extending the supplied square's dark neon arena
background while preserving the complete CITADEL title and START button.
Square exports above 512px are upscales, not additional source detail.

Upload images remain in [apps/web/public/artwork/](apps/web/public/artwork/):

| Placement                        | File / size                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| itch cover                       | `itch-cover-630x500.png`, smaller `itch-cover-315x250.png`                                   |
| itch launch image                | `itch-splash-960x540.png`                                                                    |
| Devvit original icon             | `devvit-icon-1024x1024.png`                                                                  |
| Devvit responsive launcher image | `devvit-splash-880x512.png`                                                                  |
| Facebook sharing                 | `facebook-share-1200x630.png`                                                                |
| Facebook game candidates         | `facebook-cover-800x450.png`, `facebook-icon-1024x1024.png`, `facebook-splash-2048x2048.png` |

The SDK upload icon is [apps/reddit/assets/icon.png](apps/reddit/assets/icon.png),
a compressed 1024px derivative below 500 KB. Preserve complete lettering and
buttons when resizing. Smaller exports used ImageMagick `LanczosSharp`,
`filter:blur=0.85` and a final unsharp mask; generate each favicon frame from the
original square. The removed landscape master can be recovered from Git history
if reauthoring is required.

Open Graph metadata uses the absolute Pages share-image URL; update it if
hosting changes. Facebook game candidates do not imply an SDK integration, and
their dashboard requirements remain unverified. The delivered teaser video,
screenshots and capture notes are in
[artifacts/citadel-teaser/](artifacts/citadel-teaser/README.md). Its continuous
music track is mixed separately from clip SFX; capture bloom at the intended
render scale and avoid added captions/settings panels. Exact historical footage
uses the media checkpoint documented there, since gameplay fixes can change
seeded outcomes.

## Review status and retained evidence

M01–M05 and M07 were approved. M08's local desktop build was approved, with
public verification tracked separately; M06's comparative pacing work remains
unstarted. M09 awaits owner review, including physical mobile checks. Do not
start M10 or networking automatically. Multiplayer, matchmaking, account-backed
progress and Facebook SDK integration are not delivered features.

The former folder held milestone reports, screenshots, audition files,
profiling captures and detailed experiments, many superseded by later feedback.
Their important behavior and limits are condensed above; historical work records
and commit IDs remain in PLAN.md, and committed raw evidence can be recovered
from Git history. Useful golden physics logs were moved to
`tooling/fixtures/physics/` and remain enforced by the fast unit suite. New manual
captures go to ignored `artifacts/reviews/`; they are not required game assets.

Before M09 approval, review desktop/touch steering, curved hits and banks,
2/4/6 and dense 16-seat/16-ball play, damage protection/revenge serves,
elimination morphs, title/result/Settings layouts, replay-token demotion,
pause/resume, background audio recovery and real iOS standalone interaction.
Local sandbox tests cover Reddit launcher/control behavior; authenticated Reddit
installation and mobile-app playtesting remain separate validation.
