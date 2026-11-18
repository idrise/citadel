import { Box3, Mesh, ShaderMaterial, Vector3, type PerspectiveCamera } from "three";
import { createNeonLettering } from "./neon-lettering";
/** A quiet fixed-size foreground label, inside the viewport's existing safe-area bounds. */
export function createReleaseVersion(camera: PerspectiveCamera, version: string) {
  const root = createNeonLettering(`V${version}`, 12, 0xa9bac8);
  root.name = "release-version";
  root.traverse((node) => {
    if (
      node instanceof Mesh &&
      node.material instanceof ShaderMaterial &&
      node.material.name === "NeonFeatureEdges"
    ) {
      node.material.uniforms.strokeWidth!.value = 0.65;
      node.material.uniforms.neonColour!.value.multiplyScalar(0.55);
    }
  });
  camera.add(root);
  const size = new Box3().setFromObject(root).getSize(new Vector3());
  return {
    update(width: number, height: number) {
      const depth = 17,
        unit = (2 * Math.tan((camera.fov * Math.PI) / 360) * depth) / Math.max(1, height);
      root.scale.setScalar(unit);
      root.position.set(
        (width / 2 - 18 - size.x / 2) * unit,
        (-height / 2 + 18 + size.y / 2) * unit,
        -depth,
      );
    },
  };
}
