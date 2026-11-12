import { beforeEach, expect, it, vi } from "vite-plus/test";
import { createImpactFeedback } from "./tone-impacts";

const voices = vi.hoisted(
  () =>
    [] as { triggerAttackRelease: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[],
);
vi.mock("tone", () => ({
  FMSynth: class {},
  PolySynth: class {
    triggerAttackRelease = vi.fn();
    dispose = vi.fn();
    constructor() {
      voices.push(this);
    }
    connect() {
      return this;
    }
  },
}));
beforeEach(() => {
  voices.length = 0;
});

it("routes walls and paddles to separate voices two octaves apart, at the requested audio time", () => {
  const impacts = createImpactFeedback({} as never, {} as never);
  const cue = { note: 69, velocity: 0.65, duration: 0.12 };
  expect(impacts.play({ ...cue, voice: "ricochet" }, 10)).toBe(true);
  expect(voices[0]!.triggerAttackRelease).toHaveBeenCalledWith(110, 0.045, 10, 0.65);
  expect(voices[1]!.triggerAttackRelease).not.toHaveBeenCalled();
  expect(impacts.play({ ...cue, voice: "hit" }, 11)).toBe(true);
  expect(voices[1]!.triggerAttackRelease).toHaveBeenCalledWith(440, 0.09, 11, 0.65);
  expect(impacts.play({ ...cue, voice: "breach" }, 12)).toBe(false);
  impacts.dispose();
  expect(voices.every((voice) => vi.mocked(voice.dispose).mock.calls.length === 1)).toBe(true);
});
