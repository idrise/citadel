import { expect, it } from "vite-plus/test";
import { levelDifficulty } from "./difficulty";
import { ARENA, batCentre, batHalfAngle, createArena, fortress, railPosition } from "./arena";
import { createMatch, stepMatch } from "./match";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
import { sweepPaddle } from "./collision";
import { stepSupplies, SUPPLIES } from "./supplies";
import { polygonEdges } from "./polygon";
import { add, dot, length, scale, sub, unit } from "./vector";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "./types";

it("spreads monotonic pressure across all 100 levels, with staggered ball and pickup unlocks", () => {
  let before = levelDifficulty(1);
  expect(before).toMatchObject({
    level: 1,
    maxBalls: 1,
    pickupCount: 0,
    ballSpeed: 14,
    batScale: 1.35,
  });
  for (let level = 2; level <= 100; level++) {
    const next = levelDifficulty(level);
    expect(next.maxBalls).toBeGreaterThanOrEqual(before.maxBalls);
    expect(next.pickupCount).toBeGreaterThanOrEqual(before.pickupCount);
    expect(next.ballSpeed).toBeGreaterThan(before.ballSpeed);
    expect(next.ballInterval).toBeLessThan(before.ballInterval);
    expect(next.batScale).toBeLessThan(before.batScale);
    if (next.maxBalls > before.maxBalls) expect([10, 25, 40, 55, 70, 85, 100]).toContain(level);
    if (next.pickupCount > before.pickupCount) expect([5, 20, 35, 50, 65, 80, 95]).toContain(level);
    before = next;
  }
  expect(before).toMatchObject({
    maxBalls: 8,
    pickupCount: 7,
    ballSpeed: 34,
    ballInterval: 5,
    batScale: 0.7,
  });
  expect(levelDifficulty(NaN)).toEqual(levelDifficulty(1));
  expect(levelDifficulty(-100)).toEqual(levelDifficulty(1));
  expect(levelDifficulty(1000)).toEqual(levelDifficulty(100));
});
it.each([1, 4, 5, 20, 35, 50, 65, 80, 95, 100])(
  "level %i drops only its budget, never before play or after cutoff",
  (level) => {
    const difficulty = levelDifficulty(level),
      state = createMatch(7, 4, 3, 7, difficulty);
    state.elapsed = 20;
    stepSupplies(state, 1);
    expect(state.nextSupplyId).toBe(0);
    state.phase = "playing";
    for (let tick = 0; tick < 60 * 120; tick++) {
      state.elapsed = tick / 120;
      stepSupplies(state, 1 / 120);
      expect(state.nextSupplyId).toBeLessThanOrEqual(difficulty.pickupCount);
      expect(state.supplies.length).toBeLessThanOrEqual(2);
    }
    expect(state.nextSupplyId).toBe(difficulty.pickupCount);
    state.elapsed = SUPPLIES.cutoff;
    state.nextSupplyId = 0;
    stepSupplies(state, 1 / 120);
    expect(state.nextSupplyId).toBe(0);
  },
);
it("the frozen attempt rules control serve speed and ball count despite contradictory options", () => {
  const requested = levelDifficulty(1),
    state = createMatch(7, 4, 3, 7, requested);
  expect(state.difficulty).not.toBe(requested);
  expect(Object.isFrozen(state.difficulty)).toBe(true);
  state.phase = "playing";
  const ball = state.balls[0]!;
  ball.seat = 0;
  ball.age = 0.5;
  const next = stepMatch(
    state,
    { ...IDLE_INTENT, launch: true },
    { ...DEFAULT_OPTIONS, botLevel: 100, ballSpeed: 999, maxBalls: 8, ballInterval: 1 },
  );
  expect(length(next.balls[0]!.velocity)).toBeCloseTo(14, 8);
  let held = createMatch(7, 4, 3, 7, requested);
  held.phase = "playing";
  held.elapsed = 50;
  held = stepMatch(held, IDLE_INTENT, { ...DEFAULT_OPTIONS, maxBalls: 8, ballInterval: 1 }, 0);
  expect(held.balls).toHaveLength(1);
  expect(held.supplies).toHaveLength(0);
});
it.each([1, 50, 100])(
  "level %i reaches its ball cap on its schedule and survives high-pressure flight without collision caps",
  (level) => {
    const difficulty = levelDifficulty(level);
    let state = createMatch(2026, 6, 3, 2026, difficulty);
    state.phase = "playing";
    for (let index = 0; index < difficulty.maxBalls; index++) {
      state.elapsed = index * difficulty.ballInterval + 1e-6;
      state = stepMatch(
        state,
        IDLE_INTENT,
        { ...DEFAULT_OPTIONS, humanSeat: -1, serveTimeout: Infinity },
        0,
      );
      expect(state.balls).toHaveLength(index + 1);
    }
    expect(state.balls).toHaveLength(difficulty.maxBalls);
    for (let tick = 0; tick < 120 * 10 && state.phase !== "finished"; tick++)
      state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
    expect(state.stats.collisionCaps).toBe(0);
    for (const ball of state.balls.filter((b) => b.phase === "active"))
      expect(length(ball.velocity)).toBeCloseTo(difficulty.ballSpeed, 6);
  },
);
it("a wide early bat catches a shot that passes the narrow level-100 bat", () => {
  const easy = createArena(4, undefined, 0, levelDifficulty(1).batScale);
  const hard = createArena(4, undefined, 0, levelDifficulty(100).batScale);
  const angle = fortress(0, easy).direction,
    normal = unit(angle + 0.55);
  const start = add(batCentre(0, angle, easy), scale(normal, ARENA.batRadius + 2));
  expect(sweepPaddle(start, scale(normal, -24), 0, angle, 0, 0.2, easy)).not.toBeNull();
  expect(sweepPaddle(start, scale(normal, -24), 0, angle, 0, 0.2, hard)).toBeNull();
});
it("fits every level's physical bat inside every arena at both travel limits", () => {
  for (const count of [2, 3, 4, 5, 6] as const)
    for (const level of [1, 5, 10, 25, 50, 75, 100]) {
      const arena = createArena(count, undefined, 0, levelDifficulty(level).batScale);
      for (const home of arena.fortresses)
        for (const offset of home.angleLimits!) {
          const angle = home.direction + offset;
          for (let step = 0; step <= 20; step++) {
            const delta = -batHalfAngle(arena) + (step / 20) * batHalfAngle(arena) * 2;
            const point = add(
              batCentre(home.id, angle, arena),
              scale(unit(angle + delta), ARENA.batRadius),
            );
            for (const edge of polygonEdges(arena.vertices))
              expect(dot(sub(point, edge.start), edge.normal)).toBeGreaterThanOrEqual(
                ARENA.paddleThickness / 2 + 0.014,
              );
          }
        }
    }
});
it("preserves the round's bat width throughout elimination morphs and all derived rail limits", () => {
  for (const level of [1, 100]) {
    const rules = levelDifficulty(level),
      state = createMatch(7, 6, 3, 7, rules);
    const width = batHalfAngle(state.arena);
    for (const id of [1, 3, 5, 4]) {
      state.players[id]!.health.fill(false);
      state.eliminations.push({ seat: id, elapsed: state.elapsed });
      beginArenaMorph(state);
      for (let frame = 0; frame < 40 && state.morph; frame++) {
        stepArenaMorph(state, 0.1);
        expect(batHalfAngle(state.arena)).toBe(width);
        for (const p of state.players.filter((p) => p.health.some(Boolean)))
          expect(
            Number.isFinite(railPosition(p.id, p.angle, ARENA.railRadius, state.arena).x),
          ).toBe(true);
      }
    }
    expect(state.arena.count).toBe(2);
  }
});

it("keeps all eight queued level-100 serves inside the walls and visibly separated at travel limits", () => {
  for (const count of [2, 3, 4, 5, 6] as const)
    for (const side of [0, 1]) {
      let state = createMatch(7, count, 3, 7, levelDifficulty(100));
      state.phase = "playing";
      state.elapsed = 40;
      for (const player of state.players) {
        const home = fortress(player.id, state.arena);
        player.angle = home.direction + home.angleLimits![side]!;
      }
      const options = { ...DEFAULT_OPTIONS, humanSeat: -1, serveTimeout: Infinity };
      state = stepMatch(state, IDLE_INTENT, options, 0);
      state = stepMatch(state, IDLE_INTENT, options, 0);
      expect(state.balls).toHaveLength(8);
      for (const ball of state.balls) {
        for (const edge of polygonEdges(state.arena.vertices))
          expect(dot(sub(ball.position, edge.start), edge.normal)).toBeGreaterThanOrEqual(
            ARENA.ballRadius + 0.02,
          );
        for (const other of state.balls.filter((b) => b.id > ball.id))
          expect(length(sub(ball.position, other.position))).toBeGreaterThanOrEqual(
            ARENA.ballRadius * 2.7,
          );
      }
    }
});
