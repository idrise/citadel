import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, railPosition } from "./arena";
import { createMatch, stepMatch } from "./match";
import { launchBall } from "./serving";
import { serveCurve, MAX_SWIPE_CURVE } from "./flight";
import { predictServe } from "./return-preview";
import { advanceBall } from "./ball";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "./types";
import { length, sub } from "./vector";
it("adds signed remembered swipe spin to serves while preserving straight stationary launches and speed", () => {
  for (const count of [2, 4, 8, 16] as const)
    for (const seat of [0, count - 1])
      for (const side of [-1, 0, 1]) {
        const state = createMatch(4, count),
          ball = state.balls[0]!,
          player = state.players[seat]!;
        state.phase = "playing";
        ball.seat = seat;
        ball.position = railPosition(seat, player.angle, ARENA.railRadius + 0.4, state.arena);
        player.swipe = { velocity: side * ARENA.paddleSpeed, remaining: side === 0 ? 0 : 0.1 };
        launchBall(state, ball, DEFAULT_OPTIONS);
        expect(ball.spin).toBe(side * MAX_SWIPE_CURVE);
        expect(length(ball.velocity)).toBeCloseTo(24, 10);
        expect(ball.striker).toBe(seat);
      }
  expect(serveCurve({ velocity: ARENA.paddleSpeed, remaining: 0 })).toBe(0);
  expect(serveCurve({ velocity: ARENA.paddleSpeed, remaining: 0.05 })).toBeCloseTo(
    MAX_SWIPE_CURVE * Math.SQRT1_2,
  );
});
it.each([-1, 1])(
  "a real moving launch curves on side %s through the ordinary intent and fixed-step path",
  (side) => {
    const state = createMatch();
    state.phase = "playing";
    const player = state.players[0]!,
      ball = state.balls[0]!;
    Object.assign(ball, {
      seat: 0,
      age: 0.5,
      position: railPosition(0, player.angle, ARENA.railRadius + 0.4, state.arena),
    });
    const next = stepMatch(
      state,
      { ...IDLE_INTENT, steer: side, launch: true },
      { ...DEFAULT_OPTIONS, humanSeat: 0 },
    );
    expect(next.events.some((event) => event.type === "launch")).toBe(true);
    expect(Math.sign(next.balls[0]!.spin!)).toBe(side);
    expect(state.balls[0]!.phase).toBe("ready");
    expect(next.balls[0]!.phase).toBe("active");
  },
);
it("previews the actual curved launch without changing the held ball, clocks, health or RNG", () => {
  const state = createMatch();
  state.phase = "playing";
  const player = state.players[0]!,
    ball = state.balls[0]!;
  ball.seat = 0;
  ball.position = railPosition(0, player.angle, ARENA.railRadius + 0.4, state.arena);
  player.swipe = { velocity: ARENA.paddleSpeed, remaining: 0.1 };
  const saved = structuredClone(state),
    preview = predictServe(state, 0)!;
  expect(state).toEqual(saved);
  expect(preview.points.length).toBeGreaterThan(15);
  const trial = structuredClone(state);
  launchBall(trial, trial.balls[0]!, DEFAULT_OPTIONS);
  const angles = trial.players.map((p) => p.angle),
    pieces = trial.players.map((p) => p.pieces.map((body) => body.position));
  for (let step = 1; step < Math.min(16, preview.points.length); step++) {
    advanceBall(trial, trial.balls[0]!, angles, FIXED_DT, DEFAULT_OPTIONS, pieces, true);
    expect(length(sub(trial.balls[0]!.position, preview.points[step]!))).toBeLessThan(1e-8);
  }
});
