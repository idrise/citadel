import { Group, Mesh } from "three";
import { expect, it } from "vite-plus/test";
import { createMatch } from "../simulation/match";
import type { GameEvent } from "../simulation/types";
import { createEffects } from "./effects";
import { disposeScene } from "./dispose-scene";

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
