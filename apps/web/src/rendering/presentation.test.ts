import { Box3, MeshPhysicalMaterial, Vector3 } from "three";
import { expect, it, vi } from "vite-plus/test";
import { FORTRESSES } from "../simulation/arena";
import { createMatch } from "../simulation/match";
import { createArenaCamera, fitArenaCamera } from "./camera";
import { createFloorReflection } from "./floor-reflection";
import { frostedMaterial } from "./frosted-material";
import { createArenaView } from "./arena-view";
import { disposeScene } from "./dispose-scene";
import { createPaddleTrace } from "./paddle-trace";

it.each([0, 1, 2, 3])(
  "puts the camera behind human seat %s with that fortress at the near edge",
  (seat) => {
    const camera = createArenaCamera(seat);
    const anchor = FORTRESSES[seat]!.anchor;
    expect(Math.sign(camera.position.x)).toBe(Math.sign(anchor.x));
    expect(Math.sign(camera.position.z)).toBe(Math.sign(anchor.y));
    fitArenaCamera(camera, new Box3(new Vector3(-10, -3, -10), new Vector3(10, 1.6, 10)), 1.8);
    const projected = FORTRESSES.map((fortress) =>
      new Vector3(fortress.anchor.x, 0, fortress.anchor.y).project(camera),
    );
    expect(projected[seat]!.x).toBeCloseTo(0);
    expect(projected[seat]!.y).toBe(Math.min(...projected.map((point) => point.y)));
  },
);

it("uses dark, rough physical metal rather than a bright diffuse face", () => {
  const material = frostedMaterial();
  expect(material).toBeInstanceOf(MeshPhysicalMaterial);
  expect(material.metalness).toBeGreaterThan(0.8);
  expect(material.roughness).toBeGreaterThan(0.25);
  expect(material.roughness).toBeLessThan(0.5);
  expect(Math.max(material.color.r, material.color.g, material.color.b)).toBeLessThan(0.1);
  material.dispose();
});

it("releases the reflection render target and scene-owned geometry without double disposing materials", () => {
  const reflection = createFloorReflection();
  const target = vi.spyOn(reflection.mesh.getRenderTarget(), "dispose");
  const material = Array.isArray(reflection.mesh.material)
    ? reflection.mesh.material[0]!
    : reflection.mesh.material;
  const release = vi.spyOn(material, "dispose");
  reflection.dispose();
  expect(target).toHaveBeenCalledTimes(1);
  expect(release).not.toHaveBeenCalled();
  disposeScene(reflection.mesh);
  expect(release).toHaveBeenCalledTimes(1);
});

it("renders a growing physical piece at its current collider position and radius", () => {
  const state = createMatch();
  const view = createArenaView();
  const body = state.players[0]!.pieces[0]!;
  body.radius *= 1.2;
  body.position = { x: -7.2, y: 7.3 };
  view.update(state, 0, { humanSeat: 0, preview: false, reducedEffects: true });
  const piece = view.root.getObjectByName("health-0-0")!;
  expect(piece.position.x).toBe(body.position.x);
  expect(piece.position.z).toBe(body.position.y);
  const size = new Box3().setFromObject(piece).getSize(new Vector3());
  expect(size.x).toBeCloseTo(body.radius * 2);
  view.dispose();
  disposeScene(view.root);
});

it("traces the bat's full height with physical HDR neon geometry", () => {
  const trace = createPaddleTrace(2.2, 0.48, 0.28, 0.85, 0x00d9ff);
  const bounds = new Box3().setFromObject(trace);
  expect(bounds.max.y).toBeGreaterThan(0);
  expect(bounds.min.y).toBeLessThan(-0.85);
  expect(bounds.max.y - bounds.min.y).toBeLessThan(0.95);
  trace.traverse((part) => {
    if (!("material" in part)) return;
    const material = (part as import("three").Mesh).material as import("three").MeshBasicMaterial;
    expect(material.toneMapped).toBe(false);
    expect(material.color.b).toBeGreaterThan(1);
  });
  disposeScene(trace);
});
