import { expect, it, vi } from "vite-plus/test";
const state = vi.hoisted(() => ({
  nodes: [] as {
    kind: string;
    triggerAttackRelease: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[],
}));
vi.mock("tone", () => {
  class Node {
    triggerAttackRelease = vi.fn();
    dispose = vi.fn();
    constructor(readonly kind: string) {
      state.nodes.push(this);
    }
    connect() {
      return this;
    }
  }
  return {
    Filter: class extends Node {
      constructor() {
        super("filter");
      }
    },
    NoiseSynth: class extends Node {
      constructor() {
        super("noise");
      }
    },
    MembraneSynth: class extends Node {
      constructor() {
        super("boom");
      }
    },
  };
});
import { createExplosion } from "./tone-explosion";
it("synthesizes a bass/noise impact, coalesces simultaneous deaths and releases its graph", () => {
  const explosion = createExplosion({} as never, {} as never);
  explosion.play(1, 0.8);
  explosion.play(1, 0.8);
  explosion.play(1.01, 0.8);
  const boom = state.nodes.find((n) => n.kind === "boom")!,
    noise = state.nodes.find((n) => n.kind === "noise")!;
  expect(boom.triggerAttackRelease).toHaveBeenCalledTimes(1);
  expect(noise.triggerAttackRelease).toHaveBeenCalledTimes(1);
  explosion.play(2, 0.85, true);
  expect(boom.triggerAttackRelease.mock.calls.map((c) => c[0])).toEqual([62, 48]);
  explosion.dispose();
  expect(state.nodes.every((n) => n.dispose.mock.calls.length === 1)).toBe(true);
});
