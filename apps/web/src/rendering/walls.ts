import { MAX_PLAYERS } from "../simulation/player-count";
import { createCornerMotion } from "./corner-motion";
import { BoxGeometry, Group, Mesh } from "three";
import { fortress, SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import { clamp, dot } from "../simulation/vector";
import { createWallFit } from "./wall-fit";
import { polygonEdges } from "../simulation/polygon";
import { createFeatureEdges } from "./feature-edges";
import { frostedMaterial } from "./frosted-material";
import {
  createWallCap,
  createWallFoot,
  WALL_HEIGHT,
  WALL_PANEL_CENTRE_Y,
  WALL_PANEL_HEIGHT,
} from "./wall-section";
export { WALL_CENTRE, WALL_HEIGHT, WALL_THICKNESS } from "./wall-section";

/** Thick opaque caps/feet and outer supports frame recessed faces; near glass keeps play visible. */
export function createArenaWalls(humanSeat: number, initial: ArenaGeometry = SQUARE_ARENA): Group {
  const root = new Group();
  root.name = "arena-walls";
  const walls: Group[] = [];
  const posts: Mesh[] = [];
  const fits: ((length: number, start: number, end: number) => void)[][] = [];
  // Shared rays for the live outline and victory star need at most 42 segments at the sixteen-player test ceiling.
  for (let side = 0; side < MAX_PLAYERS * 2 + 16; side++) {
    const length = 1,
      near = false;
    const wall = new Group();
    const wallFits: ((length: number, start: number, end: number) => void)[] = [];
    const frameMaterial = frostedMaterial(0x33465b);
    for (const [name, geometry] of [
      ["wall-cap", createWallCap(length)],
      ["wall-foot", createWallFoot(length)],
    ] as const) {
      const beam = new Mesh(geometry, frameMaterial);
      beam.name = name;
      beam.castShadow = true;
      beam.receiveShadow = true;
      beam.add(createFeatureEdges(geometry, 0x00cfff, { width: near ? 3.5 : 4.5, power: 1.7 }));
      wallFits.push(createWallFit(beam));
      wall.add(beam);
    }
    const panelMaterial = frostedMaterial(0x263544);
    if (near) {
      panelMaterial.transparent = true;
      panelMaterial.opacity = 0.14;
      panelMaterial.depthWrite = false;
    }
    const panel = new Mesh(new BoxGeometry(length, WALL_PANEL_HEIGHT, 0.72), panelMaterial);
    panel.name = "wall-panel";
    panel.position.set(0, WALL_PANEL_CENTRE_Y, 0.36);
    panel.receiveShadow = true;
    panel.castShadow = !near;
    panel.add(
      createFeatureEdges(panel.geometry, 0x00cfff, {
        width: 3,
        opacity: near ? 0.35 : 0.65,
        power: 1.5,
      }),
    );
    wallFits.push(createWallFit(panel, 0.36));
    wall.add(panel);
    for (const joint of [-1, 0, 1]) {
      const support = new Mesh(new BoxGeometry(0.22, 1.56, 0.24), frameMaterial);
      support.name = "wall-support";
      support.position.set((joint * length) / 4, WALL_PANEL_CENTRE_Y, 0.84);
      support.castShadow = true;
      support.receiveShadow = true;
      support.add(
        createFeatureEdges(support.geometry, 0x00cfff, { width: 3, opacity: 0.65, power: 2 }),
      );
      wall.add(support);
    }
    fits.push(wallFits);
    walls.push(wall);
    root.add(wall);
  }
  for (let index = 0; index < MAX_PLAYERS * 2 + 16; index++) {
    const post = new Mesh(
      new BoxGeometry(0.98, WALL_HEIGHT + 0.12, 0.98),
      frostedMaterial(0x33465b),
    );
    post.name = "corner-post";
    post.castShadow = true;
    post.receiveShadow = true;
    post.add(createFeatureEdges(post.geometry, 0x00cfff, { width: 4, power: 1.7 }));
    posts.push(post);
    root.add(post);
  }
  const cornerMotion = createCornerMotion();
  let settled = true;
  let previous: ArenaGeometry | undefined;
  let previousSeat = humanSeat;
  const update = (
    arena: ArenaGeometry,
    seat = humanSeat,
    cameraAnchor?: { x: number; y: number },
    dt = 0,
  ) => {
    if (previous === arena && previousSeat === seat && !cameraAnchor && settled) return;
    previousSeat = seat;
    previous = arena;
    const anchor = cameraAnchor ?? fortress(seat, arena).anchor;
    const edges = polygonEdges(arena.vertices);
    const turns = edges.map((edge, index) => {
      const previous = edges[(index + edges.length - 1) % edges.length]!.normal;
      return -Math.atan2(
        previous.x * edge.normal.y - previous.y * edge.normal.x,
        dot(previous, edge.normal),
      );
    });
    walls.forEach((wall, index) => {
      const edge = edges[index];
      wall.visible = Boolean(edge);
      if (!edge) return;
      const dx = edge.end.x - edge.start.x,
        dz = edge.end.y - edge.start.y;
      const length = Math.hypot(dx, dz);
      wall.visible = length > 0.02;
      if (!wall.visible) return;
      wall.position.set((edge.start.x + edge.end.x) / 2, 0, (edge.start.y + edge.end.y) / 2);
      wall.rotation.y = Math.atan2(-dz, dx);
      wall.scale.x = length;
      for (const fit of fits[index]!)
        fit(length, Math.tan(turns[index]! / 2), Math.tan(turns[(index + 1) % edges.length]! / 2));
      const near = edge.normal.x * anchor.x + edge.normal.y * anchor.y < -0.01;
      wall.name = near ? "near-wall" : "rear-wall";
      wall.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        if (object.name === "wall-support") object.scale.x = 1 / length;
        if (object.name === "wall-panel") {
          const material = object.material as import("three").MeshPhysicalMaterial;
          material.transparent = near;
          material.opacity = near ? 0.14 : 1;
          material.depthWrite = !near;
          object.castShadow = !near;
          const glow = object.children[0] as Mesh;
          (glow.material as import("three").ShaderMaterial).uniforms.opacity!.value = near
            ? 0.35
            : 0.65;
        }
      });
    });
    const corners = arena.vertices.map((p, index) => {
      const strength = clamp((turns[index]! - 0.08) / 0.45, 0, 1);
      const before = edges[(index + edges.length - 1) % edges.length]!.normal;
      const next = edges[index]!.normal;
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
    const poses = cornerMotion.update(corners, dt);
    settled = poses.every((pose) => Math.abs(pose.growth - pose.target) < 0.001);
    posts.forEach((post, index) => {
      const pose = poses[index];
      post.visible = Boolean(pose && pose.growth > 0.001);
      if (!pose) return;
      post.userData.corner = pose.index;
      post.rotation.y = pose.yaw;
      post.position.set(pose.x, ((WALL_HEIGHT + 0.12) * pose.growth) / 2, pose.z);
      post.scale.set(pose.growth, pose.growth, pose.growth);
    });
  };
  root.userData.update = update;
  update(initial);
  return root;
}
