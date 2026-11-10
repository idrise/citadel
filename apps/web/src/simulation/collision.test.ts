import { describe, expect, it } from "vite-plus/test";
import { ARENA, fortress, railPosition } from "./arena";
import { paddleReturn, sweepCircle, sweepPaddle, sweepWalls } from "./collision";
import { dot, length, scale, unit } from "./vector";

describe("swept collisions", () => {
  it("finds a fast crossing that ends beyond the target and ignores a near miss", () => {
    const hit = sweepCircle({ x: -5, y: 0 }, { x: 1000, y: 0 }, { x: 0, y: 0 }, 0.5, 1 / 120);
    expect(hit?.time).toBeCloseTo(0.0045);
    expect(
      sweepCircle({ x: -5, y: 0.51 }, { x: 1000, y: 0 }, { x: 0, y: 0 }, 0.5, 1 / 120),
    ).toBeNull();
  });
  it("does not rebounce an overlapping ball already moving away", () => {
    expect(sweepCircle({ x: 0.4, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, 0.5, 1)).toBeNull();
  });
  it("reports both faces of a simultaneous wall corner", () => {
    const hits = sweepWalls({ x: 0, y: 0 }, { x: 100, y: 100 }, 0.1);
    expect(hits).toHaveLength(2);
    expect(hits[0]!.time).toBeCloseTo((ARENA.halfSize - ARENA.ballRadius) / 100);
    expect(hits[0]!.time).toBe(hits[1]!.time);
  });
  it("hits both sides of a curved paddle without making the whole rail solid", () => {
    const angle = fortress(0).direction;
    const incoming = sweepPaddle(
      railPosition(0, angle, 5),
      scale(unit(angle), -100),
      0,
      angle,
      0,
      0.02,
    );
    const behind = sweepPaddle(
      railPosition(0, angle, 3.8),
      scale(unit(angle), 100),
      0,
      angle,
      0,
      0.02,
    );
    expect(incoming).not.toBeNull();
    expect(behind).not.toBeNull();
    expect(dot(incoming!.normal, behind!.normal)).toBeCloseTo(-1);
    expect(
      sweepPaddle(
        railPosition(0, angle + 0.6, 5),
        scale(unit(angle + 0.6), -100),
        0,
        angle,
        0,
        0.02,
      ),
    ).toBeNull();
  });
  it("detects a moving rounded end sweeping into a stationary ball", () => {
    const angle = fortress(0).direction;
    const point = railPosition(0, angle + ARENA.paddleHalfAngle + 0.09);
    expect(sweepPaddle(point, { x: 0, y: 0 }, 0, angle, 3.2, 1 / 120)).not.toBeNull();
  });
  it("preserves speed and gives different centre/edge shot directions", () => {
    const angle = fortress(0).direction;
    const incoming = scale(unit(angle), -12);
    const centre = paddleReturn(incoming, 0, unit(angle));
    const edge = paddleReturn(incoming, 0.9, unit(angle));
    expect(length(centre)).toBeCloseTo(12);
    expect(length(edge)).toBeCloseTo(12);
    expect(dot(centre, unit(angle))).toBeCloseTo(12);
    expect(dot(edge, unit(angle))).toBeLessThan(12);
    expect(dot(edge, unit(angle))).toBeGreaterThan(0);
  });
});
