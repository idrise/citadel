import { afterEach, expect, it, vi } from "vite-plus/test";
import { clampPaddleAngle, fortress } from "../simulation/arena";
import { createDesktopInput, MOUSE_RADIANS_PER_PIXEL } from "./desktop";

afterEach(() => vi.unstubAllGlobals());
function inputFixture() {
  const canvas = new EventTarget() as HTMLCanvasElement;
  const windowEvents = new EventTarget();
  const documentEvents = Object.assign(new EventTarget(), {
    activeElement: canvas,
    pointerLockElement: null as HTMLCanvasElement | null,
    exitPointerLock: vi.fn(() => {
      documentEvents.pointerLockElement = null;
      documentEvents.dispatchEvent(new Event("pointerlockchange"));
    }),
  });
  canvas.focus = vi.fn();
  canvas.requestPointerLock = vi.fn(async () => {
    documentEvents.pointerLockElement = canvas;
    documentEvents.dispatchEvent(new Event("pointerlockchange"));
  });
  vi.stubGlobal("window", windowEvents);
  vi.stubGlobal("document", documentEvents);
  let currentAngle = fortress(0).direction;
  const lost = vi.fn();
  const controls = createDesktopInput(canvas, 0, () => currentAngle, vi.fn(), lost);
  const move = (amount: number) =>
    canvas.dispatchEvent(Object.assign(new Event("mousemove"), { movementX: amount }));
  return {
    canvas,
    windowEvents,
    documentEvents,
    controls,
    lost,
    move,
    setAngle: (angle: number) => {
      currentAngle = angle;
    },
  };
}

it("uses captured relative movement and holds a world target without any screen or camera dependency", async () => {
  const input = inputFixture();
  input.move(25);
  expect(input.controls.read().targetAngle).toBeNull();
  input.controls.capture();
  await Promise.resolve();
  input.move(25);
  const target = fortress(0).direction + 25 * MOUSE_RADIANS_PER_PIXEL;
  expect(input.controls.read().targetAngle).toBeCloseTo(target);
  for (let tick = 0; tick < 120; tick++)
    expect(input.controls.read().targetAngle).toBeCloseTo(target);
  input.move(-10);
  expect(input.controls.read().targetAngle).toBeCloseTo(target - 10 * MOUSE_RADIANS_PER_PIXEL);
  input.controls.dispose();
});

it("clamps unlimited deltas and clears held keys when capture is lost", async () => {
  const input = inputFixture();
  input.controls.capture();
  await Promise.resolve();
  input.move(50000);
  expect(input.controls.read().targetAngle).toBeCloseTo(
    clampPaddleAngle(0, fortress(0).direction + 2),
  );
  input.move(-50000);
  expect(input.controls.read().targetAngle).toBeCloseTo(
    clampPaddleAngle(0, fortress(0).direction - 2),
  );
  input.windowEvents.dispatchEvent(Object.assign(new Event("keydown"), { code: "KeyD" }));
  expect(input.controls.read().steer).toBe(1);
  input.controls.release();
  expect(input.lost).toHaveBeenCalledTimes(1);
  expect(input.controls.read().steer).toBe(0);
  expect(input.controls.read().targetAngle).toBeNull();
  input.controls.dispose();
});

it("starts new mouse movement at the actual bat angle after keyboard steering and releases on dispose", async () => {
  const input = inputFixture();
  input.controls.capture();
  await Promise.resolve();
  input.windowEvents.dispatchEvent(Object.assign(new Event("keydown"), { code: "KeyD" }));
  input.controls.read();
  input.setAngle(fortress(0).direction + 0.2);
  input.windowEvents.dispatchEvent(Object.assign(new Event("keyup"), { code: "KeyD" }));
  input.move(2);
  expect(input.controls.read().targetAngle).toBeCloseTo(
    fortress(0).direction + 0.2 + 2 * MOUSE_RADIANS_PER_PIXEL,
  );
  input.controls.dispose();
  expect(input.documentEvents.pointerLockElement).toBeNull();
  expect(input.lost).not.toHaveBeenCalled();
});

it("reports capture rejection so the session can stay paused", async () => {
  const input = inputFixture();
  input.canvas.requestPointerLock = vi.fn(async () => {
    throw new Error("Capture denied");
  });
  input.controls.capture();
  await vi.waitFor(() => expect(input.lost).toHaveBeenCalledOnce());
  expect(input.controls.read().targetAngle).toBeNull();
  input.controls.dispose();
});

it("releases a capture that completes after the input adapter was disposed", async () => {
  const input = inputFixture();
  let complete!: () => void;
  input.canvas.requestPointerLock = vi.fn(
    () => new Promise<void>((resolve) => (complete = resolve)),
  );
  input.controls.capture();
  input.controls.dispose();
  input.documentEvents.pointerLockElement = input.canvas;
  complete();
  await Promise.resolve();
  expect(input.documentEvents.pointerLockElement).toBeNull();
  expect(input.lost).not.toHaveBeenCalled();
});
