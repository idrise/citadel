import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
/** Authored completed-match pose; transitions use the real viewport's capture/reset path. */
export function renderBoardTransitionReview(
  container: HTMLElement,
  count: PlayerCount,
  width = 1280,
  height = 900,
  graded = false,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const finished = createMatch(2026, count, 3, 2026, graded ? levelDifficulty(1) : undefined),
    target = createMatch(2027, count, 3, 2027, graded ? levelDifficulty(2) : undefined);
  finished.phase = "finished";
  finished.winner = 0;
  for (const player of finished.players) if (player.id !== 0) player.health.fill(false);
  const view = createViewport(container, 0, finished.arena),
    canvas = view.canvas;
  view.render(finished, 0, {
    humanSeat: 0,
    preview: false,
    slowdown: false,
    reducedEffects: false,
    menu: { mode: "victory", count, elapsed: 4, reduced: false },
  });
  view.transitionTitle(target, 0, true);
  let elapsed = 0;
  return {
    frame(time: number) {
      view.render(target, time - elapsed, {
        humanSeat: 0,
        preview: false,
        slowdown: false,
        reducedEffects: false,
        menu: { mode: "title", count, elapsed: 0, reduced: false },
      });
      elapsed = time;
      return { count, elapsed, moving: view.titleMoving, sameCanvas: canvas === view.canvas };
    },
    dispose: () => view.dispose(),
  };
}
