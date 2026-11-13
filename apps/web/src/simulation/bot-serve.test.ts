import { expect, it } from "vite-plus/test";
import { createMatch } from "./match";
import { ARENA, clampPaddleAngle, fortress, railPosition } from "./arena";
import { aimServeAt } from "./aim";
import { planBotServe, servePlanTarget } from "./bot-serve";
import { botIntent } from "./bots";
import { SUPPLIES } from "./supplies";
import { scale, unit } from "./vector";
function duel() {
  const state = createMatch(2026, 4);
  state.phase = "playing";
  state.players[1]!.health.fill(false);
  state.players[3]!.health.fill(false);
  Object.assign(state.balls[0]!, { phase: "ready", seat: 0, age: 0.6 });
  const angle = aimServeAt(0, state.players[2]!.pieces[0]!.position, state.arena);
  state.players[0]!.angle = angle;
  state.balls[0]!.position = railPosition(0, angle, ARENA.railRadius + 0.4, state.arena);
  return state;
}
it("reads visible bat coverage without mutating state or RNG, and recognizes an exposed bank", () => {
  const state = duel(),
    saved = structuredClone(state),
    blocked = planBotServe(state, 0)!;
  expect(blocked).toMatchObject({ targetSeat: 2, open: false, supplyId: null });
  expect(state).toEqual(saved);
  state.players[2]!.angle = clampPaddleAngle(
    2,
    fortress(2, state.arena).direction + 2,
    state.arena,
  );
  const open = planBotServe(state, 0)!;
  expect(open.open).toBe(true);
  expect(open.targetSeat).toBe(2);
  expect(servePlanTarget(state, open)).toBe(state.players[2]!.pieces[open.piece!]!.position);
  state.players[2]!.health[open.piece!] = false;
  expect(servePlanTarget(state, open)).toBeNull();
});
it("waits briefly behind a covered shot, launches when the target turns away, and eventually applies pressure", () => {
  const state = duel();
  expect(botIntent(state, 0, 100).launch).toBe(false);
  const cached = state.bots[0]!.servePlan;
  botIntent(state, 0, 100);
  expect(state.bots[0]!.servePlan).toBe(cached);
  state.elapsed = 0.2;
  state.players[2]!.angle = clampPaddleAngle(
    2,
    fortress(2, state.arena).direction + 2,
    state.arena,
  );
  expect(botIntent(state, 0, 100).launch).toBe(true);
  const closed = duel();
  closed.balls[0]!.age = 1.3;
  expect(botIntent(closed, 0, 100).launch).toBe(true);
});
it("prefers a reachable live supply, ignores descent/full inventories and immediately abandons a consumed supply", () => {
  const state = duel();
  state.supplies = [{ id: 7, position: { x: -1, y: 1 }, age: SUPPLIES.fall }];
  const plan = planBotServe(state, 0)!;
  expect(plan.supplyId).toBe(7);
  expect(plan.open).toBe(true);
  botIntent(state, 0, 100);
  expect(state.bots[0]!.servePlan!.supplyId).toBe(7);
  state.supplies = [];
  botIntent(state, 0, 100);
  expect(state.bots[0]!.servePlan!.supplyId).toBeNull();
  expect(servePlanTarget(state, plan)).toBeNull();
  state.supplies = [{ id: 8, position: { x: -1, y: 1 }, age: 0.2 }];
  expect(planBotServe(state, 0)!.supplyId).toBeNull();
  state.supplies[0]!.age = 2;
  state.players[0]!.health = Array(12).fill(true);
  expect(planBotServe(state, 0)!.supplyId).toBeNull();
});
it("prioritizes an incoming catch over an opportunistic launch and reserves advanced waiting tactics for later levels", () => {
  const state = duel();
  botIntent(state, 0, 1);
  expect(state.bots[0]!.servePlan).toBeUndefined();
  const home = fortress(0, state.arena),
    incoming = {
      ...state.balls[0]!,
      id: 3,
      phase: "active" as const,
      seat: 2,
      position: railPosition(0, home.direction, 6, state.arena),
      velocity: scale(unit(home.direction), -24),
    };
  state.balls.push(incoming);
  state.balls[0]!.age = 1.5;
  expect(botIntent(state, 0, 100).launch).toBe(false);
  expect(state.bots[0]!.servePlan).toBeUndefined();
});
