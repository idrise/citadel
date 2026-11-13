import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import { fortress, railPosition, type PlayerCount } from "../apps/web/src/simulation/arena";
import { MAX_SWIPE_CURVE } from "../apps/web/src/simulation/flight";
import { predictReturn } from "../apps/web/src/simulation/return-preview";
import { angleDifference, angleOf, scale, unit } from "../apps/web/src/simulation/vector";
export function renderSpinBounceReview(
  container: HTMLElement,
  count: PlayerCount,
  side: number,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(2026, count),
    angle = fortress(0, state.arena).direction;
  state.phase = "playing";
  state.tick = 120;
  const ball = state.balls[0]!;
  Object.assign(ball, {
    phase: "active",
    position: railPosition(0, angle, 6, state.arena),
    velocity: scale(unit(angle), -24),
    spin: side * MAX_SWIPE_CURVE,
  });
  const view = createViewport(container, 0, state.arena),
    forecast = predictReturn(state, 0, false);
  if (!forecast) throw new Error("Authored spin shot must be caught");
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
      spin: ball.spin,
      outgoingDegrees: (angleDifference(angleOf(forecast.outgoing), angle) * 180) / Math.PI,
    }),
    dispose: () => view.dispose(),
  };
}
