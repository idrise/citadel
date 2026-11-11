import { clampPaddleAngle, fortress } from "../simulation/arena";
import { IDLE_INTENT, type PlayerIntent } from "../simulation/types";

export const MOUSE_RADIANS_PER_PIXEL = 0.004;

/** Relative deltas are independent of the camera and never depend on pointer screen edges. */
export function createDesktopInput(
  canvas: HTMLCanvasElement,
  seat: number,
  currentAngle: () => number,
  togglePause: () => void,
  lostCapture: () => void,
) {
  const keys = new Set<string>();
  let angle: number | null = null;
  let launch = false;
  let disposed = false;
  const lower = clampPaddleAngle(seat, fortress(seat).direction - Math.PI / 2);
  const upper = clampPaddleAngle(seat, fortress(seat).direction + Math.PI / 2);
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
      angle = Math.max(
        lower,
        Math.min(upper, (angle ?? currentAngle()) + event.movementX * MOUSE_RADIANS_PER_PIXEL),
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
      if (document.pointerLockElement !== canvas) {
        clear();
        lostCapture();
      }
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
      keys.add(event.code);
      if (event.code === "Space" || event.code === "Enter") launch = !event.repeat;
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
      canvas.focus({ preventScroll: true });
      if (canvas.requestPointerLock) {
        const request = canvas.requestPointerLock();
        if (request)
          void request
            .then(() => {
              if (disposed && document.pointerLockElement === canvas) document.exitPointerLock();
            })
            .catch(() => {
              if (!disposed) lostCapture();
            });
      }
    },
    release() {
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    read(): PlayerIntent {
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
      abort.abort();
      clear();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
  };
}
