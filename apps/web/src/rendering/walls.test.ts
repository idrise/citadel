import { Box3, type Group, Mesh, Vector3 } from "three";
import { POST_BASE_HEIGHT, POST_HEIGHT } from "./wall-section";
import { expect, it } from "vite-plus/test";
import { createArena, type ArenaGeometry, type PlayerCount } from "../simulation/arena";
import { polygonEdges } from "../simulation/polygon";
import { createArenaWalls } from "./walls";
import { disposeScene } from "./dispose-scene";
import { createMatch } from "../simulation/match";
import { beginArenaMorph, stepArenaMorph } from "../simulation/arena-morph";

it("fully raises visible posts above the reflective floor in classic and rounded layouts", () => {
  for (const count of [2, 3, 4, 5, 6] as const)
    for (const shape of ["classic", "rounded"] as const) {
      const arena = createArena(count, undefined, 0, 1, shape);
      const root = createArenaWalls(0, arena);
      const posts = root.children.filter(
        (object) => object.name === "corner-post" && object.visible,
      );
      expect(posts.length).toBeGreaterThan(0);
      for (const post of posts) {
        const bounds = new Box3().setFromObject(post);
        expect(bounds.min.y).toBeCloseTo(POST_BASE_HEIGHT, 6);
        expect(bounds.min.y).toBeGreaterThan(0.025);
        expect(bounds.max.y).toBeCloseTo(POST_BASE_HEIGHT + POST_HEIGHT, 6);
        const glow = post.children[0] as Mesh;
        const starts = glow.geometry.getAttribute("edgeStart"),
          ends = glow.geometry.getAttribute("edgeEnd");
        const baseY = -POST_HEIGHT / 2;
        let visibleBaseEdges = 0;
        for (let i = 0; i < starts.count; i++)
          if (Math.abs(starts.getY(i) - baseY) < 1e-6 && Math.abs(ends.getY(i) - baseY) < 1e-6)
            visibleBaseEdges++;
        expect(visibleBaseEdges).toBe(4);
      }
      root.userData.update(arena, 0, undefined, 0, { vertices: arena.vertices, lift: 0 });
      for (const post of posts) {
        expect(post.visible).toBe(false);
        expect(new Box3().setFromObject(post).max.y).toBeCloseTo(0, 6);
      }
      disposeScene(root);
    }
});

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

it("lowers full-size posts vertically at fixed corners, hides them during the reshape, and raises only the new set", async () => {
  const { morphPosts } = await import("../simulation/arena-transition");
  const state = createMatch(2026, 6),
    root = createArenaWalls(0, state.arena);
  const posts = root.children.filter((object) => object.name === "corner-post");
  const source = posts
    .filter((post) => post.visible)
    .map((post) => ({
      x: post.position.x,
      y: post.position.y,
      z: post.position.z,
      yaw: post.rotation.y,
    }));
  state.players[5]!.health.fill(false);
  state.eliminations.push({ seat: 5, elapsed: 0 });
  beginArenaMorph(state);
  const duration = state.morph!.duration;
  const update = () =>
    root.userData.update(state.arena, 0, undefined, 1 / 60, morphPosts(state.morph!));
  stepArenaMorph(state, duration * 0.075);
  update();
  posts
    .filter((post) => post.visible)
    .forEach((post, index) => {
      expect(post.position.x).toBe(source[index]!.x);
      expect(post.position.z).toBe(source[index]!.z);
      expect(post.rotation.y).toBe(source[index]!.yaw);
      expect(post.position.y).toBeLessThan(source[index]!.y);
      expect(post.scale.toArray()).toEqual([1, 1, 1]);
      const material = (post as Mesh).material as import("three").MeshPhysicalMaterial;
      expect(material.clippingPlanes![0]!.normal.toArray()).toEqual([0, 1, 0]);
      expect(material.clipShadows).toBe(true);
      const edges = post.children[0] as Mesh;
      expect((edges.material as import("three").ShaderMaterial).clippingPlanes).toBe(
        material.clippingPlanes,
      );
    });
  stepArenaMorph(state, duration * 0.425);
  update();
  expect(posts.some((post) => post.visible)).toBe(false);
  stepArenaMorph(state, duration * 0.425);
  update();
  expect(state.arena).toBe(state.morph!.to);
  expect(posts.filter((post) => post.visible)).toHaveLength(5);
  const target = posts.filter((post) => post.visible).map((post) => post.position.clone());
  stepArenaMorph(state, duration * 0.05);
  update();
  posts
    .filter((post) => post.visible)
    .forEach((post, i) => {
      expect(post.position.x).toBe(target[i]!.x);
      expect(post.position.z).toBe(target[i]!.z);
      expect(post.position.y).toBeGreaterThan(target[i]!.y);
    });
  disposeScene(root);
});

it("fades side glazing continuously as the view crosses it, retaining material and seam geometry", () => {
  const arena = createArena(4),
    root = createArenaWalls(0, arena);
  const wall = root.children[0]!;
  const panel = wall.getObjectByName("wall-panel") as Mesh;
  const material = panel.material as import("three").MeshPhysicalMaterial;
  const positions = panel.geometry.getAttribute("position");
  let before: number | undefined;
  for (let i = -200; i <= 200; i++) {
    root.userData.update(arena, 0, { x: 1, y: i / 1000 }, 1 / 60);
    if (before !== undefined) expect(Math.abs(material.opacity - before)).toBeLessThan(0.01);
    before = material.opacity;
    expect(panel.material).toBe(material);
    expect(panel.geometry.getAttribute("position")).toBe(positions);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(panel.renderOrder).toBeLessThan(0);
  }
  expect(root.getObjectByName("wall-support")).toBeUndefined();
  disposeScene(root);
});
