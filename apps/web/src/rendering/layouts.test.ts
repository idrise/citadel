import { Box3, Mesh, Vector3 } from "three";
import { expect, it, vi } from "vite-plus/test";
import { createArena, fortress } from "../simulation/arena";
import { createMatch } from "../simulation/match";
import { damagePiece } from "../simulation/serving";
import { beginArenaMorph, stepArenaMorph } from "../simulation/arena-morph";
import { createArenaView } from "./arena-view";
import { disposeScene } from "./dispose-scene";
import { createArenaCamera, fitArenaCamera } from "./camera";
import { hullGeometry } from "./hull";
it.each([2, 3, 4, 5, 6] as const)(
  "frames all physical %s-seat boundary vertices from every human seat in wide and narrow windows",
  (count) => {
    const arena = createArena(count);
    const corners = arena.vertices.flatMap((p) => [
      new Vector3(p.x * 1.09, 0, p.y * 1.09),
      new Vector3(p.x * 1.09, 2.34, p.y * 1.09),
    ]);
    const bounds = new Box3().setFromPoints(corners);
    for (let seat = 0; seat < count; seat++)
      for (const aspect of [0.65, 1.8]) {
        const camera = createArenaCamera(seat, arena);
        fitArenaCamera(camera, bounds, aspect, corners);
        const projections = corners.map((point) => point.clone().project(camera));
        for (const point of projections) {
          expect(Math.abs(point.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(point.y)).toBeLessThanOrEqual(1);
        }
        const extent = Math.max(...projections.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
        expect(extent).toBeGreaterThan(0.9);
      }
  },
);
it("uses upward-facing floor triangles and a real deep hull, with no hidden triangulation edges", () => {
  const geometry = hullGeometry(createArena(6).vertices, 0.55, -0.17, 2.1);
  const normal = geometry.getAttribute("normal");
  expect(normal.getY(0)).toBeCloseTo(1);
  geometry.computeBoundingBox();
  expect(geometry.boundingBox!.max.y - geometry.boundingBox!.min.y).toBeCloseTo(2.1);
  geometry.dispose();
});
it("moves meshes and mirrors with the colliders, hides eliminated actors, and releases replaced geometry", () => {
  const state = createMatch(4, 6);
  state.phase = "playing";
  const view = createArenaView(5, state.arena);
  const body = state.players[1]!;
  body.health.fill(false);
  body.health[0] = true;
  damagePiece(state, state.balls[0]!, 1, 0);
  beginArenaMorph(state);
  const base = view.root.children[0]!.children[0] as Mesh;
  const disposed = vi.spyOn(base.geometry, "dispose");
  for (let i = 0; i < 10; i++) {
    stepArenaMorph(state, 1 / 30);
    view.update(state, 1 / 30, {
      humanSeat: 5,
      preview: false,
      slowdown: false,
      reducedEffects: false,
    });
  }
  expect(disposed).toHaveBeenCalledTimes(1);
  const paddles = view.root.children.filter(
    (child) => child instanceof Mesh && child.position.y === 0.95,
  );
  expect(paddles).toHaveLength(6);
  expect(paddles[1]!.visible).toBe(false);
  const home = fortress(5, state.arena);
  expect(paddles[5]!.position.x).toBe(home.anchor.x);
  expect(paddles[5]!.position.z).toBe(home.anchor.y);
  const walls = view.root.getObjectByName("arena-walls")!;
  expect(
    walls.children.filter((child) => child.visible && /^(near|rear)-wall$/.test(child.name)),
  ).toHaveLength(state.arena.vertices.length);
  const piece = view.root.getObjectByName("health-5-0")!;
  expect(piece.position.x).toBe(state.players[5]!.pieces[0]!.position.x);
  view.dispose();
  disposeScene(view.root);
});
