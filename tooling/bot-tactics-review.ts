import { createViewport } from "../apps/web/src/rendering/viewport";
import {
  ARENA,
  FIXED_DT,
  fortress,
  railPosition,
  type PlayerCount,
} from "../apps/web/src/simulation/arena";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { DEFAULT_OPTIONS, type GameEvent } from "../apps/web/src/simulation/types";
import { add, scale, unit } from "../apps/web/src/simulation/vector";

/** Staged incoming ball and pickup; actual bot inputs, collision, spin and collection. */
export function renderBotTacticsReview(
  container: HTMLElement,
  count: PlayerCount,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  let state = createMatch(4, count),
    time = 0,
    spin = 0,
    collections = 0;
  const home = fortress(0, state.arena);
  const point = railPosition(
    0,
    home.direction,
    ARENA.railRadius + ARENA.ballRadius + ARENA.paddleThickness / 2,
    state.arena,
  );
  state.phase = "playing";
  state.elapsed = 5;
  state.nextSupplyId = 1;
  state.supplies = [{ id: 0, age: 2, position: add(point, scale(unit(home.direction + 0.6), 8)) }];
  state.balls = [
    {
      ...state.balls[0]!,
      phase: "active",
      seat: 1,
      position: railPosition(0, home.direction, 9, state.arena),
      velocity: scale(unit(home.direction), -24),
      spin: 0,
    },
  ];
  const viewport = createViewport(container, 0, state.arena),
    owners = new Map<number, number>();
  const render = (dt: number, events: GameEvent[]) =>
    viewport.render({ ...state, events }, dt, {
      ballOwners: owners,
      humanSeat: 0,
      preview: false,
      slowdown: false,
      quality: "high",
      reducedEffects: false,
      menu: { mode: "hidden", level: 100, count, elapsed: 0, reduced: false },
    });
  render(0, []);
  return {
    advance(target: number) {
      const before = time,
        events: GameEvent[] = [];
      while (time + FIXED_DT <= target + 1e-8) {
        time += FIXED_DT;
        state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1, botLevel: 100 });
        events.push(...state.events);
        for (const event of state.events) {
          if (event.type === "paddle") {
            owners.set(event.ballId!, event.seat);
            if (event.seat === 0) spin = event.impact!.spin;
          }
          if (event.type === "collection" && event.seat === 0) collections++;
        }
      }
      render(time - before, events);
    },
    summary: () => ({
      count,
      spin,
      collections,
      health: state.players[0]!.health.filter(Boolean).length,
      caps: state.stats.collisionCaps,
    }),
    dispose: () => viewport.dispose(),
  };
}
