import { expect, it, vi } from "vite-plus/test";
import { ARENA, batHalfAngle, batRadius, createArena } from "../simulation/arena";
import { createStage } from "./stage";
import { resizePaddle } from "./paddle-shape";
import { disposeScene } from "./dispose-scene";

it("renders the physical profile radius and retains buffers until the profile or width actually changes", () => {
  const stage = createStage(0, createArena(6));
  const paddle = stage.paddles[0]!;
  for (const profile of ["standard", "shallow", "deep"] as const) {
    const arena = createArena(6, undefined, 0, 1, "classic", profile),
      radius = batRadius(arena);
    resizePaddle(paddle, batHalfAngle(arena), 0xff0000, radius);
    const geometry = paddle.geometry,
      positions = geometry.getAttribute("position"),
      centre = ARENA.railRadius - radius;
    for (let i = 0; i < positions.count; i++) {
      const distance = Math.hypot(positions.getX(i) - centre, positions.getZ(i));
      expect(distance).toBeGreaterThanOrEqual(radius - ARENA.paddleThickness / 2 - 0.026);
      expect(distance).toBeLessThanOrEqual(radius + ARENA.paddleThickness / 2 + 0.026);
    }
    const dispose = vi.spyOn(geometry, "dispose");
    resizePaddle(paddle, batHalfAngle(arena), 0xff0000, radius);
    expect(paddle.geometry).toBe(geometry);
    expect(dispose).not.toHaveBeenCalled();
  }
  disposeScene(stage.root);
});
