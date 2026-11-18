import { Box3, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createMenuOverlay } from "./menu-overlay";
it("shows the release version in the bottom-right corner at a stable readable size across screens and menus", () => {
  const overlay = createMenuOverlay();
  for (const [width, height] of [
    [320, 320],
    [390, 844],
    [844, 390],
    [1280, 900],
  ] as const)
    for (const mode of ["title", "hidden", "level", "victory", "defeat"] as const) {
      overlay.update({ mode, count: 6, elapsed: 0, reduced: false }, 0, width, height);
      overlay.camera.updateMatrixWorld(true);
      const root = overlay.scene.getObjectByName("release-version")!;
      expect(root.userData.text).toBe("V1.0.0");
      expect(overlay.visible).toBe(true);
      const bounds = new Box3().setFromObject(root),
        min = bounds.min.clone().project(overlay.camera),
        max = bounds.max.clone().project(overlay.camera);
      const right = ((max.x + 1) * width) / 2,
        bottom = ((1 - min.y) * height) / 2;
      expect(width - right).toBeGreaterThan(16);
      expect(width - right).toBeLessThan(20);
      expect(height - bottom).toBeGreaterThan(16);
      expect(height - bottom).toBeLessThan(20);
      expect(((max.y - min.y) * height) / 2).toBeGreaterThan(11);
      expect(((max.y - min.y) * height) / 2).toBeLessThan(14);
      const ids = root.children.map((child) => child.uuid);
      overlay.update({ mode, count: 6, elapsed: 1, reduced: true }, 0, width, height);
      expect(root.children.map((child) => child.uuid)).toEqual(ids);
      expect(root.getWorldPosition(new Vector3()).z).toBeLessThan(0);
    }
  overlay.dispose();
});
