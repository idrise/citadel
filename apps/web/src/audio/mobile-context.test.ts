import { afterEach, expect, it, vi } from "vite-plus/test";
import { createPlaybackContext, releasePlaybackContext, primeContext } from "./mobile-context";
afterEach(() => vi.unstubAllGlobals());
it("sets playback routing before context construction and restores it only after the last owner closes", () => {
  const session = { type: "ambient" };
  vi.stubGlobal("navigator", { audioSession: session });
  const construct = vi.fn(() => expect(session.type).toBe("playback"));
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        construct();
      }
    },
  );
  const a = createPlaybackContext(),
    b = createPlaybackContext();
  expect(construct).toHaveBeenCalledTimes(2);
  releasePlaybackContext(a);
  expect(session.type).toBe("playback");
  releasePlaybackContext(b);
  expect(session.type).toBe("ambient");
  releasePlaybackContext(b);
  expect(session.type).toBe("ambient");
});
it("restores audio routing if opening the native context fails and supports Safari's prefixed fallback", () => {
  const session = { type: "auto" };
  vi.stubGlobal("navigator", { audioSession: session });
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        throw Error("blocked");
      }
    },
  );
  expect(() => createPlaybackContext()).toThrow("blocked");
  expect(session.type).toBe("auto");
  vi.stubGlobal("AudioContext", undefined);
  vi.stubGlobal("webkitAudioContext", class {});
  const context = createPlaybackContext();
  expect(session.type).toBe("playback");
  releasePlaybackContext(context);
  expect(session.type).toBe("auto");
});
it("primes with one silent sample synchronously and disconnects after completion", () => {
  const source = {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    disconnect: vi.fn(),
    onended: null as (() => void) | null,
  };
  const context = {
    createBufferSource: () => source,
    createBuffer: vi.fn(() => "silent"),
    sampleRate: 48000,
    destination: {},
  };
  primeContext(context as unknown as AudioContext);
  expect(context.createBuffer).toHaveBeenCalledWith(1, 1, 48000);
  expect(source.start).toHaveBeenCalledOnce();
  expect(source.buffer).toBe("silent");
  source.onended!();
  expect(source.disconnect).toHaveBeenCalledOnce();
});
