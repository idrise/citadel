# Challenge changes and demotion stakes

The reflected world-space level announcement now carries concise captions below the level. They rise and sink with the existing introduction; the opening countdown and simulation never wait for text. The CITADEL title remains separate from the level briefing.

## What players see

- **EXTRA BALL** at each ball unlock; **PICKUPS INTRODUCED** at level 5, then **MORE PICKUPS** when the budget rises.
- **SMALLER BAT** after a cumulative ten-percentage-point width step, and **QUICKER BOTS** after a cumulative 0.13-second reaction improvement. **SPEED UP** fills intervening rising levels, where ball speed increases continuously. Level 100 calls out **EXTRA BALL** and **ELITE BOTS**.
- **LOSS RETRIES LEVEL NN** on an ordinary attempt; warm-coloured **LOSS DROPS TO LEVEL NN** when two losses are already saved for this challenge. Level 1 states **LEVEL 01 IS THE FLOOR**.

At most two key changes are shown at once, prioritising balls and pickups. Portrait mode wraps the stakes into larger short lines so the whole level sign does not shrink to fit one long warning.

The loss prediction uses the same level/count/streak conditions as `recordResult`, including selecting another arena. It is frozen at Start for the attempt. Result updates prepare the next briefing without rewriting the current attempt's stakes.

Changes compare the current level with the actual previous same-arena attempt in saved progress. Skipping 7 → 9 still reports the extra ball unlocked at 8. A retry at the same level does not claim another upgrade. A downward step can report fewer balls/pickups, a wider bat or slower bots; the existing DEMOTED FROM NN line remains. For a new arena without a prior attempt, the introduction describes that level relative to its predecessor.

## Easy to hardest

This is feedback over the existing difficulty curve, not a new balance change. All attempts begin with one ball; the cap and arrival schedule depend on level.

| Parameter                      | Level 1                   | Level 100                                    |
| ------------------------------ | ------------------------- | -------------------------------------------- |
| Ball cap                       | 1                         | 16                                           |
| Ball arrival interval          | 12s (cap already reached) | 2s                                           |
| Base ball speed                | 14                        | 34                                           |
| Bat width relative to standard | 135%                      | 70%                                          |
| Pickup budget                  | 0                         | 7                                            |
| Bot reaction delay             | 0.65s plus jitter         | One physics tick, no deliberate error/jitter |

Extra balls unlock every 6–7 levels (15 additions across the 100 levels). Pickups begin at 5, with budget increases at 20/35/50/65/80/95. Speed and bat width ramp continuously; bot prediction, movement, serve accuracy and tactics improve along the existing level profile. Level-100 bots still obey legal movement and visible-state planning.

The [render report](reviews/m09/level-briefing/report.json) includes the actual rule values, bot profiles and captions for all 100 levels, plus ten authored desktop/phone samples at 2/4/6 players. [Phone extra ball and demotion risk](reviews/m09/level-briefing/phone-6-level-8.png), [desktop maximum challenge](reviews/m09/level-briefing/desktop-4-level-100.png), and [completed demotion](reviews/m09/level-briefing/phone-4-level-7.png) show the world lettering and reflections.

## Checks and limits

`vp check --fix` is clean; **456 unit tests across 73 files**, **16/16 root production browser checks** and **12/12 Pages browser checks** pass. Both production bases build; ten rendered fixtures have zero browser errors. `git diff --check` is clean. Unit coverage checks every ball/pickup unlock, skipped and repeated levels, smaller-bat/bot milestones, loss prediction against actual `recordResult` outcomes across level/arena/streak boundaries, caption placement and viewport bounds for every seat, stale-warning replacement, floor clipping and unchanged title rendering. Native browser coverage exercises real introductions, pause, safe losses, demotion, progression persistence and desktop/touch Back/Retry.

An initial concurrent CPU/browser run timed out three unit cases. Reducing redundant geometry rebuilds and sampling progression boundaries, then running unit checks separately, resolves those timeouts. The first browser selection passed 15/16: a test edit incorrectly expected a demotion warning on a safe attempt. Correcting that expectation makes the full root selection pass. The expanded geometry check also caught top-edge clipping in the triangle landscape view after a five-level jump. Keeping the two main changes makes the complete sign fit again. All final checks pass.

Physical iPad/iPhone readability and balance remain for hands-on review. The existing ~969kB main-chunk advisory remains. Local demo: `http://localhost:5177/`.

**REVIEW REQUIRED — M09**
