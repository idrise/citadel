import { Box3, GreaterDepth, Group, Mesh, MeshPhysicalMaterial, Vector3 } from "three";
import { expect, it, vi } from "vite-plus/test";
import { FORTRESSES } from "../simulation/arena";
import { createMatch } from "../simulation/match";
import { createArenaCamera, fitArenaCamera } from "./camera";
import { createFloorReflection } from "./floor-reflection";
import { frostedMaterial } from "./frosted-material";
import { createArenaView } from "./arena-view";
import { disposeScene } from "./dispose-scene";
import { createBallView } from "./ball-view";

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

it("keeps an occluded ball readable through solid walls without changing its position or radius", () => {
  const root = new Group();
  const view = createBallView(root);
  const state = createMatch();
  state.balls[0]!.position = { x: -8.75, y: 8.75 };
  view.update(state, false);
  const ghosts = root.children.filter((part) => part.name === "occluded-ball") as Mesh[];
  expect(ghosts.filter((part) => part.visible)).toHaveLength(1);
  const ghost = ghosts[0]!;
  expect(ghost.position).toEqual(new Vector3(-8.75, 0.58, 8.75));
  expect((ghost.geometry as import("three").SphereGeometry).parameters.radius).toBe(0.187);
  const material = ghost.material as import("three").MeshBasicMaterial;
  expect(material.depthTest).toBe(true);
  expect(material.depthFunc).toBe(GreaterDepth);
  expect(material.depthWrite).toBe(false);
  view.update({ ...state, balls: [] }, true);
  expect(ghosts.some((part) => part.visible)).toBe(false);
  disposeScene(root);
});
