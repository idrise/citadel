import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, fortress, railPosition } from "./arena";
import { botLevelProfile } from "./bot-level";
import { botIntent } from "./bots";
import { botStrokeAngle, botTargets, planBotShot } from "./bot-shot";
import { aimServeAt } from "./aim";
import { createMatch, stepMatch } from "./match";
import { SUPPLIES } from "./supplies";
import { DEFAULT_OPTIONS } from "./types";
import { add, angleDifference, scale, unit } from "./vector";

it.each([1, 40, 80, 100])(
  "level %i serves at a reachable supply and abandons consumed targets",
  (level) => {
    const state = createMatch(2026, 4);
    state.phase = "playing";
    state.balls = [state.balls[0]!];
    Object.assign(state.balls[0]!, {
      phase: "ready",
      seat: 0,
      position: railPosition(
        0,
        fortress(0, state.arena).direction,
        ARENA.railRadius + 0.4,
        state.arena,
      ),
    });
    state.supplies = [{ id: 0, position: { x: -1, y: 1 }, age: SUPPLIES.fall }];
    const intent = botIntent(state, 0, level);
    expect(
      Math.abs(
        angleDifference(
          intent.targetAngle!,
          aimServeAt(0, state.supplies[0]!.position, state.arena),
        ),
      ),
    ).toBeLessThanOrEqual(botLevelProfile(level).error * 0.08 + 1e-8);
    expect(state.bots[0]!.serveTarget).toEqual(state.supplies[0]!.position);
    state.supplies = [];
    botIntent(state, 0, level);
    expect(state.bots[0]!.serveTarget).not.toEqual({ x: -1, y: 1 });
  },
);

it("ignores falling/expired supplies and full inventories without resurrecting an eliminated seat", () => {
  const state = createMatch(1, 4),
    origin = { x: 0, y: 0 };
  state.supplies = [
    { id: 0, position: origin, age: 0.9 },
    { id: 1, position: origin, age: SUPPLIES.lifetime },
    { id: 2, position: origin, age: 2 },
  ];
  expect(botTargets(state, 0, origin).filter((t) => t.reward === 9)).toHaveLength(1);
  state.players[0]!.health = Array(12).fill(true);
  expect(botTargets(state, 0, origin).every((t) => t.reward < 9)).toBe(true);
  state.players[0]!.health.fill(false);
  expect(botIntent(state, 0, 100).targetAngle).toBeNull();
});

it("searches signed curves at visible pickup targets without mutating the match", () => {
  const signs = new Set<number>();
  for (const turn of [-0.8, -0.6, -0.4, 0.4, 0.6, 0.8]) {
    const state = createMatch(4, 4),
      home = fortress(0, state.arena);
    const point = railPosition(
      0,
      home.direction,
      ARENA.railRadius + ARENA.ballRadius + ARENA.paddleThickness / 2,
      state.arena,
    );
    state.supplies = [
      { id: 0, age: 2, position: add(point, scale(unit(home.direction + turn), 8)) },
    ];
    const before = structuredClone(state);
    const shot = planBotShot(
      state,
      0,
      { point, velocity: scale(unit(home.direction), -24), angle: home.direction },
      16,
    );
    expect(Number.isFinite(shot.score)).toBe(true);
    if (shot.score > 8) signs.add(Math.sign(shot.swipe));
    expect(state).toEqual(before);
  }
  expect(signs.has(-1)).toBe(true);
  expect(signs.has(1)).toBe(true);
});

it("executes the final brush as ordinary scheduled paddle movement", () => {
  const plan = { angle: 1, swipe: 3.2, contactAt: 2 };
  expect(botStrokeAngle(plan, 1)).toBeCloseTo(1 - 3.2 * 0.065);
  expect(botStrokeAngle(plan, 2)).toBe(1);
  expect(botStrokeAngle(plan, 2.1)).toBe(1);
  expect(
    (botStrokeAngle(plan, 1.98) - botStrokeAngle(plan, 1.98 - FIXED_DT)) / FIXED_DT,
  ).toBeCloseTo(3.2);
});

it("produces curved real returns and collections through normal simulation, with no collision caps", () => {
  let state = createMatch(2026, 4);
  const options = { ...DEFAULT_OPTIONS, humanSeat: -1, botLevel: 100 };
  let curves = 0,
    collections = 0;
  for (let tick = 0; tick < 120 * 35 && state.phase !== "finished"; tick++) {
    const angles = state.players.map((p) => p.angle);
    state = stepMatch(state, undefined, options);
    state.players.forEach((p, seat) =>
      expect(Math.abs(angleDifference(p.angle, angles[seat]!))).toBeLessThanOrEqual(
        16 * FIXED_DT + 1e-8,
      ),
    );
    curves += state.events.filter(
      (e) => e.type === "paddle" && Math.abs(e.impact?.spin ?? 0) > 0.2,
    ).length;
    collections += state.events.filter((e) => e.type === "collection").length;
  }
  expect(curves).toBeGreaterThan(0);
  expect(collections).toBeGreaterThan(0);
  expect(state.stats.collisionCaps).toBe(0);
});

it.each([-0.8, 0.8])(
  "swipes a real return toward the supply at offset %s and earns its container",
  (turn) => {
    let state = createMatch(4, 4);
    const home = fortress(0, state.arena);
    state.phase = "playing";
    state.elapsed = 5;
    state.nextSupplyId = 1;
    const point = railPosition(
      0,
      home.direction,
      ARENA.railRadius + ARENA.ballRadius + ARENA.paddleThickness / 2,
      state.arena,
    );
    state.supplies = [
      { id: 0, age: 2, position: add(point, scale(unit(home.direction + turn), 8)) },
    ];
    state.balls = [
      {
        ...state.balls[0]!,
        phase: "active",
        seat: 1,
        position: railPosition(0, home.direction, 9, state.arena),
        velocity: scale(unit(home.direction), -24),
        spin: 0,
      },
    ];
    const initialHealth = state.players[0]!.health.filter(Boolean).length;
    let spin = 0,
      collected = false;
    for (let tick = 0; tick < 100 && !collected; tick++) {
      state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1, botLevel: 100 });
      for (const event of state.events) {
        if (event.type === "paddle" && event.seat === 0) spin = event.impact!.spin;
        if (event.type === "collection") {
          expect(event.seat).toBe(0);
          collected = true;
        }
      }
    }
    expect(Math.sign(spin)).toBe(Math.sign(turn));
    expect(Math.abs(spin)).toBeGreaterThan(1);
    expect(collected).toBe(true);
    expect(state.players[0]!.health.filter(Boolean).length).toBe(initialHealth + 1);
  },
);

it("early serves have imperfect stable aim; level 100 serves have no intentional error", () => {
  const misses = [1, 50, 100].map((level) => {
    const state = createMatch(2026, 4);
    state.phase = "playing";
    Object.assign(state.balls[0]!, { seat: 0, phase: "ready" });
    const first = botIntent(state, 0, level);
    const aim = aimServeAt(0, state.bots[0]!.serveTarget!, state.arena);
    expect(botIntent(state, 0, level).targetAngle).toBe(first.targetAngle);
    return Math.abs(angleDifference(first.targetAngle!, aim));
  });
  expect(misses[0]).toBeGreaterThan(misses[1]!);
  expect(misses[1]).toBeGreaterThan(misses[2]!);
  expect(misses[2]).toBe(0);
});

it("unlocks accurate signed shot planning as the bot tactics budget reaches level 100", () => {
  const state = createMatch(4, 4),
    home = fortress(0, state.arena);
  const point = railPosition(
    0,
    home.direction,
    ARENA.railRadius + ARENA.ballRadius + ARENA.paddleThickness / 2,
    state.arena,
  );
  state.supplies = [{ id: 0, age: 2, position: add(point, scale(unit(home.direction + 1), 8)) }];
  const contact = { point, velocity: scale(unit(home.direction), -24), angle: home.direction };
  const easy = planBotShot(state, 0, contact, 2, botLevelProfile(1).tactics);
  const hard = planBotShot(state, 0, contact, 16, botLevelProfile(100).tactics);
  expect(easy.swipe).toBe(0);
  expect(hard.swipe).toBeGreaterThan(0);
  expect(hard.score).toBeGreaterThan(easy.score);
});
