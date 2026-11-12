import { Group, Mesh } from "three";
import { createFeatureEdges } from "./feature-edges";
import { frostedMaterial } from "./frosted-material";
import { createArenaWalls } from "./walls";
import { SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import { hullGeometry, replaceHull } from "./hull";

/** The solid plinth, floor and wall colliders share one polygon. */
export function createArenaBase(humanSeat = 0, initial: ArenaGeometry = SQUARE_ARENA): Group {
  const root = new Group();
  const specs = [
    { margin: 0.55, top: -0.17, depth: 2.1, colour: 0x18263c },
    { margin: 0.85, top: -2.28, depth: 0.45, colour: 0x0d1524 },
    { margin: 0, top: 0.01, depth: 0.12, colour: 0x1c2734 },
  ];
  const slabs = specs.map((spec) => {
    const mesh = new Mesh(
      hullGeometry(initial.vertices, spec.margin, spec.top, spec.depth),
      frostedMaterial(spec.colour),
    );
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    if (spec.margin) mesh.add(createFeatureEdges(mesh.geometry, 0x009dd9, { width: 3, power: 1 }));
    root.add(mesh);
    return mesh;
  });
  const walls = createArenaWalls(humanSeat, initial);
  root.add(walls);
  let previous = initial;
  root.userData.update = (
    arena: ArenaGeometry,
    seat = humanSeat,
    anchor?: { x: number; y: number },
  ) => {
    if (previous !== arena) {
      previous = arena;
      slabs.forEach((mesh, i) => {
        const spec = specs[i]!;
        replaceHull(mesh, hullGeometry(arena.vertices, spec.margin, spec.top, spec.depth));
      });
    }
    (
      walls.userData.update as (
        arena: ArenaGeometry,
        seat: number,
        anchor?: { x: number; y: number },
      ) => void
    )(arena, seat, anchor);
  };
  return root;
}
