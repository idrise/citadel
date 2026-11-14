import { expect, it } from "vite-plus/test";
import { InstancedMesh, Matrix4, Vector3 } from "three";
import { createMatch } from "../simulation/match";
import { createArenaView } from "./arena-view";
import { serveDirection } from "../simulation/aim";
it("shows only an optional short initial direction, never curved or incoming forecasts", () => {
  const state = createMatch(2026, 6),
    view = createArenaView(0, state.arena),
    ball = state.balls[0]!;
  state.phase = "playing";
  ball.phase = "ready";
  ball.seat = 0;
  state.players[0]!.swipe = { velocity: 10, remaining: 0.1 };
  const options = { humanSeat: 0, preview: false, slowdown: false, reducedEffects: true };
  const dots = view.root.getObjectByName("aim-dots") as InstancedMesh;
  view.update(state, 0, options);
  expect(dots.visible).toBe(false);
  view.update(state, 0, { ...options, preview: true });
  expect(dots.visible).toBe(true);
  const direction = serveDirection(0, state.players[0]!.angle, state.arena),
    matrix = new Matrix4();
  for (let i = 0; i < dots.count; i++) {
    dots.getMatrixAt(i, matrix);
    const point = new Vector3().setFromMatrixPosition(matrix),
      x = point.x - ball.position.x,
      y = point.z - ball.position.y;
    expect(Math.abs(x * direction.y - y * direction.x)).toBeLessThan(1e-5);
    expect(Math.hypot(x, y)).toBeLessThanOrEqual(2.21);
  }
  ball.phase = "active";
  view.update(state, 0, { ...options, preview: true });
  expect(dots.visible).toBe(false);
  view.dispose();
});
