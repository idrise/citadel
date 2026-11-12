import { expect, it } from "vite-plus/test";
import { createArena } from "../simulation/arena";
import { createArenaReflections } from "./arena-reflections";
import { disposeScene } from "./dispose-scene";
it("allocates only a small floor capture on mobile and retains geometry when just the camera moves", () => {
  const arena = createArena(6),
    view = createArenaReflections(0, arena, true);
  expect(view.meshes).toHaveLength(1);
  const floor = view.meshes[0]!,
    geometry = floor.geometry;
  expect(floor.getRenderTarget().width).toBe(256);
  for (let frame = 0; frame < 30; frame++)
    view.update(arena, 0, { x: Math.sin(frame), y: Math.cos(frame) });
  expect(floor.geometry).toBe(geometry);
  view.setReduced(true);
  expect(floor.visible).toBe(false);
  view.setReduced(false);
  expect(floor.visible).toBe(true);
  view.setVictory(true);
  expect(floor.visible).toBe(true);
  view.update(createArena(4));
  expect(floor.geometry).not.toBe(geometry);
  view.dispose();
  view.meshes.forEach(disposeScene);
});
