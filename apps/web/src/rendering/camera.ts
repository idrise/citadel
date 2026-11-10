import { fortress } from "../simulation/arena";
import { Box3, OrthographicCamera, Plane, Raycaster, Vector2, Vector3 } from "three";

export const INPUT_PLANE_HEIGHT = 0.52;
export const CAMERA_TARGET = { x: 0, y: -0.6, z: 0 } as const;
export function createArenaCamera(humanSeat = 0): OrthographicCamera {
  const camera = new OrthographicCamera(-12, 12, 12, -12, 0.1, 150);
  const anchor = fortress(humanSeat).anchor;
  const distance = Math.hypot(anchor.x, anchor.y);
  camera.position.set((anchor.x / distance) * 25, 24, (anchor.y / distance) * 25);
  camera.lookAt(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
  camera.updateMatrixWorld();
  return camera;
}

/** Fit all extruded geometry, including the plinth, with identical framing after resize. */
export function fitArenaCamera(camera: OrthographicCamera, bounds: Box3, aspect: number): void {
  camera.updateMatrixWorld();
  const view = new Box3();
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        view.expandByPoint(new Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      }
  const centre = view.getCenter(new Vector3());
  const size = view.getSize(new Vector3());
  const halfHeight = Math.max(size.y / 2, size.x / (2 * aspect)) * 1.09;
  camera.left = centre.x - halfHeight * aspect;
  camera.right = centre.x + halfHeight * aspect;
  camera.top = centre.y + halfHeight;
  camera.bottom = centre.y - halfHeight;
  camera.updateProjectionMatrix();
}

export function screenToArena(
  camera: OrthographicCamera,
  ndc: Vector2,
): { x: number; y: number } | null {
  const ray = new Raycaster();
  ray.setFromCamera(ndc, camera);
  const point = ray.ray.intersectPlane(
    new Plane(new Vector3(0, 1, 0), -INPUT_PLANE_HEIGHT),
    new Vector3(),
  );
  return point ? { x: point.x, y: point.z } : null;
}
