import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { DEFAULT_OPTIONS, type GameEvent } from "../apps/web/src/simulation/types";
import type { PlayerCount } from "../apps/web/src/simulation/arena";

/** Natural fixed-step bot play. Late captures warm only their final visual history. */
export function renderDifficultyReview(
  container: HTMLElement,
  count: PlayerCount,
  level: number,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  let state = createMatch(2026, count, 3, 2026, levelDifficulty(level)),
    time = 0,
    lastRender = 0;
  const viewport = createViewport(container, 0, state.arena);
  const render = (events: GameEvent[]) => {
    viewport.render({ ...state, events }, Math.min(0.1, time - lastRender), {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: false,
      quality: "high",
      ballOwners: new Map(
        state.balls.filter((b) => b.striker !== undefined).map((b) => [b.id, b.striker!]),
      ),
      menu: {
        mode: state.phase === "countdown" ? "level" : "hidden",
        level,
        count,
        elapsed: 0,
        reduced: false,
      },
    });
    lastRender = time;
  };
  render([]);
  return {
    advance(target: number) {
      let events: GameEvent[] = [];
      while (time + 1 / 120 <= target + 1e-8) {
        time += 1 / 120;
        state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
        if (time < target - 0.35) continue;
        events.push(...state.events);
        if (state.tick % 4 === 0) {
          render(events);
          events = [];
        }
      }
      render(events);
    },
    summary: () => ({
      level,
      count,
      phase: state.phase,
      balls: state.balls.length,
      supplies: state.supplies.length,
      elapsed: state.elapsed,
      activeBalls: state.balls.filter((b) => b.phase === "active").length,
      difficulty: state.difficulty,
      collisionCaps: state.stats.collisionCaps,
    }),
    dispose: () => viewport.dispose(),
  };
}
