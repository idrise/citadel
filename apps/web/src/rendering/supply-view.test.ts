import {
  Group,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  type WebGLRenderer,
} from "three";
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
  view.update(state, 0.7, false);
  expect(view.inTransit(0, 3)).toBe(false);
  view.update(state, 0, true);
  expect(root.children.filter((p) => p.name === "supply-transfer").every((p) => !p.visible)).toBe(
    true,
  );
  disposeScene(root);
});
it("renders exactly three initial containers then the actual awarded fourth, without hiding a live collider during the transfer effect", () => {
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
  expect(visibleHealth()).toHaveLength(4);
  view.update(state, 0.6, options);
  expect(visibleHealth()).toHaveLength(4);
  view.dispose();
  disposeScene(view.root);
});

it("updates the transfer outline's actual drawing uniforms so an award cannot expand into a screen-wide flash", () => {
  const root = new Group();
  createSupplyView(root);
  const flight = root.children.find((object) => object.name === "supply-transfer")!;
  const edge = flight.getObjectByName("feature-edges") as Mesh;
  const material = edge.material as ShaderMaterial;
  const renderer = {
    getCurrentViewport: (target: { set: (x: number, y: number, w: number, h: number) => void }) =>
      target.set(0, 0, 1280, 900),
    getPixelRatio: () => 2,
  } as unknown as WebGLRenderer;
  edge.onBeforeRender(
    renderer,
    new Scene(),
    new PerspectiveCamera(),
    edge.geometry,
    material,
    new Group(),
  );
  expect(material.uniforms.resolution!.value).toEqual(new Vector2(1280, 900));
  expect(material.uniforms.pixelRatio!.value).toBe(2);
  expect(material.uniforms.opacity!.value).toBe(0.8);
  disposeScene(root);
});

it("shows a bounded, paused transfer streak then a bank arrival ring and +1, without altering live health", () => {
  const state = createMatch(3),
    root = new Group(),
    view = createSupplyView(root);
  state.phase = "playing";
  state.supplies = [{ id: 0, age: 1, position: { x: 0, y: 0 } }];
  state.balls[0]!.striker = 0;
  collectSupply(state, state.balls[0]!, 0);
  const saved = structuredClone(state),
    resources = root.children.map((p) => p.uuid);
  view.update(state, 0.3, false);
  const trail = root.children.find((p) => p.name === "supply-streak" && p.visible) as Mesh;
  expect(trail).toBeDefined();
  const points = Array.from(trail.geometry.getAttribute("position").array);
  view.update(state, 0, false);
  expect(Array.from(trail.geometry.getAttribute("position").array)).toEqual(points);
  view.update(state, 0.6, false);
  expect(root.children.filter((p) => p.name === "supply-award" && p.visible)).toHaveLength(1);
  expect(root.children.filter((p) => p.name === "supply-arrival" && p.visible)).toHaveLength(1);
  expect(root.children.filter((p) => p.name === "supply-transfer" && p.visible)).toHaveLength(0);
  view.update(state, 0.7, false);
  expect(root.children.filter((p) => p.name === "supply-award" && p.visible)).toHaveLength(0);
  expect(state).toEqual(saved);
  expect(root.children.map((p) => p.uuid)).toEqual(resources);
  view.reset();
  view.update(state, 0, false);
  expect(root.children.filter((p) => p.name === "supply-award" && p.visible)).toHaveLength(0);
  disposeScene(root);
});
