import { afterEach, expect, it, vi } from "vite-plus/test";
import { createEmbeddedDesktopInput, embeddedMouseAngle } from "./embedded-desktop";
import { clampPaddleAngle, fortress, SQUARE_ARENA } from "../simulation/arena";

afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const canvas = new EventTarget() as HTMLCanvasElement;
  const doc = {
    activeElement: null as unknown,
    pointerLockElement: null,
    exitPointerLock: vi.fn(),
  };
  canvas.focus = vi.fn(() => {
    doc.activeElement = canvas;
  });
  canvas.getBoundingClientRect = () => ({ left: 100, width: 800 }) as DOMRect;
  const requestLock = vi.fn();
  canvas.requestPointerLock = requestLock;
  const win = new EventTarget();
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  let arena = structuredClone(SQUARE_ARENA);
  const pause = vi.fn();
  const controls = createEmbeddedDesktopInput(
    canvas,
    0,
    pause,
    () => 1,
    () => arena,
  );
  const mouse = (x: number) =>
    canvas.dispatchEvent(Object.assign(new Event("mousemove"), { clientX: x }));
  const key = (code: string, repeat = false) =>
    win.dispatchEvent(Object.assign(new Event("keydown", { cancelable: true }), { code, repeat }));
  return {
    canvas,
    requestLock,
    controls,
    mouse,
    key,
    pause,
    doc,
    win,
    rotate: () => {
      arena = {
        ...arena,
        fortresses: arena.fortresses.map((home) => ({ ...home, direction: home.direction + 0.3 })),
      };
    },
  };
}

it.each([0.5, 1, 2, NaN])(
  "retains full legal reach with sensitivity %s and an offset embed",
  (sensitivity) => {
    expect(embeddedMouseAngle(100, 100, 800, -0.8, 0.9, sensitivity)).toBeCloseTo(-0.8);
    expect(embeddedMouseAngle(900, 100, 800, -0.8, 0.9, sensitivity)).toBeCloseTo(0.9);
    expect(embeddedMouseAngle(500, 100, 800, -0.8, 0.9, sensitivity)).toBeCloseTo(0.05);
    expect(embeddedMouseAngle(-500, 100, 800, -0.8, 0.9, sensitivity)).toBeCloseTo(-0.8);
  },
);
it("starts without pointer lock, steers from embed coordinates and rebases through morphs", () => {
  const f = fixture();
  f.mouse(700);
  expect(f.controls.read().targetAngle).toBeNull();
  f.controls.capture();
  f.mouse(900);
  expect(f.controls.read().targetAngle).toBeCloseTo(
    clampPaddleAngle(0, fortress(0).direction + Math.PI / 2),
  );
  const before = f.controls.read().targetAngle!;
  f.rotate();
  expect(f.controls.read().targetAngle).toBeCloseTo(before + 0.3);
  expect(f.requestLock).not.toHaveBeenCalled();
  f.controls.dispose();
  expect(f.doc.exitPointerLock).not.toHaveBeenCalled();
});
it("supports keyboard steering and single-shot serving only while the game owns focus", () => {
  const f = fixture();
  f.key("Space");
  expect(f.controls.read().launch).toBe(false);
  f.controls.capture();
  f.key("KeyD");
  expect(f.controls.read().steer).toBe(1);
  f.key("Space");
  f.key("Space", true);
  expect(f.controls.read().launch).toBe(true);
  expect(f.controls.read().launch).toBe(false);
  f.key("Escape");
  expect(f.pause).toHaveBeenCalledOnce();
  f.doc.activeElement = null;
  f.key("KeyP");
  expect(f.pause).toHaveBeenCalledOnce();
  f.controls.release();
  expect(f.controls.read()).toMatchObject({ steer: 0, targetAngle: null, launch: false });
  f.controls.dispose();
});
it("clears queued mouse clicks on reset/release and removes listeners on disposal", () => {
  const f = fixture();
  const click = () => f.canvas.dispatchEvent(Object.assign(new Event("mousedown"), { button: 0 }));
  f.controls.capture();
  click();
  expect(f.controls.read().launch).toBe(true);
  click();
  f.controls.resetSeat(1);
  expect(f.controls.read().launch).toBe(false);
  click();
  f.controls.release();
  expect(f.controls.read().launch).toBe(false);
  f.controls.capture();
  f.controls.dispose();
  click();
  f.key("Space");
  f.mouse(900);
  expect(f.controls.read()).toMatchObject({ steer: 0, targetAngle: null, launch: false });
});
