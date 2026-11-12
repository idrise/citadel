import { queuedServePosition } from "./serve-queue";
import type { Vec2 } from "./vector";
import type { RoundDifficulty } from "./difficulty";
import { stepSupplies } from "./supplies";
import {
  ARENA,
  FIXED_DT,
  createArena,
  fortress,
  clampPaddleAngle,
  railPosition,
  type PlayerCount,
} from "./arena";
import { beginArenaMorph, stepArenaMorph } from "./arena-morph";
import { createPieceBodies, stepHealth } from "./health";
import { advanceBall } from "./ball";
import { botLevelProfile } from "./bot-level";
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
import { rememberSwipe } from "./flight";

export function createMatch(
  seed = 1,
  count: PlayerCount = 4,
  initialPieces: number = ARENA.startingPieces,
  supplySeed = seed,
  difficulty?: RoundDifficulty,
): MatchState {
  if (!Number.isInteger(initialPieces) || initialPieces < 1 || initialPieces > 12)
    throw new Error("Invalid initial containers");
  const arena = createArena(count, undefined, 0, difficulty?.batScale ?? 1);
  const state: MatchState = {
    ...(difficulty ? { difficulty: Object.freeze({ ...difficulty }) } : {}),
    arena,
    morph: null,
    eliminations: [],
    tick: 0,
    elapsed: 0,
    countdown: 1.5,
    phase: "countdown",
    rng: seed >>> 0,
    nextBallId: 1,
    players: arena.fortresses.map((seat) => ({
      id: seat.id,
      angle: seat.direction,
      health: Array<boolean>(initialPieces).fill(true),
      pieces: createPieceBodies(seat.id, arena, initialPieces),
    })),
    bots: arena.fortresses.map((seat) => ({
      targetAngle: seat.direction,
      reactionAt: 0,
      serveDelay: 0.65,
      serveTarget: null,
    })),
    balls: [],
    supplies: [],
    nextSupplyId: 0,
    supplySeed: supplySeed >>> 0,
    supplyRng: supplySeed >>> 0,
    lastSupplyPosition: null,
    winner: null,
    events: [],
    nextEventId: 0,
    stats: { paddleHits: 0, damage: 0, collisionCaps: 0 },
  };
  state.bots.forEach((bot) => {
    bot.serveDelay += sample(state) * 0.45;
  });
  state.balls = [readyBall(state, Math.floor(sample(state) * count))];
  return state;
}

/** Pure fixed-step transition. Inputs, bots and renderer never write to the previous state. */
export function stepMatch(
  previous: MatchState,
  human: PlayerIntent = IDLE_INTENT,
  requestedOptions: MatchOptions = DEFAULT_OPTIONS,
  dt = FIXED_DT,
): MatchState {
  if (previous.phase === "finished") return previous;
  const difficulty = previous.difficulty;
  const options = difficulty
    ? {
        ...requestedOptions,
        botLevel: difficulty.level,
        ballSpeed: difficulty.ballSpeed,
        ballInterval: difficulty.ballInterval,
        maxBalls: difficulty.maxBalls,
      }
    : requestedOptions;
  const state: MatchState = {
    ...previous,
    tick: previous.tick + 1,
    events: [],
    supplies: previous.supplies.map((drop) => ({ ...drop, position: { ...drop.position } })),
    players: previous.players.map((player) => ({
      ...player,
      health: [...player.health],
      pieces: player.pieces.map((body) => ({
        ...body,
        position: { ...body.position },
        velocity: { ...body.velocity },
      })),
    })),
    bots: previous.bots.map((bot) => ({ ...bot })),
    balls: previous.balls
      .map((ball) => ({
        ...ball,
        position: { ...ball.position },
        velocity: { ...ball.velocity },
      }))
      .sort((a, b) => a.id - b.id),
    stats: { ...previous.stats },
    eliminations: [...previous.eliminations],
  };
  beginArenaMorph(state);
  if (state.phase === "playing") stepArenaMorph(state, dt);
  const inputs = state.players.map((player) => {
    if (player.id !== options.humanSeat)
      return botIntent(state, player.id, options.botLevel ?? options.botDifficulty);
    if (human.targetAngle === null) return human;
    // Intent is expressed in the geometry visible before this fixed step.
    const turn = angleDifference(
      fortress(player.id, state.arena).direction,
      fortress(player.id, previous.arena).direction,
    );
    return { ...human, targetAngle: human.targetAngle + turn };
  });
  const previousPieces = state.players.map((player) => player.pieces.map((body) => body.position));
  state.players.forEach((player) => stepHealth(player, dt, state.arena));
  const previousAngles = state.players.map((player) => player.angle);
  state.players.forEach((player, seat) => {
    if (!alive(player)) {
      player.swipe = { velocity: 0, remaining: 0 };
      return;
    }
    const before = player.angle;
    const input = inputs[seat] ?? IDLE_INTENT;
    const requested =
      input.targetAngle !== null && Number.isFinite(input.targetAngle)
        ? input.targetAngle
        : player.angle + clamp(input.steer || 0, -1, 1) * ARENA.paddleSpeed * dt;
    const difference = angleDifference(
      clampPaddleAngle(seat, requested, state.arena),
      player.angle,
    );
    const speed =
      seat === options.humanSeat && input.targetAngle !== null
        ? (options.pointerPaddleSpeed ?? ARENA.pointerPaddleSpeed)
        : options.botLevel !== undefined && seat !== options.humanSeat
          ? botLevelProfile(options.botLevel).speed
          : ARENA.paddleSpeed;
    player.angle = clampPaddleAngle(
      seat,
      player.angle + clamp(difference, -speed * dt, speed * dt),
      state.arena,
    );
    player.swipe = rememberSwipe(player.swipe, (player.angle - before) / dt, dt);
  });
  if (state.phase === "countdown") {
    state.countdown = Math.max(0, state.countdown - dt);
    if (state.countdown === 0) state.phase = "playing";
  } else state.elapsed += dt;
  stepSupplies(state, dt);
  const served = new Set<number>();
  const waitingPositions: Vec2[] = [];
  for (const ball of state.balls) {
    if (state.phase === "finished") break;
    if (ball.phase === "ready") {
      const queueIndex = state.balls.filter(
        (queued) => queued.phase === "ready" && queued.seat === ball.seat && queued.id < ball.id,
      ).length;
      const angle = state.players[ball.seat]!.angle;
      ball.position = state.difficulty
        ? queuedServePosition(ball.seat, angle, queueIndex, state.arena, waitingPositions)
        : railPosition(
            ball.seat,
            angle,
            ARENA.railRadius + 0.4 + queueIndex * ARENA.ballRadius * 2.3,
            state.arena,
          );
      waitingPositions.push(ball.position);
      if (state.phase !== "playing") continue;
      ball.age += dt;
      if (
        (ball.age >= 0.25 && inputs[ball.seat]?.launch && !served.has(ball.seat)) ||
        ball.age >= options.serveTimeout
      ) {
        served.add(ball.seat);
        launchBall(state, ball, options);
      }
    } else advanceBall(state, ball, previousAngles, dt, options, previousPieces);
  }
  if (state.phase === "playing") {
    const desired = Math.min(
      clamp(Math.floor(options.maxBalls), 1, 8),
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
