import { type Group, Mesh, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createArena, type ArenaGeometry, type PlayerCount } from "../simulation/arena";
import { polygonEdges } from "../simulation/polygon";
import { createArenaWalls } from "./walls";
import { disposeScene } from "./dispose-scene";
import { createMatch } from "../simulation/match";
import { beginArenaMorph, stepArenaMorph } from "../simulation/arena-morph";

function assertPosts(root: Group, arena: ArenaGeometry) {
  const edges = polygonEdges(arena.vertices);
  (root.userData.update as (arena: ArenaGeometry) => void)(arena);
  root.updateMatrixWorld(true);
  const posts = root.children.filter((object) => object.name === "corner-post");
  posts.forEach((post) => {
    const index = post.userData.corner as number;
    if (!post.visible) return;
    const edge = edges[index]!,
      previous = edges[(index + edges.length - 1) % edges.length]!;
    const diagonal = new Vector3(1, 0, 1).transformDirection(post.matrixWorld),
      bisector = new Vector3(
        edge.normal.x + previous.normal.x,
        0,
        edge.normal.y + previous.normal.y,
      ).normalize();
    expect(diagonal.dot(bisector)).toBeCloseTo(1, 7);
    const positions = (post as Mesh).geometry.getAttribute("position");
    for (let i = 0; i < positions.count; i++) {
      const p = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(post.matrixWorld);
      for (const side of [previous, edge])
        expect(
          (p.x - side.start.x) * side.normal.x + (p.z - side.start.y) * side.normal.y,
        ).toBeLessThan(1e-6);
    }
  });
}

it.each([2, 3, 4, 5, 6] as PlayerCount[])(
  "rotates %s-seat corner caps with their walls, including a changed arena pose",
  (count) => {
    const root = createArenaWalls(0, createArena(count));
    for (const rotation of [0, 0.37, 1.1]) {
      assertPosts(root, createArena(count, undefined, rotation));
    }
    disposeScene(root);
  },
);

it("tracks changing corner bisectors and retracting posts during an actual six-to-five morph", () => {
  const state = createMatch(2026, 6),
    root = createArenaWalls(0, state.arena);
  state.players[4]!.health.fill(false);
  state.eliminations.push({ seat: 4, elapsed: 0 });
  beginArenaMorph(state);
  for (let i = 0; i < 10; i++) {
    stepArenaMorph(state, 0.35);
    assertPosts(root, state.arena);
  }
  expect(state.arena.count).toBe(5);
  expect(state.morph).toBeNull();
  disposeScene(root);
});
