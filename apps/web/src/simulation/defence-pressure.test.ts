import { expect, it } from "vite-plus/test";
import { fortress, railPosition } from "./arena";
import { createMatch, stepMatch } from "./match";
import { hasDefencePressure } from "./defence-pressure";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "./types";
import { approachSlowdown } from "./slowdown";
import { scale, unit } from "./vector";

function incoming(seat: number, offset: number, radius: number, id: number) {
  const state = createMatch();
  const angle = fortress(seat).direction + offset;
  return {
    ...state.balls[0]!,
    id,
    phase: "active" as const,
    position: railPosition(seat, angle, radius),
    velocity: scale(unit(angle), -24),
  };
}

it.each([0, 1, 2, 3])("only relieves separated rapid catches, equally for defender %s", (seat) => {
  const state = createMatch();
  state.phase = "playing";
  state.balls = [incoming(seat, 0, 6, 0)];
  expect(hasDefencePressure(state, seat)).toBe(false);
  expect(approachSlowdown(state, state.balls[0]!, true).factor).toBe(1);
  state.balls.push(incoming(seat, 0.05, 6.2, 1));
  expect(hasDefencePressure(state, seat)).toBe(false);
  state.balls[1] = incoming(seat, 0.7, 6.2, 1);
  const saved = structuredClone(state);
  expect(hasDefencePressure(state, seat)).toBe(true);
  expect(approachSlowdown(state, state.balls[0]!, true).factor).toBe(1);
  expect(approachSlowdown(state, state.balls[1]!, true).factor).toBe(0.55);
  expect(state).toEqual(saved);
  state.balls[1]!.velocity = scale(state.balls[1]!.velocity, -1);
  expect(hasDefencePressure(state, seat)).toBe(false);
  state.balls[1] = incoming(seat, 0.7, 17, 1);
  expect(hasDefencePressure(state, seat)).toBe(false);
});

it("lets the second catch retain bounded relief after the first threat has gone", () => {
  const state = createMatch();
  state.phase = "playing";
  state.balls = [incoming(0, -0.4, 6, 0), incoming(0, 0.4, 6.1, 1)];
  const result = approachSlowdown(state, state.balls[1]!, true);
  expect(result.factor).toBe(0.55);
  const second = state.balls[1]!;
  second.slowSeat = result.seat;
  state.balls = [second];
  expect(hasDefencePressure(state, 0)).toBe(false);
  expect(approachSlowdown(state, second, true).factor).toBe(0.55);
  expect(approachSlowdown(state, second, false).factor).toBe(1);
  second.velocity = scale(second.velocity, -1);
  expect(approachSlowdown(state, second, true).factor).toBe(1);
});

it("does not slow an ordinary shot because a second ball will be intercepted first", () => {
  const state = createMatch();
  state.phase = "playing";
  state.balls = [incoming(0, 0, 6, 0), incoming(0, 0.7, 6.2, 1)];
  expect(hasDefencePressure(state, 0)).toBe(true);
  state.players[1]!.pieces[0]!.position = railPosition(0, fortress(0).direction + 0.7, 5.6);
  expect(hasDefencePressure(state, 0)).toBe(false);
  expect(approachSlowdown(state, state.balls[0]!, true).factor).toBe(1);
});

it("buys a real second catch at the original movement cap without delaying the first ball", () => {
  const catches = (enabled: boolean) => {
    let state = createMatch();
    state.phase = "playing";
    const base = fortress(0).direction;
    state.players[0]!.angle = base - 0.35;
    state.balls = [incoming(0, -0.65, 6.24, 0), incoming(0, 0.65, 10.56, 1)];
    let returns = 0;
    let firstTick: number | null = null;
    for (let tick = 0; tick < 90; tick++) {
      const before = state.players[0]!.angle;
      state = stepMatch(
        state,
        { ...IDLE_INTENT, targetAngle: base + (returns ? 0.35 : -0.35) },
        { ...DEFAULT_OPTIONS, slowdown: enabled, ballInterval: 999, pointerPaddleSpeed: 3.2 },
      );
      expect(Math.abs(state.players[0]!.angle - before)).toBeLessThanOrEqual(3.2 / 120 + 1e-10);
      const hits = state.events.filter(
        (event) => event.type === "paddle" && event.seat === 0,
      ).length;
      if (hits && firstTick === null) firstTick = tick;
      returns += hits;
    }
    return { returns, firstTick };
  };
  const normal = catches(false),
    relieved = catches(true);
  expect(normal.returns).toBe(1);
  expect(relieved.returns).toBe(2);
  expect(relieved.firstTick).toBe(normal.firstTick);
});
