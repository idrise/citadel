import { Group, Mesh, MeshStandardMaterial, PerspectiveCamera, ShaderMaterial } from "three";
import { expect, it } from "vite-plus/test";
import { createNeonLettering } from "./neon-lettering";
import { createSceneMenu } from "./scene-menu";
import { createVictoryFireworks } from "./victory-fireworks";
import { disposeScene } from "./dispose-scene";
import { createMenuOverlay, MENU_BACKGROUND_GAIN } from "./menu-overlay";

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
    camera = new PerspectiveCamera(44, 1280 / 900, 0.1, 180),
    menu = createSceneMenu(camera);
  root.add(camera);
  camera.position.set(0, 14, 25);
  camera.lookAt(0, 3, 0);
  camera.updateMatrixWorld(true);
  const state = { mode: "title" as const, count: 2, elapsed: 0, reduced: false };
  const controls = menu.update(state, 1280, 900);
  expect(controls.find((c) => c.action === "decrease")!.disabled).toBe(true);
  expect(controls.find((c) => c.action === "increase")!.disabled).toBe(false);
  expect(
    controls.every(
      (c) =>
        [c.left, c.top, c.width, c.height].every(Number.isFinite) && c.width > 0 && c.height > 0,
    ),
  ).toBe(true);
  expect(
    menu.update({ ...state, count: 6 }, 1280, 900).find((c) => c.action === "increase")!.disabled,
  ).toBe(true);
  expect(menu.update({ ...state, mode: "victory", elapsed: 1 }, 1280, 900)).toEqual([]);
  expect(
    menu.update({ ...state, mode: "victory", elapsed: 5 }, 1280, 900).map((c) => c.action),
  ).toEqual(["rematch", "options"]);
  expect(menu.update({ ...state, mode: "hidden" }, 1280, 900)).toEqual([]);
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

it("keeps the same camera-relative title/control layout through every player count and camera pose", () => {
  const camera = new PerspectiveCamera(44, 1280 / 900, 0.1, 200),
    menu = createSceneMenu(camera);
  const state = { mode: "title" as const, count: 2, elapsed: 0, reduced: false };
  const original = menu.update(state, 1280, 900);
  for (const count of [2, 3, 4, 5, 6]) {
    camera.position.set(count * 3, 12 - count, -count * 2);
    camera.lookAt(0, 0, 0);
    const current = menu.update({ ...state, count }, 1280, 900);
    for (const control of current) {
      const previous = original.find((c) => c.action === control.action)!;
      for (const key of ["left", "top", "width", "height"] as const)
        expect(control[key]).toBeCloseTo(previous[key], 7);
    }
  }
  for (const [width, height] of [
    [360, 740],
    [1920, 1080],
  ]) {
    for (const control of menu.update(state, width!, height!)) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.top).toBeGreaterThanOrEqual(0);
      expect(control.left + control.width).toBeLessThanOrEqual(width!);
      expect(control.top + control.height).toBeLessThanOrEqual(height!);
    }
  }
  disposeScene(camera);
});

it.each(["title", "victory", "defeat"] as const)(
  "dims the %s background while keeping its foreground visible and restores normal play",
  (mode) => {
    const overlay = createMenuOverlay(),
      state = { mode, count: 4, elapsed: 5, reduced: false };
    overlay.update(state, 0, 1280, 900);
    expect(overlay.backgroundGain).toBe(MENU_BACKGROUND_GAIN);
    expect(MENU_BACKGROUND_GAIN).toBeLessThan(0.3);
    expect(overlay.dimmer.enabled).toBe(true);
    expect(overlay.visible).toBe(true);
    overlay.update({ ...state, mode: "hidden" }, 2, 1280, 900);
    expect(overlay.backgroundGain).toBe(1);
    expect(overlay.dimmer.enabled).toBe(false);
    expect(overlay.visible).toBe(false);
    overlay.update(state, 0.5, 1280, 900);
    expect(overlay.backgroundGain).toBeLessThan(0.2);
    overlay.update({ ...state, reduced: true }, 0, 1280, 900);
    expect(overlay.backgroundGain).toBe(MENU_BACKGROUND_GAIN);
    expect(overlay.visible).toBe(true);
    overlay.dispose();
  },
);

it("gives phone title and result controls finger-sized targets in portrait and landscape", () => {
  const camera = new PerspectiveCamera(44, 1, 0.1, 200);
  const menu = createSceneMenu(camera);
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [844, 390],
    [667, 320],
    [768, 1024],
    [1024, 768],
  ]) {
    for (const mode of ["title", "victory", "defeat"] as const) {
      const controls = menu.update(
        { mode, count: 4, elapsed: 5, reduced: true, touch: true },
        width!,
        height!,
      );
      for (const control of controls) {
        expect(control.width).toBeGreaterThanOrEqual(44);
        expect(control.height).toBeGreaterThanOrEqual(44);
        expect(control.left).toBeGreaterThanOrEqual(12);
        expect(control.top).toBeGreaterThanOrEqual(12);
        expect(control.left + control.width).toBeLessThanOrEqual(width! - 12);
        expect(control.top + control.height).toBeLessThanOrEqual(height! - 12);
      }
    }
  }
  disposeScene(camera);
});
