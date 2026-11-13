import { levelDifficulty } from "../simulation/difficulty";
/** Debug navigation owns no persistence. Leaving it restores the caller's saved level. */
export function createDebugLevels() {
  let value: number | null = null,
    previous: number | undefined;
  return {
    get active() {
      return value !== null;
    },
    get previous() {
      return previous;
    },
    move(delta: number, current: number) {
      previous = current;
      value = levelDifficulty(current + delta).level;
      return value;
    },
    exit() {
      value = null;
      previous = undefined;
    },
  };
}
export function debugLevelStep(
  event: Pick<
    KeyboardEvent,
    "key" | "code" | "repeat" | "ctrlKey" | "metaKey" | "altKey" | "target"
  >,
): number | "exit" | null {
  const target = event.target as HTMLElement | null;
  if (
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    target?.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target?.tagName ?? "")
  )
    return null;
  if (event.key === "Backspace") return "exit";
  if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") return 1;
  if (event.key === "-" || event.key === "−" || event.code === "NumpadSubtract") return -1;
  return null;
}
