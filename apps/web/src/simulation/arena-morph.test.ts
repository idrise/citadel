import { createFixedClock } from "../session/fixed-clock";
import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, createArena, fortress, type PlayerCount } from "./arena";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
import { createMatch, stepMatch } from "./match";
import { damagePiece } from "./serving";
import { carryPoint, polygonEdges } from "./polygon";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "./types";
import { angleDifference, dot, length, scale, sub, unit } from "./vector";

function eliminate(state: ReturnType<typeof createMatch>, id: number) {
  const player = state.players[id]!;
  player.health.fill(false);
  player.health[0] = true;
  damagePiece(state, state.balls[0]!, id, 0);
}
it.each([3, 4, 5, 6] as const)(
  "smoothly changes %s seats to the next topology, retaining health, identity and relative bat control",
  (count) => {
    const state = createMatch(21, count);
    state.phase = "playing";
    const id = count - 1;
    state.players[0]!.angle = fortress(0, state.arena).direction + 0.12;
    eliminate(state, id);
    const health = state.players.map((p) => [...p.health]),
      before = structuredClone(state);
    beginArenaMorph(state);
    expect(state.morph!.duration).toBeGreaterThanOrEqual(2.8);
    expect(state.morph!.duration).toBeLessThan(4);
    expect(state.arena).toEqual(before.arena);
    let maxTravel = 0;
    for (let i = 0; i < 2400 && state.morph; i++) {
      const positions = state.players.map((p) => ({ ...fortress(p.id, state.arena).anchor }));
      stepArenaMorph(state, FIXED_DT);
      for (const player of state.players.filter((p) => p.id !== id)) {
        const home = fortress(player.id, state.arena);
        maxTravel = Math.max(maxTravel, length(sub(home.anchor, positions[player.id]!)) / FIXED_DT);
        for (const body of player.pieces)
          for (const edge of polygonEdges(state.arena.vertices))
            expect(dot(sub(body.position, edge.start), edge.normal)).toBeGreaterThanOrEqual(
              body.radius - 1e-6,
            );
      }
      expect(
        angleDifference(state.players[0]!.angle, fortress(0, state.arena).direction),
      ).toBeCloseTo(0.12);
    }
    expect(state.morph).toBeNull();
    expect(state.arena.count).toBe(count - 1);
    expect(state.arena.vertices).toHaveLength(count === 3 ? 4 : count - 1);
    expect(state.players.map((p) => p.health)).toEqual(health);
    expect(state.players.map((p) => p.id)).toEqual(before.players.map((p) => p.id));
    expect(maxTravel).toBeLessThanOrEqual(6.01);
  },
);
it("retargets a second elimination during a morph without snapping, losing a ready ball, or changing live ball velocity/spin", () => {
  const state = createMatch(12, 6);
  state.phase = "playing";
  const active = {
    ...state.balls[0]!,
    id: 1,
    phase: "active" as const,
    position: { x: 1, y: 2 },
    velocity: scale(unit(0.6), 24),
    spin: 0.7,
  };
  state.balls.push(active);
  eliminate(state, 4);
  beginArenaMorph(state);
  stepArenaMorph(state, 2);
  eliminate(state, 2);
  const before = structuredClone(state.arena),
    motion = { ...active.velocity },
    spin = active.spin;
  beginArenaMorph(state);
  expect(state.arena).toEqual(before);
  expect(state.morph!.to.count).toBe(4);
  stepArenaMorph(state, FIXED_DT);
  expect(length(sub(fortress(0, state.arena).anchor, fortress(0, before).anchor))).toBeLessThan(
    0.01,
  );
  expect(active.velocity).toEqual(motion);
  expect(active.spin).toBe(spin);
  expect(state.balls[0]!.phase).toBe("ready");
  expect(state.players[state.balls[0]!.seat]!.health.some(Boolean)).toBe(true);
});
it("uses the same deterministic transition at each tick without mutating its input; victory stops geometry too", () => {
  let state = createMatch(4, 4);
  state.phase = "playing";
  eliminate(state, 1);
  const frozen = structuredClone(state);
  const options = { ...DEFAULT_OPTIONS, humanSeat: -1 };
  let replay = structuredClone(state);
  for (let tick = 0; tick < 1200; tick++) {
    state = stepMatch(state, IDLE_INTENT, options);
    replay = stepMatch(replay, IDLE_INTENT, options);
  }
  expect(state).toEqual(replay);
  expect(frozen.morph).toBeNull();
  const ended = { ...state, phase: "finished" as const };
  expect(stepMatch(ended)).toBe(ended);
});
it.each([2, 3, 4, 5, 6] as PlayerCount[])(
  "contains an eight-ball stress run in the actual %s-seat boundary",
  (count) => {
    let state = createMatch(31, count);
    const options = { ...DEFAULT_OPTIONS, humanSeat: -1, maxBalls: 8, ballInterval: 1 };
    for (let i = 0; i < 120 * 30 && state.phase !== "finished"; i++) {
      state = stepMatch(state, IDLE_INTENT, options);
      for (const ball of state.balls)
        for (const edge of polygonEdges(state.arena.vertices))
          expect(dot(sub(ball.position, edge.start), edge.normal)).toBeGreaterThanOrEqual(
            ARENA.ballRadius - 1e-5,
          );
    }
    expect(state.stats.collisionCaps).toBe(0);
  },
);

it("transports a held human target through the current tick's geometry before applying paddle speed", () => {
  let state = createMatch(12, 4);
  state.phase = "playing";
  eliminate(state, 1);
  beginArenaMorph(state);
  stepArenaMorph(state, 2);
  const id = 2,
    home = fortress(id, state.arena);
  state.players[id]!.angle = home.direction + 0.1;
  const next = stepMatch(
    state,
    { ...IDLE_INTENT, targetAngle: state.players[id]!.angle },
    { ...DEFAULT_OPTIONS, humanSeat: id },
  );
  expect(angleDifference(next.players[id]!.angle, fortress(id, next.arena).direction)).toBeCloseTo(
    0.1,
    10,
  );
});

it("replays the changing boundary, pieces, bots and held target identically at 30/60/144 FPS", () => {
  const replay = (fps: number) => {
    let state = createMatch(31, 6);
    state.phase = "playing";
    eliminate(state, 2);
    const clock = createFixedClock(),
      initial = structuredClone(state);
    const next = stepMatch(state, IDLE_INTENT);
    expect(state).toEqual(initial);
    expect(next).not.toBe(state);
    for (let frame = 0; frame < fps * 12; frame++)
      clock.advance(1 / fps, () => {
        state = stepMatch(state, {
          ...IDLE_INTENT,
          targetAngle: fortress(0, state.arena).direction + 0.1,
        });
      });
    return state;
  };
  const baseline = replay(30);
  expect(replay(60)).toEqual(baseline);
  expect(replay(144)).toEqual(baseline);
});

it("carries a bot's selected serve target with the floor instead of choosing a different rival every morph tick", () => {
  const state = createMatch(4, 6);
  state.phase = "playing";
  eliminate(state, 2);
  beginArenaMorph(state);
  const before = state.arena,
    target = { ...state.players[3]!.pieces[1]!.position },
    rng = state.rng;
  state.bots[0]!.serveTarget = target;
  stepArenaMorph(state, 0.2);
  expect(state.bots[0]!.serveTarget).toEqual(
    carryPoint(target, before.vertices, state.arena.vertices),
  );
  expect(state.rng).toBe(rng);
});

it("shares a regular target's rotation to cut needless travel instead of pinning the first corner", () => {
  const state = createMatch(4, 6);
  state.phase = "playing";
  eliminate(state, 5);
  beginArenaMorph(state);
  const cost = (arena: typeof state.arena) =>
    state.players
      .filter((p) => p.id !== 5)
      .reduce((sum, p) => {
        const delta = sub(fortress(p.id, arena).anchor, fortress(p.id, state.arena).anchor);
        return sum + delta.x * delta.x + delta.y * delta.y;
      }, 0);
  const oldTarget = createArena(5);
  expect(cost(state.morph!.to)).toBeLessThan(cost(oldTarget) * 0.6);
  const radial = state
    .morph!.to.fortresses.filter((s) => s.id !== 5)
    .map((s) => Math.hypot(s.anchor.x, s.anchor.y));
  radial.forEach((radius) => expect(radius).toBeCloseTo(14));
});
it("catches up with rapid deaths on the existing transition window instead of restarting eight seconds", () => {
  const state = createMatch(8, 6);
  state.phase = "playing";
  eliminate(state, 5);
  beginArenaMorph(state);
  const first = state.morph!;
  expect(first.duration).toBeCloseTo(2.8);
  stepArenaMorph(state, 1);
  eliminate(state, 3);
  beginArenaMorph(state);
  expect(state.morph!.to.count).toBe(4);
  expect(state.morph!.duration).toBeLessThanOrEqual(2.0);
  stepArenaMorph(state, state.morph!.duration);
  expect(state.morph).toBeNull();
  expect(state.arena.count).toBe(4);
});
