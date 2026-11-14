import { fortress, SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import { Box3, MathUtils, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from "three";

export const INPUT_PLANE_HEIGHT = 0.52;
export const CAMERA_TARGET = { x: 0, y: -0.6, z: 0 } as const;
export const FOREGROUND_PADDING = 0.06;
export function createArenaCamera(
  humanSeat = 0,
  arena: ArenaGeometry = SQUARE_ARENA,
): PerspectiveCamera {
  const camera = new PerspectiveCamera(44, 1, 0.1, 400);
  const anchor = fortress(humanSeat, arena).anchor;
  const distance = Math.hypot(anchor.x, anchor.y);
  const size = Math.max(1, ...arena.vertices.map((p) => Math.hypot(p.x, p.y) / 15));
  camera.userData.arenaScale = size;
  camera.position.set(
    (anchor.x / distance) * 25 * size,
    18.9 * size,
    (anchor.y / distance) * 25 * size,
  );
  camera.lookAt(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
  camera.updateMatrixWorld();
  return camera;
}

/** Fit perspective slopes, not parallel rays. Lens shift centres the complete solid arena. */
export function fitArenaCamera(
  camera: PerspectiveCamera,
  bounds: Box3,
  aspect: number,
  corners?: readonly Vector3[],
  bottomPadding = 0,
): void {
  camera.updateMatrixWorld();
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  const points =
    corners ??
    [bounds.min.x, bounds.max.x].flatMap((x) =>
      [bounds.min.y, bounds.max.y].flatMap((y) =>
        [bounds.min.z, bounds.max.z].map((z) => new Vector3(x, y, z)),
      ),
    );
  for (const corner of points) {
    const point = corner.clone().applyMatrix4(camera.matrixWorldInverse);
    const depth = Math.max(camera.near, -point.z);
    minX = Math.min(minX, point.x / depth);
    maxX = Math.max(maxX, point.x / depth);
    minY = Math.min(minY, point.y / depth);
    maxY = Math.max(maxY, point.y / depth);
  }
  const padding = Math.max(0, Math.min(0.25, bottomPadding));
  // Reserve the full danger-zoom envelope without cancelling its live 2% visual cue.
  const halfTan =
    Math.max((maxY - minY) / (2 * (1 - padding)), (maxX - minX) / (2 * aspect)) *
    1.04 *
    (padding ? 1.02 : 1);
  camera.fov = MathUtils.radToDeg(2 * Math.atan(halfTan));
  // Normalised viewport units preserve aspect and an exact inverse pointer projection.
  camera.setViewOffset(
    2 * aspect,
    2,
    (((minX + maxX) / 2) * camera.zoom) / halfTan,
    ((-(minY + maxY) / 2) * camera.zoom) / halfTan +
      (padding
        ? Math.max(0, ((maxY - minY) * camera.zoom) / (2 * halfTan) - (1 - 2 * padding))
        : 0),
    2 * aspect,
    2,
  );
  camera.updateProjectionMatrix();
}

export function screenToArena(
  camera: PerspectiveCamera,
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
