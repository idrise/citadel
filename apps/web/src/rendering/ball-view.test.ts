import { Box3, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createMatch } from "../simulation/match";
import { createBallView, BALL_APPEAR_SECONDS, BALL_DEPARTURE_SECONDS } from "./ball-view";
import { disposeScene } from "./dispose-scene";
import { createArenaCamera, fitArenaCamera, FOREGROUND_PADDING } from "./camera";
import { createCameraMotion } from "./camera-motion";

it("clears departing balls out of the camera before recycling, including portrait and sixteen-seat arenas", () => {
  for (const count of [2, 4, 6, 16] as const)
    for (const aspect of [390 / 844, 1280 / 900, 844 / 390]) {
      const root = new Group(),
        view = createBallView(root),
        state = createMatch(2, count);
      state.phase = "playing";
      const template = state.balls[0]!;
      state.balls = state.arena.vertices.map((position, id) => ({
        ...template,
        id,
        phase: "active" as const,
        position: { ...position },
      }));
      const camera = createArenaCamera(0, state.arena);
      createCameraMotion(camera).layout(aspect);
      const corners = state.arena.vertices.flatMap((p) => [
        new Vector3(p.x * 1.09, -2.73, p.y * 1.09),
        new Vector3(p.x * 1.09, 2.34, p.y * 1.09),
      ]);
      fitArenaCamera(
        camera,
        new Box3().setFromPoints(corners),
        aspect,
        corners,
        FOREGROUND_PADDING,
      );
      view.update(state, false, 0, undefined, false, "low", 0.2);
      view.depart();
      for (let frame = 0; frame < 79; frame++)
        view.update(state, false, 0, undefined, true, "low", 0.01);
      const balls = root.children.filter((p) => p.name === "game-ball" && p.visible);
      expect(balls.length).toBe(state.balls.length);
      for (const ball of balls) {
        const point = ball.position.clone().project(camera);
        expect(Math.abs(point.x) > 1 || Math.abs(point.y) > 1 || point.z < -1 || point.z > 1).toBe(
          true,
        );
      }
      disposeScene(root);
    }
});

function fixture() {
  const root = new Group(),
    view = createBallView(root),
    state = createMatch(2026);
  state.phase = "playing";
  state.balls[0]!.phase = "active";
  state.balls[0]!.spin = 0.6;
  for (let frame = 0; frame < 20; frame++) {
    state.tick++;
    state.balls[0]!.position.x += 0.1;
    view.update(state, false, 20, new Map([[0, 2]]), false, "high", 1 / 60);
  }
  const ball = root.children.find((p) => p.name === "game-ball" && p.visible) as Mesh;
  return { root, view, state, ball };
}

it("launches departing balls from their visible poses, preserving colours, spin and trails across a tick-zero reset", () => {
  const { root, view, state, ball } = fixture();
  const start = ball.position.clone(),
    colour = (ball.material as MeshStandardMaterial).color.clone();
  const trail = root.children.find((p) => p.name === "ball-trail" && p.visible) as InstancedMesh;
  const matrices = Array.from(trail.instanceMatrix.array),
    spin = root.children.find((p) => p.name === "ball-spin" && p.visible)!;
  const spinPose = spin.position.clone(),
    saved = structuredClone(state),
    count = root.children.length;
  const opening = createMatch(4),
    savedOpening = structuredClone(opening);
  view.depart();
  view.update(opening, false, 20, undefined, true, "high", 0);
  expect(ball.position).toEqual(start);
  expect(spin.position).toEqual(spinPose);
  expect((ball.material as MeshStandardMaterial).color).toEqual(colour);
  expect(Array.from(trail.instanceMatrix.array)).toEqual(matrices);
  view.update(opening, false, 20, undefined, true, "high", 0.1);
  expect(ball.position.y).toBeGreaterThan(start.y);
  expect(ball.position.x).toBe(start.x);
  expect(ball.position.z).toBe(start.z);
  expect(spin.position.y).toBe(ball.position.y);
  const frozen = ball.position.clone();
  view.depart(); // A second retarget must not restart the already visible flight.
  view.update(opening, false, 20, undefined, true, "high", 0);
  expect(ball.position).toEqual(frozen);
  for (let frame = 0; frame < Math.ceil(BALL_DEPARTURE_SECONDS / 0.05) + 1; frame++)
    view.update(opening, false, 20, undefined, true, "high", 0.05);
  expect(root.children.filter((p) => p.name === "game-ball").every((p) => !p.visible)).toBe(true);
  expect(root.children.filter((p) => p.name === "ball-spin").every((p) => !p.visible)).toBe(true);
  expect(root.children.length).toBe(count);
  expect(state).toEqual(saved);
  expect(opening).toEqual(savedOpening);
  disposeScene(root);
});

it("grows incoming balls and ready halos smoothly from zero, and freezes their reveal at zero dt", () => {
  const root = new Group(),
    view = createBallView(root),
    state = createMatch(3);
  view.update(state, false, 20, undefined, true, "high", 0);
  state.phase = "playing";
  view.update(state, false, 20, undefined, false, "high", 0);
  const ball = root.children.find((p) => p.name === "game-ball" && p.visible) as Mesh;
  const halos = root.getObjectByName("ready-ball-halos") as InstancedMesh;
  const matrix = new Matrix4();
  halos.getMatrixAt(0, matrix);
  expect(ball.scale.x).toBe(0);
  expect(matrix.elements[0]).toBe(0);
  view.update(state, false, 20, undefined, false, "high", BALL_APPEAR_SECONDS / 2);
  expect(ball.scale.x).toBeCloseTo(0.5);
  view.update(state, false, 20, undefined, false, "high", 0);
  expect(ball.scale.x).toBeCloseTo(0.5);
  view.update(state, false, 20, undefined, false, "high", BALL_APPEAR_SECONDS / 2);
  expect(ball.scale.x).toBe(1);
  disposeScene(root);
});

it("retires balls smoothly at victory and avoids large flight motion in reduced effects", () => {
  const { root, view, state, ball } = fixture();
  const start = ball.position.clone();
  state.phase = "finished";
  state.balls = [];
  view.update(state, false, 20, undefined, false, "high", 0);
  expect(ball.visible).toBe(true);
  expect(ball.position).toEqual(start);
  view.update(state, true, 20, undefined, false, "high", 0.06);
  expect(ball.position).toEqual(start);
  expect(ball.scale.x).toBeCloseTo(0.5);
  view.update(state, true, 20, undefined, false, "high", 0.06);
  expect(ball.visible).toBe(false);
  disposeScene(root);
});
