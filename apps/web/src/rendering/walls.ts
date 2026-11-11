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
  // The fixed pool also accepts retargets from earlier builds/saved fixtures.
  for (let side = 0; side < 12; side++) {
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
  for (let index = 0; index < 12; index++) {
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
  let previous: ArenaGeometry | undefined;
  const update = (arena: ArenaGeometry) => {
    if (previous === arena) return;
    previous = arena;
    const anchor = fortress(humanSeat, arena).anchor;
    const edges = polygonEdges(arena.vertices);
    const turns = edges.map((edge, index) =>
      Math.acos(
        clamp(dot(edges[(index + edges.length - 1) % edges.length]!.normal, edge.normal), -1, 1),
      ),
    );
    walls.forEach((wall, index) => {
      const edge = edges[index];
      wall.visible = Boolean(edge);
      if (!edge) return;
      const dx = edge.end.x - edge.start.x,
        dz = edge.end.y - edge.start.y;
      const length = Math.hypot(dx, dz);
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
    posts.forEach((post, index) => {
      const p = arena.vertices[index];
      const strength = p ? clamp((turns[index]! - 0.08) / 0.45, 0, 1) : 0;
      post.visible = strength > 0.001;
      if (p) {
        const previous = edges[(index + edges.length - 1) % edges.length]!.normal,
          next = edges[index]!.normal;
        const inset = 0.48 / (1 + dot(previous, next));
        post.position.set(
          p.x - (previous.x + next.x) * inset,
          ((WALL_HEIGHT + 0.12) * strength) / 2,
          p.y - (previous.y + next.y) * inset,
        );
        post.scale.setScalar(strength);
      }
    });
  };
  root.userData.update = update;
  update(initial);
  return root;
}
