import { InstancedMesh, ShaderMaterial } from "three";
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
  const all = stage.root.getObjectByName("paddle-motion-blurs")!.children as InstancedMesh<
    import("three").BufferGeometry,
    ShaderMaterial
  >[];
  const ghosts = () => all.filter((mesh) => mesh.count > 0);
  const move = (tick: number, offset: number, budget = 12) => {
    state.tick = tick;
    state.players[0]!.angle = fortress(0, state.arena).direction + offset;
    const original = structuredClone(state);
    blur.update(state, budget);
    expect(state).toEqual(original);
  };
  return { state, stage, blur, ghosts, move, all };
}

it("shows a short instanced trail, freezes on pause and fades when the bat stops", () => {
  const f = fixture();
  f.move(0, 0);
  expect(f.ghosts()).toHaveLength(0);
  f.move(12, ARENA.paddleSpeed * FIXED_DT * 12);
  expect(f.ghosts()).toHaveLength(1);
  const mesh = f.ghosts()[0]!;
  expect(mesh.count).toBe(12);
  const matrices = Array.from(mesh.instanceMatrix.array);
  f.blur.update(f.state);
  expect(Array.from(mesh.instanceMatrix.array)).toEqual(matrices);
  f.move(25, ARENA.paddleSpeed * FIXED_DT * 12);
  expect(f.ghosts()).toHaveLength(0);
  disposeScene(f.stage.root);
});

it("clears on reduced effects, elimination and restart, and bounds the medium budget", () => {
  const f = fixture();
  f.move(0, 0);
  f.move(12, 0.32, 6);
  expect(f.ghosts()[0]!.count).toBe(6);
  f.move(13, 0.34, 0);
  expect(f.ghosts()).toHaveLength(0);
  f.move(14, 0.36);
  expect(f.ghosts()).toHaveLength(0);
  f.move(26, 0.6);
  expect(f.ghosts()).toHaveLength(1);
  f.state.players[0]!.health.fill(false);
  f.move(27, 0.6);
  expect(f.ghosts()).toHaveLength(0);
  f.state.players[0]!.health.fill(true);
  f.move(0, 0);
  expect(f.ghosts()).toHaveLength(0);
  disposeScene(f.stage.root);
});

it("avoids stacking missing early history and keeps the live bat mask aligned", () => {
  const f = fixture();
  f.move(0, 0);
  f.move(1, 0.1);
  expect(f.ghosts()[0]!.count).toBeLessThanOrEqual(1);
  const home = fortress(0, f.state.arena);
  expect(f.all[0]!.material.uniforms.anchor!.value.toArray()).toEqual([
    home.anchor.x,
    home.anchor.y,
  ]);
  expect(f.all[0]!.material.uniforms.angle!.value).toBe(f.state.players[0]!.angle);
  disposeScene(f.stage.root);
});
