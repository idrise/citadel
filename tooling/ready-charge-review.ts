import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import { aimServeAt } from "../apps/web/src/simulation/aim";
import { queuedServePosition } from "../apps/web/src/simulation/serve-queue";
import { launchBall } from "../apps/web/src/simulation/serving";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
import type { PlayerCount } from "../apps/web/src/simulation/arena";

/** Pose fixture: actual holding position, visible paddle aim and launch transition. */
export function renderReadyChargeReview(
  container: HTMLElement,
  count: PlayerCount,
  seat = 1,
  reduced = false,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(2026, count, 3),
    target = seat === 0 ? 1 : 0;
  state.phase = "playing";
  state.tick = 42;
  state.elapsed = 0.35;
  state.players[seat]!.angle = aimServeAt(
    seat,
    state.players[target]!.pieces[0]!.position,
    state.arena,
  );
  const ball = state.balls[0]!;
  ball.seat = seat;
  ball.phase = "ready";
  ball.age = 0.35;
  ball.position = queuedServePosition(seat, state.players[seat]!.angle, 0, state.arena, []);
  const view = createViewport(container, 0, state.arena);
  const draw = () =>
    view.render(state, 0, {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: reduced,
      quality: "high",
      menu: { mode: "hidden", count, elapsed: 0, reduced },
    });
  draw();
  return {
    summary: () => ({ count, seat, reduced, phase: ball.phase }),
    launch() {
      launchBall(state, ball, DEFAULT_OPTIONS);
      draw();
    },
    dispose: () => view.dispose(),
  };
}
