import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, batCentre, fortress } from "./arena";
import { advanceBall } from "./ball";
import { paddleReturn } from "./collision";
import { createMatch } from "./match";
import { predictReturn, traceAimGuide } from "./return-preview";
import { DEFAULT_OPTIONS } from "./types";
import { add, angleDifference, angleOf, length, normalise, scale, sub, unit } from "./vector";

export function returnFixture(seat = 0, offset = 0, gap = 1.5) {
  const state = createMatch(2026);
  state.phase = "playing";
  const angle = fortress(seat).direction;
  const normal = unit(angle + offset * ARENA.batHalfAngle);
  const contact = add(
    batCentre(seat, angle),
    scale(normal, ARENA.batRadius + ARENA.paddleThickness / 2 + ARENA.ballRadius),
  );
  state.balls = [
    {
      ...state.balls[0]!,
      phase: "active",
      position: add(contact, scale(normal, gap)),
      velocity: scale(normal, -24),
    },
  ];
  return { state, normal, contact };
}

it.each([0, 1, 2, 3])(
  "previews actual centre/edge returns for seat %s without changing the live state",
  (seat) => {
    for (const offset of [-0.75, 0, 0.75])
      for (const slowdown of [false, true]) {
        const { state, normal, contact } = returnFixture(seat, offset);
        const before = structuredClone(state);
        const preview = predictReturn(state, seat, slowdown)!;
        expect(preview).not.toBeNull();
        expect(state).toEqual(before);
        expect(length(sub(preview.contact, contact))).toBeLessThan(1e-7);
        const expected = normalise(paddleReturn(scale(normal, -24), offset, normal));
        expect(preview.outgoing.x).toBeCloseTo(expected.x, 6);
        expect(preview.outgoing.y).toBeCloseTo(expected.y, 6);
        const trial = structuredClone(state);
        const ball = trial.balls[0]!;
        const angles = trial.players.map((p) => p.angle),
          pieces = trial.players.map((p) => p.pieces.map((body) => body.position));
        for (let step = 0; step < 60 && !trial.events.length; step++)
          advanceBall(
            trial,
            ball,
            angles,
            FIXED_DT,
            { ...DEFAULT_OPTIONS, slowdown },
            pieces,
            true,
          );
        expect(trial.events[0]!.type).toBe("paddle");
        expect(angleDifference(angleOf(ball.velocity), angleOf(preview.outgoing))).toBeCloseTo(
          0,
          8,
        );
        expect(length(ball.velocity)).toBeCloseTo(24);
      }
  },
);

it("uses slowdown timing, suppresses distant/missed contacts and selects the earliest active ball", () => {
  const { state } = returnFixture();
  const fast = predictReturn(state, 0, false)!,
    slow = predictReturn(state, 0, true)!;
  expect(slow.time).toBeGreaterThan(fast.time);
  state.balls.push({
    ...state.balls[0]!,
    id: 1,
    position: add(state.balls[0]!.position, scale(unit(fortress(0).direction), -1)),
  });
  expect(predictReturn(state, 0, false)!.ballId).toBe(1);
  expect(predictReturn(returnFixture(0, 0, 12).state, 0, false)).toBeNull();
  state.players[0]!.health.fill(false);
  expect(predictReturn(state, 0, false)).toBeNull();
});

it("hides an incoming preview if an actual health piece would intercept first", () => {
  const { state, normal } = returnFixture();
  state.players[1]!.pieces[0]!.position = add(state.balls[0]!.position, scale(normal, -0.8));
  const saved = structuredClone(state);
  expect(predictReturn(state, 0, false)).toBeNull();
  expect(state).toEqual(saved);
});

it("stops outgoing guides at intact pieces, lets gaps through, and allows only one wall bank", () => {
  const state = createMatch();
  state.players[1]!.pieces[0]!.position = { x: 1, y: 0 };
  const points = traceAimGuide(state, { x: 0, y: 0 }, { x: 1, y: 0 }, 3, 0);
  expect(points[1]!.x).toBeCloseTo(1 - ARENA.pieceRadius - ARENA.ballRadius);
  state.players[1]!.health[0] = false;
  expect(traceAimGuide(state, { x: 0, y: 0 }, { x: 1, y: 0 }, 3, 0)[1]!.x).toBeCloseTo(3);
  const bank = traceAimGuide(state, { x: 8, y: 0 }, { x: 1, y: 0 }, 4, 0);
  expect(bank[1]!.x).toBeCloseTo(9 - ARENA.ballRadius);
  expect(bank[2]!.x).toBeLessThan(bank[1]!.x);
});
