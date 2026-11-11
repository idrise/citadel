import { Box3, DirectionalLight, Scene, Vector2, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { FORTRESSES, clampPaddleAngle, railPosition } from "../simulation/arena";
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
          expect(Math.abs(projected.x)).toBeLessThan(0.97);
          expect(Math.abs(projected.y)).toBeLessThan(0.97);
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

it("builds four full-height solid wall panels with translucent near faces", () => {
  const base = createArenaBase();
  const walls = base.getObjectByName("arena-walls")!;
  const panels = walls.children.filter(
    (part) => part.name === "near-wall" || part.name === "rear-wall",
  );
  expect(panels).toHaveLength(4);
  expect(panels.filter((panel) => panel.name === "near-wall")).toHaveLength(2);
  for (const seam of walls.children.filter((part) => part.name === "wall-seam")) {
    const size = new Box3().setFromObject(seam).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(1.9);
    expect(Math.max(size.x, size.z)).toBeLessThan(0.04);
  }
  for (const panel of panels) {
    const size = new Box3().setFromObject(panel).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(1.9);
    expect(Math.min(size.x, size.z)).toBeGreaterThan(0.45);
    if (panel.name === "near-wall") {
      const material = (panel as import("three").Mesh)
        .material as import("three").MeshPhysicalMaterial;
      expect(material.transparent).toBe(true);
      expect(material.opacity).toBeLessThan(0.5);
      expect(material.depthWrite).toBe(false);
    }
  }
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

it("uses true perspective: equal-sized camera-facing objects project larger nearby", () => {
  const camera = createArenaCamera();
  fitArenaCamera(camera, new Box3(new Vector3(-10, -3, -10), new Vector3(10, 2.5, 10)), 1.6);
  const near = FORTRESSES[0]!.anchor,
    far = FORTRESSES[2]!.anchor;
  const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const height = (point: { x: number; y: number }) => {
    const start = new Vector3(point.x, 0, point.y);
    return start.clone().add(right).project(camera).distanceTo(start.project(camera));
  };
  expect(camera.isPerspectiveCamera).toBe(true);
  expect(height(near)).toBeGreaterThan(height(far) * 1.25);
});
