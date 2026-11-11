import { expect, it } from "vite-plus/test";
import { victoryOutro } from "./victory-outro";
it("resolves a win with an ascending finite closing phrase rather than starting another gameplay loop", () => {
  const cues = Array.from({ length: 80 }, (_, step) => victoryOutro(step));
  const answers = cues
    .flat()
    .filter((c) => c.voice === "answer")
    .map((c) => c.note);
  expect(answers.at(-1)).toBeGreaterThan(answers[0]!);
  expect(cues.slice(40).flat()).toEqual([]);
  expect(cues.flat().some((c) => ["damage", "riser", "breath"].includes(c.voice))).toBe(false);
});
