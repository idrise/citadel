import { describe, expect, it } from "vite-plus/test";
import { ARENA, FORTRESSES, clampPaddleAngle, railPosition } from "./arena";
import { angleDifference, angleOf, length, sub } from "./vector";

describe("four-corner arena", () => {
  it("puts all 32 targets behind the curved rail, inside the walls, in four symmetric sectors", () => {
    expect(FORTRESSES).toHaveLength(4);
    for (const seat of FORTRESSES) {
      expect(seat.pieces).toHaveLength(8);
      for (const piece of seat.pieces) {
        expect(length(sub(piece, seat.anchor)) + ARENA.pieceRadius).toBeLessThan(
          ARENA.railRadius - ARENA.paddleThickness,
        );
        expect(Math.abs(piece.x) + ARENA.pieceRadius).toBeLessThan(ARENA.halfSize + 0.02);
        expect(Math.abs(piece.y) + ARENA.pieceRadius).toBeLessThan(ARENA.halfSize + 0.02);
        expect(
          Math.abs(angleDifference(angleOf(sub(piece, seat.anchor)), seat.direction)),
        ).toBeLessThan(ARENA.sectorHalfAngle);
      }
      expect(length(sub(railPosition(seat.id, seat.direction), seat.anchor))).toBeGreaterThan(
        Math.max(
          ...seat.pieces.map((piece) => length(sub(piece, seat.anchor)) + ARENA.pieceRadius),
        ),
      );
    }
    expect(FORTRESSES[0]!.pieces.map((piece) => ({ x: -piece.x, y: -piece.y }))).toEqual(
      FORTRESSES[2]!.pieces.map((piece) => ({
        x: expect.closeTo(piece.x),
        y: expect.closeTo(piece.y),
      })),
    );
  });

  it("clamps wrapped pointer angles and leaves room for the whole paddle at each end", () => {
    for (const seat of FORTRESSES) {
      const limit =
        ARENA.sectorHalfAngle -
        ARENA.paddleHalfAngle -
        Math.asin((ARENA.ballRadius + ARENA.paddleThickness / 2 + 0.01) / ARENA.railRadius);
      expect(clampPaddleAngle(seat.id, seat.direction + 2 * Math.PI)).toBeCloseTo(seat.direction);
      expect(clampPaddleAngle(seat.id, seat.direction + 2)).toBeCloseTo(seat.direction + limit);
      expect(clampPaddleAngle(seat.id, seat.direction - 2)).toBeCloseTo(seat.direction - limit);
    }
  });
});
