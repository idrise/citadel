import { beforeEach, expect, it, vi } from "vite-plus/test";
import { createDrums } from "./tone-drums";
import type { MusicCue } from "./music-types";

const nodes = vi.hoisted(
  () =>
    [] as {
      options: Record<string, unknown>;
      connect: ReturnType<typeof vi.fn>;
      triggerAttackRelease: ReturnType<typeof vi.fn>;
      frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
      dispose: ReturnType<typeof vi.fn>;
    }[],
);
vi.mock("tone", () => {
  class Node {
    connect = vi.fn(() => this);
    triggerAttackRelease = vi.fn();
    frequency = { setValueAtTime: vi.fn() };
    dispose = vi.fn();
    constructor(readonly options: Record<string, unknown>) {
      nodes.push(this);
    }
  }
  return { MembraneSynth: Node, NoiseSynth: Node, Filter: Node, Synth: Node, PolySynth: Node };
});
beforeEach(() => {
  nodes.length = 0;
});
const cue = (voice: MusicCue["voice"]): MusicCue => ({
  voice,
  note: 36,
  velocity: 0.63,
  duration: 0.09,
  brightness: 0.7,
});
it("routes the stronger percussion through the music bus while damage retains its independent effects level", () => {
  const output = {} as never,
    live = {} as never;
  const drums = createDrums({} as never, output, live);
  const synths = nodes.filter((n) => n.options.volume !== undefined);
  for (const node of nodes.slice(0, -1)) expect(node.connect.mock.calls[0]![0]).not.toBe(live);
  const damage = nodes.at(-1)!;
  expect(damage.connect).toHaveBeenCalledWith(live);
  expect(damage.options.options).toMatchObject({ volume: -11 });
  const [kick, hat, openHat, clap, snare] = synths;
  expect(Number(kick!.options.volume)).toBeGreaterThan(-10);
  expect(Number(snare!.options.volume)).toBeGreaterThan(-18);
  expect(Number(hat!.options.volume)).toBeLessThan(Number(snare!.options.volume));
  expect(Number(openHat!.options.volume)).toBeLessThan(Number(hat!.options.volume));
  expect(Number(clap!.options.volume)).toBeLessThan(Number(kick!.options.volume));
  drums.dispose();
  for (const node of nodes) expect(node.dispose).toHaveBeenCalledOnce();
});
it("retains exact score timing, velocity accents, paired snare body and brightness automation", () => {
  const drums = createDrums({} as never, {} as never, {} as never);
  for (const voice of ["kick", "hat", "openHat", "clap", "snare", "crash", "damage"] as const)
    expect(drums.play(cue(voice), 12)).toBe(true);
  const played = nodes.filter((n) => n.triggerAttackRelease.mock.calls.length);
  expect(played).toHaveLength(8);
  for (const node of played) {
    const call = node.triggerAttackRelease.mock.calls[0]!;
    expect(call.slice(-3)).toEqual([0.09, 12, 0.63]);
  }
  expect(nodes.filter((n) => n.frequency.setValueAtTime.mock.calls.length)).toHaveLength(1);
  expect(
    nodes.find((n) => n.options.frequency === 1300)!.frequency.setValueAtTime,
  ).toHaveBeenCalledWith(2400, 12);
  expect(drums.play(cue("lead"), 13)).toBe(false);
  drums.dispose();
});
