import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { createArena, fortress, type PlayerCount } from "../apps/web/src/simulation/arena";
import { createPieceBodies } from "../apps/web/src/simulation/health";
import { fitDefenceLimits } from "../apps/web/src/simulation/defence-limits";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";

/** Authored pose for comparing usable triangle bat travel; wall vertices are identical. */
export function triangleClearanceReview(
  container: HTMLElement,
  count: PlayerCount,
  before = false,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(1, count, 3, 1, levelDifficulty(1));
  if (before && count === 3) {
    const original = createArena(3, undefined, 0, 1.35);
    const fitted = fitDefenceLimits({
      ...original,
      count: 4,
      fortresses: original.fortresses.map((home, index) => ({
        ...home,
        anchor: { ...original.vertices[index]! },
      })),
    });
    state.arena = { ...fitted, count: 3 };
    state.players.forEach((p) => {
      p.pieces = createPieceBodies(p.id, state.arena, 3);
    });
  }
  state.phase = "playing";
  state.balls = [];
  const viewport = createViewport(container, 0, state.arena);
  const render = (side: number) => {
    state.players.forEach((p) => {
      const home = fortress(p.id, state.arena);
      p.angle = home.direction + home.angleLimits![side]!;
    });
    viewport.render(state, 0, {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: false,
      quality: "high",
    });
  };
  render(1);
  return {
    render,
    summary: () => ({
      count,
      before,
      vertices: state.arena.vertices,
      fortresses: state.arena.fortresses.map((f) => ({
        id: f.id,
        anchor: f.anchor,
        limits: f.angleLimits,
      })),
    }),
    dispose: () => viewport.dispose(),
  };
}
/** Ordinary seeded simulation; samples expose natural scoreless rallies and their resets. */
export function naturalRallyReview(
  container: HTMLElement,
  count: PlayerCount = 2,
  level = 1,
  seed = 2026,
) {
  container.style.cssText = "width:1280px;height:900px;position:relative";
  let state = createMatch(seed, count, 3, seed, levelDifficulty(level)),
    time = 0;
  const viewport = createViewport(container, 0, state.arena);
  const sample = () => ({
    time,
    phase: state.phase,
    damage: state.stats.damage,
    collisionCaps: state.stats.collisionCaps,
    balls: state.balls.map((b) => ({
      id: b.id,
      phase: b.phase,
      rallyTime: b.rallyTime ?? 0,
      speed: Math.hypot(b.velocity.x, b.velocity.y),
    })),
  });
  return {
    sample,
    advance(target: number) {
      const scores = [];
      while (time + 1 / 120 <= target + 1e-8 && state.phase !== "finished") {
        time += 1 / 120;
        state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
        if (state.events.some((e) => e.type === "damage")) scores.push(sample());
      }
      viewport.render(state, 1 / 30, {
        humanSeat: 0,
        preview: false,
        slowdown: false,
        reducedEffects: false,
        quality: "high",
        ballOwners: new Map(state.balls.map((b) => [b.id, b.striker ?? b.seat])),
      });
      return { sample: sample(), scores };
    },
    dispose: () => viewport.dispose(),
  };
}
