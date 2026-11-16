import { createArena, type PlayerCount, FIXED_DT } from "../simulation/arena";
import { createMatch, stepMatch } from "../simulation/match";
import { createPieceBodies } from "../simulation/health";
import { readyBall } from "../simulation/serving";
import { DEFAULT_OPTIONS, IDLE_INTENT, type MatchState } from "../simulation/types";

export interface Scenario {
  seats: PlayerCount;
  shape: "classic" | "rounded";
  workload: "play" | "sixteen" | "morph";
}
export const BENCHMARK_SEED = 0xc17ade1;
export const BENCHMARK_SUPPLY_SEED = 0x51a11;
/** Authored repeatable fixture: production bots/physics, repaired defences, scripted eliminations.
 * It deliberately cannot advance campaign progress and is not a natural match/replay. */
export function createScenario(config: Scenario) {
  let state: MatchState;
  let ticks = 0;
  let cycle = 0;
  let eliminated = -1;
  const reset = () => {
    state = createMatch(BENCHMARK_SEED, config.seats, 3, BENCHMARK_SUPPLY_SEED);
    state.arena = createArena(config.seats, undefined, 0, 1, config.shape);
    state.players.forEach((player) => {
      player.angle = state.arena.fortresses[player.id]!.direction;
      player.pieces = createPieceBodies(player.id, state.arena, 3);
    });
    state.nextEventId = cycle * 1_000_000;
    state.phase = "playing";
    state.countdown = 0;
    state.elapsed = config.workload === "sixteen" ? 60 : 0;
    state.balls = Array.from({ length: config.workload === "sixteen" ? 16 : 4 }, (_, i) =>
      readyBall(state, i % config.seats, i),
    );
    state.nextBallId = state.balls.length;
    eliminated = -1;
    cycle++;
  };
  reset();
  return {
    get state() {
      return state;
    },
    get ticks() {
      return ticks;
    },
    get cycles() {
      return cycle;
    },
    step() {
      const localTick = ticks % (24 * 120);
      if (ticks && localTick === 0) reset();
      if (config.workload === "morph" && localTick === 12 * 120 && config.seats > 2) {
        eliminated = config.seats - 1;
        state.players[eliminated]!.health.fill(false);
        state.eliminations.push({ seat: eliminated, elapsed: state.elapsed });
      }
      state = stepMatch(state, IDLE_INTENT, {
        ...DEFAULT_OPTIONS,
        humanSeat: -1,
        maxBalls: config.workload === "sixteen" ? 16 : 4,
        ballInterval: 2,
        serveTimeout: 0.6,
      });
      // Restore damaged bodies after the production collision path; preserve the authored elimination.
      state.players.forEach((player) => {
        if (player.id !== eliminated && !player.health.every(Boolean)) {
          player.health.fill(true);
          player.pieces = createPieceBodies(player.id, state.arena, player.health.length);
        }
      });
      if (state.phase === "finished") {
        state.phase = "playing";
        state.winner = null;
        state.balls = Array.from({ length: config.workload === "sixteen" ? 16 : 4 }, (_, i) =>
          readyBall(state, i % config.seats, state.nextBallId++),
        );
      }
      ticks++;
      return state;
    },
    simulatedSeconds: () => ticks * FIXED_DT,
  };
}
