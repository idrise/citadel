import { afterEach, expect, it, vi } from "vite-plus/test";
import {
  clampPaddleAngle,
  fortress,
  railPosition,
  SQUARE_ARENA,
  type ArenaGeometry,
} from "../simulation/arena";
import { createMatch, stepMatch } from "../simulation/match";
import { scale, unit } from "../simulation/vector";
import { createDesktopInput, MOUSE_RADIANS_PER_PIXEL } from "./desktop";

afterEach(() => vi.unstubAllGlobals());
function inputFixture(seat = 0, geometry: () => ArenaGeometry = () => SQUARE_ARENA) {
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
  let currentAngle = fortress(seat, geometry()).direction;
  let sensitivity = 1;
  const lost = vi.fn();
  const controls = createDesktopInput(
    canvas,
    seat,
    () => currentAngle,
    vi.fn(),
    lost,
    () => sensitivity,
    geometry,
  );
  const move = (amount: number) =>
    canvas.dispatchEvent(Object.assign(new Event("mousemove"), { movementX: amount }));
  return {
    canvas,
    setSensitivity: (value: number) => {
      sensitivity = value;
    },
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

it.each([-1, 1])(
  "a captured 12-pixel mouse brush produces a readable signed return on side %s",
  async (side) => {
    const input = inputFixture();
    let state = createMatch(2026);
    state.phase = "playing";
    const base = fortress(0).direction;
    state.players[0]!.angle = base - side * 12 * MOUSE_RADIANS_PER_PIXEL;
    state.balls = [
      {
        ...state.balls[0]!,
        phase: "active",
        position: railPosition(0, base, 6),
        velocity: scale(unit(base), -24),
      },
    ];
    input.setAngle(state.players[0]!.angle);
    input.controls.capture();
    await Promise.resolve();
    input.move(side * 12);
    for (let tick = 0; tick < 12; tick++) {
      state = stepMatch(state, input.controls.read());
      input.setAngle(state.players[0]!.angle);
      if (state.events.some((event) => event.type === "paddle")) break;
    }
    expect(state.events.find((event) => event.type === "paddle")?.seat).toBe(0);
    expect(state.players[0]!.angle).toBeCloseTo(base, 10);
    expect(Math.sign(state.balls[0]!.spin ?? 0)).toBe(side);
    expect(Math.abs(state.balls[0]!.spin ?? 0)).toBeGreaterThan(0.6);
    input.controls.dispose();
  },
);

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
  input.setAngle(target);
  input.move(-10);
  expect(input.controls.read().targetAngle).toBeCloseTo(target - 10 * MOUSE_RADIANS_PER_PIXEL);
  input.controls.dispose();
});

it("reverses immediately from the actual bat instead of unwinding an unreached mouse target", async () => {
  const input = inputFixture();
  input.controls.capture();
  await Promise.resolve();
  input.move(100);
  const actual = fortress(0).direction + 0.05;
  input.setAngle(actual);
  input.move(-5);
  expect(input.controls.read().targetAngle).toBeCloseTo(actual - 5 * MOUSE_RADIANS_PER_PIXEL);
  input.controls.dispose();
});

it("requests raw mouse movement and falls back when the browser cannot provide it", async () => {
  const input = inputFixture();
  const request = vi
    .fn()
    .mockRejectedValueOnce(new DOMException("Raw input unavailable", "NotSupportedError"))
    .mockResolvedValueOnce(undefined);
  input.canvas.requestPointerLock = request;
  input.controls.capture();
  input.documentEvents.dispatchEvent(new Event("pointerlockerror"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(request.mock.calls).toEqual([[{ unadjustedMovement: true }], [undefined]]);
  expect(input.lost).not.toHaveBeenCalled();
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
  expect(input.lost).not.toHaveBeenCalled();
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

it.each([0, 1, 2, 3])(
  "honours sensitivity and clamps/reverses cleanly at both limits for seat %s",
  async (seat) => {
    const input = inputFixture(seat);
    input.controls.capture();
    await Promise.resolve();
    input.setSensitivity(0.5);
    input.move(10);
    expect(input.controls.read().targetAngle).toBeCloseTo(
      fortress(seat).direction + 5 * MOUSE_RADIANS_PER_PIXEL,
    );
    input.setSensitivity(2);
    input.move(10);
    expect(input.controls.read().targetAngle).toBeCloseTo(
      fortress(seat).direction + 25 * MOUSE_RADIANS_PER_PIXEL,
    );
    input.move(1e6);
    const upper = input.controls.read().targetAngle!;
    input.setAngle(upper);
    input.move(-1);
    expect(input.controls.read().targetAngle).toBeCloseTo(upper - 2 * MOUSE_RADIANS_PER_PIXEL);
    input.move(-1e6);
    const lower = input.controls.read().targetAngle!;
    input.setAngle(lower);
    input.move(1);
    expect(input.controls.read().targetAngle).toBeCloseTo(lower + 2 * MOUSE_RADIANS_PER_PIXEL);
    input.setSensitivity(NaN);
    input.setAngle(fortress(seat).direction);
    input.controls.clear();
    input.move(1);
    expect(input.controls.read().targetAngle).toBeCloseTo(
      fortress(seat).direction + MOUSE_RADIANS_PER_PIXEL,
    );
    input.move(NaN);
    expect(Number.isFinite(input.controls.read().targetAngle)).toBe(true);
    input.controls.dispose();
  },
);

it.each(["Space", "Enter"])(
  "latches one %s launch without a held repeat cancelling or repeating it",
  async (code) => {
    const input = inputFixture();
    input.controls.capture();
    await Promise.resolve();
    const down = (repeat = false) =>
      input.windowEvents.dispatchEvent(Object.assign(new Event("keydown"), { code, repeat }));
    down();
    down(true);
    expect(input.controls.read().launch).toBe(true);
    down(true);
    down();
    expect(input.controls.read().launch).toBe(false);
    input.windowEvents.dispatchEvent(Object.assign(new Event("keyup"), { code }));
    down();
    expect(input.controls.read().launch).toBe(true);
    input.controls.dispose();
  },
);

it("accepts only captured primary clicks and cancels opposing keyboard keys", async () => {
  const input = inputFixture();
  const click = (button: number) =>
    input.canvas.dispatchEvent(Object.assign(new Event("mousedown"), { button }));
  click(0);
  expect(input.controls.read().launch).toBe(false);
  input.controls.capture();
  await Promise.resolve();
  click(2);
  expect(input.controls.read().launch).toBe(false);
  click(0);
  expect(input.controls.read().launch).toBe(true);
  expect(input.controls.read().launch).toBe(false);
  input.move(20);
  for (const code of ["KeyA", "ArrowRight"])
    input.windowEvents.dispatchEvent(Object.assign(new Event("keydown"), { code }));
  const intent = input.controls.read();
  expect(intent.steer).toBe(0);
  expect(intent.targetAngle).toBeNull();
  input.controls.dispose();
});

it("releases a delayed capture after pause and ignores an obsolete request rejection", async () => {
  const input = inputFixture();
  let complete!: () => void;
  input.canvas.requestPointerLock = vi.fn(
    () => new Promise<void>((resolve) => (complete = resolve)),
  );
  input.controls.capture();
  input.controls.release();
  input.documentEvents.pointerLockElement = input.canvas;
  complete();
  await Promise.resolve();
  expect(input.documentEvents.pointerLockElement).toBeNull();
  let rejectOld!: (reason: Error) => void;
  let completeNew!: () => void;
  let request = 0;
  input.canvas.requestPointerLock = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        if (request++ === 0) rejectOld = reject;
        else completeNew = resolve;
      }),
  );
  input.controls.capture();
  input.controls.release();
  input.controls.capture();
  const before = input.lost.mock.calls.length;
  rejectOld(new Error("obsolete"));
  await Promise.resolve();
  await Promise.resolve();
  expect(input.lost.mock.calls.length).toBe(before);
  input.documentEvents.pointerLockElement = input.canvas;
  completeNew();
  await Promise.resolve();
  expect(input.documentEvents.pointerLockElement).toBe(input.canvas);
  input.controls.dispose();
});

it("handles legacy pointer-lock errors and synchronous capture failures", () => {
  const input = inputFixture();
  input.canvas.requestPointerLock = vi.fn(() => {
    throw new Error("denied");
  });
  input.controls.capture();
  expect(input.lost).toHaveBeenCalledOnce();
  input.canvas.requestPointerLock = vi.fn(() => undefined as never);
  input.controls.capture();
  input.documentEvents.dispatchEvent(new Event("pointerlockerror"));
  expect(input.lost).toHaveBeenCalledTimes(2);
  input.controls.dispose();
});

it("carries a captured relative target with a moving fortress without synthesising mouse motion", async () => {
  let geometry = structuredClone(SQUARE_ARENA);
  const input = inputFixture(0, () => geometry);
  input.controls.capture();
  await Promise.resolve();
  input.move(25);
  const before = input.controls.read().targetAngle!;
  geometry = {
    ...geometry,
    fortresses: geometry.fortresses.map((seat) => ({ ...seat, direction: seat.direction + 0.3 })),
  };
  expect(input.controls.read().targetAngle).toBeCloseTo(before + 0.3);
  expect(input.controls.read().targetAngle).toBeCloseTo(before + 0.3);
  input.move(10);
  expect(input.controls.read().targetAngle).toBeCloseTo(
    before + 0.3 + 10 * MOUSE_RADIANS_PER_PIXEL,
  );
  input.controls.clear();
  input.setAngle(fortress(0, geometry).direction);
  expect(input.controls.read().targetAngle).toBeNull();
  input.controls.dispose();
});

it("pauses only for unexpected lock loss, not intentional release after elimination", async () => {
  const input = inputFixture();
  input.controls.capture();
  await Promise.resolve();
  input.controls.release();
  expect(input.lost).not.toHaveBeenCalled();
  input.controls.capture();
  await Promise.resolve();
  input.documentEvents.exitPointerLock();
  expect(input.lost).toHaveBeenCalledOnce();
  input.controls.dispose();
});
