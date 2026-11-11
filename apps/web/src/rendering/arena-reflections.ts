import { ARENA, fortress } from "../simulation/arena";
import { createFloorReflection, createFrostedReflection } from "./floor-reflection";
import { WALL_HEIGHT } from "./walls";

/** Capture floor and visible inner wall faces without mirrors recursively rendering each other. */
export function createArenaReflections(humanSeat: number) {
  const reflections = [createFloorReflection()];
  const anchor = fortress(humanSeat).anchor;
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2;
    const x = Math.sin(angle),
      z = Math.cos(angle);
    if (x * anchor.x + z * anchor.y >= -0.01) continue;
    const reflection = createFrostedReflection(ARENA.halfSize * 2, WALL_HEIGHT, 256, 0.25);
    reflection.mesh.name = "wall-reflection";
    reflection.mesh.position.set(
      x * (ARENA.halfSize - 0.008),
      WALL_HEIGHT / 2,
      z * (ARENA.halfSize - 0.008),
    );
    reflection.mesh.rotation.y = angle + Math.PI;
    reflections.push(reflection);
  }
  const meshes = reflections.map((reflection) => reflection.mesh);
  for (const mesh of meshes) {
    const draw = mesh.onBeforeRender.bind(mesh);
    mesh.onBeforeRender = function (...args) {
      const visibility = meshes.map((other) => other.visible);
      for (const other of meshes) if (other !== mesh) other.visible = false;
      try {
        draw(...args);
      } finally {
        meshes.forEach((other, index) => {
          other.visible = visibility[index]!;
        });
      }
    };
  }
  return {
    meshes,
    setReduced(reduced: boolean) {
      for (const mesh of meshes) mesh.visible = !reduced;
    },
    dispose() {
      for (const reflection of reflections) reflection.dispose();
    },
  };
}
