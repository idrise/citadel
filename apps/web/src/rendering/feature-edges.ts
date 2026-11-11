import {
  Box3,
  BufferGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector4,
} from "three";
import { edgeFragmentShader, edgeVertexShader } from "./feature-edge-shader";

export const FEATURE_ANGLE = 35;
export interface EdgeOptions {
  width?: number;
  angle?: number;
  opacity?: number;
  power?: number;
}

/** Face-normal discontinuities select creases; coplanar triangle diagonals and smooth facets disappear. */
export function featureEdgeGeometry(source: BufferGeometry, angle = FEATURE_ANGLE) {
  const edges = new EdgesGeometry(source, angle);
  const positions = edges.getAttribute("position");
  const starts: number[] = [],
    ends: number[] = [];
  for (let index = 0; index < positions.count; index += 2) {
    starts.push(positions.getX(index), positions.getY(index), positions.getZ(index));
    ends.push(positions.getX(index + 1), positions.getY(index + 1), positions.getZ(index + 1));
  }
  edges.dispose();
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute("edgeStart", new InstancedBufferAttribute(new Float32Array(starts), 3));
  geometry.setAttribute("edgeEnd", new InstancedBufferAttribute(new Float32Array(ends), 3));
  geometry.instanceCount = starts.length / 3;
  if (!source.boundingBox) source.computeBoundingBox();
  geometry.boundingBox = source.boundingBox?.clone() ?? new Box3();
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new Sphere());
  return geometry;
}

/** One draw for every crease on a solid. Shared factories retain geometry/material ownership in the scene. */
export function createFeatureEdgeFactory(
  source: BufferGeometry,
  colour: number,
  options: EdgeOptions = {},
) {
  const geometry = featureEdgeGeometry(source, options.angle);
  const material = new ShaderMaterial({
    name: "NeonFeatureEdges",
    uniforms: {
      resolution: { value: new Vector2(1, 1) },
      strokeWidth: { value: options.width ?? 4 },
      pixelRatio: { value: 1 },
      neonColour: { value: new Color(colour).multiplyScalar(options.power ?? 3) },
      opacity: { value: options.opacity ?? 1 },
    },
    vertexShader: edgeVertexShader,
    fragmentShader: edgeFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
  });
  const viewport = new Vector4();
  return () => {
    const mesh = new Mesh(geometry, material);
    mesh.name = "feature-edges";
    mesh.onBeforeRender = (renderer) => {
      renderer.getCurrentViewport(viewport);
      (material.uniforms.resolution!.value as Vector2).set(
        Math.max(1, viewport.z),
        Math.max(1, viewport.w),
      );
      material.uniforms.pixelRatio!.value = renderer.getPixelRatio();
      material.uniformsNeedUpdate = true;
    };
    return mesh;
  };
}

export function createFeatureEdges(
  source: BufferGeometry,
  colour: number,
  options: EdgeOptions = {},
) {
  return createFeatureEdgeFactory(source, colour, options)();
}
