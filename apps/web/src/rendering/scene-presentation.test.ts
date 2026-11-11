import { Group, Mesh, MeshStandardMaterial, PerspectiveCamera, ShaderMaterial } from "three";
import { expect, it } from "vite-plus/test";
import { createNeonLettering } from "./neon-lettering";
import { createSceneMenu } from "./scene-menu";
import { createVictoryFireworks } from "./victory-fireworks";
import { disposeScene } from "./dispose-scene";

it("builds CITADEL as low-polygon solid bevelled geometry with the arena neon shader", () => {
  const text = createNeonLettering("CITADEL", 2.15),
    mesh = text.children[0] as Mesh;
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox!;
  expect(bounds.max.z - bounds.min.z).toBeGreaterThan(0.3);
  expect(bounds.max.y - bounds.min.y).toBeGreaterThan(2);
  expect(mesh.geometry.getAttribute("position").count).toBeLessThan(20000);
  expect((mesh.material as MeshStandardMaterial).map).toBeNull();
  expect(((mesh.children[0] as Mesh).material as ShaderMaterial).name).toBe("NeonFeatureEdges");
  expect(Array.from(mesh.geometry.getAttribute("position").array).every(Number.isFinite)).toBe(
    true,
  );
  disposeScene(text);
});

it("projects accessible scene controls, bounds player count, and waits before offering rematch", () => {
  const root = new Group(),
    menu = createSceneMenu(root),
    camera = new PerspectiveCamera(44, 1280 / 900, 0.1, 180);
  camera.position.set(0, 14, 25);
  camera.lookAt(0, 3, 0);
  camera.updateMatrixWorld(true);
  const state = { mode: "title" as const, count: 2, elapsed: 0, reduced: false };
  const controls = menu.update(state, camera, 1280, 900);
  expect(controls.find((c) => c.action === "decrease")!.disabled).toBe(true);
  expect(controls.find((c) => c.action === "increase")!.disabled).toBe(false);
  expect(
    controls.every(
      (c) =>
        [c.left, c.top, c.width, c.height].every(Number.isFinite) && c.width > 0 && c.height > 0,
    ),
  ).toBe(true);
  expect(
    menu.update({ ...state, count: 6 }, camera, 1280, 900).find((c) => c.action === "increase")!
      .disabled,
  ).toBe(true);
  expect(menu.update({ ...state, mode: "victory", elapsed: 1 }, camera, 1280, 900)).toEqual([]);
  expect(
    menu.update({ ...state, mode: "victory", elapsed: 4 }, camera, 1280, 900).map((c) => c.action),
  ).toEqual(["rematch", "options"]);
  expect(menu.update({ ...state, mode: "hidden" }, camera, 1280, 900)).toEqual([]);
  disposeScene(root);
});

it("runs pooled neon fireworks after the rules end, freezes on pause, and suppresses motion in reduced mode", () => {
  const root = new Group(),
    fireworks = createVictoryFireworks(root);
  fireworks.update(0.3, true, false, 0xff5c46);
  expect(root.children).toHaveLength(4);
  const burst = root.children.find((p) => p.visible)!;
  expect(burst).toBeDefined();
  const edges = burst.children[1] as Mesh;
  expect((edges.material as ShaderMaterial).name).toBe("NeonFeatureEdges");
  const positions = Array.from(edges.geometry.getAttribute("edgeStart").array);
  expect(positions.every(Number.isFinite)).toBe(true);
  fireworks.update(0, true, false, 0xff5c46);
  expect(Array.from(edges.geometry.getAttribute("edgeStart").array)).toEqual(positions);
  fireworks.update(0.1, true, false, 0xff5c46);
  expect(Array.from(edges.geometry.getAttribute("edgeStart").array)).not.toEqual(positions);
  fireworks.update(0, true, true, 0xff5c46);
  expect(root.children.every((p) => !p.visible)).toBe(true);
  fireworks.update(0, false, false, 0xff5c46);
  expect(root.children.every((p) => !p.visible)).toBe(true);
  disposeScene(root);
});
