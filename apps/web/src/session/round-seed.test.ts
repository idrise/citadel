import { expect, it } from "vite-plus/test";
import { roundSeed } from "./round-seed";
it("uses fresh attempt entropy while allowing exact seeded reproductions", () => {
  let next = 500;
  expect(roundSeed("", () => next++)).toBe(500);
  expect(roundSeed("", () => next++)).toBe(501);
  expect(
    roundSeed("?seed=2026", () => {
      throw new Error("not random");
    }),
  ).toBe(2026);
  expect(roundSeed("?seed=0")).toBe(0);
  expect(roundSeed("?seed=2026&supplySeed=73", undefined, "supplySeed")).toBe(73);
  expect(roundSeed("?seed=2026", undefined, "supplySeed")).toBe(2026);
  for (const search of ["?seed=-1", "?seed=no", "?seed=4294967296", "?seed=2e3"])
    expect(roundSeed(search, () => 17)).toBe(17);
});
