import * as Tone from "tone";
import { createFeedback } from "../apps/web/src/audio/tone-feedback";
import { encodeWave } from "./pcm-wave";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { damagePiece, emit } from "../apps/web/src/simulation/serving";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
import { createRoundObserver } from "../apps/web/src/session/round-observer";
import { createViewport } from "../apps/web/src/rendering/viewport";

/** Authored last-container impact using real damage, attribution and presentation paths. */
export function renderEliminationReview(
  container: HTMLElement,
  count: PlayerCount,
  playerKill = true,
  reduced = false,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  let state = createMatch(2026, count, 3, 2026, levelDifficulty(1)),
    time = 0;
  const view = createViewport(container, 0, state.arena),
    observer = createRoundObserver(count);
  state.phase = "playing";
  const victim = playerKill || count > 2 ? 1 : 0,
    attacker = playerKill ? 0 : count > 2 ? 2 : 1;
  const ball = state.balls[0]!;
  ball.phase = "active";
  ball.seat = attacker;
  ball.striker = attacker;
  ball.position = { ...state.players[victim]!.pieces[2]!.position };
  state.players[victim]!.health[0] = state.players[victim]!.health[1] = false;
  emit(state, "launch", ball.position, attacker, null, { ballId: ball.id });
  damagePiece(state, ball, victim, 2);
  const options = {
    humanSeat: 0,
    preview: false,
    slowdown: false,
    reducedEffects: reduced,
    quality: "high" as const,
    menu: { mode: "hidden" as const, count, elapsed: 0, reduced },
  };
  view.render({ ...state, events: observer.observe(state.events) }, 0, options);
  return {
    advance(target: number) {
      while (time + 1e-8 < target) {
        const dt = Math.min(1 / 60, target - time);
        state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 }, dt);
        time += dt;
        view.render({ ...state, events: observer.observe(state.events) }, dt, {
          ...options,
          menu: { ...options.menu, elapsed: time },
        });
      }
    },
    summary: () => ({
      count,
      playerKill,
      reduced,
      victim,
      attacker,
      time,
      phase: state.phase,
      collisionCaps: state.stats.collisionCaps,
    }),
    dispose: () => view.dispose(),
  };
}
export async function renderEliminationSound(ownLoss = false) {
  let feedback: ReturnType<typeof createFeedback> | undefined, limiter: Tone.Limiter | undefined;
  const audio = await Tone.Offline(
    (context) => {
      context.destination.volume.value = 20 * Math.log10(0.45);
      limiter = new Tone.Limiter({ context, threshold: -3 }).toDestination();
      feedback = createFeedback(context, limiter);
      feedback.play(
        { voice: "eliminate", note: ownLoss ? 38 : 81, duration: 0.6, velocity: 0.85 },
        0.2,
      );
      feedback.play({ voice: "eliminate", note: 81, duration: 0.6, velocity: 0.7 }, 0.2);
    },
    1.8,
    2,
    44100,
  );
  const result = encodeWave([audio.getChannelData(0), audio.getChannelData(1)], 44100);
  feedback?.dispose();
  limiter?.dispose();
  audio.dispose();
  return result;
}
