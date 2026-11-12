import { expect, it, vi } from "vite-plus/test";
import { fortress, SQUARE_ARENA } from "../simulation/arena";
import { createTouchInput } from "./touch";

function fixture() {
  const canvas = new EventTarget() as HTMLCanvasElement;
  let captured: number | null = null;
  canvas.setPointerCapture = vi.fn((id) => {
    captured = id;
  });
  canvas.hasPointerCapture = vi.fn((id) => captured === id);
  const release = vi.fn(() => {
    captured = null;
  });
  canvas.releasePointerCapture = release;
  canvas.getBoundingClientRect = () => ({ width: 400 }) as DOMRect;
  const home = fortress(0, SQUARE_ARENA).direction;
  const input = createTouchInput(
    canvas,
    0,
    () => home,
    () => SQUARE_ARENA,
  );
  const send = (type: string, x: number, y = 100, id = 1) =>
    canvas.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), {
        pointerType: "touch",
        pointerId: id,
        clientX: x,
        clientY: y,
      }),
    );
  input.capture();
  return { canvas, input, home, send, release };
}

it("steers with captured horizontal finger movement and never serves a drag", () => {
  const { input, home, send } = fixture();
  send("pointerdown", 100);
  send("pointermove", 200);
  expect(input.read().targetAngle).toBeGreaterThan(home);
  send("pointerup", 200);
  expect(input.read().launch).toBe(false);
  input.dispose();
});

it("serves once on a tap, ignores extra fingers and discards cancelled gestures", () => {
  const { input, send } = fixture();
  send("pointerdown", 100);
  send("pointerdown", 200, 100, 2);
  send("pointerup", 200, 100, 2);
  expect(input.read().launch).toBe(false);
  send("pointerup", 102);
  expect(input.read().launch).toBe(true);
  expect(input.read().launch).toBe(false);
  send("pointerdown", 100);
  send("pointercancel", 100);
  expect(input.read().launch).toBe(false);
  send("pointerdown", 100);
  send("pointermove", 120);
  send("pointermove", 100);
  send("pointerup", 100);
  expect(input.read().launch).toBe(false);
  input.dispose();
});

it("follows a drag to the left and does not jump when a new finger touches down", () => {
  const { input, home, send } = fixture();
  send("pointerdown", 300);
  expect(input.read().targetAngle).toBeNull();
  send("pointermove", 200);
  const target = input.read().targetAngle!;
  expect(target).toBeLessThan(home);
  send("pointerup", 200);
  send("pointerdown", 320);
  expect(input.read().targetAngle).toBe(target);
  input.dispose();
});

it("clamps travel and clears held input on pause", () => {
  const { input, send, release } = fixture();
  send("pointerdown", 100);
  send("pointermove", 10000);
  expect(input.read().targetAngle).toBeLessThanOrEqual(
    fortress(0, SQUARE_ARENA).direction + fortress(0, SQUARE_ARENA).halfAngle,
  );
  input.release();
  expect(input.read().targetAngle).toBeNull();
  expect(release).toHaveBeenCalled();
  send("pointerdown", 100);
  send("pointerup", 100);
  expect(input.read().launch).toBe(false);
  input.dispose();
});
