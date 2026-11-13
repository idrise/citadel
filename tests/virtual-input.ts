import type { SessionTestPort } from "../apps/web/src/app/test-port";
/** Installed by Playwright before the app loads; never imported by the game bundle.
 * Capture and fullscreen state remain inside this document. Native OS APIs are never called.
 */
export function installVirtualBrowserControls() {
  const state: { locked: Element | null; fullscreen: Element | null } = {
    locked: null,
    fullscreen: null,
  };
  let x = 0,
    y = 0;
  const captured = new Map<number, Element>();
  Object.defineProperty(document, "pointerLockElement", {
    configurable: true,
    get: () => state.locked,
  });
  Element.prototype.requestPointerLock = function () {
    state.locked = this;
    x = y = 0;
    document.dispatchEvent(new Event("pointerlockchange"));
    return Promise.resolve();
  };
  document.exitPointerLock = () => {
    state.locked = null;
    document.dispatchEvent(new Event("pointerlockchange"));
  };
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => state.fullscreen,
  });
  Object.defineProperty(document, "fullscreenEnabled", { configurable: true, get: () => true });
  Element.prototype.requestFullscreen = function () {
    state.fullscreen = this;
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  };
  document.exitFullscreen = () => {
    state.fullscreen = null;
    document.dispatchEvent(new Event("fullscreenchange"));
    return Promise.resolve();
  };
  Element.prototype.setPointerCapture = function (id) {
    captured.set(id, this);
  };
  Element.prototype.hasPointerCapture = function (id) {
    return captured.get(id) === this;
  };
  Element.prototype.releasePointerCapture = function (id) {
    if (captured.get(id) !== this) return;
    captured.delete(id);
    this.dispatchEvent(
      new PointerEvent("lostpointercapture", { pointerId: id, pointerType: "touch" }),
    );
  };
  window.addEventListener("pointerup", (e) => queueMicrotask(() => captured.delete(e.pointerId)));
  window.addEventListener("pointercancel", (e) =>
    queueMicrotask(() => captured.delete(e.pointerId)),
  );
  window.__citadelTestInput = {
    move(toX, toY) {
      const target = state.locked ?? document.querySelector("canvas");
      const event = new MouseEvent("mousemove", { bubbles: true, clientX: toX, clientY: toY });
      Object.defineProperties(event, {
        movementX: { value: toX - x },
        movementY: { value: toY - y },
      });
      x = toX;
      y = toY;
      target?.dispatchEvent(event);
    },
    key(code, down) {
      window.dispatchEvent(
        new KeyboardEvent(down ? "keydown" : "keyup", { code, bubbles: true, cancelable: true }),
      );
    },
    click() {
      state.locked?.dispatchEvent(new MouseEvent("mousedown", { button: 0, bubbles: true }));
    },
    touch(type, clientX, clientY, pointerId = 1) {
      const target = captured.get(pointerId) ?? document.querySelector("canvas");
      target?.dispatchEvent(
        new PointerEvent(type, {
          pointerId,
          pointerType: "touch",
          clientX,
          clientY,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
  };
}

declare global {
  interface Window {
    __citadelTestInput: {
      session?: SessionTestPort;
      move(x: number, y: number): void;
      key(code: string, down: boolean): void;
      click(): void;
      touch(type: string, x: number, y: number, id?: number): void;
    };
  }
}
