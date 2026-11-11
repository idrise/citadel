import { CatmullRomCurve3, Group, Mesh, TubeGeometry, Vector3 } from "three";
import { neonMaterial } from "./neon";

/** Trace both rims and the end faces so the curved bat reads as a solid volume. */
export function createPaddleTrace(
  radius: number,
  halfAngle: number,
  width: number,
  height: number,
  colour: number,
) {
  const root = new Group();
  const material = neonMaterial(colour, 3.5);
  const tube = (points: Vector3[], segments: number) =>
    root.add(
      new Mesh(new TubeGeometry(new CatmullRomCurve3(points), segments, 0.014, 5, false), material),
    );
  // Sit just beyond the bevel rather than burying the neon core inside its opaque face.
  const radii = [radius - width / 2 - 0.028, radius + width / 2 + 0.028];
  const levels = [0.035, -height - 0.035];
  for (const y of levels)
    for (const r of radii) {
      tube(
        Array.from({ length: 33 }, (_, index) => {
          const angle = -halfAngle - 0.009 + (index / 32) * (halfAngle + 0.009) * 2;
          return new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
        }),
        32,
      );
    }
  for (const angle of [-halfAngle - 0.009, halfAngle + 0.009]) {
    for (const r of radii)
      tube(
        levels.map((y) => new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r)),
        1,
      );
    for (const y of levels)
      tube(
        radii.map((r) => new Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r)),
        1,
      );
  }
  return root;
}
