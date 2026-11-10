import { fortress } from "../simulation/arena";
import { angleOf, sub, type Vec2 } from "../simulation/vector";
import { IDLE_INTENT, type PlayerIntent } from "../simulation/types";

export function createDesktopInput(
  canvas: HTMLCanvasElement,
  seat: number,
  project: (x: number, y: number) => Vec2 | null,
  togglePause: () => void,
) {
  const keys = new Set<string>();
  let angle: number | null = null;
  let launch = false;
  const abort = new AbortController();
  const options = { signal: abort.signal };
  function clear() {
    keys.clear();
    angle = null;
    launch = false;
  }
  canvas.addEventListener(
    "pointermove",
    (event) => {
      const point = project(event.clientX, event.clientY);
      if (point) angle = angleOf(sub(point, fortress(seat).anchor));
    },
    options,
  );
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      canvas.focus({ preventScroll: true });
      launch = true;
    },
    options,
  );
  canvas.addEventListener("pointerleave", clear, options);
  window.addEventListener(
    "keydown",
    (event) => {
      if (document.activeElement !== canvas) return;
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
      abort.abort();
      clear();
    },
  };
}
