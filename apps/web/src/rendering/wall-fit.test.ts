import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createWallFit } from "./wall-fit";
import { createFeatureEdges } from "./feature-edges";
import { disposeScene } from "./dispose-scene";
import { createArena } from "../simulation/arena";
import { polygonEdges } from "../simulation/polygon";
import { dot } from "../simulation/vector";

function section() {
  const mesh = new Mesh(
    new BoxGeometry(1, 0.3, 0.96).translate(0, 0, 0.48),
    new MeshBasicMaterial(),
  );
  mesh.add(createFeatureEdges(mesh.geometry, 0x00cfff));
  return mesh;
}

it("uses exactly the same joint endpoints on neighbouring walls, including very short sections and star notches", () => {
  const shapes = [
    createArena(6).vertices,
    createArena(4).vertices,
    [
      { x: -9, y: 9 },
      { x: -8.99999, y: 9 },
      { x: 9, y: 9 },
      { x: 9, y: -9 },
      { x: -9, y: -9 },
    ],
    Array.from({ length: 10 }, (_, i) => ({
      x: Math.cos((-i * Math.PI) / 5) * (i % 2 ? 4.7 : 9.2),
      y: Math.sin((-i * Math.PI) / 5) * (i % 2 ? 4.7 : 9.2),
    })),
  ];
  for (const vertices of shapes) {
    const edges = polygonEdges(vertices);
    const joins = edges.map((edge, i) => {
      const before = edges[(i + edges.length - 1) % edges.length]!.normal,
        d = 1 + dot(before, edge.normal);
      return { x: -(before.x + edge.normal.x) / d, y: -(before.y + edge.normal.y) / d };
    });
    const meshes = edges.map((edge, i) => {
      const mesh = section();
      createWallFit(mesh)(edge.start, edge.end, joins[i]!, joins[(i + 1) % edges.length]!);
      return mesh;
    });
    for (let i = 0; i < meshes.length; i++) {
      const a = meshes[i]!.geometry.getAttribute("position"),
        b = meshes[(i + 1) % meshes.length]!.geometry.getAttribute("position");
      const joint = vertices[(i + 1) % vertices.length]!,
        offset = joins[(i + 1) % joins.length]!;
      for (const depth of [0, 0.96])
        for (const y of [-0.15, 0.15]) {
          const expected = new Vector3(joint.x + offset.x * depth, y, joint.y + offset.y * depth);
          for (const positions of [a, b]) {
            let nearest = Infinity;
            for (let p = 0; p < positions.count; p++)
              nearest = Math.min(
                nearest,
                expected.distanceTo(new Vector3().fromBufferAttribute(positions, p)),
              );
            expect(nearest).toBeLessThan(2e-6);
          }
        }
    }
    meshes.forEach(disposeScene);
  }
});

it("retains GPU buffers and finite world bounds through a collapsing section without truncating its joins", () => {
  const mesh = section(),
    fit = createWallFit(mesh),
    edges = mesh.children[0] as Mesh;
  const position = mesh.geometry.getAttribute("position"),
    starts = edges.geometry.getAttribute("edgeStart");
  for (const distance of [18, 4, 0.01, 1e-6, 0, 10]) {
    fit({ x: 0, y: 0 }, { x: distance, y: 0 }, { x: -1, y: 1 }, { x: 1, y: 1 });
    expect(mesh.geometry.getAttribute("position")).toBe(position);
    expect(edges.geometry.getAttribute("edgeStart")).toBe(starts);
    expect([...position.array].every(Number.isFinite)).toBe(true);
    expect([...mesh.geometry.getAttribute("normal").array].every(Number.isFinite)).toBe(true);
    expect(mesh.geometry.boundingBox!.max.x).toBeCloseTo(distance + 0.96, 5);
    expect(mesh.geometry.boundingBox!.min.x).toBeCloseTo(-0.96, 5);
  }
  disposeScene(mesh);
});

it("keeps neon endpoints on their actual faces and closes the longitudinal trace without internal end creases", () => {
  const mesh = section();
  createWallFit(mesh)({ x: -4, y: 7 }, { x: 9, y: -2 }, { x: -0.4, y: 1 }, { x: 0.8, y: 0.3 });
  const edges = mesh.children[0] as Mesh,
    starts = edges.geometry.getAttribute("edgeStart"),
    ends = edges.geometry.getAttribute("edgeEnd");
  let visible = 0;
  for (let i = 0; i < starts.count; i++) {
    const a = new Vector3().fromBufferAttribute(starts, i),
      b = new Vector3().fromBufferAttribute(ends, i);
    if (a.distanceTo(b) < 1e-6) continue;
    visible++;
    for (const endpoint of [a, b]) {
      const position = mesh.geometry.getAttribute("position");
      let nearest = Infinity;
      for (let p = 0; p < position.count; p++)
        nearest = Math.min(
          nearest,
          endpoint.distanceTo(new Vector3().fromBufferAttribute(position, p)),
        );
      expect(nearest).toBeLessThan(1e-6);
    }
  }
  expect(visible).toBe(4);
  disposeScene(mesh);
});
