import { clampPaddleAngle, fortress, SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import { IDLE_INTENT, type PlayerIntent } from "../simulation/types";

export const MOUSE_RADIANS_PER_PIXEL = 0.005;

/** Relative deltas are independent of the camera and never depend on pointer screen edges. */
export function createDesktopInput(
  canvas: HTMLCanvasElement,
  seat: number,
  currentAngle: () => number,
  togglePause: () => void,
  lostCapture: () => void,
  sensitivity: () => number = () => 1,
  geometry: () => ArenaGeometry = () => SQUARE_ARENA,
) {
  const keys = new Set<string>();
  let angle: number | null = null;
  let launch = false;
  let disposed = false;
  let captureWanted = false;
  let captureEpoch = 0;
  let capturePending = false;
  let base = fortress(seat, geometry()).direction;
  function rebase() {
    const next = fortress(seat, geometry()).direction;
    if (angle !== null) angle = clampPaddleAngle(seat, angle + next - base, geometry());
    base = next;
  }
  const abort = new AbortController();
  const options = { signal: abort.signal };
  function clear() {
    keys.clear();
    angle = null;
    launch = false;
  }
  canvas.addEventListener(
    "mousemove",
    (event) => {
      if (document.pointerLockElement !== canvas || !Number.isFinite(event.movementX)) return;
      rebase();
      const configured = sensitivity();
      const multiplier = Number.isFinite(configured) ? Math.max(0.5, Math.min(2, configured)) : 1;
      const delta = event.movementX * MOUSE_RADIANS_PER_PIXEL * multiplier;
      const actual = currentAngle();
      // Reverse from the bat, rather than unwinding an earlier target it has not reached.
      if (angle !== null && (angle - actual) * delta < 0) angle = actual;
      angle = clampPaddleAngle(
        seat,
        Math.max(
          clampPaddleAngle(seat, base - 2, geometry()),
          Math.min(clampPaddleAngle(seat, base + 2, geometry()), (angle ?? actual) + delta),
        ),
        geometry(),
      );
    },
    options,
  );
  canvas.addEventListener(
    "mousedown",
    (event) => {
      if (event.button === 0 && document.pointerLockElement === canvas) launch = true;
    },
    options,
  );
  document.addEventListener(
    "pointerlockchange",
    () => {
      if (document.pointerLockElement === canvas) {
        if (!captureWanted || disposed) document.exitPointerLock();
      } else {
        const unexpected = captureWanted;
        captureWanted = false;
        captureEpoch++;
        clear();
        if (!disposed && unexpected) lostCapture();
      }
    },
    options,
  );
  const captureFailed = () => {
    if (disposed || !captureWanted || document.pointerLockElement === canvas) return;
    captureWanted = false;
    clear();
    lostCapture();
  };
  document.addEventListener(
    "pointerlockerror",
    () => {
      if (!capturePending) captureFailed();
    },
    options,
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (document.activeElement !== canvas && document.pointerLockElement !== canvas) return;
      if (event.code === "Escape" || event.code === "KeyP") {
        event.preventDefault();
        if (!event.repeat) togglePause();
        return;
      }
      if (!["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "Enter"].includes(event.code))
        return;
      event.preventDefault();
      const held = keys.has(event.code);
      keys.add(event.code);
      if (event.code === "Space" || event.code === "Enter") {
        if (!event.repeat && !held) launch = true;
      } else angle = null;
    },
    options,
  );
  window.addEventListener(
    "keyup",
    (event) => {
      keys.delete(event.code);
    },
    options,
  );
  return {
    capture() {
      if (disposed) return;
      captureWanted = true;
      const epoch = ++captureEpoch;
      capturePending = false;
      canvas.focus({ preventScroll: true });
      const failed = (error: unknown, raw: boolean) => {
        if (epoch !== captureEpoch || !captureWanted || disposed) return;
        if (raw && error instanceof Error && error.name === "NotSupportedError") request(false);
        else captureFailed();
      };
      const request = (raw: boolean) => {
        try {
          if (!canvas.requestPointerLock) {
            captureFailed();
            return;
          }
          const pending = canvas.requestPointerLock(raw ? { unadjustedMovement: true } : undefined);
          if (pending) {
            capturePending = true;
            void pending
              .then(() => {
                if (epoch === captureEpoch) capturePending = false;
                if ((disposed || !captureWanted) && document.pointerLockElement === canvas)
                  document.exitPointerLock();
              })
              .catch((error: unknown) => {
                if (epoch === captureEpoch) capturePending = false;
                failed(error, raw);
              });
          }
        } catch (error) {
          failed(error, raw);
        }
      };
      request(true);
    },
    release() {
      captureWanted = false;
      captureEpoch++;
      clear();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    read(): PlayerIntent {
      rebase();
      const steer =
        Number(keys.has("ArrowRight") || keys.has("KeyD")) -
        Number(keys.has("ArrowLeft") || keys.has("KeyA"));
      const intent: PlayerIntent = {
        ...IDLE_INTENT,
        targetAngle: steer ? null : angle,
        steer,
        launch,
      };
      launch = false;
      if (steer) angle = null;
      return intent;
    },
    clear,
    dispose() {
      disposed = true;
      captureWanted = false;
      captureEpoch++;
      abort.abort();
      clear();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
  };
}
