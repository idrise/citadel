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
  Vector3,
  type Plane,
} from "three";
import { edgeFragmentShader, edgeVertexShader } from "./feature-edge-shader";

export const FEATURE_ANGLE = 35;
export interface EdgeOptions {
  clippingPlanes?: Plane[];
  width?: number;
  angle?: number;
  opacity?: number;
  power?: number;
}

/** Face-normal discontinuities select creases; coplanar triangle diagonals and smooth facets disappear. */
export function featureEdgeGeometry(source: BufferGeometry, angle = FEATURE_ANGLE) {
  const edges = new EdgesGeometry(source, angle);
  const positions = edges.getAttribute("position");
  const points = Array.from(positions.array);
  edges.dispose();
  const geometry = segmentEdgeGeometry(points);
  if (!source.boundingBox) source.computeBoundingBox();
  geometry.boundingBox = source.boundingBox?.clone() ?? new Box3();
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new Sphere());
  return geometry;
}

/** Explicit pairs avoid view-dependent crease selection on a changing outline. */
export function segmentEdgeGeometry(points: readonly number[]) {
  const starts: number[] = [],
    ends: number[] = [];
  for (let i = 0; i < points.length; i += 6) {
    starts.push(points[i]!, points[i + 1]!, points[i + 2]!);
    ends.push(points[i + 3]!, points[i + 4]!, points[i + 5]!);
  }
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute("edgeStart", new InstancedBufferAttribute(new Float32Array(starts), 3));
  geometry.setAttribute("edgeEnd", new InstancedBufferAttribute(new Float32Array(ends), 3));
  geometry.instanceCount = starts.length / 3;
  geometry.boundingBox = new Box3();
  for (let i = 0; i < points.length; i += 3)
    geometry.boundingBox.expandByPoint(new Vector3(points[i]!, points[i + 1]!, points[i + 2]!));
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new Sphere());
  return geometry;
}

/** One draw for every crease on a solid. Shared factories retain geometry/material ownership in the scene. */
export function createFeatureEdgeFactory(
  source: BufferGeometry,
  colour: number,
  options: EdgeOptions = {},
) {
  return createStrokeFactory(featureEdgeGeometry(source, options.angle), colour, options);
}

export function createStrokeFactory(
  geometry: InstancedBufferGeometry,
  colour: number,
  options: EdgeOptions = {},
) {
  const material = new ShaderMaterial({
    ...(options.clippingPlanes ? { clipping: true, clippingPlanes: options.clippingPlanes } : {}),
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
