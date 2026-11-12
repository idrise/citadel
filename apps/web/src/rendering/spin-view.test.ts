import { Group, Mesh, MeshBasicMaterial } from "three";
import { expect, it } from "vite-plus/test";
import { createMatch } from "../simulation/match";
import { MAX_SWIPE_CURVE } from "../simulation/flight";
import { BALL_VISUAL_RADIUS, createBallView } from "./ball-view";
import { createSpinView, NEGATIVE_SPIN, POSITIVE_SPIN } from "./spin-view";
import { disposeScene } from "./dispose-scene";
import { ARENA } from "../simulation/arena";

it("shows signed rotating spin bands, holds them on pause/reduced motion, and clears them on serve", () => {
  const root = new Group(),
    view = createSpinView(root),
    ball = createMatch().balls[0]!;
  ball.phase = "active";
  ball.spin = MAX_SWIPE_CURVE;
  view.update(ball, 0, false);
  const band = root.getObjectByName("ball-spin") as Group;
  const rotor = band.children[0]!;
  const mesh = rotor.children[0]!.children[0] as Mesh;
  const material = mesh.material as MeshBasicMaterial;
  expect(band.visible).toBe(true);
  expect(
    material.color
      .clone()
      .multiplyScalar(1 / 1.7)
      .getHex(),
  ).toBe(POSITIVE_SPIN);
  view.update(ball, 12, false);
  expect(rotor.rotation.z).toBeGreaterThan(0);
  const rotation = rotor.rotation.z;
  view.update(ball, 12, false);
  expect(rotor.rotation.z).toBe(rotation);
  view.update(ball, 24, true);
  expect(rotor.rotation.z).toBe(rotation);
  expect(band.visible).toBe(true);
  ball.spin = -MAX_SWIPE_CURVE;
  view.update(ball, 36, false);
  expect(rotor.rotation.z).toBeLessThan(rotation);
  expect(
    material.color
      .clone()
      .multiplyScalar(1 / 1.7)
      .getHex(),
  ).toBe(NEGATIVE_SPIN);
  ball.spin = 0.01;
  view.update(ball, 37, false);
  expect(band.visible).toBe(false);
  ball.spin = MAX_SWIPE_CURVE;
  ball.phase = "ready";
  view.update(ball, 38, false);
  expect(band.visible).toBe(false);
  disposeScene(root);
});

it("keeps a distance-spaced curved trail, freezes on pause, and clears it on ball replacement", () => {
  const root = new Group(),
    view = createBallView(root),
    state = createMatch();
  const ball = state.balls[0]!;
  ball.phase = "active";
  ball.spin = MAX_SWIPE_CURVE;
  ball.position = { x: 0, y: 0 };
  view.update(state, false);
  state.tick++;
  ball.position = { x: 4, y: 0 };
  view.update(state, false);
  const trail = () => root.children.filter((child) => child.name === "ball-trail" && child.visible);
  expect(trail().length).toBeGreaterThan(15);
  const before = trail().map((child) => child.position.clone());
  view.update(state, false);
  expect(trail().map((child) => child.position)).toEqual(before);
  view.update(state, true);
  expect(trail()).toHaveLength(0);
  expect(root.children.filter((child) => child.name === "ball-spin" && child.visible)).toHaveLength(
    1,
  );
  state.tick++;
  ball.id = 99;
  view.update(state, false);
  expect(trail()).toHaveLength(1);
  ball.phase = "ready";
  state.tick++;
  view.update(state, false);
  expect(trail()).toHaveLength(0);
  expect(root.children.some((child) => child.name === "ball-spin" && child.visible)).toBe(false);
  disposeScene(root);
});

it("rotates the marked ball surface with signed spin, holds it paused/reduced and keeps physics unchanged", () => {
  const root = new Group(),
    view = createBallView(root),
    state = createMatch();
  const ball = state.balls[0]!;
  ball.phase = "active";
  ball.spin = 1;
  const original = structuredClone(state);
  view.update(state, false);
  expect(state).toEqual(original);
  const mesh = root.children.find((p) => p.name === "game-ball") as Mesh<
    import("three").SphereGeometry
  >;
  expect(mesh.geometry.parameters.radius).toBe(BALL_VISUAL_RADIUS);
  expect(ARENA.ballRadius).toBe(0.187);
  state.tick = 12;
  view.update(state, false);
  expect(mesh.rotation.y).toBeLessThan(0);
  const ghost = root.children.find((p) => p.name === "occluded-ball") as Mesh;
  expect(ghost.rotation.y).toBe(mesh.rotation.y);
  const rotation = mesh.rotation.y;
  view.update(state, false);
  expect(mesh.rotation.y).toBe(rotation);
  state.tick = 24;
  view.update(state, true);
  expect(mesh.rotation.y).toBe(rotation);
  state.tick = 36;
  ball.spin = -1;
  view.update(state, false);
  expect(mesh.rotation.y).toBeGreaterThan(rotation);
  ball.spin = 0;
  const stopped = mesh.rotation.y;
  state.tick = 48;
  view.update(state, false);
  expect(mesh.rotation.y).toBe(stopped);
  ball.phase = "ready";
  view.update(state, false);
  expect(mesh.rotation.y).toBeCloseTo(0);
  disposeScene(root);
});
