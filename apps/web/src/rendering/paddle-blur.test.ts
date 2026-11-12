import { Mesh, MeshStandardMaterial, ShaderMaterial } from "three";
import { expect, it } from "vite-plus/test";
import { fortress } from "../simulation/arena";
import { createMatch } from "../simulation/match";
import { createStage } from "./stage";
import { createPaddleBlur } from "./paddle-blur";
import { disposeScene } from "./dispose-scene";

function fixture() {
  const state = createMatch(2026);
  state.phase = "playing";
  const stage = createStage();
  const blur = createPaddleBlur(stage.root, stage.paddles);
  const all = stage.root.getObjectByName("paddle-motion-blurs")!.children as Mesh[];
  const ghosts = () => all.filter((mesh) => mesh.visible);
  const move = (tick: number, offset: number, budget = 4) => {
    state.tick = tick;
    state.players[0]!.angle = fortress(0, state.arena).direction + offset;
    const original = structuredClone(state);
    blur.update(state, budget);
    expect(state).toEqual(original);
  };
  const sweep = (budget = 4) =>
    [0, 4, 8, 12, 16].forEach((tick, index) => move(tick, index * 0.1, budget));
  return { state, stage, blur, ghosts, move, sweep };
}

it("draws complete faded bat copies at actual historical poses, not interpolated positions", () => {
  const f = fixture();
  f.sweep();
  const ghosts = f.ghosts();
  expect(ghosts).toHaveLength(4);
  expect(
    (f.stage.paddles[0]!.material as MeshStandardMaterial[]).every(
      (material) => !material.transparent && material.opacity === 1,
    ),
  ).toBe(true);
  const base = fortress(0, f.state.arena).direction;
  ghosts.forEach((ghost, index) => {
    expect(ghost.geometry).toBe(f.stage.paddles[0]!.geometry);
    expect(ghost.rotation.y).toBeCloseTo(-(base + (3 - index) * 0.1));
    const materials = ghost.material as MeshStandardMaterial[];
    expect(materials.every((material) => material.transparent && !material.depthWrite)).toBe(true);
    expect(materials[0]!.opacity).toBe([0.32, 0.23, 0.15, 0.08][index]);
    expect(((ghost.children[0] as Mesh).material as ShaderMaterial).name).toBe("NeonFeatureEdges");
  });
  const poses = ghosts.map((mesh) => mesh.rotation.y);
  f.blur.update(f.state);
  expect(f.ghosts().map((mesh) => mesh.rotation.y)).toEqual(poses);
  f.move(36, 0.4);
  expect(f.ghosts()).toHaveLength(0);
  disposeScene(f.stage.root);
});

it("retains two copies at the low budget and clears on reduced motion, elimination and restart", () => {
  const f = fixture();
  f.sweep(2);
  expect(f.ghosts()).toHaveLength(2);
  f.move(17, 0.42, 0);
  expect(f.ghosts()).toHaveLength(0);
  f.move(18, 0.44);
  expect(f.ghosts()).toHaveLength(0);
  f.move(22, 0.54);
  expect(f.ghosts()).toHaveLength(1);
  f.state.players[0]!.health.fill(false);
  f.move(26, 0.6);
  expect(f.ghosts()).toHaveLength(0);
  f.state.players[0]!.health.fill(true);
  f.move(0, 0);
  expect(f.ghosts()).toHaveLength(0);
  disposeScene(f.stage.root);
});

it("does not stack the same historical frame when a slow render has only one old pose", () => {
  const f = fixture();
  f.move(0, 0);
  f.move(16, 0.4);
  expect(f.ghosts()).toHaveLength(1);
  disposeScene(f.stage.root);
});
