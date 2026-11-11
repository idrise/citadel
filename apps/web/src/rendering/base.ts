import { BoxGeometry, ExtrudeGeometry, Group, Mesh, Shape } from "three";
import { frostedMaterial } from "./frosted-material";
import { createArenaWalls } from "./walls";
import { ARENA } from "../simulation/arena";

function slab(halfSize: number, depth: number, colour: number) {
  const outline = new Shape();
  outline.moveTo(-halfSize, -halfSize);
  outline.lineTo(halfSize, -halfSize);
  outline.lineTo(halfSize, halfSize);
  outline.lineTo(-halfSize, halfSize);
  outline.closePath();
  const geometry = new ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.1,
    bevelThickness: 0.1,
    bevelSegments: 2,
    steps: 1,
  });
  geometry.rotateX(Math.PI / 2);
  const mesh = new Mesh(geometry, frostedMaterial(colour));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

/** A deep structural base supports full-height perimeter walls. */
export function createArenaBase(humanSeat = 0): Group {
  const root = new Group();
  const body = slab(ARENA.halfSize + 0.55, 2.1, 0x18263c);
  body.position.y = -0.17;
  root.add(body);
  const foot = slab(ARENA.halfSize + 0.85, 0.45, 0x0d1524);
  foot.position.y = -2.28;
  root.add(foot);
  const surface = new Mesh(
    new BoxGeometry(ARENA.halfSize * 2, 0.12, ARENA.halfSize * 2),
    frostedMaterial(0x1c2734),
  );
  surface.position.y = -0.05;
  surface.receiveShadow = true;
  root.add(surface);
  root.add(createArenaWalls(humanSeat));
  return root;
}
