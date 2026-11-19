import { beforeEach, expect, it, vi } from "vite-plus/test";
import { createPaddleSwish } from "./tone-swish";
import { swishParameters } from "./paddle-swish";

const state = vi.hoisted(() => ({
  nodes: [] as {
    kind: string;
    options: Record<string, unknown>;
    frequency: Record<string, ReturnType<typeof vi.fn>>;
    gain: Record<string, ReturnType<typeof vi.fn>>;
    pan: { setTargetAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[],
}));
vi.mock("tone", () => {
  class Node {
    frequency = {
      cancelScheduledValues: vi.fn(),
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    };
    gain = {
      cancelAndHoldAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
    };
    pan = { setTargetAtTime: vi.fn() };
    connect = vi.fn(() => this);
    start = vi.fn(() => this);
    dispose = vi.fn();
    constructor(
      readonly kind: string,
      readonly options: Record<string, unknown>,
    ) {
      state.nodes.push(this);
    }
  }
  return Object.fromEntries(
    ["Oscillator", "Gain", "Panner"].map((kind) => [
      kind,
      class extends Node {
        constructor(options: Record<string, unknown>) {
          super(kind, options);
        }
      },
    ]),
  );
});
beforeEach(() => {
  state.nodes.length = 0;
});

it("reuses one sine oscillator through rapid steering and releases the whole graph", () => {
  const output = {} as never;
  const swish = createPaddleSwish({} as never, output);
  const [pan, gain, voice] = state.nodes;
  expect(voice!.options.type).toBe("sine");
  expect(voice!.connect).toHaveBeenCalledWith(gain);
  expect(gain!.connect).toHaveBeenCalledWith(pan);
  expect(pan!.connect).toHaveBeenCalledWith(output);
  for (let frame = 0; frame < 600; frame++)
    swish.steer(Math.sin(frame) * 16, Math.cos(frame), frame / 60);
  expect(state.nodes).toHaveLength(3);
  expect(voice!.start).toHaveBeenCalledTimes(1);
  swish.dispose();
  for (const node of state.nodes) expect(node.dispose).toHaveBeenCalledTimes(1);
});

it("gives each stroke a rounded attack, a short pitch glide and a finite silent end", () => {
  const swish = createPaddleSwish({ immediate: () => 12 } as never, {} as never);
  const [pan, gain, voice] = state.nodes;
  const parameters = swishParameters(3.2, -0.5);
  swish.steer(3.2, -0.5, 10);
  expect(voice!.frequency.setValueAtTime).toHaveBeenCalledWith(parameters.frequency, 10);
  expect(voice!.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
    parameters.endFrequency,
    10.11,
  );
  expect(gain!.gain.linearRampToValueAtTime).toHaveBeenCalledWith(parameters.gain, 10.015);
  expect(gain!.gain.setValueAtTime).toHaveBeenCalledWith(0, 10.14);
  expect(pan!.pan.setTargetAtTime).toHaveBeenCalledWith(parameters.pan, 10, 0.025);
  for (let frame = 1; frame <= 30; frame++) swish.steer(3.2, 0, 10 + frame / 60);
  expect(voice!.frequency.setValueAtTime).toHaveBeenCalledTimes(1);
  swish.steer(0, 0);
  expect(gain!.gain.cancelAndHoldAtTime).toHaveBeenCalledTimes(1);
  swish.steer(3.2, 0, 12.2);
  expect(gain!.gain.cancelAndHoldAtTime).toHaveBeenLastCalledWith(12.2);
  swish.dispose();
});

it("does not schedule a voice for idle, tiny or invalid movement", () => {
  const swish = createPaddleSwish({} as never, {} as never);
  for (const velocity of [0, 0.1, 1, NaN, Infinity, -Infinity]) swish.steer(velocity, NaN, 3);
  swish.steer(16, 0, NaN);
  expect(state.nodes[2]!.frequency.setValueAtTime).not.toHaveBeenCalled();
  expect(state.nodes[1]!.gain.linearRampToValueAtTime).not.toHaveBeenCalled();
  swish.dispose();
});
