import { Group, Mesh, PerspectiveCamera, ShaderMaterial } from "three";
import { expect, it } from "vite-plus/test";
import { createSpectatorMenu } from "./scene-spectator";
import { createMenuOverlay } from "./menu-overlay";
import { disposeScene } from "./dispose-scene";
it("renders early Back/Retry as neon scene geometry and keeps the live board bright", () => {
  const overlay = createMenuOverlay(),
    state = {
      mode: "hidden" as const,
      count: 6,
      elapsed: 0,
      reduced: false,
      spectator: { level: 3 },
    };
  const controls = overlay.update(state, 0, 1280, 900);
  expect(controls.map((c) => [c.action, c.label])).toEqual([
    ["back", "Back"],
    ["retry", "Retry level 3"],
  ]);
  expect(overlay.visible).toBe(true);
  expect(overlay.backgroundGain).toBe(1);
  const retry = overlay.scene.getObjectByName("scene-control:retry")!;
  const edges = retry.getObjectByName("feature-edges") as Mesh;
  expect((edges.material as ShaderMaterial).name).toBe("NeonFeatureEdges");
  expect(retry.getObjectByName("neon-text:RETRY")).toBeDefined();
  overlay.update(
    { ...state, spectator: { level: 2, demotion: { from: 3, to: 2, count: 6 } } },
    0,
    1280,
    900,
  );
  expect(overlay.scene.getObjectByName("neon-text:DEMOTED TO LEVEL 02")).toBeDefined();
  const back = overlay.scene.getObjectByName("scene-control:back")!;
  expect(back.getObjectByName("neon-text:BACK")).toBeDefined();
  expect(back.visible).toBe(true);
  overlay.update({ mode: "hidden", count: 6, elapsed: 0, reduced: false }, 0, 1280, 900);
  expect(overlay.visible).toBe(false);
  overlay.dispose();
});
it("keeps all scene hit targets finger-sized and inside narrow, rotated and desktop viewports", () => {
  const camera = new PerspectiveCamera(44, 1, 0.1, 200),
    menu = createSpectatorMenu(camera);
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [844, 390],
    [667, 320],
    [768, 1024],
    [1280, 900],
  ]) {
    const controls = menu.update(
      { level: 100, demotion: { from: 100, to: 99, count: 3 } },
      width!,
      height!,
    );
    expect(controls.map((c) => c.action)).toEqual(["back", "retry"]);
    for (const c of controls) {
      expect(c.width).toBeGreaterThanOrEqual(44);
      expect(c.height).toBeGreaterThanOrEqual(44);
      expect(c.left).toBeGreaterThanOrEqual(12);
      expect(c.top).toBeGreaterThanOrEqual(12);
      expect(c.left + c.width).toBeLessThanOrEqual(width! - 12);
      expect(c.top + c.height).toBeLessThanOrEqual(height! - 12);
    }
  }
  const root = new Group();
  root.add(camera);
  disposeScene(root);
});
