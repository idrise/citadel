import { beforeEach, expect, it, vi } from "vite-plus/test";
import { createPaddleSwish } from "./tone-swish";
import { swishParameters } from "./paddle-swish";

const state = vi.hoisted(() => ({
  nodes: [] as {
    kind: string;
    options: Record<string, unknown>;
    frequency: { setTargetAtTime: ReturnType<typeof vi.fn> };
    gain: { setTargetAtTime: ReturnType<typeof vi.fn> };
    pan: { setTargetAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  }[],
}));
vi.mock("tone", () => {
  class Node {
    frequency = { setTargetAtTime: vi.fn() };
    gain = { setTargetAtTime: vi.fn() };
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
    ["Noise", "Filter", "Gain", "Panner"].map((kind) => [
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

it("uses one broad filtered noise source and reuses its graph throughout rapid steering", () => {
  const output = {} as never;
  const swish = createPaddleSwish({} as never, output);
  const [pan, gain, filter, noise] = state.nodes;
  expect(noise!.options.type).toBe("pink");
  expect(filter!.options).toMatchObject({ type: "bandpass", Q: 0.5 });
  expect(noise!.connect).toHaveBeenCalledWith(filter);
  expect(filter!.connect).toHaveBeenCalledWith(gain);
  expect(gain!.connect).toHaveBeenCalledWith(pan);
  expect(pan!.connect).toHaveBeenCalledWith(output);
  for (let frame = 0; frame < 600; frame++)
    swish.steer(Math.sin(frame) * 16, Math.cos(frame), frame / 60);
  expect(state.nodes).toHaveLength(4);
  expect(noise!.start).toHaveBeenCalledTimes(1);
  swish.dispose();
  for (const node of state.nodes) expect(node.dispose).toHaveBeenCalledTimes(1);
});

it("smooths air brightness, amplitude and stereo at the supplied audio time, then releases to silence", () => {
  const swish = createPaddleSwish({ immediate: () => 12 } as never, {} as never);
  const [pan, gain, filter, noise] = state.nodes;
  const parameters = swishParameters(3.2, -0.5);
  swish.steer(3.2, -0.5, 10);
  expect(filter!.frequency.setTargetAtTime).toHaveBeenCalledWith(parameters.frequency, 10, 0.04);
  expect(gain!.gain.setTargetAtTime).toHaveBeenCalledWith(parameters.gain, 10, 0.012);
  expect(pan!.pan.setTargetAtTime).toHaveBeenCalledWith(parameters.pan, 10, 0.025);
  expect(noise!.frequency.setTargetAtTime).not.toHaveBeenCalled();
  swish.steer(0, 0);
  expect(gain!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 12, 0.04);
  swish.dispose();
});

it("schedules finite silent parameters for invalid movement input", () => {
  const swish = createPaddleSwish({} as never, {} as never);
  for (const velocity of [NaN, Infinity, -Infinity]) swish.steer(velocity, NaN, 3);
  expect(state.nodes[1]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 3, 0.04);
  expect(state.nodes[0]!.pan.setTargetAtTime).toHaveBeenLastCalledWith(0, 3, 0.025);
  expect(state.nodes[2]!.frequency.setTargetAtTime).toHaveBeenLastCalledWith(1200, 3, 0.04);
  swish.dispose();
});
