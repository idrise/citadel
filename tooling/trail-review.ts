import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
/** Authored comparable flight poses through the ordinary trail renderer, not live outcomes. */
export function createTrailReview(container: HTMLElement, speed: number, spin: number) {
  container.style.cssText = "width:1280px;height:900px;position:relative";
  const state = createMatch(51, 6),
    ball = state.balls[0]!,
    view = createViewport(container, 0, state.arena);
  state.phase = "playing";
  ball.phase = "active";
  ball.spin = spin;
  ball.velocity = { x: speed, y: 0 };
  for (let tick = 0; tick <= 18; tick++) {
    const time = tick / 120 - 0.15;
    state.tick = tick;
    ball.position = { x: speed * time, y: spin * speed * time * time * 0.5 };
    view.render(state, 1 / 120, {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: false,
      quality: "high",
      menu: { mode: "hidden", count: 6, level: 1, bestLevel: 1, elapsed: 0, reduced: false },
    });
  }
  return { dispose: () => view.dispose() };
}
