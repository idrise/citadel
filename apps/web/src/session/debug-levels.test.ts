import { expect, it } from "vite-plus/test";
import { createDebugLevels, debugLevelStep } from "./debug-levels";
it("navigates bounded unranked levels independently of the saved challenge and exits cleanly", () => {
  const saved = { level: 9, wins: 4, losses: 2 },
    before = structuredClone(saved),
    debug = createDebugLevels();
  expect(debug.active).toBe(false);
  expect(debug.move(1, saved.level)).toBe(10);
  expect(debug.previous).toBe(9);
  expect(debug.active).toBe(true);
  expect(debug.move(100, 10)).toBe(100);
  expect(debug.move(-200, 100)).toBe(1);
  debug.exit();
  expect(debug.active).toBe(false);
  expect(debug.previous).toBeUndefined();
  expect(saved).toEqual(before);
});
it("accepts plus/minus and numpad variants without stealing editor input or browser shortcuts", () => {
  const event = {
    key: "+",
    code: "Equal",
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    target: null,
  };
  expect(debugLevelStep(event)).toBe(1);
  expect(debugLevelStep({ ...event, key: "Backspace" })).toBe("exit");
  expect(debugLevelStep({ ...event, key: "=", code: "Equal" })).toBe(1);
  expect(debugLevelStep({ ...event, key: "-", code: "Minus" })).toBe(-1);
  expect(debugLevelStep({ ...event, key: "", code: "NumpadAdd" })).toBe(1);
  expect(debugLevelStep({ ...event, key: "", code: "NumpadSubtract" })).toBe(-1);
  for (const change of [
    { repeat: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: true },
    { key: "a" },
    { target: { tagName: "INPUT" } },
    { target: { tagName: "SELECT" } },
    { target: { tagName: "TEXTAREA" } },
    { target: { isContentEditable: true } },
  ])
    expect(
      debugLevelStep({ ...event, ...change } as Parameters<typeof debugLevelStep>[0]),
    ).toBeNull();
});
