import {
  createPlaybackContext,
  releasePlaybackContext,
  primeContext,
  contextRunning,
} from "./mobile-context";
import { createMusicDirector, type MusicFrame } from "./director";
import type { EngineLoader, MusicEngine, MusicStatus } from "./ports";
import type { GameEvent } from "../simulation/types";
import { VICTORY_TAIL_SECONDS } from "./victory-outro";

interface Dependencies {
  createContext: () => AudioContext;
  load: EngineLoader;
}
const defaults: Dependencies = {
  createContext: createPlaybackContext,
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
  let effectsVolume = 0.45;
  let scoreEnabled = true;
  let wanted = false;
  let applied = "";
  let appliedMix = "";
  let endingUntil = 0;
  const sync = () => {
    if (!engine || disposed) return;
    if (!wanted) engine.steer?.(0, 0);
    const mixKey = `${scoreEnabled}:${volume}:${effectsVolume}`;
    if (engine.setMix && mixKey !== appliedMix) {
      engine.setMix(scoreEnabled ? volume : 0, effectsVolume);
      appliedMix = mixKey;
    }
    if (
      endingUntil > (context?.currentTime ?? 0) &&
      enabled &&
      (volume > 0 || effectsVolume > 0) &&
      !failed
    )
      return;
    endingUntil = 0;
    const playing = enabled && wanted && unlocked && !failed && contextRunning(context);
    const key = `${playing}:${scoreEnabled}:${volume}:${effectsVolume}`;
    if (applied === key) return;
    applied = key;
    engine.setPlaying(
      playing,
      engine.setMix ? 1 : Math.max(scoreEnabled ? volume : 0, effectsVolume),
    );
  };
  const fail = () => {
    failed = true;
    try {
      sync();
    } catch {
      /* Audio is optional. */
    }
  };
  const stateChanged = () => {
    if (!contextRunning(context)) {
      unlocked = false;
      endingUntil = 0;
    } else unlocked = true;
    try {
      sync();
    } catch {
      fail();
    }
  };
  const close = (host: AudioContext) => {
    host.removeEventListener?.("statechange", stateChanged);
    releasePlaybackContext(host);
    void host.close().catch(() => {});
  };
  return {
    unlock() {
      if (!enabled || disposed) return;
      try {
        // Native resume runs inside the Play/Resume click, before any dynamic import awaits.
        context ??= dependencies.createContext();
        const host = context;
        host.addEventListener?.("statechange", stateChanged);
        primeContext(host);
        failed = false;
        void host
          .resume()
          .then(() => {
            if (!disposed) {
              unlocked = contextRunning(host);
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
    steer(velocity: number, position: number) {
      if (engine && wanted && enabled && unlocked && !failed) engine.steer?.(velocity, position);
    },
    configure(next: { music: boolean; musicVolume: number; effectsVolume?: number }) {
      scoreEnabled = next.music;
      volume = Number.isFinite(next.musicVolume)
        ? Math.max(0, Math.min(1, next.musicVolume))
        : 0.45;
      const effects = next.effectsVolume ?? (next.music ? volume : 0);
      effectsVolume = Number.isFinite(effects) ? Math.max(0, Math.min(1, effects)) : 0.75;
      enabled = next.music || effectsVolume > 0;
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
          const victory = events.find((event) => event.type === "victory");
          if (victory) {
            const won = victory.seat === humanSeat;
            endingUntil = (context?.currentTime ?? 0) + (won ? VICTORY_TAIL_SECONDS : 2);
            engine.steer?.(0, 0);
            engine.finish(won);
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
            : wanted && context && !contextRunning(context)
              ? "waiting"
              : engine && unlocked
                ? wanted
                  ? "playing"
                  : "paused"
                : loading
                  ? "loading"
                  : "idle";
      return {
        status: scoreEnabled ? status : ("off" as const),
        needsGesture: enabled && (failed || Boolean(wanted && context && !contextRunning(context))),
        ...director.snapshot(),
      };
    },
    pulse() {
      return enabled &&
        scoreEnabled &&
        (wanted || endingUntil > (context?.currentTime ?? 0)) &&
        volume > 0 &&
        unlocked &&
        !failed &&
        !disposed
        ? (engine?.pulse() ?? 0)
        : 0;
    },
    visuals() {
      return enabled &&
        scoreEnabled &&
        (wanted || endingUntil > (context?.currentTime ?? 0)) &&
        volume > 0 &&
        unlocked &&
        !failed &&
        !disposed
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
