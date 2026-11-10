import { Color, ExtrudeGeometry, Mesh, MeshStandardMaterial, Shape } from "three";

export function arcMesh(
  radius: number,
  start: number,
  end: number,
  width: number,
  colour: number,
  height = 0.18,
  intensity = 0.5,
) {
  const shape = new Shape();
  shape.absarc(0, 0, radius + width / 2, start, end, false);
  shape.absarc(0, 0, radius - width / 2, end, start, true);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 32,
  });
  geometry.rotateX(Math.PI / 2);
  const cap = new MeshStandardMaterial({
    color: colour,
    emissive: colour,
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.35,
  });
  const side = new MeshStandardMaterial({
    color: new Color(colour).multiplyScalar(0.35),
    emissive: colour,
    emissiveIntensity: 0.06,
    roughness: 0.35,
    metalness: 0.5,
  });
  const mesh = new Mesh(geometry, [cap, side]);
  mesh.castShadow = height > 0.1;
  mesh.receiveShadow = true;
  return mesh;
}
