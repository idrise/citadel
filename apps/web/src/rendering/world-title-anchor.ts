import {
  Mesh,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
} from "three";
import { mobileMenuLayout } from "./mobile-menu-layout";

/** Keep reflected world lettering at a screen anchor while its arena camera moves.
 * Translate on a horizontal plane at the fully raised height, preserving the rise/sink animation. */
export function createWorldTitleAnchor(root: Object3D) {
  const ray = new Raycaster(),
    plane = new Plane(new Vector3(0, 1, 0));
  const ndc = new Vector2(),
    point = new Vector3(),
    corner = new Vector3();
  return (camera: PerspectiveCamera, width: number, height: number, raisedY: number) => {
    if (!root.visible || width <= 0 || height <= 0) return;
    const face = root.getObjectByName("neon-text:CITADEL")?.children[0];
    if (!(face instanceof Mesh) || !face.geometry.boundingBox) return;
    const layout = mobileMenuLayout(width, height, false).title;
    ndc.set(0, 1 - (2 * layout.y) / height);
    camera.updateMatrixWorld(true);
    for (let step = 0; step < 3; step++) {
      plane.constant = -raisedY;
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(plane, point)) return;
      root.position.x = point.x;
      root.position.z = point.z;
      root.updateMatrixWorld(true);
      let min = Infinity,
        max = -Infinity;
      const bounds = face.geometry.boundingBox;
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            corner.set(x, y, z).applyMatrix4(face.matrixWorld).project(camera);
            min = Math.min(min, corner.x);
            max = Math.max(max, corner.x);
          }
      const ratio = layout.width / (((max - min) * width) / 2);
      if (!Number.isFinite(ratio) || ratio >= 0.999 || step === 2) break;
      root.scale.multiplyScalar(ratio);
      root.position.y *= ratio;
      raisedY *= ratio;
    }
  };
}
