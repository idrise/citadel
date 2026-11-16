import { MUSIC_LOOK_AHEAD } from "../audio/schedule-window";
import { expect, it } from "vite-plus/test";
import { comparisonPasses, type Comparison } from "./protocol";
const config: Comparison = {
  comparison: "quality",
  change: "scale",
  seats: 6,
  shape: "classic",
  workload: "play",
  reverse: false,
  staticAudio: false,
};
it("uses identical fixed render scales for High/Low, real engine-off and one-variable comparisons", () => {
  const [high, low] = comparisonPasses(config);
  expect([high?.seconds, low?.seconds]).toEqual([60, 60]);
  expect(low).toEqual({ ...high, id: "low", quality: "low" });
  for (const change of [
    "scale",
    "bloom",
    "floorReflection",
    "wallReflections",
    "drawing",
    "audio",
    "balanced",
  ] as const) {
    const [reference, changed] = comparisonPasses({ ...config, comparison: "custom", change });
    expect(reference?.rendering.fixedScale).toBe(1);
    expect(changed?.id).toBe(change);
    if (change === "audio") expect(changed?.audio).toBe(false);
    if (change === "balanced") expect(changed?.latencyHint).toBe("balanced");
    if (change === "scale") expect(changed?.rendering.fixedScale).toBe(0.5);
  }
});
it("compares the same controlled interruption with only score headroom changed, in either order", () => {
  const passes = comparisonPasses({ ...config, comparison: "audio", staticAudio: true });
  expect(passes[0]).toMatchObject({ lookAhead: 0.04, stallMs: 80, seconds: 25, draw: false });
  expect(passes[1]).toEqual({
    ...passes[0],
    id: `music-${MUSIC_LOOK_AHEAD * 1000}ms`,
    lookAhead: MUSIC_LOOK_AHEAD,
  });
  expect(
    comparisonPasses({ ...config, comparison: "audio", staticAudio: true, reverse: true }),
  ).toEqual([...passes].reverse());
});
it("labels duration overrides through settings, rejects invalid overrides and supports ten-minute soak", () => {
  expect(comparisonPasses(config, 2).every((p) => p.seconds === 2)).toBe(true);
  for (const n of [NaN, Infinity, 0, -1, 601]) expect(() => comparisonPasses(config, n)).toThrow();
  expect(comparisonPasses({ ...config, comparison: "soak" })).toHaveLength(1);
  expect(comparisonPasses({ ...config, comparison: "soak" })[0]?.seconds).toBe(600);
});
