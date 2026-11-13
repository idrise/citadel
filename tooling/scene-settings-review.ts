import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
export function renderSceneSettingsReview(
  container: HTMLElement,
  count: PlayerCount,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(2026, count),
    view = createViewport(container, 0, state.arena);
  view.render(state, 0, {
    humanSeat: 0,
    preview: false,
    slowdown: false,
    reducedEffects: false,
    quality: "high",
    menu: {
      mode: "hidden",
      count,
      elapsed: 0,
      reduced: false,
      settings: {
        open: true,
        touch: width < 700,
        showPause: false,
        needsSound: false,
        effectsVolume: 0.75,
        musicVolume: 0.45,
        mouseSensitivity: 1,
      },
    },
  });
  return {
    summary: () => ({ count, width, height, touch: width < 700 }),
    dispose: () => view.dispose(),
  };
}
