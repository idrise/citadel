import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import {
  batRadius,
  batHalfAngle,
  fortress,
  FIXED_DT,
  type PlayerCount,
} from "../apps/web/src/simulation/arena";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "../apps/web/src/simulation/types";

/** Authored presentation/idle poses, ordinary fixed-step inputs and real renderer; no session capture. */
export function createPlaytestFeedbackReview(
  container: HTMLElement,
  count: PlayerCount,
  level: number,
  width: number,
  height: number,
  seat = 0,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  let state = createMatch(2026, count, 3, 2026, levelDifficulty(level));
  const view = createViewport(container, seat, state.arena);
  let lastVictory = 0;
  const frame = (
    mode: "title" | "level" | "hidden" | "victory",
    elapsed: number,
    dt = 1 / 30,
    reduced = false,
  ) =>
    view.render(state, dt, {
      humanSeat: seat,
      preview: false,
      slowdown: false,
      reducedEffects: reduced,
      quality: "high",
      menu: { mode, level, previousLevel: level - 1, introDuration: 6, count, elapsed, reduced },
    });
  return {
    title() {
      for (let i = 0; i < 30; i++) frame("title", i / 30);
    },
    briefing() {
      state.countdown = 4;
      frame("level", 2);
    },
    play(offset = 0) {
      state.phase = "playing";
      state.countdown = 0;
      Object.assign(state.balls[0]!, {
        phase: "active",
        position: { x: 1, y: 2 },
        velocity: { x: 0, y: 0 },
      });
      const before = state.rng,
        poses = state.players.map((p) => p.angle);
      for (let i = 0; i < 120; i++) {
        state = stepMatch(
          state,
          { ...IDLE_INTENT, targetAngle: fortress(seat, state.arena).direction + offset },
          { ...DEFAULT_OPTIONS, humanSeat: seat },
        );
        if (i % 4 === 0) frame("hidden", state.elapsed, FIXED_DT * 4);
      }
      return {
        gameplayRngUnchanged: state.rng === before,
        movedBots: state.players.filter(
          (p) => p.id !== seat && Math.abs(p.angle - poses[p.id]!) > 1e-4,
        ).length,
        collisionCaps: state.stats.collisionCaps,
      };
    },
    victory(time: number, reduced = false) {
      state.phase = "finished";
      state.winner = seat;
      state.players.forEach((p) => {
        if (p.id !== seat) p.health.fill(false);
      });
      for (let elapsed = lastVictory; !reduced && elapsed < time; elapsed += 1 / 30)
        frame("victory", elapsed, 1 / 30);
      frame("victory", time, 1 / 30, reduced);
      lastVictory = time;
    },
    summary: () => ({
      count,
      level,
      seat,
      profile: state.difficulty!.batProfile,
      radius: batRadius(state.arena),
      halfAngle: batHalfAngle(state.arena),
    }),
    dispose: () => view.dispose(),
  };
}
