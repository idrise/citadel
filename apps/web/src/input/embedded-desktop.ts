import { clampPaddleAngle, fortress, type ArenaGeometry } from "../simulation/arena";
import { IDLE_INTENT, type PlayerIntent } from "../simulation/types";
import { clamp } from "../simulation/vector";

/** Reddit's iframe has no pointer lock. Map its full width to the legal bat arc.
 * Sensitivity changes the response curve while retaining reach at both edges. */
export function embeddedMouseAngle(
  x: number,
  left: number,
  width: number,
  low: number,
  high: number,
  sensitivity: number,
) {
  const position = clamp(((x - left) / Math.max(1, width)) * 2 - 1, -1, 1);
  const gain = Number.isFinite(sensitivity) ? clamp(sensitivity, 0.5, 2) : 1;
  const response = Math.sign(position) * Math.abs(position) ** (1 / gain);
  return low + ((response + 1) / 2) * (high - low);
}

export function createEmbeddedDesktopInput(
  canvas: HTMLCanvasElement,
  seat: number,
  togglePause: () => void,
  sensitivity: () => number,
  geometry: () => ArenaGeometry,
) {
  const abort = new AbortController(),
    options = { signal: abort.signal },
    keys = new Set<string>();
  let enabled = false,
    angle: number | null = null,
    launch = false,
    base = fortress(seat, geometry()).direction;
  function clear() {
    keys.clear();
    angle = null;
    launch = false;
  }
  function rebase() {
    const next = fortress(seat, geometry()).direction;
    if (angle !== null) angle = clampPaddleAngle(seat, angle + next - base, geometry());
    base = next;
  }
  canvas.addEventListener(
    "mousemove",
    (event) => {
      if (!enabled || !Number.isFinite(event.clientX)) return;
      rebase();
      const arena = geometry(),
        rect = canvas.getBoundingClientRect();
      const low = clampPaddleAngle(seat, base - Math.PI / 2, arena),
        high = clampPaddleAngle(seat, base + Math.PI / 2, arena);
      angle = embeddedMouseAngle(event.clientX, rect.left, rect.width, low, high, sensitivity());
    },
    options,
  );
  canvas.addEventListener(
    "mousedown",
    (event) => {
      if (enabled && event.button === 0) {
        canvas.focus({ preventScroll: true });
        launch = true;
      }
    },
    options,
  );
  canvas.addEventListener(
    "contextmenu",
    (event) => {
      if (enabled) event.preventDefault();
    },
    options,
  );
  window.addEventListener(
    "keydown",
    (event) => {
      if (!enabled || document.activeElement !== canvas) return;
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
      if ((event.code === "Space" || event.code === "Enter") && !event.repeat && !held)
        launch = true;
      else if (!["Space", "Enter"].includes(event.code)) angle = null;
    },
    options,
  );
  window.addEventListener("keyup", (event) => keys.delete(event.code), options);
  return {
    capture() {
      enabled = true;
      canvas.focus({ preventScroll: true });
    },
    release() {
      enabled = false;
      clear();
    },
    clear,
    resetSeat(next: number) {
      clear();
      seat = next;
      base = fortress(seat, geometry()).direction;
    },
    read(): PlayerIntent {
      rebase();
      const steer =
        Number(keys.has("ArrowRight") || keys.has("KeyD")) -
        Number(keys.has("ArrowLeft") || keys.has("KeyA"));
      const intent = { ...IDLE_INTENT, targetAngle: steer ? null : angle, steer, launch };
      launch = false;
      if (steer) angle = null;
      return intent;
    },
    dispose() {
      enabled = false;
      abort.abort();
      clear();
    },
  };
}
