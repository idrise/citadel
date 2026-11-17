# Level tuning

Edit [`apps/web/src/simulation/levels.ts`](../apps/web/src/simulation/levels.ts).
This is the single source for the existing 100-level challenge. TypeScript checks
names and types; the unit suite checks the roster constraints and existing curves.
Use `pnpm dev` for live updates, or rebuild a production preview after edits.

`LEVEL_FORMULAS` specifies an algorithm for each feature. `BOT_FORMULAS` and
`BOT_ANCHORS` specify the bot curves. `LEVEL_OVERRIDES` replaces only the named
keys at individual levels; omitted keys continue using their formulas. Bot keys
merge individually too. For example:

```ts
export const LEVEL_OVERRIDES: Readonly<Partial<Record<number, LevelOverride>>> = {
  1: { playerCount: 6 },
  12: {
    playerCount: 6,
    ballSpeed: 18,
    maxBalls: 2,
    pickupCount: 0,
    bots: { reaction: 0.4, error: 1.2 },
  },
};
```

The addition interval uses the resolved ball cap unless explicitly overridden.
A zero pickup budget or zero bot jitter/error is an override, not a missing value.
The resolved values are frozen for the entire attempt, including its result screen.

| Key               | Meaning / unit                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `playerCount`     | Total starting players, including the human. Use 2 or 4–16; maximum 7 for levels 1–20.    |
| `arenaShape`      | `classic`, `wide`, `faceted`, `compact`, `spacious`, `rounded`                            |
| `batProfile`      | `standard`, `shallow`, `deep` curvature; separate from width                              |
| `batScale`        | Multiplier on the standard bat half-angle                                                 |
| `ballSpeed`       | Initial flight speed in world units/second; the existing rally acceleration still applies |
| `maxBalls`        | Ball cap, integer 1–16; rounds begin with one                                             |
| `ballInterval`    | Seconds of playing time between additional balls                                          |
| `pickupCount`     | Total supply budget for the existing opening-minute drop system                           |
| `bots.reaction`   | Seconds between bot reaction opportunities                                                |
| `bots.jitter`     | Maximum extra random reaction delay, seconds                                              |
| `bots.error`      | Maximum aiming-error range, radians                                                       |
| `bots.horizon`    | Prediction horizon, seconds                                                               |
| `bots.serveScale` | Multiplier on the bot's serve wait                                                        |
| `bots.speed`      | Bot paddle movement cap, radians/second; does not change ball speed                       |
| `bots.tactics`    | Tactical sophistication, 0–1                                                              |

The existing bot speed curve remains unchanged: 2 rad/s at level 1, 3.2 rad/s at
level 35–80, then smoothly rising to the human mouse cap of 16 rad/s at level 100.
Level 100 reacts each physics tick with no jitter or aiming error. These are tuning
choices, and all can be overridden.

`PLAYER_WEIGHTS` favours six with weight 3 versus weight 1 for every other count.
`ROSTER_SEED` deterministically disperses those choices across levels without using
match RNG. Change it to reshuffle. Level 1 explicitly starts with six. Among levels
21–100, the current seed includes all allowed counts and six appears most often.
A replay/retry does not reroll the roster. Three can still occur during elimination
morphs; no progression level starts with three.

The selector and its visible count row are removed from desktop and touch title
menus. The quiet level/player status remains. Old roster preferences cannot shift
the saved level; settings and history remain intact. The injected browser-test
port retains explicit roster fixtures for existing geometry/physics checks only.

## Verification

- `vp check --fix`: formatting, lint and TypeScript pass.
- `vp test run`: 623 tests in 114 files pass.
- Root and `/citadel/` production builds pass, retaining the existing large-chunk advisory.
- 36 selected native Chromium root browser scenarios have passing coverage across
  the initial and corrected runs. A legacy two-player progression fixture now explicitly
  selects its roster after reload, since roster preferences no longer control real levels.
  The new demotion test initially used a stale exact Retry label; its corrected label passes.
- Seven final production `/citadel/` checks pass: desktop/phone title controls,
  debug roster restoration, real demotion/Retry, preview morph/clamping and startup/refresh.
- All browser input stayed inside the page through `tests/fixtures.ts` and the virtual-input hook.
- No full browser-suite or physical phone/Safari run is claimed. Existing large-roster
  readability/performance and human pacing review remain open.

Rendered desktop and phone title frames and authored 2/4/6-player level introductions
are saved in [`reviews/m09/level-tuning/`](reviews/m09/level-tuning/). Reviewed frames
show reachable Start/Settings, no count selector, readable introductions and intact
arena framing.

A live local demo is running at **http://127.0.0.1:5179/** (`vp dev`, root base path).
Edit the TypeScript tuning file to reload. Keyboard +/− previews unranked levels;
Backspace restores the saved challenge. Try an early two-player level, a six-player
level, then navigate beyond 20 to inspect the larger rosters.

Local tuning checkpoint: `b04e794`. UI integration and review evidence are committed
separately. No push or deployment was performed. M09 remains awaiting review.
