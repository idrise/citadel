import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import {
  ARENA,
  batCentre,
  batHalfAngle,
  fortress,
  type PlayerCount,
} from "../apps/web/src/simulation/arena";
import { paddleReturn, sweepPaddle } from "../apps/web/src/simulation/collision";
import { add, angleDifference, angleOf, scale, unit } from "../apps/web/src/simulation/vector";

/** Identical incoming direction; the real bat contact and preview determine each outgoing fan. */
export function renderPaddleAimReview(
  container: HTMLElement,
  count: PlayerCount,
  offset = 0,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(2026, count, 3),
    angle = fortress(0, state.arena).direction;
  state.phase = "playing";
  state.tick = 120;
  state.elapsed = 1;
  const halfSpan = ARENA.batRadius * Math.sin(batHalfAngle(state.arena));
  const start = add(
    add(batCentre(0, angle, state.arena), scale(unit(angle), ARENA.batRadius + 2)),
    scale(unit(angle + Math.PI / 2), halfSpan * offset),
  );
  const velocity = scale(unit(angle), -14),
    hit = sweepPaddle(start, velocity, 0, angle, 0, 0.4, state.arena)!;
  state.balls = [{ ...state.balls[0]!, phase: "active", position: start, velocity, spin: 0 }];
  const view = createViewport(container, 0, state.arena);
  view.render(state, 0, {
    humanSeat: 0,
    preview: true,
    slowdown: false,
    reducedEffects: false,
    quality: "high",
    menu: { mode: "hidden", count, elapsed: 0, reduced: false },
  });
  return {
    summary: () => ({
      count,
      offset,
      contactOffset: hit.offset,
      deflectionDegrees:
        (angleDifference(angleOf(paddleReturn(velocity, hit.offset, hit.normal)), angle) * 180) /
        Math.PI,
      radius: ARENA.batRadius,
      halfSpan,
    }),
    dispose: () => view.dispose(),
  };
}
