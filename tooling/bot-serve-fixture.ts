import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { ARENA, FIXED_DT, fortress, railPosition } from "../apps/web/src/simulation/arena";
import { aimServeAt } from "../apps/web/src/simulation/aim";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "../apps/web/src/simulation/types";
/** Authored held-ball duel, then ordinary human movement and bot decisions through real physics. */
export function createSneakServeFixture() {
  let state = createMatch(2026, 2, 3, 2026, levelDifficulty(100));
  state.phase = "playing";
  const ball = state.balls[0]!;
  Object.assign(ball, { seat: 1, striker: 1, age: 0.6 });
  const angle = aimServeAt(1, state.players[0]!.pieces[0]!.position, state.arena);
  state.players[1]!.angle = angle;
  ball.position = railPosition(1, angle, ARENA.railRadius + 0.4, state.arena);
  const launches: { time: number; seat: number; spin: number }[] = [],
    damage: { time: number; seat: number }[] = [];
  return {
    get state() {
      return state;
    },
    advance(time: number, turnAway = false, onStep?: (dt: number) => void) {
      while (state.elapsed + 1e-8 < time) {
        state = stepMatch(
          state,
          turnAway
            ? { ...IDLE_INTENT, targetAngle: fortress(0, state.arena).direction + 2 }
            : IDLE_INTENT,
          { ...DEFAULT_OPTIONS, humanSeat: 0 },
        );
        for (const event of state.events) {
          if (event.type === "launch")
            launches.push({
              time: state.elapsed,
              seat: event.seat,
              spin: state.balls.find((b) => b.id === event.ballId)?.spin ?? 0,
            });
          if (event.type === "damage") damage.push({ time: state.elapsed, seat: event.seat });
        }
        onStep?.(FIXED_DT);
      }
    },
    summary: () => ({
      launches,
      damage,
      health: state.players.map((p) => p.health.filter(Boolean).length),
      collisionCaps: state.stats.collisionCaps,
    }),
  };
}
