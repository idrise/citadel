import { expect, it } from "vite-plus/test";
import { trajectoryDots } from "./trajectory";

it("keeps dots evenly spaced through sampled bends instead of drawing a chord past the bounce", () => {
  const source = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
  ];
  expect(trajectoryDots(source, 0.5)).toEqual([
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 0.5 },
    { x: 1, y: 1 },
  ]);
  expect(source[1]).toEqual({ x: 1, y: 0 });
});
it("accepts curved samples, duplicate contact points and a bounded display budget", () => {
  const curve = Array.from({ length: 33 }, (_, index) => ({
    x: 2 * Math.cos(((index / 32) * Math.PI) / 2),
    y: 2 * Math.sin(((index / 32) * Math.PI) / 2),
  }));
  const dots = trajectoryDots(curve, 0.1);
  expect(dots.length).toBeGreaterThan(25);
  for (const dot of dots) expect(Math.hypot(dot.x, dot.y)).toBeCloseTo(2, 2);
  expect(
    trajectoryDots(
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      0.1,
      5,
    ),
  ).toHaveLength(5);
  expect(trajectoryDots([])).toEqual([]);
  expect(trajectoryDots(curve, 0)).toEqual([]);
});
