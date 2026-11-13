import { createRoundObserver } from "../session/round-observer";
import { Group, InstancedMesh } from "three";
import { expect, it } from "vite-plus/test";
import { creditedPlayerKill, createEliminationBursts } from "./elimination-burst";
import { createVictoryFireworks } from "./victory-fireworks";
import { disposeScene } from "./dispose-scene";
import type { GameEvent } from "../simulation/types";
const event: GameEvent = {
  id: 1,
  tick: 1,
  type: "elimination",
  seat: 1,
  ballId: 0,
  attackerSeat: 0,
  piece: null,
  position: { x: 3, y: 4 },
};
it("uses bounded instanced destruction at the eliminated fortress, freezes and expires without touching its event", () => {
  const scene = new Group(),
    effect = createEliminationBursts(scene),
    original = structuredClone(event);
  effect.emit(event);
  effect.update(0.15, false, 10);
  const burst = scene.children.find((g) => g.visible)!;
  expect(burst.position.toArray()).toEqual([3, 0, 4]);
  const shards = burst.getObjectByName("elimination-shards") as InstancedMesh;
  expect(shards.count).toBe(32);
  expect(Array.from(shards.instanceMatrix.array).every(Number.isFinite)).toBe(true);
  const before = Array.from(shards.instanceMatrix.array);
  effect.update(0, false, 10);
  expect(Array.from(shards.instanceMatrix.array)).toEqual(before);
  for (let id = 2; id < 40; id++) effect.emit({ ...event, id });
  expect(scene.children).toHaveLength(6);
  effect.update(0, false, 3);
  expect(shards.count).toBe(12);
  effect.update(0, true, 3);
  expect(shards.visible).toBe(false);
  effect.update(2, false, 10);
  expect(scene.children.every((g) => !g.visible)).toBe(true);
  expect(event).toEqual(original);
  effect.reset();
  disposeScene(scene);
});
it("uses the victory fireworks pool for a short active-play reward and clears it on reset/reduced mode", () => {
  const scene = new Group(),
    fireworks = createVictoryFireworks(scene);
  fireworks.celebrate({ x: 5, y: 3 }, 0xff5c46);
  fireworks.update(0.1, false, false, 0xff5c46);
  expect(scene.children.some((g) => g.visible)).toBe(true);
  const before = scene.children.map((g) => g.position.toArray());
  fireworks.update(0, false, false, 0xff5c46);
  expect(scene.children.map((g) => g.position.toArray())).toEqual(before);
  for (let i = 0; i < 30; i++) fireworks.update(0.1, false, false, 0xff5c46);
  expect(scene.children.every((g) => !g.visible)).toBe(true);
  fireworks.celebrate({ x: 0, y: 0 }, 0xff5c46);
  fireworks.update(0.1, false, true, 0xff5c46);
  expect(scene.children.every((g) => !g.visible)).toBe(true);
  fireworks.reset();
  expect(scene.children).toHaveLength(4);
  disposeScene(scene);
});

it("rewards the actual last striker, preserving bank-shot credit and excluding bot and self eliminations", () => {
  const observer = createRoundObserver(4);
  const credited = observer.observe([
    { ...event, id: 0, type: "launch", seat: 0 },
    { ...event, id: 1, type: "wall", seat: -1 },
    { ...event, id: 2, type: "elimination", seat: 1 },
    { ...event, id: 3, type: "paddle", seat: 2 },
    { ...event, id: 4, type: "elimination", seat: 3 },
    { ...event, id: 5, type: "launch", seat: 0 },
    { ...event, id: 6, type: "elimination", seat: 0 },
  ]);
  expect(credited.map((e) => creditedPlayerKill(e, 0))).toEqual([
    false,
    false,
    true,
    false,
    false,
    false,
    false,
  ]);
});
