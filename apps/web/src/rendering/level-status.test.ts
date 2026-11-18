import { PerspectiveCamera, Box3, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createLevelStatus } from "./level-status";
import { disposeScene } from "./dispose-scene";

it("shows remaining replay tokens at top left, reuses geometry, and fits clear of phone Pause", () => {
  const camera = new PerspectiveCamera(44, 1, 0.1, 200),
    status = createLevelStatus(camera);
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [844, 390],
    [1280, 900],
  ]) {
    camera.aspect = width! / height!;
    camera.updateProjectionMatrix();
    for (const replayTokens of [3, 2, 1, 0]) {
      const state = {
        mode: "hidden" as const,
        count: 6,
        level: 7,
        bestLevel: 12,
        replayTokens,
        touch: true,
        settings: {
          open: false,
          touch: true,
          showPause: true,
          needsSound: false,
          effectsVolume: 1,
          musicVolume: 1,
          mouseSensitivity: 1,
        },
        elapsed: 0,
        reduced: false,
      };
      status.update(state, width!, height!);
      const root = camera.getObjectByName("level-status")!;
      expect(root.getObjectByName(`neon-text:REPLAYS ${replayTokens}`)).toBeDefined();
      const ids = root.children.map((c) => c.uuid);
      status.update(state, width!, height!);
      expect(root.children.map((c) => c.uuid)).toEqual(ids);
      camera.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(root);
      const min = bounds.min.clone().project(camera),
        max = bounds.max.clone().project(camera);
      expect(((min.x + 1) * width!) / 2).toBeGreaterThan(10);
      expect(((max.x + 1) * width!) / 2).toBeLessThan(width! - 85);
      expect(((1 - max.y) * height!) / 2).toBeGreaterThan(10);
      expect(((1 - min.y) * height!) / 2).toBeLessThan(100);
      status.update({ ...state, debug: true }, width!, height!);
      expect(root.userData.text).not.toContain("REPLAYS");
      status.update({ ...state, settings: { ...state.settings, open: true } }, width!, height!);
      expect(root.visible).toBe(false);
    }
  }
  disposeScene(camera);
});
it("keeps status readable and stable across level updates, resize and debug without mutating progress", () => {
  const camera = new PerspectiveCamera(44, 1, 0.1, 200),
    status = createLevelStatus(camera),
    state = {
      mode: "hidden" as const,
      count: 6,
      level: 7,
      bestLevel: 12,
      elapsed: 0,
      reduced: false,
    };
  status.update(state, 390, 844);
  const root = camera.getObjectByName("level-status")!,
    ids = root.children.map((c) => c.uuid);
  status.update(state, 390, 844);
  expect(root.children.map((c) => c.uuid)).toEqual(ids);
  status.update({ ...state, debug: true, level: 8 }, 390, 844);
  expect(root.userData.text).toContain("DEBUG LEVEL 08");
  expect(root.userData.text).toContain("BEST 12");
  const a = new Box3().setFromObject(root).getSize(new Vector3()).x;
  status.update({ ...state, debug: true, level: 9 }, 390, 844);
  const b = new Box3().setFromObject(root).getSize(new Vector3()).x;
  expect(b / a).toBeCloseTo(1, 1);
  expect(state.bestLevel).toBe(12);
  status.update({ mode: "hidden", count: 6, level: 7, elapsed: 0, reduced: false }, 390, 844);
  expect(root.visible).toBe(false);
});

it("shows zero before any wins and the literal highest win at level 100", () => {
  const camera = new PerspectiveCamera(44, 1, 0.1, 200),
    status = createLevelStatus(camera);
  for (const [level, bestLevel] of [
    [1, 0],
    [10, 5],
    [100, 100],
  ] as const) {
    status.update(
      { mode: "title", count: 6, level, bestLevel, elapsed: 0, reduced: false },
      390,
      844,
    );
    expect(camera.getObjectByName("level-status")!.userData.text).toContain(
      `BEST ${String(bestLevel).padStart(2, "0")}`,
    );
  }
});
