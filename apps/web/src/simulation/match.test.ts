import { describe, expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, fortress, railPosition } from "./arena";
import { createMatch, stepMatch } from "./match";
import { alive, DEFAULT_OPTIONS, IDLE_INTENT, type MatchState } from "./types";
import { add, length, normalise, scale, sub, unit } from "./vector";

function shotAtPiece(piece = 3): MatchState {
  const state = createMatch(7);
  state.phase = "playing";
  const seat = fortress(0);
  const direction = normalise(sub(seat.pieces[piece]!, seat.anchor));
  state.balls[0] = {
    id: 0,
    phase: "active",
    seat: 2,
    age: 0,
    slowSeat: null,
    position: add(seat.anchor, scale(direction, 3.1)),
    velocity: scale(direction, -120),
  };
  return state;
}

describe("match rules", () => {
  it("never mutates the input state and repeats a seeded input stream exactly", () => {
    const previous = createMatch(42);
    const saved = structuredClone(previous);
    stepMatch(previous);
    expect(previous).toEqual(saved);
    let first = createMatch(42);
    let second = createMatch(42);
    for (let tick = 0; tick < 1200; tick++) {
      first = stepMatch(first);
      second = stepMatch(second);
    }
    expect(first).toEqual(second);
  });
  it("applies one identical movement cap to mouse targets, keyboard and bots", () => {
    const state = createMatch(1);
    const target = fortress(0).direction + 0.5;
    const next = stepMatch(state, { ...IDLE_INTENT, targetAngle: target });
    expect(next.players[0]!.angle - state.players[0]!.angle).toBeCloseTo(
      ARENA.paddleSpeed * FIXED_DT,
    );
    const keyboard = stepMatch(state, { ...IDLE_INTENT, steer: 1 });
    expect(keyboard.players[0]!.angle).toBeCloseTo(next.players[0]!.angle);
    for (const player of next.players)
      expect(Math.abs(player.angle - state.players[player.id]!.angle)).toBeLessThanOrEqual(
        ARENA.paddleSpeed * FIXED_DT + 1e-10,
      );
  });
  it("destroys only the physically struck piece and gives the damaged defender the revenge serve", () => {
    const next = stepMatch(shotAtPiece());
    expect(next.players[0]!.health.filter(Boolean)).toHaveLength(7);
    expect(next.players[0]!.health[3]).toBe(false);
    expect(next.balls[0]!.phase).toBe("ready");
    expect(next.balls[0]!.seat).toBe(0);
    expect(next.stats.damage).toBe(1);
    expect(next.events.filter((event) => event.type === "damage")).toHaveLength(1);
  });
  it("does not replace a gap with nearest-piece damage", () => {
    const state = shotAtPiece();
    state.players[0]!.health[3] = false;
    const next = stepMatch(state);
    expect(next.players[0]!.health).toEqual(state.players[0]!.health);
    expect(next.balls[0]!.phase).toBe("active");
    expect(next.stats.damage).toBe(0);
  });
  it("crossing an undefended arc alone does not damage health", () => {
    const state = shotAtPiece();
    const angle = fortress(0).direction + 0.5;
    state.balls[0]!.position = railPosition(0, angle, 4.8);
    state.balls[0]!.velocity = scale(unit(angle), -30);
    const next = stepMatch(state);
    expect(next.stats.damage).toBe(0);
  });
  it("selects a seeded surviving recipient after an elimination", () => {
    const state = shotAtPiece();
    state.players[0]!.health = state.players[0]!.health.map((_, piece) => piece === 3);
    const next = stepMatch(state);
    expect(alive(next.players[0]!)).toBe(false);
    expect(next.balls[0]!.phase).toBe("ready");
    expect(next.balls[0]!.seat).not.toBe(0);
    expect(alive(next.players[next.balls[0]!.seat]!)).toBe(true);
    expect(stepMatch(state)).toEqual(next);
  });
  it("ends on the last opponent and never serves or steps after victory", () => {
    const state = shotAtPiece();
    state.players[0]!.health = state.players[0]!.health.map((_, piece) => piece === 3);
    state.players[1]!.health.fill(false);
    state.players[2]!.health.fill(false);
    const next = stepMatch(state);
    expect(next.phase).toBe("finished");
    expect(next.winner).toBe(3);
    expect(next.balls).toHaveLength(0);
    expect(stepMatch(next, { ...IDLE_INTENT, launch: true })).toBe(next);
  });
  it("automatically launches a held ball after the deadline and does not serve during countdown", () => {
    const state = createMatch(1);
    const ball = state.balls[0]!;
    const options = { ...DEFAULT_OPTIONS, humanSeat: ball.seat, serveTimeout: 0.5 };
    ball.age = 10;
    expect(stepMatch(state, { ...IDLE_INTENT, launch: true }, options).balls[0]!.phase).toBe(
      "ready",
    );
    state.phase = "playing";
    expect(stepMatch(state, IDLE_INTENT, options).balls[0]!.phase).toBe("active");
  });
  it("slowdown applies equally to any seat, does not stack and restores on leaving the region", () => {
    for (const seat of [0, 1, 2, 3]) {
      const state = createMatch(2);
      state.phase = "playing";
      const angle = fortress(seat).direction;
      state.balls[0] = {
        id: 0,
        phase: "active",
        seat,
        age: 0,
        slowSeat: null,
        position: railPosition(seat, angle, 6),
        velocity: scale(unit(angle), -12),
      };
      const options = { ...DEFAULT_OPTIONS, humanSeat: seat, slowdown: true };
      const slow = stepMatch(state, IDLE_INTENT, options);
      expect(length(sub(slow.balls[0]!.position, state.balls[0]!.position))).toBeCloseTo(
        12 * FIXED_DT * 0.55,
      );
      expect(slow.balls[0]!.slowSeat).toBe(seat);
      slow.balls[0]!.velocity = scale(unit(angle), 12);
      const fast = stepMatch(slow, IDLE_INTENT, options);
      expect(fast.balls[0]!.slowSeat).toBeNull();
      expect(length(sub(fast.balls[0]!.position, slow.balls[0]!.position))).toBeCloseTo(
        12 * FIXED_DT,
      );
    }
  });
  it("rebounds through an eliminated sector without phantom paddle or health collisions", () => {
    const state = createMatch(4);
    state.phase = "playing";
    state.players[0]!.health.fill(false);
    state.balls[0] = {
      id: 0,
      phase: "active",
      seat: 2,
      age: 0,
      slowSeat: null,
      position: { x: -8.7, y: 8.7 },
      velocity: { x: -30, y: 30 },
    };
    const next = stepMatch(state);
    expect(next.balls[0]!.velocity.x).toBeGreaterThan(0);
    expect(next.balls[0]!.velocity.y).toBeLessThan(0);
    expect(next.stats.damage).toBe(0);
  });
});

it("seeded all-bot rounds reach a winner without stuck balls or collision-loop caps", () => {
  const durations: number[] = [];
  for (const seed of [1, 21, 2026]) {
    let state = createMatch(seed);
    for (let tick = 0; tick < 120 * 900 && state.phase !== "finished"; tick++) {
      state = stepMatch(state, IDLE_INTENT, { ...DEFAULT_OPTIONS, humanSeat: -1 });
      const ball = state.balls[0];
      if (ball) {
        expect(Number.isFinite(ball.position.x + ball.position.y)).toBe(true);
        expect(Math.abs(ball.position.x)).toBeLessThan(ARENA.halfSize);
        expect(Math.abs(ball.position.y)).toBeLessThan(ARENA.halfSize);
      }
    }
    durations.push(state.elapsed);
    expect(state.phase, `seed ${seed}: ${state.stats.damage} damage at ${state.elapsed}s`).toBe(
      "finished",
    );
    expect(state.players.filter(alive)).toHaveLength(1);
    expect(state.stats.collisionCaps).toBe(0);
  }
  expect(durations.every((seconds) => seconds < 900)).toBe(true);
}, 20000);

describe("timed multi-ball pressure", () => {
  it("starts with one ball, adds balls on playing time only, and honours the cap", () => {
    let state = createMatch(1);
    expect(state.balls).toHaveLength(1);
    state.countdown = 0.01;
    state = stepMatch(state, IDLE_INTENT, DEFAULT_OPTIONS);
    expect(state.balls).toHaveLength(1);
    state.phase = "playing";
    state.elapsed = 14.98;
    expect(stepMatch(state).balls).toHaveLength(1);
    state.elapsed = 15;
    const second = stepMatch(state);
    expect(second.balls).toHaveLength(2);
    expect(second.events.some((event) => event.type === "arrival")).toBe(true);
    second.elapsed = 45;
    const fourth = stepMatch(second);
    expect(fourth.balls).toHaveLength(4);
    expect(new Set(fourth.balls.map((ball) => ball.id)).size).toBe(4);
    fourth.elapsed = 300;
    expect(stepMatch(fourth).balls).toHaveLength(4);
    const single = stepMatch(state, IDLE_INTENT, { ...DEFAULT_OPTIONS, maxBalls: 1 });
    expect(single.balls).toHaveLength(1);
  });
  it("launches at the requested doubled speed with a 10 percent larger collision radius", () => {
    const state = createMatch(3);
    state.phase = "playing";
    const ball = state.balls[0]!;
    ball.age = 10;
    const next = stepMatch(state);
    expect(length(next.balls[0]!.velocity)).toBeCloseTo(24);
    expect(ARENA.ballRadius).toBeCloseTo(0.17 * 1.1);
  });
  it("one click launches one queued ball and keeps IDs on returned balls", () => {
    const state = createMatch(1);
    state.phase = "playing";
    const first = state.balls[0]!;
    first.seat = 0;
    first.age = 0.5;
    state.balls.push({
      ...first,
      id: 1,
      position: { ...first.position },
      velocity: { ...first.velocity },
    });
    state.nextBallId = 2;
    const next = stepMatch(state, { ...IDLE_INTENT, launch: true });
    expect(next.balls.filter((ball) => ball.phase === "active")).toHaveLength(1);
    expect(next.balls.filter((ball) => ball.phase === "ready")).toHaveLength(1);
    const hit = shotAtPiece();
    hit.balls[0]!.id = 7;
    expect(stepMatch(hit).balls[0]!.id).toBe(7);
  });
  it("reassigns already queued revenge serves when their defender is eliminated", () => {
    const state = shotAtPiece();
    state.players[0]!.health = state.players[0]!.health.map((_, piece) => piece === 3);
    state.balls.push({ ...state.balls[0]!, id: 1, phase: "ready", seat: 0, age: 0 });
    state.nextBallId = 2;
    const next = stepMatch(state);
    expect(next.balls).toHaveLength(2);
    expect(next.balls.every((ball) => ball.phase === "ready" && ball.seat !== 0)).toBe(true);
    expect(next.balls.map((ball) => ball.id)).toEqual([0, 1]);
  });
  it("orders simultaneous balls deterministically without damaging a missing target twice", () => {
    const state = shotAtPiece();
    state.balls.push({
      ...state.balls[0]!,
      id: 1,
      position: { ...state.balls[0]!.position },
      velocity: { ...state.balls[0]!.velocity },
    });
    state.nextBallId = 2;
    const next = stepMatch(state);
    expect(next.stats.damage).toBe(1);
    expect(next.balls[0]!.phase).toBe("ready");
    expect(next.balls[1]!.phase).toBe("active");
    expect(next).toEqual(stepMatch(state));
  });
  it("supports eight fast balls with slowdown while preserving bounds, recipients and replay", () => {
    let state = createMatch(15);
    const options = {
      ...DEFAULT_OPTIONS,
      humanSeat: -1,
      ballInterval: 1,
      maxBalls: 8,
      slowdown: true,
    };
    let replay = createMatch(15);
    for (let tick = 0; tick < 120 * 45 && state.phase !== "finished"; tick++) {
      state = stepMatch(state, IDLE_INTENT, options);
      replay = stepMatch(replay, IDLE_INTENT, options);
      for (const ball of state.balls) {
        expect(Math.abs(ball.position.x)).toBeLessThan(ARENA.halfSize);
        expect(Math.abs(ball.position.y)).toBeLessThan(ARENA.halfSize);
        if (ball.phase === "ready") expect(alive(state.players[ball.seat]!)).toBe(true);
      }
    }
    expect(state).toEqual(replay);
    expect(state.stats.collisionCaps).toBe(0);
    expect(state.stats.damage).toBeGreaterThan(10);
  });
});
