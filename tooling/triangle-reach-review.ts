import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import { fortress, type PlayerCount } from "../apps/web/src/simulation/arena";
import { beginArenaMorph, stepArenaMorph } from "../apps/web/src/simulation/arena-morph";
import { fitDefenceLimits } from "../apps/web/src/simulation/defence-limits";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";

/** Authored limit poses; the three-survivor case uses the real elimination morph. */
export function triangleReachReview(
  container: HTMLElement,
  count: PlayerCount,
  before: boolean,
  width: number,
  height: number,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(7, count === 3 ? 4 : count, 3, 7, levelDifficulty(1));
  if (count === 3) {
    state.players[1]!.health.fill(false);
    state.eliminations.push({ seat: 1, elapsed: 0 });
    beginArenaMorph(state);
    while (state.morph) stepArenaMorph(state, 1 / 120);
    if (before) {
      // Reproduce the old sector cap and permanent lane with the same forward anchors.
      state.arena = {
        ...fitDefenceLimits({ ...state.arena, count: 4, batWallGap: 0.7 }),
        count: 3,
      };
    }
  }
  state.phase = "playing";
  state.balls = [];
  const viewport = createViewport(container, 0, state.arena);
  return {
    render(side: number) {
      for (const p of state.players) {
        const home = fortress(p.id, state.arena);
        p.angle = home.direction + (side === 0 ? 0 : home.angleLimits![side < 0 ? 0 : 1]!);
      }
      // Settle the presentation-only corner pillars, without advancing gameplay.
      for (let frame = 0; frame < 120; frame++)
        viewport.render(state, 1 / 60, {
          humanSeat: 0,
          preview: false,
          slowdown: false,
          reducedEffects: false,
          quality: "high",
        });
    },
    summary: () => ({
      count,
      before,
      fortresses: state.arena.fortresses
        .filter((f) => state.players[f.id]!.health.some(Boolean))
        .map(({ id, anchor, angleLimits }) => ({ id, anchor, angleLimits })),
    }),
    dispose: () => viewport.dispose(),
  };
}
