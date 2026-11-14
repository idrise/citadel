import { PerspectiveCamera, Box3, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createLevelStatus } from "./level-status";
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
