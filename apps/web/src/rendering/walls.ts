import { MAX_PLAYERS } from "../simulation/player-count";
import type { PostReveal } from "../simulation/arena-transition";
import { BoxGeometry, Group, Mesh, Plane, Vector3 } from "three";
import { fortress, SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import { clamp, dot } from "../simulation/vector";
import { createWallFit } from "./wall-fit";
import { polygonEdges } from "../simulation/polygon";
import { createFeatureEdges } from "./feature-edges";
import { frostedMaterial } from "./frosted-material";
import {
  createWallCap,
  createWallFoot,
  WALL_PANEL_CENTRE_Y,
  WALL_PANEL_HEIGHT,
  POST_HEIGHT,
  POST_BASE_HEIGHT,
} from "./wall-section";
export { WALL_CENTRE, WALL_HEIGHT, WALL_THICKNESS } from "./wall-section";

/** Thick opaque caps/feet and outer supports frame recessed faces; near glass keeps play visible. */
export function createArenaWalls(humanSeat: number, initial: ArenaGeometry = SQUARE_ARENA): Group {
  const root = new Group();
  root.name = "arena-walls";
  const walls: Group[] = [];
  const posts: Mesh[] = [];
  const fits: ReturnType<typeof createWallFit>[][] = [];
  // Shared rays for the live outline and victory star need at most 42 segments at the sixteen-player test ceiling.
  for (let side = 0; side < MAX_PLAYERS * 2 + 16; side++) {
    const length = 1;
    const wall = new Group();
    const wallFits: ReturnType<typeof createWallFit>[] = [];
    const frameMaterial = frostedMaterial(0x33465b);
    for (const [name, geometry] of [
      ["wall-cap", createWallCap(length)],
      ["wall-foot", createWallFoot(length)],
    ] as const) {
      const beam = new Mesh(geometry, frameMaterial);
      beam.name = name;
      beam.castShadow = true;
      beam.receiveShadow = true;
      beam.add(createFeatureEdges(geometry, 0x00cfff, { width: 4.5, power: 1.7 }));
      wallFits.push(createWallFit(beam));
      wall.add(beam);
    }
    const panelMaterial = frostedMaterial(0x263544);
    panelMaterial.transparent = true;
    panelMaterial.depthWrite = false;
    const panel = new Mesh(new BoxGeometry(length, WALL_PANEL_HEIGHT, 0.72), panelMaterial);
    panel.name = "wall-panel";
    panel.position.set(0, WALL_PANEL_CENTRE_Y, 0);
    panel.receiveShadow = true;
    // Draw translucent faces before neon strokes, avoiding painter-order gaps
    // where adjacent curved panels meet the cap or a paddle silhouette.
    panel.renderOrder = -1;
    panel.castShadow = false;
    panel.add(
      createFeatureEdges(panel.geometry, 0x00cfff, {
        width: 3,
        opacity: 0.65,
        power: 1.5,
      }),
    );
    wallFits.push(createWallFit(panel, 0.36));
    wall.add(panel);
    fits.push(wallFits);
    walls.push(wall);
    root.add(wall);
  }
  for (let index = 0; index < MAX_PLAYERS * 2 + 16; index++) {
    const clippingPlanes = [new Plane(new Vector3(0, 1, 0), -0.012)];
    const material = frostedMaterial(0x33465b);
    material.clippingPlanes = clippingPlanes;
    material.clipShadows = true;
    const post = new Mesh(new BoxGeometry(0.98, POST_HEIGHT, 0.98), material);
    post.name = "corner-post";
    post.castShadow = true;
    post.receiveShadow = true;
    post.add(createFeatureEdges(post.geometry, 0x00cfff, { width: 4, power: 1.7, clippingPlanes }));
    posts.push(post);
    root.add(post);
  }
  let previousPosts: PostReveal | undefined;
  let previous: ArenaGeometry | undefined;
  let previousSeat = humanSeat;
  const update = (
    arena: ArenaGeometry,
    seat = humanSeat,
    cameraAnchor?: { x: number; y: number },
    _dt = 0,
    reveal?: PostReveal,
  ) => {
    if (previous === arena && previousSeat === seat && !cameraAnchor && previousPosts === reveal)
      return;
    previousPosts = reveal;
    previousSeat = seat;
    previous = arena;
    const anchor = cameraAnchor ?? fortress(seat, arena).anchor;
    const edges = polygonEdges(arena.vertices);
    const joins = edges.map((edge, index) => {
      const before = edges[(index + edges.length - 1) % edges.length]!.normal;
      const denominator = Math.max(1e-8, 1 + dot(before, edge.normal));
      return {
        x: -(before.x + edge.normal.x) / denominator,
        y: -(before.y + edge.normal.y) / denominator,
      };
    });
    walls.forEach((wall, index) => {
      const edge = edges[index];
      wall.visible = Boolean(edge);
      if (!edge) return;
      for (const fit of fits[index]!)
        fit(edge.start, edge.end, joins[index]!, joins[(index + 1) % edges.length]!);
      const near = edge.normal.x * anchor.x + edge.normal.y * anchor.y < -0.01;
      wall.name = near ? "near-wall" : "rear-wall";
      const facing =
        (edge.normal.x * anchor.x + edge.normal.y * anchor.y) /
        Math.max(1e-6, Math.hypot(anchor.x, anchor.y));
      const fade = clamp((facing + 0.18) / 0.36, 0, 1);
      const opacity = fade * fade * (3 - 2 * fade);
      wall.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        if (object.name === "wall-panel") {
          const material = object.material as import("three").MeshPhysicalMaterial;
          material.opacity = 0.14 + 0.86 * opacity;
          const glow = object.children[0] as Mesh;
          (glow.material as import("three").ShaderMaterial).uniforms.opacity!.value =
            0.35 + 0.3 * opacity;
        }
      });
    });
    const postVertices = reveal?.vertices ?? arena.vertices;
    const postEdges = polygonEdges(postVertices);
    const corners = postVertices.map((p, index) => {
      const before = postEdges[(index + postEdges.length - 1) % postEdges.length]!.normal;
      const next = postEdges[index]!.normal;
      const turn = -Math.atan2(before.x * next.y - before.y * next.x, dot(before, next));
      const strength = clamp((turn - 0.25) / 0.25, 0, 1);
      const yaw = Math.PI / 4 - Math.atan2(before.y + next.y, before.x + next.x);
      const c = Math.cos(yaw),
        s = Math.sin(yaw);
      const reach =
        0.49 * (Math.abs(before.x * c - before.y * s) + Math.abs(before.x * s + before.y * c));
      const inset = reach / Math.max(0.15, 1 + dot(before, next));
      return {
        point: p,
        index,
        strength,
        yaw,
        x: p.x - (before.x + next.x) * inset,
        z: p.y - (before.y + next.y) * inset,
      };
    });

    posts.forEach((post, index) => {
      const pose = corners[index];
      // Corner angle selects real posts; it must not leave them half-buried
      // after a morph. Every visible post reaches the same raised base.
      const lift = pose && pose.strength > 0.001 ? (reveal?.lift ?? 1) : 0;
      post.visible = lift > 0.001;
      if (!pose) return;
      post.userData.corner = pose.index;
      post.rotation.y = pose.yaw;
      post.position.set(pose.x, (POST_HEIGHT + POST_BASE_HEIGHT) * lift - POST_HEIGHT / 2, pose.z);
    });
  };
  root.userData.update = update;
  update(initial);
  return root;
}
