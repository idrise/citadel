import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
export function renderArenaVariantReview(
  container: HTMLElement,
  count: PlayerCount,
  level: number,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(2026, count, 3, 2026, levelDifficulty(level)),
    view = createViewport(container, 0, state.arena);
  state.countdown = 4;
  view.render(state, 0.5, {
    humanSeat: 0,
    preview: false,
    slowdown: false,
    reducedEffects: false,
    menu: { mode: "level", count, elapsed: 0, reduced: false, level, introDuration: 6 },
  });
  return {
    summary: () => ({
      count,
      level,
      shape: state.difficulty!.arenaShape,
      vertices: state.arena.vertices.length,
    }),
    dispose: () => view.dispose(),
  };
}
