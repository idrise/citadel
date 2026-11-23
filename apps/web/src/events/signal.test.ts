import { expect, it, vi } from "vite-plus/test";
import { createSignal } from "./signal";
import { NO_GAME_SIGNALS } from "./game-signals";

it("delivers typed events and removes subscriptions without affecting other listeners", () => {
  const signal = createSignal<number>(),
    first = vi.fn(),
    second = vi.fn();
  const stop = signal.subscribe(first);
  signal.subscribe(second);
  signal.emit(1);
  stop();
  stop();
  signal.emit(2);
  expect(first.mock.calls).toEqual([[1]]);
  expect(second.mock.calls).toEqual([[1], [2]]);
});
it("isolates throwing and rejecting observers from gameplay and remaining subscribers", async () => {
  const signal = createSignal<void>(),
    working = vi.fn();
  signal.subscribe(() => {
    throw new Error("optional observer");
  });
  signal.subscribe(async () => {
    throw new Error("offline observer");
  });
  signal.subscribe(working);
  expect(() => signal.emit()).not.toThrow();
  await Promise.resolve();
  expect(working).toHaveBeenCalledOnce();
});
it("the web/itch default never retains or calls observers", () => {
  const listener = vi.fn();
  const stop = NO_GAME_SIGNALS.ready.subscribe(listener);
  NO_GAME_SIGNALS.ready.emit();
  NO_GAME_SIGNALS.sessionClosed.emit();
  stop();
  expect(listener).not.toHaveBeenCalled();
});
