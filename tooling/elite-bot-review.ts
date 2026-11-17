import { ARENA, FIXED_DT, fortress, type PlayerCount } from "../apps/web/src/simulation/arena";
import { botLevelProfile } from "../apps/web/src/simulation/bot-level";
import { botIntent } from "../apps/web/src/simulation/bots";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
import { add, angleDifference, clamp, scale, unit } from "../apps/web/src/simulation/vector";

/** A real shot at an intact container: a save or a scored hit must use normal collision rules. */
export function eliteCatchTrial(seed: number, count: PlayerCount = 4) {
  let state = createMatch(seed, count, 3, seed, levelDifficulty(100));
  state.phase = "playing";
  const home = fortress(0, state.arena),
    target = state.players[0]!.pieces[0]!;
  Object.assign(state.balls[0]!, {
    phase: "active",
    position: add(target.position, scale(unit(home.direction), 9)),
    velocity: scale(unit(home.direction), -34),
    spin: 0,
    rallyTime: 0,
  });
  for (let tick = 0; tick < 120; tick++) {
    state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
    const save = state.events.find((event) => event.type === "paddle" && event.seat === 0);
    const damage = state.events.find((event) => event.type === "damage" && event.seat === 0);
    if (save || damage)
      return {
        seed,
        count,
        outcome: save ? "save" : "damage",
        seconds: state.elapsed,
        collisionCaps: state.stats.collisionCaps,
      };
  }
  return {
    seed,
    count,
    outcome: "unresolved",
    seconds: state.elapsed,
    collisionCaps: state.stats.collisionCaps,
  };
}

/** Fixed level-60 policy in seat zero; its motor is capped too. This is not a human playtest. */
export function eliteProxyTrial(seed: number, count: PlayerCount, proxyLevel = 60) {
  let state = createMatch(seed, count, 3, seed, levelDifficulty(100));
  const proxy = botLevelProfile(proxyLevel);
  for (let tick = 0; tick < 120 * 90 && state.phase !== "finished"; tick++) {
    const intent = botIntent(state, 0, proxyLevel),
      current = state.players[0]!.angle;
    if (intent.targetAngle !== null)
      intent.targetAngle =
        current +
        clamp(
          angleDifference(intent.targetAngle, current),
          -proxy.speed * FIXED_DT,
          proxy.speed * FIXED_DT,
        );
    state = stepMatch(state, intent, { ...DEFAULT_OPTIONS, humanSeat: 0 });
    if (!state.players[0]!.health.some(Boolean)) break;
  }
  return {
    seed,
    count,
    proxyLevel,
    seconds: state.elapsed,
    won: state.phase === "finished" && state.winner === 0,
    alive: state.players[0]!.health.some(Boolean),
    damage: state.stats.damage,
    collisionCaps: state.stats.collisionCaps,
    humanPointerSpeed: ARENA.pointerPaddleSpeed,
  };
}
