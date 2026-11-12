import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import type { PlayerCount } from "../apps/web/src/simulation/arena";

/** Pose fixture: the actual countdown drives the world lettering and existing planar reflections. */
export function renderLevelIntroReview(
  container: HTMLElement,
  count: PlayerCount,
  level = 1,
  demoted = false,
  reduced = false,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(2026, count),
    viewport = createViewport(container, 0, state.arena);
  let previous = 0;
  const advance = (time: number) => {
    state.countdown = Math.max(0, 1.5 - time);
    state.phase = time < 1.5 ? "countdown" : "playing";
    viewport.render(state, Math.max(0, time - previous), {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: reduced,
      quality: "high",
      menu: {
        mode: time < 1.5 ? "level" : "hidden",
        level,
        count,
        elapsed: 0,
        reduced,
        demotion: demoted ? { from: level + 1, to: level, count } : null,
      },
    });
    previous = time;
  };
  advance(0);
  return { advance, dispose: () => viewport.dispose() };
}
