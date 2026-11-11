import { BoxGeometry, Group, Mesh } from "three";
import { ARENA, fortress } from "../simulation/arena";
import { createFeatureEdges } from "./feature-edges";
import { frostedMaterial } from "./frosted-material";
import {
  createWallCap,
  createWallFoot,
  WALL_CENTRE,
  WALL_HEIGHT,
  WALL_PANEL_CENTRE_Y,
  WALL_PANEL_HEIGHT,
} from "./wall-section";
export { WALL_CENTRE, WALL_HEIGHT, WALL_THICKNESS } from "./wall-section";

/** Thick opaque caps/feet and outer supports frame recessed faces; near glass keeps play visible. */
export function createArenaWalls(humanSeat: number): Group {
  const root = new Group();
  root.name = "arena-walls";
  const anchor = fortress(humanSeat).anchor;
  const length = ARENA.halfSize * 2;
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2;
    const x = Math.sin(angle),
      z = Math.cos(angle);
    const near = x * anchor.x + z * anchor.y > 0.01;
    const wall = new Group();
    wall.name = near ? "near-wall" : "rear-wall";
    wall.position.set(x * ARENA.halfSize, 0, z * ARENA.halfSize);
    wall.rotation.y = angle;
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
    root.add(wall);
  }
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const post = new Mesh(
        new BoxGeometry(0.98, WALL_HEIGHT + 0.12, 0.98),
        frostedMaterial(0x33465b),
      );
      post.position.set(x * WALL_CENTRE, (WALL_HEIGHT + 0.12) / 2, z * WALL_CENTRE);
      post.name = "corner-post";
      post.castShadow = true;
      post.receiveShadow = true;
      post.add(createFeatureEdges(post.geometry, 0x00cfff, { width: 4, power: 1.7 }));
      root.add(post);
    }
  return root;
}
