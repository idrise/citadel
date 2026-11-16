import { Box3, CylinderGeometry, Group, Mesh, MeshPhysicalMaterial, Vector3 } from "three";
import { expect, it, vi } from "vite-plus/test";
import { ARENA } from "../simulation/arena";
import { disposeScene } from "./dispose-scene";
import { createHealthFactory } from "./health-piece";
import { featureEdgeGeometry } from "./feature-edges";

it("combines the original cap and base without changing their shape or crease count", () => {
  const cap = new CylinderGeometry(ARENA.pieceRadius * 0.78, ARENA.pieceRadius * 0.94, 0.13, 24);
  const base = new CylinderGeometry(ARENA.pieceRadius, ARENA.pieceRadius, 0.08, 24);
  cap.translate(0, 1.105, 0);
  base.translate(0, 0.05, 0);
  const capEdges = featureEdgeGeometry(cap),
    baseEdges = featureEdgeGeometry(base);
  const piece = createHealthFactory(0xff4422)();
  const trim = piece.children[1] as Mesh;
  const positions = trim.geometry.getAttribute("position");
  expect(piece.children).toHaveLength(2);
  expect(positions.count).toBe(
    cap.getAttribute("position").count + base.getAttribute("position").count,
  );
  for (const [source, offset] of [
    [cap, 0],
    [base, cap.getAttribute("position").count],
  ] as const) {
    const original = source.getAttribute("position");
    for (let i = 0; i < original.count; i++)
      expect([
        positions.getX(i + offset),
        positions.getY(i + offset),
        positions.getZ(i + offset),
      ]).toEqual([original.getX(i), original.getY(i), original.getZ(i)]);
  }
  const outline = trim.children[0] as Mesh;
  expect((outline.geometry as import("three").InstancedBufferGeometry).instanceCount).toBe(
    capEdges.instanceCount + baseEdges.instanceCount,
  );
  const bounds = new Box3().setFromObject(piece).getSize(new Vector3());
  expect(bounds.y).toBeCloseTo(1.16);
  disposeScene(piece);
  cap.dispose();
  base.dispose();
  capEdges.dispose();
  baseEdges.dispose();
});

it("shares trim resources across pieces and disposes each once", () => {
  const make = createHealthFactory(0xff4422),
    first = make(),
    second = make();
  const a = first.children[1] as Mesh,
    b = second.children[1] as Mesh;
  expect(a.geometry).toBe(b.geometry);
  expect(a.material).toBe(b.material);
  expect((a.children[0] as Mesh).geometry).toBe((b.children[0] as Mesh).geometry);
  const disposed = vi.spyOn(a.geometry, "dispose");
  const group = new Group();
  group.add(first, second);
  disposeScene(group);
  expect(disposed).toHaveBeenCalledOnce();
});

it("keeps trim matte while retaining the body's metal and neon outline", () => {
  const piece = createHealthFactory(0xff4422)();
  const body = piece.children[0] as Mesh,
    trim = piece.children[1] as Mesh;
  const material = trim.material as MeshPhysicalMaterial;
  expect(material.roughness).toBeGreaterThanOrEqual(0.9);
  expect(material.metalness).toBeLessThanOrEqual(0.2);
  expect(material.clearcoat).toBe(0);
  expect((body.material as MeshPhysicalMaterial).metalness).toBeGreaterThan(0.8);
  expect(trim.children[0]!.name).toBe("feature-edges");
  disposeScene(piece);
});
