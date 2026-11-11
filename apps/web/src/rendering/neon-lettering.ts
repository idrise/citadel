import { ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Path, Shape, Vector2 } from "three";
import { createFeatureEdges } from "./feature-edges";

// Original angular stroke alphabet. Coordinates describe geometry, never a font atlas.
const GLYPHS: Record<string, number[][]> = {
  A: [
    [0, 0, 0.5, 1.4, 1, 0],
    [0.2, 0.5, 0.8, 0.5],
  ],
  B: [
    [0, 0, 0, 1.4, 0.7, 1.4, 1, 1.15, 1, 0.95, 0.7, 0.7, 0, 0.7],
    [0.7, 0.7, 1, 0.45, 1, 0.25, 0.7, 0, 0, 0],
  ],
  C: [[1, 1.4, 0.22, 1.4, 0, 1.18, 0, 0.22, 0.22, 0, 1, 0]],
  D: [[0, 0, 0, 1.4, 0.65, 1.4, 1, 1.05, 1, 0.35, 0.65, 0, 0, 0]],
  E: [
    [1, 1.4, 0, 1.4, 0, 0, 1, 0],
    [0, 0.7, 0.8, 0.7],
  ],
  F: [
    [1, 1.4, 0, 1.4, 0, 0],
    [0, 0.7, 0.8, 0.7],
  ],
  G: [[1, 1.4, 0.22, 1.4, 0, 1.18, 0, 0.22, 0.22, 0, 1, 0, 1, 0.65, 0.55, 0.65]],
  H: [
    [0, 0, 0, 1.4],
    [1, 0, 1, 1.4],
    [0, 0.7, 1, 0.7],
  ],
  I: [
    [0.15, 1.4, 0.85, 1.4],
    [0.5, 1.4, 0.5, 0],
    [0.15, 0, 0.85, 0],
  ],
  J: [[0, 1.4, 1, 1.4, 1, 0.25, 0.75, 0, 0.2, 0, 0, 0.2]],
  K: [
    [0, 0, 0, 1.4],
    [1, 1.4, 0, 0.6, 1, 0],
  ],
  L: [[0, 1.4, 0, 0, 1, 0]],
  M: [[0, 0, 0, 1.4, 0.5, 0.7, 1, 1.4, 1, 0]],
  N: [[0, 0, 0, 1.4, 1, 0, 1, 1.4]],
  O: [[0.22, 0, 0, 0.22, 0, 1.18, 0.22, 1.4, 0.78, 1.4, 1, 1.18, 1, 0.22, 0.78, 0, 0.22, 0]],
  P: [[0, 0, 0, 1.4, 0.75, 1.4, 1, 1.15, 1, 0.95, 0.75, 0.7, 0, 0.7]],
  Q: [
    [0.22, 0, 0, 0.22, 0, 1.18, 0.22, 1.4, 0.78, 1.4, 1, 1.18, 1, 0.22, 0.78, 0, 0.22, 0],
    [0.6, 0.4, 1.1, -0.1],
  ],
  R: [
    [0, 0, 0, 1.4, 0.75, 1.4, 1, 1.15, 1, 0.95, 0.75, 0.7, 0, 0.7],
    [0.55, 0.7, 1, 0],
  ],
  S: [[1, 1.4, 0.2, 1.4, 0, 1.2, 0, 0.9, 0.2, 0.7, 0.8, 0.7, 1, 0.5, 1, 0.2, 0.8, 0, 0, 0]],
  T: [
    [0, 1.4, 1, 1.4],
    [0.5, 1.4, 0.5, 0],
  ],
  U: [[0, 1.4, 0, 0.22, 0.22, 0, 0.78, 0, 1, 0.22, 1, 1.4]],
  V: [[0, 1.4, 0.5, 0, 1, 1.4]],
  W: [[0, 1.4, 0.2, 0, 0.5, 0.65, 0.8, 0, 1, 1.4]],
  X: [
    [0, 0, 1, 1.4],
    [0, 1.4, 1, 0],
  ],
  Y: [
    [0, 1.4, 0.5, 0.7, 1, 1.4],
    [0.5, 0.7, 0.5, 0],
  ],
  Z: [[0, 1.4, 1, 1.4, 0, 0, 1, 0]],
  "0": [[0.22, 0, 0, 0.22, 0, 1.18, 0.22, 1.4, 0.78, 1.4, 1, 1.18, 1, 0.22, 0.78, 0, 0.22, 0]],
  "1": [
    [0.15, 1.1, 0.5, 1.4, 0.5, 0],
    [0.1, 0, 0.9, 0],
  ],
  "2": [[0, 1.2, 0.2, 1.4, 0.8, 1.4, 1, 1.2, 1, 0.95, 0, 0, 1, 0]],
  "3": [
    [0, 1.4, 0.8, 1.4, 1, 1.2, 1, 0.2, 0.8, 0, 0, 0],
    [0.3, 0.7, 1, 0.7],
  ],
  "4": [[0.75, 0, 0.75, 1.4, 0, 0.45, 1, 0.45]],
  "5": [[1, 1.4, 0, 1.4, 0, 0.75, 0.8, 0.75, 1, 0.55, 1, 0.2, 0.8, 0, 0, 0]],
  "6": [[1, 1.4, 0.2, 1.4, 0, 1.2, 0, 0.2, 0.2, 0, 0.8, 0, 1, 0.2, 1, 0.55, 0.8, 0.75, 0, 0.75]],
  "7": [[0, 1.4, 1, 1.4, 0.25, 0]],
  "8": [
    [
      0.2, 0.7, 0, 0.9, 0, 1.2, 0.2, 1.4, 0.8, 1.4, 1, 1.2, 1, 0.9, 0.8, 0.7, 0.2, 0.7, 0, 0.5, 0,
      0.2, 0.2, 0, 0.8, 0, 1, 0.2, 1, 0.5, 0.8, 0.7,
    ],
  ],
  "9": [[0, 0, 0.8, 0, 1, 0.2, 1, 1.2, 0.8, 1.4, 0.2, 1.4, 0, 1.2, 0, 0.9, 0.2, 0.7, 1, 0.7]],
  "+": [
    [0, 0.7, 1, 0.7],
    [0.5, 0.2, 0.5, 1.2],
  ],
  "-": [[0.1, 0.7, 0.9, 0.7]],
};

/** Offset an authored centreline into a thick polygon, with bounded miter joins. */
function stroke(points: number[], x: number): Shape {
  const vertices = Array.from(
    { length: points.length / 2 },
    (_, i) => new Vector2(points[i * 2]! + x, points[i * 2 + 1]!),
  );
  const closed = vertices[0]!.equals(vertices.at(-1)!);
  if (closed) vertices.pop();
  const left: Vector2[] = [],
    right: Vector2[] = [];
  vertices.forEach((p, i) => {
    const before = vertices[i ? i - 1 : closed ? vertices.length - 1 : 0]!,
      after = vertices[i + 1 < vertices.length ? i + 1 : closed ? 0 : i]!;
    const a = p.clone().sub(before).normalize(),
      b = after.clone().sub(p).normalize();
    if (!a.lengthSq()) a.copy(b);
    if (!b.lengthSq()) b.copy(a);
    const normal = new Vector2(-a.y - b.y, a.x + b.x).normalize();
    const extent = Math.min(0.2, 0.08 / Math.max(0.4, normal.dot(new Vector2(-b.y, b.x))));
    left.push(p.clone().addScaledVector(normal, extent));
    right.push(p.clone().addScaledVector(normal, -extent));
  });
  if (!closed) return new Shape([...left, ...right.reverse()]);
  const area = vertices.reduce(
    (sum, p, i) =>
      sum +
      p.x * vertices[(i + 1) % vertices.length]!.y -
      p.y * vertices[(i + 1) % vertices.length]!.x,
    0,
  );
  const shape = new Shape(area > 0 ? right : left);
  shape.holes.push(new Path(area > 0 ? left : right));
  return shape;
}

/** Solid, bevelled, low-polygon lettering using the same neon crease shader as the walls. */
export function createNeonLettering(text: string, height = 1, colour = 0x88e9ff) {
  const shapes: Shape[] = [];
  const scale = height / 1.56,
    advance = 1.38;
  text
    .toUpperCase()
    .split("")
    .forEach((letter, index) => {
      if (letter === " ") return;
      const paths = GLYPHS[letter];
      if (!paths) throw Error(`Unsupported procedural glyph ${letter}`);
      shapes.push(...paths.map((path) => stroke(path, index * advance)));
    });
  const geometry = new ExtrudeGeometry(shapes, {
    depth: 0.28,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 1,
  });
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  geometry.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -0.14 * scale);
  const face = new MeshStandardMaterial({
    color: 0x0b1727,
    metalness: 0.65,
    roughness: 0.3,
    emissive: colour,
    emissiveIntensity: 0.08,
  });
  const mesh = new Mesh(geometry, face);
  mesh.add(
    createFeatureEdges(geometry, colour, {
      width: Math.min(3.3, Math.max(0.8, height * 2.8)),
      power: height < 0.6 ? 1.15 : 1.6,
    }),
  );
  const root = new Group();
  root.name = `neon-text:${text}`;
  root.add(mesh);
  root.userData.text = text;
  return root;
}
