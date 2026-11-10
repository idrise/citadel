import { ARENA, FIXED_DT, FORTRESSES, clampPaddleAngle, railPosition } from "./arena";
import { advanceBall } from "./ball";
import { botIntent } from "./bots";
import { sample } from "./random";
import { emit, launchBall, readyBall } from "./serving";
import {
  alive,
  DEFAULT_OPTIONS,
  IDLE_INTENT,
  type MatchOptions,
  type MatchState,
  type PlayerIntent,
} from "./types";
import { angleDifference, clamp } from "./vector";

export function createMatch(seed = 1): MatchState {
  const state: MatchState = {
    tick: 0,
    elapsed: 0,
    countdown: 1.5,
    phase: "countdown",
    rng: seed >>> 0,
    nextBallId: 1,
    players: FORTRESSES.map((seat) => ({
      id: seat.id,
      angle: seat.direction,
      health: Array<boolean>(ARENA.pieces).fill(true),
    })),
    bots: FORTRESSES.map((seat) => ({
      targetAngle: seat.direction,
      reactionAt: 0,
      serveDelay: 0.65,
      serveTarget: null,
    })),
    balls: [],
    winner: null,
    events: [],
    nextEventId: 0,
    stats: { paddleHits: 0, damage: 0, collisionCaps: 0 },
  };
  state.bots.forEach((bot) => {
    bot.serveDelay += sample(state) * 0.45;
  });
  state.balls = [readyBall(state, Math.floor(sample(state) * 4))];
  return state;
}

/** Pure fixed-step transition. Inputs, bots and renderer never write to the previous state. */
export function stepMatch(
  previous: MatchState,
  human: PlayerIntent = IDLE_INTENT,
  options: MatchOptions = DEFAULT_OPTIONS,
  dt = FIXED_DT,
): MatchState {
  if (previous.phase === "finished") return previous;
  const state: MatchState = {
    ...previous,
    tick: previous.tick + 1,
    events: [],
    players: previous.players.map((player) => ({ ...player, health: [...player.health] })),
    bots: previous.bots.map((bot) => ({ ...bot })),
    balls: previous.balls.map((ball) => ({
      ...ball,
      position: { ...ball.position },
      velocity: { ...ball.velocity },
    })),
    stats: { ...previous.stats },
  };
  const inputs = state.players.map((player) =>
    player.id === options.humanSeat ? human : botIntent(state, player.id),
  );
  const previousAngles = state.players.map((player) => player.angle);
  state.players.forEach((player, seat) => {
    if (!alive(player)) return;
    const input = inputs[seat] ?? IDLE_INTENT;
    const requested =
      input.targetAngle !== null && Number.isFinite(input.targetAngle)
        ? input.targetAngle
        : player.angle + clamp(input.steer || 0, -1, 1) * ARENA.paddleSpeed * dt;
    const difference = angleDifference(clampPaddleAngle(seat, requested), player.angle);
    player.angle = clampPaddleAngle(
      seat,
      player.angle + clamp(difference, -ARENA.paddleSpeed * dt, ARENA.paddleSpeed * dt),
    );
  });
  if (state.phase === "countdown") {
    state.countdown = Math.max(0, state.countdown - dt);
    if (state.countdown === 0) state.phase = "playing";
  } else state.elapsed += dt;
  const served = new Set<number>();
  for (const ball of state.balls) {
    if (state.phase === "finished") break;
    if (ball.phase === "ready") {
      const queueIndex = state.balls.filter(
        (queued) => queued.phase === "ready" && queued.seat === ball.seat && queued.id < ball.id,
      ).length;
      ball.position = railPosition(
        ball.seat,
        state.players[ball.seat]!.angle,
        ARENA.railRadius + 0.4 + queueIndex * ARENA.ballRadius * 2.3,
      );
      if (state.phase !== "playing") continue;
      ball.age += dt;
      if (
        (ball.age >= 0.25 && inputs[ball.seat]?.launch && !served.has(ball.seat)) ||
        ball.age >= options.serveTimeout
      ) {
        served.add(ball.seat);
        launchBall(state, ball, options);
      }
    } else advanceBall(state, ball, previousAngles, dt, options);
  }
  if (state.phase === "playing") {
    const desired = Math.min(
      options.maxBalls,
      1 + Math.floor(state.elapsed / Math.max(1, options.ballInterval)),
    );
    while (state.balls.length < desired) {
      const candidates = state.players.filter(alive);
      const queued = (seat: number) =>
        state.balls.filter((ball) => ball.phase === "ready" && ball.seat === seat).length;
      const minimum = Math.min(...candidates.map((player) => queued(player.id)));
      const seats = candidates.filter((player) => queued(player.id) === minimum);
      const seat = seats[Math.floor(sample(state) * seats.length)]!.id;
      const incoming = readyBall(state, seat, state.nextBallId++);
      state.balls.push(incoming);
      emit(state, "arrival", incoming.position, seat);
    }
  }
  return state;
}
