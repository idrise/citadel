import { Group } from "three";
import { expect, it } from "vite-plus/test";
import { createSupplyView } from "./supply-view";
import { createArenaView } from "./arena-view";
import { createMatch } from "../simulation/match";
import { collectSupply } from "../simulation/supplies";
import { disposeScene } from "./dispose-scene";

it("falls, holds on pause, transfers the awarded container, and keeps reduced motion static", () => {
  const state = createMatch(2026),
    root = new Group(),
    view = createSupplyView(root);
  state.phase = "playing";
  state.supplies = [{ id: 0, age: 0.3, position: { x: 1, y: -1 } }];
  view.update(state, 0, false);
  const drop = root.getObjectByName("supply-drop")!;
  const height = drop.children[0]!.position.y;
  expect(height).toBeGreaterThan(1);
  view.update(state, 0, false);
  expect(drop.children[0]!.position.y).toBe(height);
  state.supplies[0]!.age = 1;
  view.update(state, 0.1, false);
  expect(drop.children[0]!.position.y).toBe(0);
  state.balls[0]!.striker = 0;
  const event = collectSupply(state, state.balls[0]!, 0);
  expect(event).toBeTruthy();
  view.update(state, 0.2, false);
  expect(drop.visible).toBe(false);
  expect(view.inTransit(0, 3)).toBe(true);
  const flight = root.children.find(
    (object) => object.name === "supply-transfer" && object.visible,
  )!;
  const pose = flight.position.clone();
  view.update(state, 0, false);
  expect(flight.position).toEqual(pose);
  view.update(state, 0.4, false);
  expect(view.inTransit(0, 3)).toBe(false);
  view.update(state, 0, true);
  expect(root.children.filter((p) => p.name === "supply-transfer").every((p) => !p.visible)).toBe(
    true,
  );
  disposeScene(root);
});
it("renders exactly three initial containers then the actual awarded fourth, without duplicate transfer bodies", () => {
  const state = createMatch(7),
    view = createArenaView(0, state.arena);
  const options = { humanSeat: 0, preview: false, slowdown: false, reducedEffects: false };
  state.phase = "playing";
  view.update(state, 0, options);
  const visibleHealth = () =>
    view.root.children.filter((object) => object.name.startsWith("health-0-") && object.visible);
  expect(visibleHealth()).toHaveLength(3);
  state.supplies = [{ id: 0, age: 1, position: { x: 0, y: 0 } }];
  state.balls[0]!.striker = 0;
  collectSupply(state, state.balls[0]!, 0);
  view.update(state, 0.1, options);
  expect(visibleHealth()).toHaveLength(3);
  view.update(state, 0.6, options);
  expect(visibleHealth()).toHaveLength(4);
  view.dispose();
  disposeScene(view.root);
});
