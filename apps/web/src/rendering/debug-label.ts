import { Box3, Vector3, type PerspectiveCamera } from "three";
import { createNeonLettering } from "./neon-lettering";
/** Camera-mounted debug status is independent of arena/camera movement. */
export function createDebugLabel(camera: PerspectiveCamera) {
  const root = createNeonLettering("DEBUG - PROGRESS NOT SAVED", 0.3, 0xffab83);
  root.name = "debug-level-status";
  camera.add(root);
  root.visible = false;
  const extent = new Box3().setFromObject(root).getSize(new Vector3()).x;
  return {
    update(active: boolean, width: number, height: number) {
      root.visible = active;
      if (!active) return;
      const depth = 17,
        worldPerPixel = (2 * Math.tan((camera.fov * Math.PI) / 360) * depth) / Math.max(height, 1);
      root.scale.setScalar((Math.min(width - 28, 460) / extent) * worldPerPixel);
      root.position.set(0, (height / 2 - 27) * worldPerPixel, -depth);
    },
  };
}
