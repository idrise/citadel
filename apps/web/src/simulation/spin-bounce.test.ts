import { expect, it } from "vite-plus/test";
import { spinBounce, spinReturn, MAX_SWIPE_CURVE, CURVE_DECAY } from "./flight";
import { advanceBall } from "./ball";
import { createMatch } from "./match";
import { FIXED_DT, fortress, railPosition } from "./arena";
import { DEFAULT_OPTIONS } from "./types";
import { dot, length, scale, unit } from "./vector";
it("has a stronger but bounded curve, with mirrored tangential grip and unchanged ball speed", () => {
  expect(MAX_SWIPE_CURVE / CURVE_DECAY).toBeGreaterThan(1);
  expect(MAX_SWIPE_CURVE / CURVE_DECAY).toBeLessThan(1.14);
  for (const angle of [0, 0.7, Math.PI, 4]) {
    const normal = unit(angle),
      tangent = unit(angle + Math.PI / 2),
      incoming = scale(normal, -34);
    const positive = spinBounce(incoming, normal, MAX_SWIPE_CURVE),
      negative = spinBounce(incoming, normal, -MAX_SWIPE_CURVE);
    expect(length(positive.velocity)).toBeCloseTo(34, 10);
    expect(length(negative.velocity)).toBeCloseTo(34, 10);
    expect(dot(positive.velocity, tangent)).toBeGreaterThan(6);
    expect(dot(negative.velocity, tangent)).toBeCloseTo(-dot(positive.velocity, tangent), 10);
    expect(dot(positive.velocity, normal)).toBeGreaterThan(30);
    expect(positive.spin).toBeCloseTo(MAX_SWIPE_CURVE * 0.72);
  }
});
it("leaves zero-spin returns exact and bounds malformed spin and grazing departures", () => {
  const outgoing = { x: 24, y: 0 };
  expect(spinReturn(outgoing, { x: 1, y: 0 }, 0)).toBe(outgoing);
  expect(spinReturn(outgoing, { x: 1, y: 0 }, NaN)).toBe(outgoing);
  expect(spinBounce({ x: -24, y: 0 }, { x: 1, y: 0 }, 0)).toEqual({ velocity: outgoing, spin: 0 });
  for (const spin of [-1e6, 1e6]) {
    const bounced = spinBounce({ x: -0.001, y: 24 }, { x: 1, y: 0 }, spin);
    expect(length(bounced.velocity)).toBeCloseTo(Math.hypot(0.001, 24), 10);
    expect(dot(bounced.velocity, { x: 1, y: 0 })).toBeGreaterThan(2.7);
    expect(Math.abs(bounced.spin)).toBeLessThan(MAX_SWIPE_CURVE);
  }
});
it("uses spin grip in real wall and bat impacts, with mirrored returns and no collision caps", () => {
  for (const kind of ["wall", "paddle"]) {
    const lateral: number[] = [];
    for (const side of [-1, 1]) {
      const state = createMatch(3, kind === "wall" ? 2 : 4),
        ball = state.balls[0]!;
      state.phase = "playing";
      ball.phase = "active";
      ball.spin = side * MAX_SWIPE_CURVE;
      const base = fortress(0, state.arena).direction;
      ball.position = kind === "wall" ? { x: 5.7, y: 0 } : railPosition(0, base, 4.77, state.arena);
      ball.velocity = kind === "wall" ? { x: 24, y: 0 } : scale(unit(base), -24);
      advanceBall(
        state,
        ball,
        state.players.map((p) => p.angle),
        FIXED_DT,
        DEFAULT_OPTIONS,
        state.players.map((p) => p.pieces.map((b) => b.position)),
      );
      expect(state.events[0]!.type).toBe(kind);
      expect(length(ball.velocity)).toBeCloseTo(24, 8);
      expect(state.stats.collisionCaps).toBe(0);
      lateral.push(
        kind === "wall" ? ball.velocity.y : dot(ball.velocity, unit(base + Math.PI / 2)),
      );
    }
    expect(Math.abs(lateral[0]!)).toBeGreaterThan(0.5);
    expect(lateral[0]).toBeCloseTo(-lateral[1]!, 6);
  }
});
