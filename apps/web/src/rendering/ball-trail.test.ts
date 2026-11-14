import { expect, it } from "vite-plus/test";
import { createBallTrail } from "./ball-trail";
function straight(speed: number, hz: number, budget = 20) {
  const history = createBallTrail(),
    output = new Float32Array(40);
  for (let i = 0; i <= hz; i++) history.push(i / hz, (speed * i) / hz, 0);
  expect(history.sample(1, speed, budget, output)).toBe(budget);
  return Math.hypot(
    output[0]! - output[(budget - 1) * 2]!,
    output[1]! - output[(budget - 1) * 2 + 1]!,
  );
}
it("makes faster flight longer at every frame rate and trail budget", () => {
  for (const hz of [30, 60, 120])
    for (const budget of [8, 12, 20]) {
      const lengths = [14, 24, 34, 59.5].map((speed) => straight(speed, hz, budget));
      expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
      lengths.forEach((length, i) =>
        expect(length).toBeCloseTo(straight([14, 24, 34, 59.5][i]!, 60, 20), 4),
      );
    }
});
it("keeps a curved history through a dropped frame and resets on reused/backward time", () => {
  const history = createBallTrail(),
    output = new Float32Array(40);
  for (const time of [0, 0.02, 0.04, 0.09, 0.1]) history.push(time, time * 20, time * time * 20);
  expect(history.sample(0.1, 20, 20, output)).toBe(20);
  expect(output[3]).toBeGreaterThan(output[39]!);
  history.push(0, 50, 50);
  expect(history.sample(0, 20, 20, output)).toBe(0);
  history.push(0.01, 50.2, 50);
  history.reset();
  expect(history.sample(0.01, 20, 20, output)).toBe(0);
});
