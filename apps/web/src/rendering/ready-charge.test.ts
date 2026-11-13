import { Group, InstancedMesh } from "three";
import { expect, it } from "vite-plus/test";
import { createReadyCharge } from "./ready-charge";
import { createMatch } from "../simulation/match";
import { disposeScene } from "./dispose-scene";

it("marks only held live balls, follows visible aim, freezes on pause and clears immediately at launch", () => {
  const root = new Group(),
    charge = createReadyCharge(root),
    state = createMatch();
  state.phase = "playing";
  const before = structuredClone(state);
  charge.update(state, false);
  const ring = root.getObjectByName("ready-ball-halos") as InstancedMesh,
    arrow = root.getObjectByName("ready-ball-chevrons") as InstancedMesh;
  expect(ring.count).toBe(2);
  expect(arrow.count).toBeGreaterThan(0);
  const positions = Array.from(arrow.instanceMatrix.array);
  charge.update(state, false);
  expect(Array.from(arrow.instanceMatrix.array)).toEqual(positions);
  expect(state).toEqual(before);
  state.players[state.balls[0]!.seat]!.angle += 0.1;
  charge.update(state, false);
  expect(Array.from(arrow.instanceMatrix.array)).not.toEqual(positions);
  state.balls[0]!.phase = "active";
  charge.update(state, false);
  expect(ring.count).toBe(0);
  expect(arrow.visible).toBe(false);
  disposeScene(root);
});
it("bounds sixteen simultaneous charges to two meshes and uses a static single ring in reduced mode", () => {
  const root = new Group(),
    charge = createReadyCharge(root),
    state = createMatch(1, 6);
  state.phase = "playing";
  state.balls = Array.from({ length: 16 }, (_, id) => ({ ...state.balls[0]!, id, seat: id % 6 }));
  charge.update(state, false);
  const ring = root.getObjectByName("ready-ball-halos") as InstancedMesh;
  expect(root.children).toHaveLength(2);
  expect(ring.count).toBe(32);
  expect(Array.from(ring.instanceMatrix.array).every(Number.isFinite)).toBe(true);
  charge.update(state, true);
  expect(ring.count).toBe(16);
  const frozen = Array.from(ring.instanceMatrix.array);
  state.balls.forEach((b) => (b.age += 0.3));
  charge.update(state, true);
  expect(Array.from(ring.instanceMatrix.array)).toEqual(frozen);
  charge.update(state, false, true);
  expect(root.children.every((m) => !m.visible)).toBe(true);
  disposeScene(root);
});
