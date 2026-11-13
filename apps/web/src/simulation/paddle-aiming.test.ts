import { expect, it } from "vite-plus/test";
import { ARENA, batCentre, batHalfAngle, createArena, fortress } from "./arena";
import { paddleReturn, sweepPaddle } from "./collision";
import { add, angleDifference, angleOf, length, scale, unit } from "./vector";

it("keeps the standard bat's span while giving the front a visibly deeper bow", () => {
  const previousHalfSpan = 2.2 * Math.sin(0.48);
  expect(ARENA.batRadius * Math.sin(ARENA.batHalfAngle)).toBeCloseTo(previousHalfSpan, 10);
  expect(ARENA.batRadius * (1 - Math.cos(ARENA.batHalfAngle))).toBeGreaterThan(
    2.2 * (1 - Math.cos(0.48)) * 1.4,
  );
});
it("aims identical parallel incoming shots by where they hit, with mirrored centre/shoulder/edge returns", () => {
  for (const count of [2, 3, 4, 5, 6] as const)
    for (let seat = 0; seat < count; seat++) {
      const arena = createArena(count),
        angle = fortress(seat, arena).direction;
      const halfSpan = ARENA.batRadius * Math.sin(batHalfAngle(arena));
      const centre = batCentre(seat, angle, arena),
        forward = unit(angle),
        tangent = unit(angle + Math.PI / 2);
      const turns: number[] = [];
      for (const offset of [-0.75, -0.5, 0, 0.5, 0.75]) {
        const start = add(
          add(centre, scale(forward, ARENA.batRadius + 2)),
          scale(tangent, halfSpan * offset),
        );
        const incoming = scale(forward, -24),
          hit = sweepPaddle(start, incoming, seat, angle, 0, 0.2, arena);
        expect(hit).not.toBeNull();
        const outgoing = paddleReturn(incoming, hit!.offset, hit!.normal);
        expect(length(outgoing)).toBeCloseTo(24, 9);
        turns.push(angleDifference(angleOf(outgoing), angle));
      }
      expect(turns[2]).toBeCloseTo(0, 8);
      expect(turns[0]).toBeCloseTo(-turns[4]!, 8);
      expect(turns[1]).toBeCloseTo(-turns[3]!, 8);
      expect(turns[3]).toBeGreaterThan(0.4);
      expect(turns[4]).toBeGreaterThan(0.65);
      expect(turns.every((turn, i) => i === 0 || turn > turns[i - 1]!)).toBe(true);
    }
});
