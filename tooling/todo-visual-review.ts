import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
/** Deliberately authored presentation fixture; no gameplay outcome is claimed by this reel. */
export function createMorphReview(container: HTMLElement) {
  container.style.cssText = "width:1280px;height:900px;position:relative";
  let state = createMatch(2026, 2),
    count: PlayerCount = 2;
  const view = createViewport(container, 0, state.arena);
  const frame = (dt: number) =>
    view.render(state, dt, {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: false,
      quality: "high",
      menu: { mode: "title", count, elapsed: 0, reduced: false },
    });
  frame(0);
  for (let i = 0; i < 60; i++) frame(1 / 60);
  return {
    next(next: PlayerCount) {
      count = next;
      state = createMatch(2026, next);
      view.transitionTitle(state, 0, true);
    },
    frame,
    dispose: () => view.dispose(),
  };
}
