import { Box3, Group, type PerspectiveCamera, Vector3 } from "three";
import { createNeonLettering } from "./neon-lettering";
import { disposeScene } from "./dispose-scene";

/** Camera-relative procedural lettering, visible only before the opening ball. */
export function createLevelIntro(camera: PerspectiveCamera) {
  const root = new Group();
  root.name = "level-introduction";
  camera.add(root);
  let level = -1,
    text = new Group(),
    textWidth = 1;
  root.add(text);
  return {
    root,
    update(value: number | null, width: number, height: number) {
      root.visible = value !== null;
      if (value === null) return;
      if (value !== level) {
        root.remove(text);
        disposeScene(text);
        level = value;
        text = createNeonLettering(`LEVEL ${value}`, 1.4, 0xffcf79);
        textWidth = new Box3().setFromObject(text).getSize(new Vector3()).x;
        root.add(text);
      }
      const depth = 18;
      const worldPerPixel =
        (2 * Math.tan((camera.fov * Math.PI) / 360) * depth) / Math.max(1, height);
      root.position.set(0, 0, -depth);
      root.scale.setScalar((Math.min(width * 0.82, 720) * worldPerPixel) / textWidth);
      root.updateMatrixWorld(true);
    },
  };
}
