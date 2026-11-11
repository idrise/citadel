import { expect, it } from "vite-plus/test";
import { crowdShape } from "./crowd-shape";

it("keeps both the cheer's pitch and vowels rising, reserving falling contours for loss", () => {
  const cheer = crowdShape(false),
    loss = crowdShape(true);
  for (const values of [cheer.pitch, ...cheer.formants]) {
    expect(values[1]).toBeGreaterThan(values[0]);
    expect(values[2]).toBeGreaterThan(values[1]);
  }
  expect(loss.pitch[2]).toBeLessThan(loss.pitch[0]);
  for (const values of loss.formants) expect(values[2]).toBeLessThan(values[0]);
  expect(cheer.air).toBeGreaterThan(loss.air);
});
