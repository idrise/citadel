import { createMusicDirector, type MusicFrame } from "./director";
import type { EngineLoader, MusicEngine, MusicStatus } from "./ports";
import type { GameEvent } from "../simulation/types";

interface Dependencies {
  createContext: () => AudioContext;
  load: EngineLoader;
}
const defaults: Dependencies = {
  createContext: () => new AudioContext({ latencyHint: "interactive" }),
  load: async (context, onStep) =>
    (await import("./tone-engine")).createToneEngine(context, onStep),
};

/** Owns gesture unlocking, lazy loading and teardown. Audio failure never interrupts the match. */
export function createGameMusic(seed: number, humanSeat: number, dependencies = defaults) {
  const director = createMusicDirector(humanSeat, seed);
  let context: AudioContext | null = null;
  let engine: MusicEngine | null = null;
  let loading: Promise<void> | null = null;
  let unlocked = false;
  let failed = false;
  let disposed = false;
  let enabled = true;
  let volume = 0.45;
  let wanted = false;
  let applied = "";
  let endingUntil = 0;
  const sync = () => {
    if (!engine || disposed) return;
    if (endingUntil > (context?.currentTime ?? 0) && enabled && volume > 0 && !failed) return;
    endingUntil = 0;
    const playing = enabled && wanted && unlocked && !failed;
    const key = `${playing}:${volume}`;
    if (applied === key) return;
    applied = key;
    engine.setPlaying(playing, volume);
  };
  const fail = () => {
    failed = true;
    try {
      sync();
    } catch {
      /* Audio is optional. */
    }
  };
  const close = (host: AudioContext) => {
    void host.close().catch(() => {});
  };
  return {
    unlock() {
      if (!enabled || disposed) return;
      try {
        // Native resume runs inside the Play/Resume click, before any dynamic import awaits.
        context ??= dependencies.createContext();
        const host = context;
        failed = false;
        void host
          .resume()
          .then(() => {
            if (!disposed) {
              unlocked = true;
              sync();
            }
          })
          .catch(fail);
        loading ??= dependencies
          .load(host, (step) => director.step(step))
          .then((loaded) => {
            if (disposed) {
              loaded.dispose();
              return;
            }
            engine = loaded;
            sync();
          })
          .catch(() => {
            loading = null;
            fail();
          });
      } catch {
        fail();
      }
    },
    configure(next: { music: boolean; musicVolume: number }) {
      enabled = next.music;
      volume = Number.isFinite(next.musicVolume)
        ? Math.max(0, Math.min(1, next.musicVolume))
        : 0.45;
      try {
        sync();
      } catch {
        fail();
      }
    },
    setPlaying(value: boolean) {
      wanted = value;
      try {
        sync();
      } catch {
        fail();
      }
    },
    silence() {
      // Explicit pause/focus loss cancels the tail retained for automatic results.
      wanted = false;
      endingUntil = 0;
      try {
        sync();
      } catch {
        fail();
      }
    },
    observe(frame: MusicFrame, events: readonly GameEvent[]) {
      if (disposed) return;
      const cues = director.observe(frame, events);
      if (engine && wanted && enabled && unlocked && !failed && !disposed)
        try {
          engine.play(cues);
          if (events.some((event) => event.type === "victory")) {
            endingUntil = (context?.currentTime ?? 0) + 2;
            engine.finish();
          }
        } catch {
          fail();
        }
    },
    snapshot() {
      const status: MusicStatus = !enabled
        ? "off"
        : failed
          ? "unavailable"
          : endingUntil > (context?.currentTime ?? 0)
            ? "ending"
            : engine && unlocked
              ? wanted
                ? "playing"
                : "paused"
              : loading
                ? "loading"
                : "idle";
      return { status, ...director.snapshot() };
    },
    pulse() {
      return enabled && wanted && volume > 0 && unlocked && !failed && !disposed
        ? (engine?.pulse() ?? 0)
        : 0;
    },
    visuals() {
      return enabled && wanted && volume > 0 && unlocked && !failed && !disposed
        ? (engine?.visuals() ?? { pulse: 0, phase: -1, energy: 0 })
        : { pulse: 0, phase: -1, energy: 0 };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      engine?.dispose();
      if (context) close(context);
    },
  };
}
export type MusicSnapshot = ReturnType<ReturnType<typeof createGameMusic>["snapshot"]>;
