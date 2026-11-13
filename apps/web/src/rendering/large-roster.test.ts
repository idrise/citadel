import { Box3, PointLight, Scene, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createArena } from "../simulation/arena";
import { createArenaCamera, fitArenaCamera } from "./camera";
import { createCameraMotion } from "./camera-motion";
import { seatLights } from "./seat-lights";
import { lightArena } from "./lighting";
import { disposeScene } from "./dispose-scene";
it("fits every extended arena from the initial camera through portrait/landscape changes without clipping or going inside it", () => {
  for (const count of [8, 12, 16] as const)
    for (const variant of ["classic", "wide", "faceted", "compact", "spacious"] as const)
      for (const aspect of [0.462, 1.42]) {
        const arena = createArena(count, undefined, 0, 1, variant),
          camera = createArenaCamera(),
          motion = createCameraMotion(camera);
        motion.layout(aspect);
        motion.scale(Math.max(1, ...arena.vertices.map((p) => Math.hypot(p.x, p.y) / 15)));
        const points = arena.vertices.flatMap((p) => [
          new Vector3(p.x, 0, p.y),
          new Vector3(p.x, 2.34, p.y),
        ]);
        const bounds = new Box3().setFromPoints(points);
        fitArenaCamera(camera, bounds, aspect, points);
        for (const point of points) {
          const projected = point.clone().project(camera);
          expect(Math.abs(projected.x)).toBeLessThanOrEqual(1.001);
          expect(Math.abs(projected.y)).toBeLessThanOrEqual(1.001);
          expect(projected.z).toBeGreaterThan(-1);
          expect(projected.z).toBeLessThan(1);
        }
      }
});
it("retains six point lights and includes the viewer among representative live colours", () => {
  const scene = new Scene(),
    dispose = lightArena(scene, createArena(16));
  expect(scene.children.filter((p) => p instanceof PointLight)).toHaveLength(6);
  const players = Array.from({ length: 16 }, (_, id) => ({ id, health: [true, true, true] })),
    seats = seatLights(players, 15);
  expect(seats).toHaveLength(6);
  expect(new Set(seats).size).toBe(6);
  expect(seats).toContain(15);
  players.forEach((p) => p.health.fill(p.id === 10));
  expect(seatLights(players, 15)).toEqual([10]);
  dispose();
  disposeScene(scene);
});

it("preserves ordered star notches and bounded walls when returning from a large victory, including a mid-reveal retarget", async () => {
  const { victoryOutlines } = await import("./victory-morph");
  const { matchPresentationOutlines, blendPresentationOutline } =
    await import("./presentation-outline");
  const arena = createArena(16, undefined, 0, 1, "wide"),
    victory = victoryOutlines(arena.vertices, Math.PI * 0.75);
  for (const progress of [0, 0.5, 1]) {
    const source = victory.from.map((p, i) => ({
      x: p.x * (1 - progress) + victory.to[i]!.x * progress,
      y: p.y * (1 - progress) + victory.to[i]!.y * progress,
    }));
    for (const count of [2, 4, 8, 12, 16] as const)
      for (const variant of ["wide", "compact", "spacious"] as const) {
        const target = createArena(count, undefined, 0, 1, variant),
          outline = matchPresentationOutlines(source, target.vertices);
        expect(outline.from.length).toBeLessThanOrEqual(42);
        for (let frame = 0; frame <= 20; frame++) {
          const points = blendPresentationOutline(outline, frame / 20);
          for (let i = 0; i < points.length; i++) {
            const a = points[i]!,
              b = points[(i + 1) % points.length]!;
            expect(a.x * b.y - a.y * b.x).toBeLessThan(1e-7);
          }
        }
      }
  }
});
