import { Mesh } from "three";
import { ARENA } from "../simulation/arena";
import { arcMesh } from "./arc";
import { createFeatureEdges } from "./feature-edges";

/** Rebuild only on a round/roster width change. Body and glow share the physical arc extent. */
export function resizePaddle(
  paddle: Mesh,
  halfAngle: number,
  colour: number,
  radius: number = ARENA.batRadius,
) {
  if (paddle.userData.batHalfAngle === halfAngle && paddle.userData.batRadius === radius) return;
  const shape = arcMesh(radius, -halfAngle, halfAngle, ARENA.paddleThickness, colour, 0.85, 1.5);
  shape.geometry.translate(ARENA.railRadius - radius, 0, 0);
  paddle.geometry.dispose();
  for (const child of paddle.children.slice())
    if (child instanceof Mesh) {
      paddle.remove(child);
      child.geometry.dispose();
      (Array.isArray(child.material) ? child.material : [child.material]).forEach((material) =>
        material.dispose(),
      );
    }
  paddle.geometry = shape.geometry;
  (Array.isArray(shape.material) ? shape.material : [shape.material]).forEach((material) =>
    material.dispose(),
  );
  paddle.add(createFeatureEdges(paddle.geometry, colour, { width: 4.5, power: 2 }));
  paddle.userData.batHalfAngle = halfAngle;
  paddle.userData.batRadius = radius;
}
