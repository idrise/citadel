import { expect, it } from "vite-plus/test";
import { Mesh } from "three";
import { createArena } from "../simulation/arena";
import { createStage } from "./stage";
import { disposeScene } from "./dispose-scene";
import { createArenaReflections } from "./arena-reflections";
it("keeps arena meshes free of shadow work while retaining floor and wall reflection captures", () => {
  const arena = createArena(4),
    stage = createStage(0, arena);
  let meshes = 0;
  stage.root.traverse((object) => {
    if (object instanceof Mesh) {
      meshes++;
      expect(object.castShadow).toBe(false);
      expect(object.receiveShadow).toBe(false);
    }
  });
  expect(meshes).toBeGreaterThan(20);
  const reflections = createArenaReflections(0, arena);
  expect(reflections.meshes[0]?.visible).toBe(true);
  expect(reflections.meshes.slice(1).some((mesh) => mesh.visible)).toBe(true);
  reflections.dispose();
  reflections.meshes.forEach(disposeScene);
  disposeScene(stage.root);
});
