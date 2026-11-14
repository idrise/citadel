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
import { cameraDanger, createCameraMotion } from "./camera-motion";
import { createMatch } from "../simulation/match";

it("holds the exact neutral view indefinitely when the bat is centred", () => {
  const camera = createArenaCamera();
  const home = camera.position.clone();
  const target = new Vector3(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
  const radius = home.distanceTo(target);
  const bounds = new Box3(new Vector3(-10, 0, -10), new Vector3(10, 2.25, 10));
  const motion = createCameraMotion(camera);
  let largestDrift = 0;
  for (let step = 0; step < 800; step++) {
    motion.update(0.1, false);
    fitArenaCamera(camera, bounds, [0.65, 1.8, 2.4][step % 3]!);
    largestDrift = Math.max(largestDrift, camera.position.distanceTo(home));
    expect(camera.position.distanceTo(target)).toBeCloseTo(radius);
    expect(camera.position.distanceTo(home)).toBeLessThan(1.6);
    expect(Math.abs(camera.zoom - 1)).toBeLessThanOrEqual(0.00601);
    for (const x of [-10, 10])
      for (const y of [0, 2.25])
        for (const z of [-10, 10]) {
          const point = new Vector3(x, y, z).project(camera);
          expect(Math.abs(point.x)).toBeLessThan(0.97);
          expect(Math.abs(point.y)).toBeLessThan(0.97);
        }
  }
  expect(largestDrift).toBeLessThan(1e-12);
});

it("freezes without snapping or accumulating hidden motion during reduced effects or pause", () => {
  const camera = createArenaCamera();
  const motion = createCameraMotion(camera);
  for (let frame = 0; frame < 100; frame++) motion.update(0.05, false, 0.8, 0.5);
  const held = camera.position.clone();
  const rotation = camera.quaternion.clone();
  for (let frame = 0; frame < 100; frame++) {
    motion.update(0.1, true);
    motion.update(0, false);
  }
  expect(camera.position).toEqual(held);
  expect(camera.quaternion.toArray()).toEqual(rotation.toArray());
  motion.update(1 / 60, false, 0.8, 0.5);
  expect(camera.position.distanceTo(held)).toBeLessThan(0.01);
});

it("inverse projection remains correct at every fortress throughout the live camera movement", () => {
  const camera = createArenaCamera();
  const motion = createCameraMotion(camera);
  const bounds = new Box3(new Vector3(-10, -3, -10), new Vector3(10, 1.3, 10));
  for (let frame = 0; frame < 700; frame++) {
    motion.update(0.1, false, Math.sin(frame * 0.2), frame % 2);
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

it("zooms for approaching nearby balls, not receding or ready balls", () => {
  const state = createMatch(2026, 4);
  const home = FORTRESSES[0]!;
  state.phase = "playing";
  const ball = state.balls[0]!;
  ball.phase = "active";
  ball.position = { x: home.anchor.x - 4, y: home.anchor.y };
  ball.velocity = { x: 10, y: 0 };
  expect(cameraDanger(state, 0)).toBe(1);
  ball.velocity.x = -10;
  expect(cameraDanger(state, 0)).toBe(0);
  ball.phase = "ready";
  expect(cameraDanger(state, 0)).toBe(0);
});

it("smoothly follows the bat and danger while freezing all cues in reduced motion", () => {
  const camera = createArenaCamera();
  const motion = createCameraMotion(camera);
  for (let i = 0; i < 20; i++) motion.update(0.05, false, 1, 1);
  expect(camera.zoom).toBeGreaterThan(1.015);
  const position = camera.position.clone(),
    zoom = camera.zoom;
  for (let i = 0; i < 20; i++) motion.update(0.1, true, -1, 0);
  expect(camera.position).toEqual(position);
  expect(camera.zoom).toBe(zoom);
  motion.update(0.016, false, -1, 0);
  expect(camera.position.distanceTo(position)).toBeLessThan(0.15);
  expect(camera.zoom).toBeLessThan(zoom);
});

it("returns symmetrically to exact neutral and recentres after following a new fortress", () => {
  for (const side of [-1, 1]) {
    const camera = createArenaCamera(),
      motion = createCameraMotion(camera);
    const home = camera.position.clone();
    for (let i = 0; i < 20; i++) motion.update(0.1, false, side, 0);
    expect(camera.position.distanceTo(home)).toBeGreaterThan(0.4);
    for (let i = 0; i < 40; i++) motion.update(0.1, false, side * 0.02, 0);
    expect(camera.position.distanceTo(home)).toBeLessThan(1e-10);
    const yaw = 1.7;
    motion.follow(yaw);
    for (let i = 0; i < 80; i++) motion.update(0.1, false, 0, 0);
    expect(Math.atan2(camera.position.x, camera.position.z)).toBeCloseTo(yaw, 10);
    expect(camera.zoom).toBe(1);
  }
});

it("keeps the arena in frame at maximum danger and paddle movement on phone and desktop", () => {
  const camera = createArenaCamera();
  const motion = createCameraMotion(camera);
  const bounds = new Box3(new Vector3(-10, 0, -10), new Vector3(10, 2.25, 10));
  for (let step = 0; step < 300; step++) {
    motion.update(0.1, false, step % 100 < 50 ? 1 : -1, 1);
    fitArenaCamera(camera, bounds, [0.46, 1.8, 2.16][step % 3]!);
    for (const x of [-10, 10])
      for (const y of [0, 2.25])
        for (const z of [-10, 10]) {
          const point = new Vector3(x, y, z).project(camera);
          expect(Math.abs(point.x)).toBeLessThan(1);
          expect(Math.abs(point.y)).toBeLessThan(1);
        }
  }
});
it("uses more portrait floor area while retaining all wall tops and containers through rotation", async () => {
  const { createArena } = await import("../simulation/arena");
  for (const count of [2, 4, 6] as const) {
    const arena = createArena(count),
      camera = createArenaCamera(0, arena),
      motion = createCameraMotion(camera);
    const points = arena.vertices.flatMap((p) => [
      new Vector3(p.x * 1.03, 0, p.y * 1.03),
      new Vector3(p.x * 1.03, 2.34, p.y * 1.03),
    ]);
    const bounds = new Box3().setFromPoints(points);
    fitArenaCamera(camera, bounds, 390 / 844, points);
    const projectedHeight = () => {
      const ys = points.map((p) => p.clone().project(camera).y);
      return Math.max(...ys) - Math.min(...ys);
    };
    const original = projectedHeight();
    motion.layout(390 / 844);
    fitArenaCamera(camera, bounds, 390 / 844, points);
    expect(projectedHeight()).toBeGreaterThan(original * 1.15);
    for (const point of points) {
      const p = point.clone().project(camera);
      expect(Math.abs(p.x)).toBeLessThan(0.97);
      expect(Math.abs(p.y)).toBeLessThan(0.97);
    }
    const portrait = camera.position.clone();
    motion.update(0, true);
    expect(camera.position).toEqual(portrait);
    motion.layout(844 / 390);
    motion.layout(390 / 844);
    expect(camera.position.distanceTo(portrait)).toBeLessThan(1e-8);
  }
});
