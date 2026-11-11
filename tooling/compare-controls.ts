import { createHash } from "node:crypto";
import {
  ARENA,
  FIXED_DT,
  batCentre,
  clampPaddleAngle,
  fortress,
} from "../apps/web/src/simulation/arena";
import { advanceBall } from "../apps/web/src/simulation/ball";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { predictReturn } from "../apps/web/src/simulation/return-preview";
import { IDLE_INTENT } from "../apps/web/src/simulation/types";
import { add, angleDifference, angleOf, scale, unit } from "../apps/web/src/simulation/vector";
import {
  ASSISTANCE,
  createSettings,
  matchOptions,
  withAssistance,
} from "../apps/web/src/session/settings";
import { MOUSE_RADIANS_PER_PIXEL } from "../apps/web/src/input/desktop";

const round = (value: number) => Number(value.toFixed(3));
const base = fortress(0).direction;
const railSpan = clampPaddleAngle(0, base + 1) - clampPaddleAngle(0, base - 1);
const modes = ASSISTANCE.map((mode) => {
  const settings = withAssistance(createSettings(), mode.id);
  const options = matchOptions(settings, -1);
  const measureContacts = (pressure: boolean) =>
    [-0.75, 0, 0.75].map((offset) => {
      const state = createMatch(2026);
      state.phase = "playing";
      const normal = unit(base + offset * ARENA.batHalfAngle);
      const surface = add(
        batCentre(0, base),
        scale(normal, ARENA.batRadius + ARENA.paddleThickness / 2 + ARENA.ballRadius),
      );
      const ball = state.balls[0]!;
      ball.phase = "active";
      ball.position = add(surface, scale(normal, 1.5));
      ball.velocity = scale(normal, -24);
      if (pressure) {
        const side = offset > 0 ? -1 : 1;
        const angle = base + side * 0.7;
        state.balls.push({
          ...ball,
          id: 1,
          position: {
            x: fortress(0).anchor.x + Math.cos(angle) * 5.8,
            y: fortress(0).anchor.y + Math.sin(angle) * 5.8,
          },
          velocity: scale(unit(angle), -24),
        });
      }
      const predicted = mode.preview ? predictReturn(state, 0, mode.slowdown) : null;
      const angles = state.players.map((player) => player.angle),
        pieces = state.players.map((player) => player.pieces.map((body) => body.position));
      let contactSeconds: number | null = null;
      for (let step = 0; step < 120; step++) {
        let tracked: ReturnType<typeof advanceBall>;
        for (const projected of state.balls) {
          if (projected.phase !== "active") continue;
          const hit = advanceBall(state, projected, angles, FIXED_DT, options, pieces, true);
          if (projected.id === ball.id) tracked = hit;
          else if (hit?.type === "piece") projected.phase = "ready";
        }
        if (!tracked) continue;
        if (tracked.type !== "paddle") throw new Error("Contact fixture was intercepted");
        contactSeconds = step * FIXED_DT + tracked.time;
        break;
      }
      if (contactSeconds === null) throw new Error("Contact fixture missed the bat");
      return {
        offset,
        contactMs: round(contactSeconds * 1000),
        returnDegrees: round((angleDifference(angleOf(ball.velocity), base) * 180) / Math.PI),
        preview: predicted !== null,
      };
    });
  const matches = [1, 21, 2026].map((seed) => {
    let state = createMatch(seed);
    for (let tick = 0; tick < 120 * 300 && state.phase !== "finished"; tick++)
      state = stepMatch(state, IDLE_INTENT, options);
    return {
      seed,
      phase: state.phase,
      seconds: round(state.elapsed),
      winner: state.winner,
      ...state.stats,
      outcomeDigest: createHash("sha256").update(JSON.stringify(state)).digest("hex").slice(0, 16),
    };
  });
  return {
    mode: mode.id,
    contacts: measureContacts(false),
    pressuredContacts: measureContacts(true),
    matches,
  };
});
const pressureCatchComparison = [false, true].map((enabled) => {
  let state = createMatch(2026);
  state.phase = "playing";
  state.players[0]!.angle = base - 0.35;
  state.balls = [
    [-0.65, 6.24],
    [0.65, 10.56],
  ].map(([offset, radius], id) => {
    const direction = unit(base + offset!);
    return {
      ...state.balls[0]!,
      id,
      phase: "active" as const,
      position: add(fortress(0).anchor, scale(direction, radius!)),
      velocity: scale(direction, -24),
    };
  });
  let catches = 0,
    firstCatchMs: number | null = null,
    maxAngularSpeed = 0;
  for (let tick = 0; tick < 90; tick++) {
    const before = state.players[0]!.angle;
    state = stepMatch(
      state,
      { ...IDLE_INTENT, targetAngle: base + (catches ? 0.35 : -0.35) },
      { ...matchOptions(createSettings(), 0), slowdown: enabled, ballInterval: 999 },
    );
    maxAngularSpeed = Math.max(
      maxAngularSpeed,
      Math.abs(state.players[0]!.angle - before) / FIXED_DT,
    );
    const hits = state.events.filter((event) => event.type === "paddle" && event.seat === 0).length;
    if (hits && firstCatchMs === null) firstCatchMs = round((tick + 1) * FIXED_DT * 1000);
    catches += hits;
  }
  return { enabled, catches, firstCatchMs, maxAngularSpeed: round(maxAngularSpeed) };
});
console.log(
  JSON.stringify(
    {
      description:
        "Deterministic stationary-bat contacts and all-bot outcomes; not human feel evidence",
      baselineSpeed: 24,
      startingGap: 1.5,
      paddleSpeed: ARENA.paddleSpeed,
      batBulge: round(ARENA.batRadius * (1 - Math.cos(ARENA.batHalfAngle))),
      fullRailDegrees: round((railSpan * 180) / Math.PI),
      minimumRailTraversalMs: round((railSpan / ARENA.paddleSpeed) * 1000),
      mouseTravelPixels: [0.5, 1, 2].map((sensitivity) => ({
        sensitivity,
        pixels: round(railSpan / (MOUSE_RADIANS_PER_PIXEL * sensitivity)),
      })),
      pressureCatchComparison,
      modes,
    },
    null,
    2,
  ),
);
