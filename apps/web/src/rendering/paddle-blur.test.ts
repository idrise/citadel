import { Mesh, MeshBasicMaterial } from "three";
import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, fortress } from "../simulation/arena";
import { createMatch } from "../simulation/match";
import { createStage } from "./stage";
import { createPaddleBlur } from "./paddle-blur";
import { disposeScene } from "./dispose-scene";

function fixture() {
  const state = createMatch(2026);
  state.phase = "playing";
  const stage = createStage();
  const blur = createPaddleBlur(stage.root, stage.paddles);
  const ghosts = () =>
    stage.root
      .getObjectByName("paddle-motion-blurs")!
      .children.filter((p) => p.name === "paddle-motion-blur" && p.visible) as Mesh<
      import("three").BufferGeometry,
      MeshBasicMaterial
    >[];
  const move = (tick: number, offset: number, budget = 5) => {
    state.tick = tick;
    state.players[0]!.angle = fortress(0, state.arena).direction + offset;
    const original = structuredClone(state);
    blur.update(state, budget);
    expect(state).toEqual(original);
  };
  return { state, stage, blur, ghosts, move };
}

it("shows a short trail behind the moving paddle, freezes on pause and fades when it stops", () => {
  const f = fixture();
  f.move(0, 0);
  expect(f.ghosts()).toHaveLength(0);
  f.move(6, ARENA.paddleSpeed * FIXED_DT * 6);
  expect(f.ghosts()).toHaveLength(5);
  const poses = f.ghosts().map((mesh) => [mesh.rotation.y, mesh.material.opacity]);
  f.blur.update(f.state);
  expect(f.ghosts().map((mesh) => [mesh.rotation.y, mesh.material.opacity])).toEqual(poses);
  f.move(20, ARENA.paddleSpeed * FIXED_DT * 6);
  f.move(30, ARENA.paddleSpeed * FIXED_DT * 6);
  expect(f.ghosts()).toHaveLength(0);
  disposeScene(f.stage.root);
});

it("clears trails on reduced effects, elimination and restart, and bounds the medium budget", () => {
  const f = fixture();
  f.move(0, 0);
  f.move(6, 0.16, 3);
  expect(f.ghosts()).toHaveLength(3);
  f.move(7, 0.18, 0);
  expect(f.ghosts()).toHaveLength(0);
  f.move(8, 0.2);
  expect(f.ghosts()).toHaveLength(0);
  f.move(14, 0.36);
  expect(f.ghosts().length).toBeGreaterThan(0);
  f.state.players[0]!.health.fill(false);
  f.move(15, 0.36);
  expect(f.ghosts()).toHaveLength(0);
  f.state.players[0]!.health.fill(true);
  f.move(0, 0);
  expect(f.ghosts()).toHaveLength(0);
  disposeScene(f.stage.root);
});
