/** Request media playback routing before opening Web Audio (Safari otherwise uses ambient audio).
 * Keep ownership local so closing/retrying a round restores the page's previous session policy. */
interface AudioSession {
  type: string;
}
let owners = 0;
let previous = "auto";
const sessions = new WeakMap<AudioContext, AudioSession>();
export function createPlaybackContext(): AudioContext {
  const nav = navigator as Navigator & { audioSession?: AudioSession };
  const session = nav.audioSession;
  if (session) {
    try {
      if (owners === 0) previous = session.type;
      session.type = "playback";
    } catch {
      /* Optional API. */
    }
  }
  const ctor =
    globalThis.AudioContext ??
    (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  let context: AudioContext;
  try {
    if (!ctor) throw new Error("Web Audio unavailable");
    context = new ctor({ latencyHint: "interactive" });
  } catch (error) {
    if (session && owners === 0)
      try {
        session.type = previous;
      } catch {
        /* Optional API. */
      }
    throw error;
  }
  if (session) {
    sessions.set(context, session);
    owners++;
  }
  return context;
}
export function releasePlaybackContext(context: AudioContext) {
  const session = sessions.get(context);
  if (!session) return;
  sessions.delete(context);
  if (--owners === 0)
    try {
      session.type = previous;
    } catch {
      /* Optional API. */
    }
}
/** Resume and prime synchronously within a tap, before any asynchronous engine import. */
export function primeContext(context: AudioContext) {
  if (!context.createBufferSource) return;
  const source = context.createBufferSource();
  source.buffer = context.createBuffer(1, 1, context.sampleRate);
  source.connect(context.destination);
  source.onended = () => source.disconnect();
  source.start();
}
export function contextRunning(context: AudioContext | null) {
  return context !== null && (context.state === undefined || context.state === "running");
}
