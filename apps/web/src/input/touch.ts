import { clampPaddleAngle, fortress, type ArenaGeometry } from "../simulation/arena";
import { IDLE_INTENT, type PlayerIntent } from "../simulation/types";

/** One captured finger steers relatively; a stationary tap serves once. */
export function createTouchInput(
  canvas: HTMLCanvasElement,
  seat: number,
  currentAngle: () => number,
  geometry: () => ArenaGeometry,
) {
  const abort = new AbortController();
  let enabled = false;
  let pointer: number | null = null;
  let startX = 0,
    startY = 0,
    lastX = 0,
    distance = 0;
  let target: number | null = null;
  let base = fortress(seat, geometry()).direction;
  let launch = false;
  function rebase() {
    const next = fortress(seat, geometry()).direction;
    if (target !== null) target = clampPaddleAngle(seat, target + next - base, geometry());
    base = next;
  }
  function clear() {
    const captured = pointer;
    pointer = null;
    if (captured !== null && canvas.hasPointerCapture(captured))
      canvas.releasePointerCapture(captured);
    target = null;
    launch = false;
  }
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (!enabled || event.pointerType !== "touch" || pointer !== null) return;
      pointer = event.pointerId;
      startX = lastX = event.clientX;
      startY = event.clientY;
      distance = 0;
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    { signal: abort.signal },
  );
  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerId !== pointer) return;
      distance = Math.max(distance, Math.hypot(event.clientX - startX, event.clientY - startY));
      if (distance >= 8) {
        rebase();
        const width = Math.max(canvas.getBoundingClientRect().width, 1);
        target = clampPaddleAngle(
          seat,
          (target ?? currentAngle()) + ((event.clientX - lastX) * 2.4) / width,
          geometry(),
        );
        lastX = event.clientX;
      }
      event.preventDefault();
    },
    { signal: abort.signal },
  );
  const finish = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (
      event.type === "pointerup" &&
      distance < 8 &&
      Math.hypot(event.clientX - startX, event.clientY - startY) < 8
    )
      launch = true;
    pointer = null;
    event.preventDefault();
  };
  canvas.addEventListener("pointerup", finish, { signal: abort.signal });
  canvas.addEventListener("pointercancel", finish, { signal: abort.signal });
  canvas.addEventListener("lostpointercapture", finish, { signal: abort.signal });
  canvas.ownerDocument?.defaultView?.addEventListener("resize", clear, { signal: abort.signal });
  return {
    capture() {
      enabled = true;
    },
    release() {
      enabled = false;
      clear();
    },
    clear,
    read(): PlayerIntent {
      rebase();
      const intent = { ...IDLE_INTENT, targetAngle: target, launch };
      launch = false;
      return intent;
    },
    dispose() {
      enabled = false;
      clear();
      abort.abort();
    },
  };
}
