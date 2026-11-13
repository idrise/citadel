import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import { createPieceBodies } from "../apps/web/src/simulation/health";
import { fitDefenceLimits } from "../apps/web/src/simulation/defence-limits";
import { fortress, type PlayerCount } from "../apps/web/src/simulation/arena";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";

/** Explicit presentation fixture: previous/current bat poses or scene-only spectator controls. */
export function renderRetryGapReview(
  container: HTMLElement,
  count: PlayerCount,
  mode: "previous" | "gap" | "spectator",
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(8, count, 3, 8, levelDifficulty(1));
  state.phase = "playing";
  state.balls = [];
  if (mode === "previous" && count === 3) {
    state.arena = fitDefenceLimits({
      ...state.arena,
      batWallGap: 0.015,
      fortresses: state.arena.fortresses.map((home, index) => ({
        ...home,
        anchor: {
          x: (state.arena.vertices[index]!.x * 11.8) / 13,
          y: (state.arena.vertices[index]!.y * 11.8) / 13,
        },
      })),
    });
    state.players.forEach((p) => {
      p.pieces = createPieceBodies(p.id, state.arena, 3);
    });
  }
  state.players.forEach((p) => {
    const home = fortress(p.id, state.arena);
    p.angle = home.direction + home.angleLimits![1];
  });
  const spectator = mode === "spectator";
  if (spectator) state.players[0]!.health.fill(false);
  const view = createViewport(container, 0, state.arena);
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
      ...(spectator ? { spectator: { level: 5 } } : {}),
    },
  });
  return {
    summary: () => ({
      count,
      mode,
      inset:
        13 - Math.hypot(state.arena.fortresses[0]!.anchor.x, state.arena.fortresses[0]!.anchor.y),
      gap: state.arena.batWallGap ?? 0.015,
    }),
    dispose: () => view.dispose(),
  };
}
