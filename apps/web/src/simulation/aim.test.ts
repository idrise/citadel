import { describe, expect, it } from "vite-plus/test";
import { aimServeAt, serveDirection } from "./aim";
import { ARENA, FORTRESSES, batCentre, clampPaddleAngle, fortress, railPosition } from "./arena";
import { paddleReturn, sweepCircle, sweepPaddle, sweepWalls } from "./collision";
import { add, scale, unit } from "./vector";

describe("adjacent-fortress aiming regression", () => {
  it("can serve directly at every rival from every corner, including the defender above Cyan", () => {
    for (const source of FORTRESSES)
      for (const rival of FORTRESSES) {
        if (source.id === rival.id) continue;
        const target = rival.pieces[3]!;
        const angle = aimServeAt(source.id, target);
        const origin = railPosition(source.id, angle, ARENA.railRadius + 0.4);
        const velocity = scale(serveDirection(source.id, angle), 24);
        const hit = sweepCircle(origin, velocity, target, ARENA.pieceRadius + ARENA.ballRadius, 2);
        expect(hit, `${source.id} must be able to attack ${rival.id}`).not.toBeNull();
        expect(sweepWalls(origin, velocity, hit!.time)).toHaveLength(0);
      }
  });

  it("the actual curved contact face can return directly toward every rival, rather than forcing the opposite corner", () => {
    for (const rival of [1, 2, 3]) {
      const target = fortress(rival).pieces[3]!;
      const base = fortress(0).direction;
      let reachable = false;
      for (let step = 0; step <= 80 && !reachable; step++) {
        const angle = clampPaddleAngle(0, base - 0.5 + step / 80);
        for (let segment = -18; segment <= 18 && !reachable; segment++) {
          const offset = segment / 20;
          const normal = unit(angle + offset * ARENA.batHalfAngle);
          const surface = add(
            batCentre(0, angle),
            scale(normal, ARENA.batRadius + ARENA.paddleThickness / 2 + ARENA.ballRadius),
          );
          const incoming = scale(normal, -24);
          const contact = sweepPaddle(
            add(surface, scale(normal, 0.08)),
            incoming,
            0,
            angle,
            0,
            0.01,
          );
          if (!contact) continue;
          const outgoing = paddleReturn(incoming, contact.offset, contact.normal);
          const targetHit = sweepCircle(
            surface,
            outgoing,
            target,
            ARENA.pieceRadius + ARENA.ballRadius,
            2,
          );
          reachable = Boolean(
            targetHit && sweepWalls(surface, outgoing, targetHit.time).length === 0,
          );
        }
      }
      expect(reachable, `Cyan's bat must reach rival ${rival}`).toBe(true);
    }
  });
});

describe("banks off both walls beside a fortress", () => {
  it("serves can hit either adjacent wall first, before another bat or health piece", () => {
    for (const source of FORTRESSES) {
      const axes = new Set<string>();
      for (const side of [-1, 1]) {
        const angle = clampPaddleAngle(source.id, source.direction + side * 2);
        const origin = railPosition(source.id, angle, ARENA.railRadius + 0.4);
        const velocity = scale(serveDirection(source.id, angle), 24);
        const wall = sweepWalls(origin, velocity, 2).sort((a, b) => a.time - b.time)[0];
        expect(wall).toBeDefined();
        axes.add(wall!.normal.x ? "x" : "y");
        expect(wall!.normal.x || wall!.normal.y).toBe(
          -(wall!.normal.x ? Math.sign(source.anchor.x) : Math.sign(source.anchor.y)),
        );
        for (const rival of FORTRESSES) {
          expect(
            sweepPaddle(origin, velocity, rival.id, rival.direction, 0, wall!.time),
          ).toBeNull();
          for (const piece of rival.pieces)
            expect(
              sweepCircle(
                origin,
                velocity,
                piece,
                ARENA.pieceRadius + ARENA.ballRadius,
                wall!.time,
              ),
            ).toBeNull();
        }
      }
      expect([...axes].sort()).toEqual(["x", "y"]);
    }
  });

  it("actual bat contacts can bank off either adjacent wall and rebound inward", () => {
    for (const source of FORTRESSES) {
      const axes = new Set<string>();
      for (const side of [-1, 1]) {
        const angle = clampPaddleAngle(source.id, source.direction + side * 2);
        const faceNormal = unit(angle + side * 0.6 * ARENA.batHalfAngle);
        const origin = add(
          batCentre(source.id, angle),
          scale(faceNormal, ARENA.batRadius + ARENA.paddleThickness / 2 + ARENA.ballRadius),
        );
        const incoming = scale(faceNormal, -24);
        const contact = sweepPaddle(
          add(origin, scale(faceNormal, 0.08)),
          incoming,
          source.id,
          angle,
          0,
          0.01,
        );
        expect(contact).not.toBeNull();
        const outgoing = paddleReturn(incoming, contact!.offset, contact!.normal);
        const wall = sweepWalls(origin, outgoing, 2).sort((a, b) => a.time - b.time)[0];
        expect(wall).toBeDefined();
        axes.add(wall!.normal.x ? "x" : "y");
        const rebound = {
          x: wall!.normal.x ? -outgoing.x : outgoing.x,
          y: wall!.normal.y ? -outgoing.y : outgoing.y,
        };
        const impact = add(origin, scale(outgoing, wall!.time));
        const after = add(impact, scale(rebound, 0.01));
        expect(Math.abs(after.x)).toBeLessThan(ARENA.halfSize - ARENA.ballRadius);
        expect(Math.abs(after.y)).toBeLessThan(ARENA.halfSize - ARENA.ballRadius);
      }
      expect([...axes].sort()).toEqual(["x", "y"]);
    }
  });
});
