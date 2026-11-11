import { expect, it, vi } from "vite-plus/test";
import { createGameMusic } from "./music-session";
import type { MusicEngine } from "./ports";
const frame = { elapsed: 1, balls: 1, alive: [true, true, true, true] };
const hit = {
  id: 0,
  tick: 0,
  type: "paddle" as const,
  seat: 0,
  piece: null,
  position: { x: 0, y: 0 },
};
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
function fixture() {
  const host = {
    currentTime: 0,
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
  const engine: MusicEngine = {
    play: vi.fn(),
    setPlaying: vi.fn(),
    pulse: vi.fn(() => 0.8),
    visuals: vi.fn(() => ({ pulse: 0.8, phase: 0.2, energy: 0.5 })),
    finish: vi.fn(),
    dispose: vi.fn(),
  };
  const deps = {
    createContext: vi.fn(() => host as unknown as AudioContext),
    load: vi.fn(async () => engine),
  };
  return { host, engine, deps, music: createGameMusic(2026, 0, deps) };
}
it("creates/resumes audio only on a gesture, and pauses/mutes live notes and visual beats", async () => {
  const { host, engine, deps, music } = fixture();
  music.setPlaying(true);
  expect(deps.createContext).not.toHaveBeenCalled();
  music.unlock();
  expect(host.resume).toHaveBeenCalledOnce();
  await flush();
  expect(engine.setPlaying).toHaveBeenLastCalledWith(true, 0.45);
  expect(music.snapshot().status).toBe("playing");
  expect(music.pulse()).toBe(0.8);
  expect(music.visuals()).toEqual({ pulse: 0.8, phase: 0.2, energy: 0.5 });
  music.observe(frame, [hit]);
  expect(engine.play).toHaveBeenCalledOnce();
  music.setPlaying(false);
  expect(engine.setPlaying).toHaveBeenLastCalledWith(false, 0.45);
  expect(music.pulse()).toBe(0);
  expect(music.snapshot().status).toBe("paused");
  expect(music.visuals()).toEqual({ pulse: 0, phase: -1, energy: 0 });
  music.observe(frame, [{ ...hit, id: 1 }]);
  expect(engine.play).toHaveBeenCalledOnce();
  music.configure({ music: false, musicVolume: 0.2 });
  expect(music.snapshot().status).toBe("off");
  music.unlock();
  expect(host.resume).toHaveBeenCalledOnce();
  music.configure({ music: true, musicVolume: 0 });
  music.setPlaying(true);
  expect(music.pulse()).toBe(0);
  music.dispose();
  music.dispose();
  expect(engine.dispose).toHaveBeenCalledOnce();
  expect(host.close).toHaveBeenCalledOnce();
});
it("does not resurrect audio when a lazy import completes after teardown", async () => {
  const { host, engine } = fixture();
  let complete!: (engine: MusicEngine) => void;
  const music = createGameMusic(2026, 0, {
    createContext: () => host as unknown as AudioContext,
    load: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  music.unlock();
  music.setPlaying(true);
  music.dispose();
  complete(engine);
  await flush();
  expect(engine.dispose).toHaveBeenCalledOnce();
  expect(engine.setPlaying).not.toHaveBeenCalled();
  expect(music.pulse()).toBe(0);
});
it("contains unsupported audio, rejected imports and playback errors", async () => {
  const missing = createGameMusic(1, 0, {
    createContext: () => {
      throw Error("unsupported");
    },
    load: vi.fn(),
  });
  expect(() => missing.unlock()).not.toThrow();
  expect(missing.snapshot().status).toBe("unavailable");
  const { music, deps, engine } = fixture();
  deps.load.mockRejectedValueOnce(Error("offline"));
  music.unlock();
  await flush();
  expect(music.snapshot().status).toBe("unavailable");
  music.unlock();
  music.setPlaying(true);
  await flush();
  expect(music.snapshot().status).toBe("playing");
  vi.mocked(engine.play).mockImplementation(() => {
    throw Error("device lost");
  });
  expect(() => music.observe(frame, [hit])).not.toThrow();
  expect(music.snapshot().status).toBe("unavailable");
  expect(music.pulse()).toBe(0);
  music.dispose();
  missing.dispose();
});

it("lets the final breach cheer resolve without delaying results, while mute can still cut it", async () => {
  const { music, engine, host } = fixture();
  music.unlock();
  music.setPlaying(true);
  await flush();
  music.observe(frame, [
    { ...hit, type: "damage" },
    { ...hit, id: 1, type: "victory" },
  ]);
  expect(engine.finish).toHaveBeenCalledOnce();
  music.setPlaying(false);
  expect(music.snapshot().status).toBe("ending");
  expect(engine.setPlaying).toHaveBeenLastCalledWith(true, 0.45);
  host.currentTime = 2.1;
  music.setPlaying(false);
  expect(engine.setPlaying).toHaveBeenLastCalledWith(false, 0.45);
  music.dispose();
});

it("can mute the final crowd tail immediately", async () => {
  const { music, engine } = fixture();
  music.unlock();
  music.setPlaying(true);
  await flush();
  music.observe(frame, [
    { ...hit, type: "damage" },
    { ...hit, id: 1, type: "victory" },
  ]);
  music.setPlaying(false);
  music.configure({ music: false, musicVolume: 0.45 });
  expect(music.snapshot().status).toBe("off");
  expect(engine.setPlaying).toHaveBeenLastCalledWith(false, 0.45);
  music.dispose();
});
