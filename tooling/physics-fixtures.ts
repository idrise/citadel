import { createHash } from "node:crypto";
import { ARENA, FIXED_DT, fortress, railPosition } from "../apps/web/src/simulation/arena";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { DEFAULT_OPTIONS, IDLE_INTENT, type MatchState } from "../apps/web/src/simulation/types";
import { add, normalise, scale, sub, unit } from "../apps/web/src/simulation/vector";
import { createFixedClock } from "../apps/web/src/session/fixed-clock";
import { MAX_SWIPE_CURVE } from "../apps/web/src/simulation/flight";

export const PHYSICS_CASES = [
  "corner-240",
  "grazing-120",
  "swipe-positive",
  "swipe-negative",
  "health-gap",
  "empty-sector",
  "eight-curves",
] as const;
export type PhysicsCase = (typeof PHYSICS_CASES)[number];
export function physicsFixture(name: PhysicsCase) {
  const state = createMatch(2026);
  state.phase = "playing";
  const base = fortress(0).direction;
  const ball = state.balls[0]!;
  ball.phase = "active";
  ball.spin = 0;
  if (name === "corner-240" || name === "eight-curves") {
    // Isolated geometry fixtures: remove defending bodies to exercise repeated wall rebounds.
    state.players.forEach((player) => player.health.fill(false));
    if (name === "corner-240") {
      ball.position = { x: 8.7, y: 8.7 };
      ball.velocity = scale(unit(Math.PI / 4), 240);
    } else
      state.balls = Array.from({ length: 8 }, (_, id) => ({
        ...ball,
        id,
        position: { x: 0, y: -3.5 + id },
        velocity: { x: id % 2 ? 120 : -120, y: 0 },
        spin: (id % 2 ? 1 : -1) * MAX_SWIPE_CURVE,
      }));
  } else if (name === "empty-sector") {
    state.players[0]!.health.fill(false);
    ball.position = { x: -8.7, y: 8.7 };
    ball.velocity = { x: -120, y: 120 };
  } else if (name === "health-gap") {
    state.players[0]!.health[0] = false;
    const body = state.players[0]!.pieces[0]!,
      direction = normalise(sub(body.position, fortress(0).anchor));
    ball.position = add(body.position, scale(direction, 0.8));
    ball.velocity = scale(direction, -120);
  } else {
    ball.position = railPosition(0, base, name.startsWith("swipe") ? 4.77 : 4.9);
    ball.velocity = scale(unit(base), name === "grazing-120" ? -120 : -24);
    if (name.startsWith("swipe"))
      state.players[0]!.angle =
        base + (name === "swipe-positive" ? -1 : 1) * ARENA.paddleSpeed * FIXED_DT;
    else {
      state.players[0]!.angle = base + 0.23;
    }
  }
  return state;
}
const quantise = (value: number) => Number(value.toFixed(6));
export function replayPhysics(name: PhysicsCase, fps = 120) {
  let state = physicsFixture(name);
  const clock = createFixedClock();
  const hash = createHash("sha256");
  const events: MatchState["events"] = [];
  const options = {
    ...DEFAULT_OPTIONS,
    // These reviewed collision fixtures retain their originally authored swipe speed.
    pointerPaddleSpeed: ARENA.paddleSpeed,
    humanSeat: 0,
    serveTimeout: 10,
    maxBalls: 8,
    ballInterval: 999,
  };
  for (let frame = 0; frame < fps * 2; frame++)
    clock.advance(1 / fps, () => {
      if (state.phase === "finished") return;
      const direction = name === "swipe-negative" ? -1 : name === "swipe-positive" ? 1 : 0;
      const intent = direction
        ? { ...IDLE_INTENT, targetAngle: fortress(0).direction + direction * 0.3 }
        : IDLE_INTENT;
      state = stepMatch(state, intent, options);
      events.push(...state.events);
      const sample = {
        tick: state.tick,
        rng: state.rng,
        phase: state.phase,
        health: state.players.map((p) => p.health),
        angles: state.players.map((p) => p.angle),
        pieces: state.players.map((p) => p.pieces),
        swipes: state.players.map((p) => p.swipe),
        stats: state.stats,
        winner: state.winner,
        balls: state.balls,
        events: state.events,
      };
      hash.update(
        JSON.stringify(sample, (_, value: unknown) =>
          typeof value === "number" ? quantise(value) : value,
        ),
      );
    });
  return { name, ticks: state.tick, traceDigest: hash.digest("hex"), events, state };
}
