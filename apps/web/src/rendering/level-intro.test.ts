import { Box3, PerspectiveCamera, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createLevelIntro } from "./level-intro";
import { createMenuOverlay } from "./menu-overlay";
import { disposeScene } from "./dispose-scene";

it("keeps level 1 and 100 readable and bounded in phone portrait, landscape and desktop", () => {
  const camera = new PerspectiveCamera(44, 1, 0.1, 200),
    intro = createLevelIntro(camera);
  for (const [width, height] of [
    [320, 568],
    [844, 390],
    [1280, 900],
  ])
    for (const level of [1, 100]) {
      camera.aspect = width! / height!;
      camera.updateProjectionMatrix();
      intro.update(level, width!, height!);
      camera.updateMatrixWorld(true);
      const box = new Box3().setFromObject(intro.root);
      const left = new Vector3(box.min.x, 0, box.min.z).project(camera).x;
      const right = new Vector3(box.max.x, 0, box.max.z).project(camera).x;
      expect(left).toBeGreaterThan(-0.95);
      expect(right).toBeLessThan(0.95);
      expect(right - left).toBeGreaterThan(0.6);
    }
  intro.update(null, 320, 568);
  expect(intro.root.visible).toBe(false);
  disposeScene(camera);
});
it("introduces the level with no clickable menu and restores the playing background afterwards", () => {
  const overlay = createMenuOverlay();
  expect(
    overlay.update({ mode: "level", level: 100, count: 6, elapsed: 0, reduced: true }, 0, 390, 844),
  ).toEqual([]);
  expect(overlay.visible).toBe(true);
  expect(overlay.backgroundGain).toBe(0.6);
  overlay.update({ mode: "hidden", count: 6, elapsed: 0, reduced: true }, 0, 390, 844);
  expect(overlay.visible).toBe(false);
  expect(overlay.backgroundGain).toBe(1);
  overlay.dispose();
});
