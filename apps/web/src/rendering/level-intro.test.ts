import { Box3, Group, Mesh, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createArena } from "../simulation/arena";
import { createLevelIntro, levelIntroRise } from "./level-intro";
import { createArenaCamera, fitArenaCamera } from "./camera";
import { createMenuOverlay } from "./menu-overlay";
import { disposeScene } from "./dispose-scene";

it("raises and sinks within the unchanged countdown, freezes at a held time and suppresses motion in reduced mode", () => {
  expect(levelIntroRise(1.5, false)).toBe(0);
  expect(levelIntroRise(1, false)).toBe(1);
  expect(levelIntroRise(0.7, false)).toBe(1);
  expect(levelIntroRise(0.2, false)).toBeGreaterThan(0);
  expect(levelIntroRise(0.2, false)).toBeLessThan(1);
  expect(levelIntroRise(0, false)).toBe(0);
  expect(levelIntroRise(1.5, true)).toBe(1);
});
it("puts solid level lettering in the reflected world, fits every seat and hides it before play", () => {
  for (const count of [2, 3, 4, 5, 6] as const)
    for (let seat = 0; seat < count; seat++) {
      const scene = new Group(),
        arena = createArena(count),
        intro = createLevelIntro(scene);
      const camera = createArenaCamera(seat, arena);
      for (const [width, height] of [
        [320, 568],
        [844, 390],
        [1280, 900],
      ])
        for (const level of [1, 100]) {
          intro.update(level, 0.8, arena, seat, false);
          expect(intro.root.parent).toBe(scene);
          const text = intro.root.getObjectByName(
            `neon-text:LEVEL ${String(level).padStart(2, "0")}`,
          );
          expect(text).toBeDefined();
          const box = new Box3().setFromObject(intro.root);
          expect(box.min.y).toBeGreaterThan(0.02);
          const corners = arena.vertices.flatMap((p) => [
            new Vector3(p.x * 1.09, 0, p.y * 1.09),
            new Vector3(p.x * 1.09, 2.34, p.y * 1.09),
          ]);
          fitArenaCamera(camera, new Box3().setFromPoints(corners), width! / height!, corners);
          const face = text!.children[0] as Mesh;
          const local = face.geometry.boundingBox!;
          const projected = [local.min.x, local.max.x].flatMap((x) =>
            [local.min.y, local.max.y].flatMap((y) =>
              [local.min.z, local.max.z].map((z) =>
                new Vector3(x, y, z).applyMatrix4(face.matrixWorld).project(camera),
              ),
            ),
          );
          expect(
            projected.every((p) => Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.95),
            JSON.stringify({ count, seat, width, height, level, projected }),
          ).toBe(true);
        }
      intro.update(1, 1.5, arena, seat, false);
      expect(new Box3().setFromObject(intro.root).max.y).toBeLessThan(0);
      intro.update(null, 0, arena, seat, false);
      expect(intro.root.visible).toBe(false);
      disposeScene(scene);
    }
});
it("adds reflected demotion lettering and leaves the world bright with no foreground countdown menu", () => {
  const root = new Group(),
    intro = createLevelIntro(root),
    arena = createArena(4);
  intro.update(7, 1, arena, 0, false, { from: 8, to: 7, count: 4 });
  expect(intro.root.getObjectByName("neon-text:DEMOTED FROM 08")).toBeDefined();
  const overlay = createMenuOverlay();
  expect(
    overlay.update({ mode: "level", level: 7, count: 4, elapsed: 0, reduced: true }, 0, 390, 844),
  ).toEqual([]);
  expect(overlay.visible).toBe(false);
  expect(overlay.backgroundGain).toBe(1);
  overlay.dispose();
  disposeScene(root);
});
it("raises the Citadel title with the same reflected world geometry and retires it below the floor", () => {
  const root = new Group(),
    intro = createLevelIntro(root),
    arena = createArena(4);
  intro.update("CITADEL", 1, arena, 0, false, null, 1);
  expect(intro.root.getObjectByName("neon-text:CITADEL")).toBeDefined();
  expect(new Box3().setFromObject(intro.root).min.y).toBeGreaterThan(0.02);
  intro.update("CITADEL", 1, arena, 0, false, null, 0.01);
  expect(new Box3().setFromObject(intro.root).max.y).toBeLessThan(0);
  intro.update("CITADEL", 1, arena, 0, false, null, 0);
  expect(intro.root.visible).toBe(false);
  disposeScene(root);
});
