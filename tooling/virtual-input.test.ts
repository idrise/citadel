import { readdirSync, readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { installVirtualBrowserControls } from "../tests/virtual-input";
import { createDesktopInput, MOUSE_RADIANS_PER_PIXEL } from "../apps/web/src/input/desktop";
import { fortress } from "../apps/web/src/simulation/arena";

afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const nativeLock = vi.fn(),
    nativeFullscreen = vi.fn(),
    nativeExit = vi.fn();
  class ElementFixture extends EventTarget {
    focus = vi.fn();
  }
  // Use inherited browser APIs, as real canvas elements do.
  Object.assign(ElementFixture.prototype, {
    requestPointerLock: nativeLock,
    requestFullscreen: nativeFullscreen,
  });
  const canvas = new ElementFixture();
  const documentFixture = Object.assign(new EventTarget(), {
    activeElement: canvas,
    querySelector: () => canvas,
    exitPointerLock: nativeExit,
    exitFullscreen: nativeExit,
  });
  const windowFixture = new EventTarget() as EventTarget & Window;
  class SyntheticMouse extends Event {
    clientX: number;
    clientY: number;
    button: number;
    constructor(type: string, options: MouseEventInit = {}) {
      super(type, options);
      this.clientX = options.clientX ?? 0;
      this.clientY = options.clientY ?? 0;
      this.button = options.button ?? 0;
    }
  }
  class SyntheticKeyboard extends Event {
    code: string;
    constructor(type: string, options: KeyboardEventInit = {}) {
      super(type, options);
      this.code = options.code ?? "";
    }
  }
  class SyntheticPointer extends SyntheticMouse {
    pointerId: number;
    pointerType: string;
    constructor(type: string, options: PointerEventInit = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 0;
      this.pointerType = options.pointerType ?? "";
    }
  }
  vi.stubGlobal("document", documentFixture);
  vi.stubGlobal("window", windowFixture);
  vi.stubGlobal("Element", ElementFixture);
  vi.stubGlobal("MouseEvent", SyntheticMouse);
  vi.stubGlobal("KeyboardEvent", SyntheticKeyboard);
  vi.stubGlobal("PointerEvent", SyntheticPointer);
  installVirtualBrowserControls();
  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    doc: documentFixture as unknown as Document,
    window: windowFixture,
    nativeLock,
    nativeFullscreen,
    nativeExit,
  };
}
it("captures, steers, serves, clears and disposes through the real adapter without native mouse APIs", async () => {
  const f = fixture(),
    base = fortress(0).direction;
  const controls = createDesktopInput(f.canvas, 0, () => base, vi.fn(), vi.fn());
  f.window.__citadelTestInput.move(10, 0);
  expect(controls.read().targetAngle).toBeNull();
  controls.capture();
  await Promise.resolve();
  expect(f.doc.pointerLockElement).toBe(f.canvas);
  f.window.__citadelTestInput.move(30, 0);
  expect(controls.read().targetAngle).toBeCloseTo(base + 30 * MOUSE_RADIANS_PER_PIXEL);
  f.window.__citadelTestInput.key("KeyD", true);
  expect(controls.read().steer).toBe(1);
  f.window.__citadelTestInput.key("KeyD", false);
  f.window.__citadelTestInput.click();
  expect(controls.read().launch).toBe(true);
  controls.release();
  expect(f.doc.pointerLockElement).toBeNull();
  controls.capture();
  f.window.__citadelTestInput.move(30, 0);
  expect(controls.read().targetAngle).toBeCloseTo(base + 30 * MOUSE_RADIANS_PER_PIXEL);
  controls.release();
  expect(controls.read().launch).toBe(false);
  controls.dispose();
  expect(f.nativeLock).not.toHaveBeenCalled();
  expect(f.nativeExit).not.toHaveBeenCalled();
});
it("keeps fullscreen and finger capture in the document and supports cancellation", async () => {
  const f = fixture(),
    lost = vi.fn();
  f.canvas.addEventListener("lostpointercapture", lost);
  await f.canvas.requestFullscreen();
  expect(f.doc.fullscreenElement).toBe(f.canvas);
  await f.doc.exitFullscreen();
  expect(f.doc.fullscreenElement).toBeNull();
  f.canvas.setPointerCapture(7);
  expect(f.canvas.hasPointerCapture(7)).toBe(true);
  f.canvas.releasePointerCapture(7);
  expect(lost).toHaveBeenCalledTimes(1);
  expect(f.canvas.hasPointerCapture(7)).toBe(false);
  expect(f.nativeFullscreen).not.toHaveBeenCalled();
  expect(f.nativeExit).not.toHaveBeenCalled();
});

it("requires the isolated fixture and synthetic movement in every automated browser spec", () => {
  const directory = new URL("../tests/", import.meta.url);
  for (const name of readdirSync(directory).filter((name) => name.endsWith(".spec.ts"))) {
    const source = readFileSync(new URL(name, directory), "utf8");
    expect(source, name).toContain('from "./fixtures"');
    expect(source, name).not.toContain('from "@playwright/test"');
    expect(source, name).not.toContain("page.mouse.");
  }
});
