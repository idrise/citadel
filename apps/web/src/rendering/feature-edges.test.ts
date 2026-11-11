import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  PlaneGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { expect, it, vi } from "vite-plus/test";
import { createFeatureEdgeFactory, createFeatureEdges, featureEdgeGeometry } from "./feature-edges";
import { disposeScene } from "./dispose-scene";
import { createWallCap, WALL_HEIGHT, WALL_THICKNESS } from "./wall-section";

it("lights box creases without lighting the triangles across flat faces", () => {
  const box = new BoxGeometry(4, 2, 1);
  const edges = featureEdgeGeometry(box);
  expect(edges.instanceCount).toBe(12);
  expect(edges.boundingBox).toEqual(box.boundingBox);
  expect(edges.boundingBox!.getSize(new Vector3()).x).toBe(4);
  edges.dispose();
  box.dispose();
});

it.each([
  [20, 4],
  [60, 5],
])("selects a %s-degree fold against a 35-degree crease threshold", (degrees, count) => {
  const angle = (degrees * Math.PI) / 180;
  const shape = new BufferGeometry();
  shape.setAttribute(
    "position",
    new Float32BufferAttribute(
      [-1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, -1, 0, 0, 0, -Math.cos(angle), Math.sin(angle)],
      3,
    ),
  );
  const edges = featureEdgeGeometry(shape);
  expect(edges.instanceCount).toBe(count);
  edges.dispose();
  shape.dispose();
});

it("retains an open plane perimeter and suppresses smooth cylinder facets", () => {
  const plane = new PlaneGeometry(2, 2);
  const flat = featureEdgeGeometry(plane);
  expect(flat.instanceCount).toBe(4);
  const cylinder = new CylinderGeometry(1, 1, 2, 24);
  const round = featureEdgeGeometry(cylinder);
  expect(round.instanceCount).toBe(48);
  const starts = round.getAttribute("edgeStart"),
    ends = round.getAttribute("edgeEnd");
  for (let edge = 0; edge < round.instanceCount; edge++)
    expect(starts.getY(edge)).toBe(ends.getY(edge));
  for (const geometry of [plane, flat, cylinder, round]) geometry.dispose();
});

it("updates stroke resolution for each draw, including small reflection targets and display pixel ratio", () => {
  const source = new BoxGeometry();
  const edge = createFeatureEdges(source, 0x00cfff, { width: 4.5 });
  let width = 1200,
    height = 800;
  const renderer = {
    getCurrentViewport: (target: { set: (x: number, y: number, z: number, w: number) => void }) =>
      target.set(0, 0, width, height),
    getPixelRatio: () => 2,
  } as unknown as WebGLRenderer;
  const draw = () =>
    edge.onBeforeRender(
      renderer,
      {} as never,
      {} as never,
      edge.geometry,
      edge.material,
      null as never,
    );
  draw();
  expect(edge.material.uniforms.resolution!.value).toEqual(new Vector2(1200, 800));
  expect(edge.material.uniforms.pixelRatio!.value).toBe(2);
  width = 256;
  height = 256;
  draw();
  expect(edge.material.uniforms.resolution!.value).toEqual(new Vector2(256, 256));
  expect(edge.material.depthTest).toBe(true);
  expect(edge.material.depthWrite).toBe(false);
  disposeScene(edge);
  source.dispose();
});

it("shares stroke resources in factories and releases them exactly once", () => {
  const source = new BoxGeometry();
  const make = createFeatureEdgeFactory(source, 0x00cfff);
  const first = make(),
    second = make();
  expect(first.geometry).toBe(second.geometry);
  expect(first.material).toBe(second.material);
  const geometry = vi.spyOn(first.geometry, "dispose"),
    material = vi.spyOn(first.material, "dispose");
  const root = new Group();
  root.add(first, second);
  disposeScene(root);
  expect(geometry).toHaveBeenCalledOnce();
  expect(material).toHaveBeenCalledOnce();
  source.dispose();
});

it("extrudes the wall cap with a real deck, shoulders, underside and substantial thickness", () => {
  const cap = createWallCap(18);
  cap.computeBoundingBox();
  const bounds = cap.boundingBox!;
  expect(bounds.max.x - bounds.min.x).toBeCloseTo(18);
  expect(bounds.max.z - bounds.min.z).toBeCloseTo(WALL_THICKNESS);
  expect(bounds.min.z).toBeCloseTo(0);
  expect(bounds.max.y).toBeCloseTo(WALL_HEIGHT);
  const edges = featureEdgeGeometry(cap);
  expect(edges.instanceCount).toBe(18);
  edges.dispose();
  cap.dispose();
});
