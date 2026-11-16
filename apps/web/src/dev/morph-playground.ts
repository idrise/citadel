import { createViewport } from "../rendering/viewport";
import { createMatch } from "../simulation/match";
import { levelDifficulty } from "../simulation/difficulty";
import { beginArenaMorph, stepArenaMorph } from "../simulation/arena-morph";
import type { PlayerCount } from "../simulation/arena";
import type { ArenaShape } from "../simulation/arena-variant";
import { VICTORY_MORPH_SECONDS } from "../rendering/victory-morph";
import { TITLE_TRANSITION_SECONDS } from "../rendering/title-transition";
import type { MatchState } from "../simulation/types";
import { arenaTransition } from "../simulation/arena-transition";

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const container = element<HTMLDivElement>("stage"),
  scrub = element<HTMLInputElement>("scrub"),
  profile = element<HTMLSelectElement>("shape"),
  speed = element<HTMLSelectElement>("speed"),
  play = element<HTMLButtonElement>("play");
let view: ReturnType<typeof createViewport> | undefined;
let state: MatchState;
let scenario = "6-5",
  elapsed = 0,
  duration = 2.8,
  playing = true,
  auto = true;
let morphStart: MatchState | undefined;
let preparing: string | undefined;
let queuedNext = false;

function match(count: PlayerCount) {
  const result = createMatch(2026, count, 3, 2026, {
    ...levelDifficulty(1),
    arenaShape: profile.value as ArenaShape,
  });
  result.balls = [];
  return result;
}
function render(dt: number) {
  view!.render(state, dt, {
    humanSeat: 0,
    preview: false,
    slowdown: false,
    reducedEffects: false,
    quality: "high",
    menu: { mode: "hidden", count: state.arena.count, elapsed, reduced: false },
  });
  scrub.value = String(elapsed / duration);
  element<HTMLOutputElement>("time").value = `${elapsed.toFixed(1)}s`;
  const phase = arenaTransition(elapsed / duration);
  element<HTMLSpanElement>("phase").textContent = preparing
    ? "Preparing board"
    : elapsed >= duration
      ? "Settled"
      : phase.retract > 0
        ? "Retract"
        : phase.rise > 0
          ? "Rebuild"
          : "Reshape";
}
function load(next = scenario, reuse = false) {
  preparing = undefined;
  scenario = next;
  elapsed = 0;
  morphStart = undefined;
  const count: PlayerCount =
    next === "4-3" || next === "victory" || next === "next"
      ? 4
      : next === "3-2"
        ? 3
        : next === "title"
          ? 2
          : 6;
  state = match(count);
  if (!reuse) {
    // Deterministic authored captures can request a fresh camera and renderer.
    view?.dispose();
    view = createViewport(container, 0, state.arena);
  } else view!.transitionTitle(state, 0, false);
  render(0);
  if (next === "victory" || next === "next") {
    state.phase = "finished";
    state.winner = 0;
    state.players.slice(1).forEach((p) => p.health.fill(false));
    duration = VICTORY_MORPH_SECONDS;
    if (next === "next") {
      elapsed = duration;
      render(0);
      state = match(6);
      view!.transitionTitle(state, 0, true);
      elapsed = 0;
      duration = 1.4;
    }
  } else if (next === "title") {
    state = match(6);
    view!.transitionTitle(state, 0, true);
    duration = TITLE_TRANSITION_SECONDS;
  } else {
    state.phase = "playing";
    state.players[count - 1]!.health.fill(false);
    state.eliminations.push({ seat: count - 1, elapsed: 0 });
    beginArenaMorph(state);
    duration = state.morph!.duration;
    morphStart = structuredClone(state);
  }
  render(0);
}
/** Use the production transition to reach a scenario's source board; keep the
 * viewport mounted instead of visibly resetting the scene between examples. */
function transitionTo(next: string) {
  if (next === "next" && state.phase === "finished") {
    preparing = undefined;
    queuedNext = false;
    scenario = next;
    state = match(6);
    view!.transitionTitle(state, 0, true);
    elapsed = 0;
    duration = 1.4;
    playing = true;
    play.textContent = "Pause";
    render(0);
    return;
  }
  const count: PlayerCount =
    next === "4-3" || next === "victory" || next === "next"
      ? 4
      : next === "3-2"
        ? 3
        : next === "title"
          ? 2
          : 6;
  const wasFinished = state.phase === "finished";
  queuedNext = next === "next";
  preparing = queuedNext ? "victory" : next;
  state = match(count);
  view!.transitionTitle(state, 0, true);
  elapsed = 0;
  duration = wasFinished ? 1.4 : TITLE_TRANSITION_SECONDS;
  playing = true;
  play.textContent = "Pause";
  render(0);
}

function startPrepared(next: string) {
  load(next, true);
}
function advance(dt: number) {
  if (elapsed >= duration) {
    if (preparing) startPrepared(preparing);
    else if (queuedNext) {
      queuedNext = false;
      scenario = "next";
      state = match(6);
      view!.transitionTitle(state, 0, true);
      elapsed = 0;
      duration = 1.4;
    }
  }
  const delta = Math.min(dt, duration - elapsed);
  elapsed += delta;
  if (state.morph) stepArenaMorph(state, delta);
  render(delta);
}
function seek(amount: number) {
  queuedNext = false;
  const desired = Math.max(0, Math.min(1, amount));
  load();
  // Run ordinary render increments so camera and title state also follow the timeline.
  while (elapsed < duration * desired - 1e-8)
    advance(Math.min(1 / 60, duration * desired - elapsed));
  if (elapsed < duration * desired) advance(duration * desired - elapsed);
}
document.querySelectorAll<HTMLButtonElement>("[data-scenario]").forEach((button) => {
  button.onclick = () => {
    playing = true;
    play.textContent = "Pause";
    transitionTo(button.dataset.scenario!);
  };
});
profile.onchange = () => transitionTo(scenario);
play.onclick = () => {
  if (elapsed >= duration) {
    transitionTo(scenario);
    playing = true;
  } else playing = !playing;
  play.textContent = playing ? "Pause" : "Play";
};
scrub.oninput = () => {
  playing = false;
  play.textContent = "Play";
  seek(Number(scrub.value));
};
load();
let previous = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, (now - previous) / 1000) * Number(speed.value);
  previous = now;
  if (auto && playing) {
    advance(dt);
    if (elapsed >= duration && !preparing && !queuedNext) {
      playing = false;
      play.textContent = "Replay";
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// A read-only authored scenario harness for deterministic screenshots; no native input.
Object.assign(window, {
  __morphStudio: {
    load(name: string) {
      auto = false;
      queuedNext = false;
      load(name);
    },
    advance,
    transition(name: string) {
      auto = false;
      transitionTo(name);
    },
    seek,
    get snapshot() {
      return {
        elapsed,
        duration,
        scenario,
        preparing,
        queuedNext,
        moving: view!.titleMoving,
        morph: Boolean(state.morph),
        source: morphStart?.arena.vertices.length,
        vertices: state.arena.vertices.length,
      };
    },
  },
});
