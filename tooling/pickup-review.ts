import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { FIXED_DT, type PlayerCount } from "../apps/web/src/simulation/arena";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
export function renderPickupReview(
  container: HTMLElement,
  count: PlayerCount,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  let state = createMatch(2026, count);
  state.phase = "playing";
  state.supplies = [{ id: 0, age: 1, position: { x: 0, y: 0 } }];
  Object.assign(state.balls[0]!, {
    phase: "active",
    striker: 0,
    position: { x: -1, y: 0 },
    velocity: { x: 24, y: 0 },
    spin: 0,
  });
  const view = createViewport(container, 0, state.arena);
  let tick = 0,
    collections = 0;
  const draw = (dt: number) =>
    view.render(state, dt, {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: false,
      quality: "high",
      menu: { mode: "hidden", count, elapsed: 0, reduced: false },
    });
  draw(0);
  return {
    frame(time: number) {
      while (tick < Math.round(time * 120)) {
        state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: 0 });
        collections += state.events.filter((e) => e.type === "collection").length;
        draw(FIXED_DT);
        tick++;
      }
      return {
        count,
        time,
        collections,
        health: state.players[0]!.health.filter(Boolean).length,
        collisionCaps: state.stats.collisionCaps,
      };
    },
    dispose: () => view.dispose(),
  };
}
