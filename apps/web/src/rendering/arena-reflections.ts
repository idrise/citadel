import { Shape, ShapeGeometry } from "three";
import { fortress, SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import { polygonEdges } from "../simulation/polygon";
import { createFloorReflection, createFrostedReflection } from "./floor-reflection";
import { WALL_PANEL_HEIGHT, WALL_PANEL_CENTRE_Y } from "./wall-section";

/** A bounded pool of planar captures follows the same moving boundary as the walls. */
export function createArenaReflections(
  humanSeat: number,
  initial: ArenaGeometry = SQUARE_ARENA,
  mobile = false,
) {
  const floor = createFloorReflection(mobile ? 256 : 512);
  const walls = Array.from({ length: mobile ? 0 : 12 }, () =>
    createFrostedReflection(1, WALL_PANEL_HEIGHT, 256, 0.25),
  );
  walls.forEach((reflection) => {
    reflection.mesh.name = "wall-reflection";
  });
  const reflections = [floor, ...walls],
    meshes = reflections.map((reflection) => reflection.mesh);
  for (const mesh of meshes) {
    const draw = mesh.onBeforeRender.bind(mesh);
    mesh.onBeforeRender = function (...args) {
      const visibility = meshes.map((other) => other.visible);
      for (const other of meshes) if (other !== mesh) other.visible = false;
      try {
        draw(...args);
      } finally {
        meshes.forEach((other, i) => {
          other.visible = visibility[i]!;
        });
      }
    };
  }
  let previous: ArenaGeometry | undefined,
    reduced = false,
    victory = false;
  let visible = meshes.map(() => false);
  const apply = () =>
    meshes.forEach((mesh, index) => {
      mesh.visible = !reduced && visible[index]! && (!victory || index === 0);
    });
  let previousSeat = humanSeat;
  const update = (
    arena: ArenaGeometry,
    seat = humanSeat,
    cameraAnchor?: { x: number; y: number },
  ) => {
    if (previous === arena && previousSeat === seat && !cameraAnchor) return;
    previousSeat = seat;
    if (previous !== arena) {
      const shape = new Shape();
      arena.vertices.forEach((p, i) =>
        i === 0 ? shape.moveTo(p.x, -p.y) : shape.lineTo(p.x, -p.y),
      );
      shape.closePath();
      floor.mesh.geometry.dispose();
      floor.mesh.geometry = new ShapeGeometry(shape);
    }
    previous = arena;
    const anchor = cameraAnchor ?? fortress(seat, arena).anchor,
      edges = polygonEdges(arena.vertices);
    visible = [
      true,
      ...walls.map((reflection, index) => {
        const edge = edges[index];
        if (!edge) return false;
        const dx = edge.end.x - edge.start.x,
          dz = edge.end.y - edge.start.y;
        reflection.mesh.scale.x = Math.hypot(dx, dz);
        reflection.mesh.position.set(
          (edge.start.x + edge.end.x) / 2 + edge.normal.x * 0.008,
          WALL_PANEL_CENTRE_Y,
          (edge.start.y + edge.end.y) / 2 + edge.normal.y * 0.008,
        );
        reflection.mesh.rotation.y = Math.atan2(-dz, dx) + Math.PI;
        return edge.normal.x * anchor.x + edge.normal.y * anchor.y > 0.01;
      }),
    ];
    apply();
  };
  update(initial);
  return {
    meshes,
    update,
    setFloorOnly(value: boolean) {
      victory = value;
      apply();
    },
    setReduced(value: boolean) {
      reduced = value;
      apply();
    },
    dispose() {
      for (const reflection of reflections) reflection.dispose();
    },
  };
}
