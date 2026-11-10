import { Box3, DirectionalLight, Scene, Vector2, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { ARENA, FORTRESSES, clampPaddleAngle, railPosition } from "../simulation/arena";
import { disposeScene } from "./dispose-scene";
import { lightArena } from "./lighting";
import { createArenaBase } from "./base";
import { createStage } from "./stage";
import { INPUT_PLANE_HEIGHT, createArenaCamera, fitArenaCamera, screenToArena } from "./camera";

it.each([2.6, 1.6, 0.6])(
  "frames the full raised arena at aspect %s, including tall pieces and base",
  (aspect) => {
    const stage = createStage();
    const bounds = new Box3().setFromObject(stage.root);
    expect(bounds.min.y).toBeLessThan(-2.5);
    expect(bounds.max.y).toBeGreaterThan(1.1);
    const camera = createArenaCamera();
    fitArenaCamera(camera, bounds, aspect);
    for (const x of [bounds.min.x, bounds.max.x])
      for (const y of [bounds.min.y, bounds.max.y])
        for (const z of [bounds.min.z, bounds.max.z]) {
          const projected = new Vector3(x, y, z).project(camera);
          expect(Math.abs(projected.x)).toBeLessThan(0.93);
          expect(Math.abs(projected.y)).toBeLessThan(0.93);
          expect(projected.z).toBeGreaterThan(-1);
          expect(projected.z).toBeLessThan(1);
        }
    disposeScene(stage.root);
  },
);

it("maps the tilted camera back to the actual bat plane at every fortress and arc end", () => {
  const camera = createArenaCamera();
  fitArenaCamera(camera, new Box3(new Vector3(-10, -3, -10), new Vector3(10, 1.3, 10)), 1.8);
  for (const seat of FORTRESSES)
    for (const offset of [-1, 0, 1]) {
      const point = railPosition(seat.id, clampPaddleAngle(seat.id, seat.direction + offset));
      const screen = new Vector3(point.x, INPUT_PLANE_HEIGHT, point.y).project(camera);
      const world = screenToArena(camera, new Vector2(screen.x, screen.y));
      expect(world!.x).toBeCloseTo(point.x, 8);
      expect(world!.y).toBeCloseTo(point.y, 8);
    }
});

it("shows real side height and horizontal depth rather than a head-on flat square", () => {
  const camera = createArenaCamera();
  fitArenaCamera(camera, new Box3(new Vector3(-10, -3, -10), new Vector3(10, 1.3, 10)), 1.8);
  const foot = new Vector3(0, -2.7, 9).project(camera);
  const top = new Vector3(0, 0, 9).project(camera);
  expect(top.y - foot.y).toBeGreaterThan(0.1);
  const depth = new Vector3(0, 0, -9).project(camera);
  expect(Math.abs(depth.x - top.x)).toBeGreaterThan(0.2);
});

it("health pieces retain their physical circular footprint while gaining readable height", () => {
  const stage = createStage();
  for (const seat of stage.health)
    for (const piece of seat) {
      const bounds = new Box3().setFromObject(piece);
      const size = bounds.getSize(new Vector3());
      expect(size.y).toBeGreaterThan(1);
      expect(size.x).toBeCloseTo(0.52);
      expect(size.z).toBeCloseTo(0.52);
    }
  disposeScene(stage.root);
});

it("cuts the camera-facing walls and rims below the lowest part of the ball", () => {
  const base = createArenaBase();
  const cutaways = base.children.filter((part) => part.name.startsWith("cutaway-wall"));
  expect(cutaways).toHaveLength(4);
  for (const part of cutaways)
    expect(new Box3().setFromObject(part).max.y).toBeLessThan(0.58 - ARENA.ballRadius);
  disposeScene(base);
});

it("fits the directional shadow projection across all four arena corners", () => {
  const scene = new Scene();
  const dispose = lightArena(scene);
  scene.updateMatrixWorld(true);
  const key = scene.children.find(
    (object) => object instanceof DirectionalLight && object.castShadow,
  ) as DirectionalLight;
  key.shadow.updateMatrices(key);
  for (const seat of FORTRESSES) {
    const projected = new Vector3(seat.anchor.x, 0, seat.anchor.y).project(key.shadow.camera);
    expect(Math.abs(projected.x)).toBeLessThan(1);
    expect(Math.abs(projected.y)).toBeLessThan(1);
    expect(Math.abs(projected.z)).toBeLessThan(1);
  }
  dispose();
});
