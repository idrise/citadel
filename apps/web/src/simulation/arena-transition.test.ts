import { expect, it } from "vite-plus/test";
import { arenaTransition, morphPosts, transitionPosts } from "./arena-transition";
import { createMatch } from "./match";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
import { fortress, FIXED_DT } from "./arena";
import { length, sub } from "./vector";

it("retracts completely before reshaping and finishes reshaping before raising new posts", () => {
  const source = [{ x: 1, y: 2 }],
    target = [{ x: -2, y: -3 }];
  for (let frame = 0; frame <= 300; frame++) {
    const t = frame / 300,
      phase = arenaTransition(t);
    const posts = transitionPosts(t, { vertices: source, lift: 0.6 }, target);
    if (phase.shape > 0 && phase.shape < 1) expect(posts.lift).toBe(0);
    if (phase.retract > 0) {
      expect(phase.shape).toBe(0);
      expect(posts.vertices).toBe(source);
    }
    if (phase.rise > 0) {
      expect(phase.shape).toBe(1);
      expect(posts.vertices).toBe(target);
    }
    expect(posts.lift).toBeGreaterThanOrEqual(0);
    expect(posts.lift).toBeLessThanOrEqual(1);
  }
  expect(arenaTransition(-1)).toEqual(arenaTransition(0));
  expect(arenaTransition(2)).toEqual(arenaTransition(1));
  expect(arenaTransition(0.5).shape).toBeCloseTo(0.5);
});

it("has zero outline velocity and acceleration at both mechanical stops", () => {
  const h = 1e-5;
  for (const t of [0.15, 0.85]) {
    const a = arenaTransition(t - h).shape,
      b = arenaTransition(t).shape,
      c = arenaTransition(t + h).shape;
    expect(Math.abs((c - a) / (2 * h))).toBeLessThan(1e-6);
    expect(Math.abs((a - 2 * b + c) / (h * h))).toBeLessThan(0.01);
  }
});

it("holds authoritative walls and actors during the post phases and bounds speed after rapid retargets", () => {
  const state = createMatch(4, 6);
  for (const id of [5, 3, 1]) {
    state.players[id]!.health.fill(false);
    state.eliminations.push({ seat: id, elapsed: 0 });
    const source = state.arena;
    const sourcePosts = state.morph
      ? morphPosts(state.morph)
      : { vertices: source.vertices, lift: 1 };
    beginArenaMorph(state);
    expect(morphPosts(state.morph!)).toEqual(sourcePosts);
    stepArenaMorph(state, state.morph!.duration * 0.1);
    expect(state.arena).toBe(source);
    for (let i = 0; i < 45; i++) {
      const before = state.arena;
      stepArenaMorph(state, FIXED_DT);
      for (const player of state.players.filter((p) => p.health.some(Boolean)))
        expect(
          length(sub(fortress(player.id, state.arena).anchor, fortress(player.id, before).anchor)) /
            FIXED_DT,
        ).toBeLessThanOrEqual(6.01);
    }
  }
  const morph = state.morph!;
  stepArenaMorph(state, morph.duration * 0.86 - morph.elapsed);
  expect(state.arena).toBe(morph.to);
  expect(morphPosts(state.morph!).lift).toBeGreaterThan(0);
  stepArenaMorph(state, morph.duration);
  expect(state.arena).toBe(morph.to);
  expect(state.morph).toBeNull();
});
