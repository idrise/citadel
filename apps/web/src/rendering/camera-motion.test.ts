import { Box3, Vector2, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { FORTRESSES, railPosition } from "../simulation/arena";
import {
  CAMERA_TARGET,
  INPUT_PLANE_HEIGHT,
  createArenaCamera,
  fitArenaCamera,
  screenToArena,
} from "./camera";
import { createCameraMotion } from "./camera-motion";

it("moves gently within a bounded orbit and keeps the full arena framed", () => {
  const camera = createArenaCamera();
  const home = camera.position.clone();
  const target = new Vector3(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
  const radius = home.distanceTo(target);
  const bounds = new Box3(new Vector3(-10, -3, -10), new Vector3(10, 1.3, 10));
  const motion = createCameraMotion(camera);
  let largestDrift = 0;
  for (let step = 0; step < 800; step++) {
    motion.update(0.1, false);
    fitArenaCamera(camera, bounds, 1.8);
    largestDrift = Math.max(largestDrift, camera.position.distanceTo(home));
    expect(camera.position.distanceTo(target)).toBeCloseTo(radius);
    expect(camera.position.distanceTo(home)).toBeLessThan(1.6);
    expect(Math.abs(camera.zoom - 1)).toBeLessThanOrEqual(0.00601);
    for (const x of [-10, 10])
      for (const y of [-3, 1.3])
        for (const z of [-10, 10]) {
          const point = new Vector3(x, y, z).project(camera);
          expect(Math.abs(point.x)).toBeLessThan(0.95);
          expect(Math.abs(point.y)).toBeLessThan(0.95);
        }
  }
  expect(largestDrift).toBeGreaterThan(0.5);
});

it("freezes without snapping or accumulating hidden motion during reduced effects or pause", () => {
  const camera = createArenaCamera();
  const motion = createCameraMotion(camera);
  for (let frame = 0; frame < 100; frame++) motion.update(0.05, false);
  const held = camera.position.clone();
  const rotation = camera.quaternion.clone();
  for (let frame = 0; frame < 100; frame++) {
    motion.update(0.1, true);
    motion.update(0, false);
  }
  expect(camera.position).toEqual(held);
  expect(camera.quaternion.toArray()).toEqual(rotation.toArray());
  motion.update(1 / 60, false);
  expect(camera.position.distanceTo(held)).toBeLessThan(0.01);
});

it("inverse projection remains correct at every fortress throughout the live camera movement", () => {
  const camera = createArenaCamera();
  const motion = createCameraMotion(camera);
  const bounds = new Box3(new Vector3(-10, -3, -10), new Vector3(10, 1.3, 10));
  for (let frame = 0; frame < 700; frame++) {
    motion.update(0.1, false);
    if (frame % 70 !== 0) continue;
    fitArenaCamera(camera, bounds, frame % 140 ? 0.65 : 2.4);
    for (const seat of FORTRESSES)
      for (const offset of [-0.45, 0, 0.45]) {
        const world = railPosition(seat.id, seat.direction + offset);
        const point = new Vector3(world.x, INPUT_PLANE_HEIGHT, world.y).project(camera);
        const result = screenToArena(camera, new Vector2(point.x, point.y));
        expect(result!.x).toBeCloseTo(world.x, 8);
        expect(result!.y).toBeCloseTo(world.y, 8);
      }
  }
});
