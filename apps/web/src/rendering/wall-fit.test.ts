import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createWallFit } from "./wall-fit";
import { disposeScene } from "./dispose-scene";
it("mitres adjoining outer edges at exactly the same corner, with no collider-face shift", () => {
  const mesh = new Mesh(
    new BoxGeometry(1, 0.3, 0.96).translate(0, 0, 0.48),
    new MeshBasicMaterial(),
  );
  const fit = createWallFit(mesh);
  fit(18, 1, 1);
  mesh.scale.x = 18;
  const positions = mesh.geometry.getAttribute("position"),
    outer: Vector3[] = [],
    inner: Vector3[] = [];
  mesh.updateMatrixWorld(true);
  for (let i = 0; i < positions.count; i++) {
    const point = new Vector3().fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
    if (point.z > 0.95) outer.push(point);
    if (point.z < 0.001) inner.push(point);
  }
  expect(Math.max(...outer.map((p) => p.x))).toBeCloseTo(9.96);
  expect(Math.min(...outer.map((p) => p.x))).toBeCloseTo(-9.96);
  expect(Math.max(...inner.map((p) => p.x))).toBeCloseTo(9);
  fit(18, 0, 0);
  mesh.geometry.computeBoundingBox();
  expect(mesh.geometry.boundingBox!.max.x).toBeCloseTo(0.5);
  disposeScene(mesh);
});
