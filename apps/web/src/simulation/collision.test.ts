import { describe, expect, it } from "vite-plus/test";
import { ARENA, batCentre, batRadius, createArena, fortress, railPosition } from "./arena";
import { paddleReturn, sweepCircle, sweepPaddle, sweepWalls } from "./collision";
import { add, dot, length, scale, unit } from "./vector";

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
    const centre = batCentre(0, angle),
      endAngle = angle + ARENA.batHalfAngle;
    const point = add(
      add(centre, scale(unit(endAngle), ARENA.batRadius)),
      scale(unit(endAngle + Math.PI / 2), ARENA.ballRadius + ARENA.paddleThickness / 2 + 0.005),
    );
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

it("recovers an entering overlap on either curved face without rebouncing departures", () => {
  for (const profile of ["shallow", "standard", "deep"] as const)
    for (const side of [-1, 1]) {
      const arena = createArena(6, undefined, 0, 1, "classic", profile),
        angle = fortress(0, arena).direction,
        normal = scale(unit(angle), side),
        inflation = ARENA.ballRadius + ARENA.paddleThickness / 2,
        point = add(
          batCentre(0, angle, arena),
          scale(unit(angle), batRadius(arena) + side * (inflation - 0.01)),
        ),
        hit = sweepPaddle(point, scale(normal, -59.5), 0, angle, 0, 1 / 120, arena);
      expect(hit?.time).toBe(0);
      expect(hit?.separation).toBeCloseTo(0.01, 10);
      expect(sweepPaddle(point, scale(normal, 59.5), 0, angle, 0, 1 / 120, arena)).toBeNull();
    }
});
