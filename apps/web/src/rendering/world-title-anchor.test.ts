import { Box3, Group, Mesh, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createArena } from "../simulation/arena";
import { createArenaCamera, fitArenaCamera } from "./camera";
import { createCameraMotion } from "./camera-motion";
import { createLevelIntro } from "./level-intro";
import { mobileMenuLayout } from "./mobile-menu-layout";
import { createWorldTitleAnchor } from "./world-title-anchor";
import { disposeScene } from "./dispose-scene";

it("anchors the reflected title near screen centre across widths, camera motion and roster changes", () => {
  for (const count of [2, 6, 16] as const)
    for (const seat of [0, count - 1]) {
      const scene = new Group(),
        arena = createArena(count),
        camera = createArenaCamera(seat, arena),
        motion = createCameraMotion(camera),
        intro = createLevelIntro(scene),
        place = createWorldTitleAnchor(intro.root);
      for (const [width, height] of [
        [320, 568],
        [390, 844],
        [699, 600],
        [700, 600],
        [1024, 768],
        [1280, 900],
        [844, 390],
      ]) {
        const aspect = width! / height!,
          tilt = -0.95 * Math.max(0, Math.min(1, (1 - aspect) / 0.4));
        motion.layout(aspect);
        motion.update(0.1, false);
        fitArenaCamera(
          camera,
          new Box3(new Vector3(-20, 0, -20), new Vector3(20, 2.34, 20)),
          aspect,
        );
        intro.update("CITADEL", 1, arena, seat, false, null, 1, tilt);
        place(camera, width!, height!, intro.raisedY);
        const projected = intro.root.getWorldPosition(new Vector3()).project(camera),
          layout = mobileMenuLayout(width!, height!, false);
        expect(projected.x).toBeCloseTo(0, 8);
        expect(((1 - projected.y) * height!) / 2).toBeCloseTo(layout.title.y, 7);
        expect(new Box3().setFromObject(intro.root).min.y).toBeGreaterThan(0.01);
        const face = intro.root.getObjectByName("neon-text:CITADEL")!.children[0] as Mesh;
        const bounds = face.geometry.boundingBox!;
        const corners = [bounds.min.x, bounds.max.x].flatMap((x) =>
          [bounds.min.y, bounds.max.y].flatMap((y) =>
            [bounds.min.z, bounds.max.z].map((z) =>
              new Vector3(x, y, z).applyMatrix4(face.matrixWorld).project(camera),
            ),
          ),
        );
        const pixelWidth =
          ((Math.max(...corners.map((p) => p.x)) - Math.min(...corners.map((p) => p.x))) * width!) /
          2;
        expect(pixelWidth).toBeLessThanOrEqual(layout.title.width * 1.02);
      }
      disposeScene(scene);
    }
});

it("preserves rising/sinking below the floor and ignores a hidden title", () => {
  const scene = new Group(),
    arena = createArena(6),
    camera = createArenaCamera(0, arena),
    intro = createLevelIntro(scene),
    place = createWorldTitleAnchor(intro.root);
  fitArenaCamera(camera, new Box3(new Vector3(-20, 0, -20), new Vector3(20, 2, 20)), 1);
  intro.update("CITADEL", 1, arena, 0, false, null, 0.01);
  place(camera, 800, 800, intro.raisedY);
  expect(new Box3().setFromObject(intro.root).max.y).toBeLessThan(0);
  intro.update("CITADEL", 1, arena, 0, false, null, 0);
  const before = intro.root.position.clone();
  place(camera, 600, 800, intro.raisedY);
  expect(intro.root.position).toEqual(before);
  disposeScene(scene);
});
