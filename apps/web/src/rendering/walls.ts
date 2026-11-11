import { BoxGeometry, Group, Mesh } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { ARENA, fortress } from "../simulation/arena";
import { neonMaterial } from "./neon";
import { frostedMaterial } from "./frosted-material";

export const WALL_HEIGHT = 2;
export const WALL_THICKNESS = 0.5;
export const WALL_CENTRE = ARENA.halfSize + WALL_THICKNESS / 2;

/** Four solid, bevelled walls. Near glass faces preserve visibility through their real height. */
export function createArenaWalls(humanSeat: number): Group {
  const root = new Group();
  root.name = "arena-walls";
  const anchor = fortress(humanSeat).anchor;
  const neon = neonMaterial(0x00cfff, 3.4);
  const nearNeon = neon.clone();
  nearNeon.transparent = true;
  nearNeon.opacity = 0.55;
  nearNeon.depthWrite = false;
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2;
    const x = Math.sin(angle),
      z = Math.cos(angle);
    const near = x * anchor.x + z * anchor.y > 0.01;
    const material = frostedMaterial(0x3b5368);
    if (near) {
      material.transparent = true;
      material.opacity = 0.2;
      material.depthWrite = false;
    }
    const wall = new Mesh(
      new RoundedBoxGeometry(WALL_CENTRE * 2, WALL_HEIGHT, WALL_THICKNESS, 2, 0.06),
      material,
    );
    wall.name = near ? "near-wall" : "rear-wall";
    wall.position.set(x * WALL_CENTRE, WALL_HEIGHT / 2, z * WALL_CENTRE);
    wall.rotation.y = angle;
    wall.receiveShadow = true;
    wall.castShadow = !near;
    root.add(wall);
    for (const height of [0.06, WALL_HEIGHT]) {
      const edge = new Mesh(
        new BoxGeometry(ARENA.halfSize * 2 + 0.05, 0.035, 0.035),
        near ? nearNeon : neon,
      );
      edge.position.set(x * (ARENA.halfSize + 0.025), height, z * (ARENA.halfSize + 0.025));
      edge.rotation.y = angle;
      root.add(edge);
    }
    for (let joint = -2; joint <= 2; joint++) {
      const upright = new Mesh(new BoxGeometry(0.024, WALL_HEIGHT, 0.024), near ? nearNeon : neon);
      upright.name = "wall-seam";
      const along = (joint * WALL_CENTRE) / 3;
      upright.position.set(
        x * (ARENA.halfSize - 0.012) + Math.cos(angle) * along,
        WALL_HEIGHT / 2,
        z * (ARENA.halfSize - 0.012) - Math.sin(angle) * along,
      );
      upright.rotation.y = angle;
      root.add(upright);
    }
  }
  for (const x of [-1, 1])
    for (const z of [-1, 1]) {
      const near = x * anchor.x + z * anchor.y > 0;
      const material = frostedMaterial(0x43576a);
      if (near) {
        material.transparent = true;
        material.opacity = 0.2;
        material.depthWrite = false;
      }
      const post = new Mesh(new RoundedBoxGeometry(0.62, 2.25, 0.62, 2, 0.06), material);
      post.position.set(x * WALL_CENTRE, 1.125, z * WALL_CENTRE);
      post.name = "corner-post";
      root.add(post);
      const light = new Mesh(new BoxGeometry(0.055, 2.25, 0.055), near ? nearNeon : neon);
      light.position.copy(post.position);
      root.add(light);
    }
  return root;
}
