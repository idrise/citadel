import { createViewport } from "../apps/web/src/rendering/viewport";
import { qualityStep, type EffectsQuality } from "../apps/web/src/rendering/quality";
import { createMatch } from "../apps/web/src/simulation/match";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
/** Render one unchanged board through every quality profile for matched comparison. */
export function createGraphicsQualityReview(
  container: HTMLElement,
  count: PlayerCount,
  touch: boolean,
) {
  container.style.cssText = "position:relative;width:100vw;height:100dvh";
  const state = createMatch(2026, count),
    view = createViewport(container, 0, state.arena);
  return {
    render(quality: EffectsQuality, open: boolean) {
      view.render(state, 0, {
        humanSeat: 0,
        quality,
        preview: false,
        slowdown: false,
        reducedEffects: false,
        menu: {
          mode: "hidden",
          count,
          elapsed: 0,
          reduced: false,
          settings: {
            open,
            touch,
            showPause: false,
            needsSound: false,
            effectsVolume: 0.75,
            musicVolume: 0.45,
            mouseSensitivity: 1,
            graphicsQuality: qualityStep(quality),
            level: 7,
            bestLevel: 12,
            diagnostics: true,
          },
        },
      });
      return { quality, count, ...view.environment(), calls: view.performance.calls };
    },
    dispose: () => view.dispose(),
  };
}
