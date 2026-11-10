import { createDesktopInput } from "../input/desktop";
import { createViewport } from "../rendering/viewport";
import type { ViewOptions } from "../rendering/arena-view";
import { SEATS } from "../rendering/palette";
import { createMatch, stepMatch } from "../simulation/match";
import { alive, DEFAULT_OPTIONS, type GameEvent, type MatchState } from "../simulation/types";
import { createFixedClock } from "./fixed-clock";

export interface Experiments {
  preview: boolean;
  slowdown: boolean;
  reducedEffects: boolean;
  serveTimeout: number;
  ballInterval: number;
  maxBalls: number;
}
export interface SessionSnapshot {
  state: MatchState;
  paused: boolean;
  started: boolean;
  notice: string;
}
export function createSession(
  container: HTMLElement,
  seed: number,
  humanSeat: number,
  onSnapshot: (snapshot: SessionSnapshot) => void,
) {
  const viewport = createViewport(container);
  const clock = createFixedClock();
  let state = createMatch(seed);
  let paused = true;
  let started = false;
  let notice = "Defend your eight pieces. Last fortress standing wins.";
  let experiments: Experiments = {
    preview: false,
    slowdown: false,
    reducedEffects: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    serveTimeout: 1.8,
    ballInterval: 15,
    maxBalls: 4,
  };
  let lastTimestamp = 0;
  let lastReport = 0;
  let frame = 0;
  const report = () => onSnapshot({ state, paused, started, notice });
  const setPaused = (value: boolean) => {
    paused = value;
    input.clear();
    clock.reset();
    report();
  };
  const input = createDesktopInput(
    viewport.canvas,
    humanSeat,
    (x, y) => viewport.pointFromClient(x, y),
    () => setPaused(!paused),
  );
  const abort = new AbortController();
  window.addEventListener("blur", () => setPaused(true), { signal: abort.signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) setPaused(true);
    },
    { signal: abort.signal },
  );
  const animate = (timestamp: number) => {
    const delta = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, 0.1) : 0;
    lastTimestamp = timestamp;
    const events: GameEvent[] = [];
    if (!paused && state.phase !== "finished")
      clock.advance(delta, () => {
        state = stepMatch(state, input.read(), {
          ...DEFAULT_OPTIONS,
          humanSeat,
          slowdown: experiments.slowdown,
          serveTimeout: experiments.serveTimeout,
          ballInterval: experiments.ballInterval,
          maxBalls: experiments.maxBalls,
        });
        events.push(...state.events);
        for (const event of state.events) {
          if (event.type === "arrival")
            notice = `Another ball joins the arena. ${state.balls.length} balls in play.`;
          if (event.type === "damage")
            notice = `${SEATS[event.seat]!.name} lost a piece. ${alive(state.players[event.seat]!) ? "Revenge serve." : "Fortress eliminated."}`;
        }
      });
    const view: ViewOptions = {
      humanSeat,
      preview: experiments.preview,
      reducedEffects: experiments.reducedEffects,
    };
    viewport.render({ ...state, events }, paused ? 0 : delta, view);
    if (timestamp - lastReport > 80 || events.some((event) => event.type === "victory")) {
      lastReport = timestamp;
      report();
    }
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
  report();
  return {
    start() {
      started = true;
      setPaused(false);
      viewport.canvas.focus({ preventScroll: true });
    },
    pause: () => setPaused(true),
    resume() {
      setPaused(false);
      viewport.canvas.focus({ preventScroll: true });
    },
    configure(next: Experiments) {
      experiments = next;
    },
    dispose() {
      cancelAnimationFrame(frame);
      abort.abort();
      input.dispose();
      viewport.dispose();
    },
  };
}
export type GameSession = ReturnType<typeof createSession>;
