import { beforeEach, expect, it, vi } from "vite-plus/test";
import type { MusicCue, Voice } from "./music-types";
import { createInstruments } from "./tone-instruments";

const state = vi.hoisted(() => {
  const bank = () => ({
    play: vi.fn((_cue: MusicCue, _time: number, _event?: boolean) => false),
    dispose: vi.fn(),
  });
  return {
    nodes: [] as {
      kind: string;
      gain: {
        cancelScheduledValues: ReturnType<typeof vi.fn>;
        setTargetAtTime: ReturnType<typeof vi.fn>;
      };
      dispose: ReturnType<typeof vi.fn>;
    }[],
    melodic: { ...bank(), duck: vi.fn() },
    drums: bank(),
    feedback: bank(),
    impacts: bank(),
    reactive: bank(),
    swish: { steer: vi.fn(), dispose: vi.fn() },
  };
});
vi.mock("tone", () => {
  class Node {
    gain = { cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() };
    dispose = vi.fn();
    constructor(readonly kind: string) {
      state.nodes.push(this);
    }
    connect() {
      return this;
    }
  }
  return {
    Gain: class extends Node {
      constructor() {
        super("gain");
      }
    },
    Compressor: class extends Node {
      constructor() {
        super("compressor");
      }
    },
  };
});
vi.mock("./tone-melodic", () => ({ createMelodic: () => state.melodic }));
vi.mock("./tone-drums", () => ({ createDrums: () => state.drums }));
vi.mock("./tone-feedback", () => ({ createFeedback: () => state.feedback }));
vi.mock("./tone-impacts", () => ({ createImpactFeedback: () => state.impacts }));
vi.mock("./tone-reactive", () => ({ createReactiveVoices: () => state.reactive }));
vi.mock("./tone-swish", () => ({ createPaddleSwish: () => state.swish }));
const cue = (voice: Voice): MusicCue => ({ voice, note: 62, velocity: 0.8, duration: 0.65 });
beforeEach(() => {
  vi.clearAllMocks();
  state.nodes.length = 0;
  state.drums.play.mockImplementation((c) => ["damage", "kick", "hat"].includes(c.voice));
  state.feedback.play.mockImplementation((c) =>
    ["breach", "success", "victory", "eliminate", "serve"].includes(c.voice),
  );
  state.impacts.play.mockImplementation((c) => ["hit", "ricochet"].includes(c.voice));
  state.reactive.play.mockImplementation((c) => ["answer", "unlock"].includes(c.voice));
});
it("keeps damage audible through the drum voice without ducking or muting the score", () => {
  const instruments = createInstruments({} as never, {} as never);
  instruments.play([cue("damage")], 12);
  expect(state.drums.play).toHaveBeenCalledExactlyOnceWith(cue("damage"), 12);
  expect(state.melodic.play).not.toHaveBeenCalled();
  for (const node of state.nodes) expect(node.gain.setTargetAtTime).not.toHaveBeenCalled();
  instruments.dispose();
});
it("routes live impacts and success/win gestures at their original times and keeps source ownership", () => {
  const instruments = createInstruments({} as never, {} as never);
  for (const voice of [
    "hit",
    "ricochet",
    "breach",
    "success",
    "victory",
    "eliminate",
    "serve",
  ] as const)
    instruments.play([cue(voice)], 10);
  expect(
    state.impacts.play.mock.calls.filter(([c]) => ["hit", "ricochet"].includes(c.voice)),
  ).toHaveLength(2);
  for (const voice of ["breach", "success", "victory", "eliminate", "serve"] as const)
    expect(state.feedback.play).toHaveBeenCalledWith(cue(voice), 10);
  instruments.play([cue("answer")], 11, "music");
  instruments.play([cue("answer")], 12, "effects");
  expect(state.reactive.play).toHaveBeenCalledWith(cue("answer"), 11, false);
  expect(state.reactive.play).toHaveBeenCalledWith(cue("answer"), 12, true);
  instruments.dispose();
});
it("preserves kick ducking and score breath/open while mix controls and teardown retain independent buses", () => {
  const instruments = createInstruments({} as never, {} as never);
  instruments.play([cue("kick"), cue("lead"), cue("breath"), cue("open")], 4, "music");
  expect(state.melodic.duck).toHaveBeenCalledExactlyOnceWith(4);
  expect(state.melodic.play).toHaveBeenCalledExactlyOnceWith(cue("lead"), 4);
  const gains = state.nodes.filter((node) => node.kind === "gain");
  expect(gains).toHaveLength(3);
  expect(gains[2]!.gain.setTargetAtTime.mock.calls).toEqual([
    [0, 4, 0.008],
    [1, 4, 0.01],
  ]);
  instruments.setMix(0.3, 0.8, 5);
  expect(gains[0]!.gain.setTargetAtTime).toHaveBeenCalledWith(0.3, 5, 0.015);
  expect(gains[1]!.gain.setTargetAtTime).toHaveBeenCalledWith(0.8, 5, 0.015);
  instruments.dispose();
  for (const bank of [
    state.melodic,
    state.drums,
    state.feedback,
    state.impacts,
    state.reactive,
    state.swish,
  ])
    expect(bank.dispose).toHaveBeenCalledOnce();
  for (const node of state.nodes) expect(node.dispose).toHaveBeenCalledOnce();
});
