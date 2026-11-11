import { Group, Mesh } from "three";
import { expect, it } from "vite-plus/test";
import { createMatch } from "../simulation/match";
import type { GameEvent } from "../simulation/types";
import { createEffects } from "./effects";
import { disposeScene } from "./dispose-scene";
import { createBallView } from "./ball-view";

const hit: GameEvent = {
  id: 1,
  tick: 0,
  type: "damage",
  position: { x: 0, y: 0 },
  seat: 0,
  piece: 0,
  ballId: 0,
  radius: 0.32,
  returnTo: { x: 1, y: 1 },
};
it("keeps ball/trail transforms finite with the zero-trail quality budget", () => {
  const root = new Group(),
    balls = createBallView(root),
    state = createMatch();
  state.balls[0]!.phase = "active";
  balls.update(state, false, 0);
  root.traverse((object) => {
    expect(object.scale.toArray().every(Number.isFinite)).toBe(true);
    expect(object.position.toArray().every(Number.isFinite)).toBe(true);
  });
  expect(root.children.some((object) => object.visible)).toBe(true);
  disposeScene(root);
});
it("shows pooled fracture geometry and a revenge arc without advancing while paused", () => {
  const root = new Group(),
    effects = createEffects(root),
    state = createMatch();
  state.balls[0]!.phase = "ready";
  const original = structuredClone(state);
  effects.emit(hit, false);
  effects.update(0.05, false, state);
  const bursts = root.children.filter((child) => child.name === "fracture-burst" && child.visible);
  expect(bursts).toHaveLength(1);
  expect(
    bursts[0]!.children.filter((child) => child.name === "fracture-shard" && child.visible),
  ).toHaveLength(10);
  expect(root.children.some((child) => child.name === "revenge-flourish" && child.visible)).toBe(
    true,
  );
  const shard = bursts[0]!.children.find((child) => child.name === "fracture-shard") as Mesh;
  const before = shard.position.clone();
  effects.update(0, false, state);
  expect(shard.position).toEqual(before);
  effects.update(0, true, state);
  expect(
    bursts[0]!.children.filter((child) => child.name === "fracture-shard" && child.visible),
  ).toHaveLength(3);
  expect(root.children.some((child) => child.name === "revenge-flourish" && child.visible)).toBe(
    false,
  );
  effects.update(1, true, state);
  expect(root.children.some((child) => child.visible)).toBe(false);
  expect(state).toEqual(original);
  disposeScene(root);
});
it("keeps simultaneous same-fortress flourishes separate and cancels a transfer when the real ball leaves", () => {
  const root = new Group(),
    effects = createEffects(root),
    state = createMatch();
  for (let id = 0; id < 8; id++) effects.emit({ ...hit, id }, false);
  effects.update(0, false, state);
  expect(
    root.children.filter((child) => child.name === "fracture-burst" && child.visible),
  ).toHaveLength(8);
  state.balls = [];
  effects.update(0.01, false, state);
  expect(root.children.some((child) => child.name === "revenge-flourish" && child.visible)).toBe(
    false,
  );
  disposeScene(root);
});

it("pools bat sparks and distinct outcome rings, freezes on pause, and suppresses sparks in reduced mode", () => {
  const root = new Group(),
    effects = createEffects(root),
    state = createMatch();
  for (let id = 0; id < 50; id++) effects.emit({ ...hit, id, type: "paddle" }, false, 10, 3, state);
  effects.update(0.05, false, state, 10, 3);
  const impacts = root.children.filter((child) => child.name === "impact-feedback");
  expect(impacts).toHaveLength(16);
  const visible = impacts.find((child) => child.visible)!;
  expect(
    visible.children.filter((child) => child.name === "impact-spark" && child.visible),
  ).toHaveLength(3);
  const spark = visible.children.find((child) => child.name === "impact-spark")!;
  const before = spark.position.clone();
  effects.update(0, false, state);
  expect(spark.position).toEqual(before);
  effects.update(0, true, state);
  expect(visible.children.some((child) => child.name === "impact-spark" && child.visible)).toBe(
    false,
  );
  effects.emit({ ...hit, id: 100, type: "victory" }, true, 3, 0, state);
  effects.update(0, true, state, 3, 0);
  expect(
    impacts.some(
      (group) =>
        group.visible &&
        group.children.some((child) => child.name === "outcome-ring" && child.visible),
    ),
  ).toBe(true);
  disposeScene(root);
});
