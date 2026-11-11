import { createRoundObserver, type RoundTotals } from "./round-observer";
import { createDesktopInput } from "../input/desktop";
import { createViewport } from "../rendering/viewport";
import type { ViewOptions } from "../rendering/arena-view";
import { SEATS } from "../rendering/palette";
import type { PlayerCount } from "../simulation/arena";
import { createMatch, stepMatch } from "../simulation/match";
import { alive, type GameEvent, type MatchState } from "../simulation/types";
import { createFixedClock } from "./fixed-clock";
import { createSettings, matchOptions, type GameSettings } from "./settings";
import { createGameMusic, type MusicSnapshot } from "../audio/music-session";

export interface SessionSnapshot {
  state: MatchState;
  paused: boolean;
  started: boolean;
  notice: string;
  music: MusicSnapshot;
  totals: RoundTotals;
  initialSettings: GameSettings | null;
}
export function createSession(
  container: HTMLElement,
  seed: number,
  humanSeat: number,
  onSnapshot: (snapshot: SessionSnapshot) => void,
  count: PlayerCount = 4,
) {
  let state = createMatch(seed, count);
  const viewport = createViewport(container, humanSeat, state.arena);
  const clock = createFixedClock();
  const observer = createRoundObserver(count);
  let paused = true;
  let started = false;
  let notice = "Defend your eight pieces. Last fortress standing wins.";
  let settings = createSettings(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  let initialSettings: GameSettings | null = null;
  let lastTimestamp = 0;
  let lastReport = 0;
  let frame = 0;
  const music = createGameMusic(seed, humanSeat);
  const report = () =>
    onSnapshot({
      state,
      paused,
      started,
      notice,
      totals: observer.snapshot(),
      initialSettings,
      music: music.snapshot(),
    });
  const setPaused = (value: boolean) => {
    paused = value;
    if (value) music.silence();
    else music.setPlaying(started && state.phase !== "finished");
    input.clear();
    if (value) input.release();
    clock.reset();
    report();
  };
  const input = createDesktopInput(
    viewport.canvas,
    humanSeat,
    () => state.players[humanSeat]!.angle,
    () => setPaused(true),
    () => {
      if (started && state.phase !== "finished") setPaused(true);
    },
    () => settings.mouseSensitivity,
    () => state.arena,
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
        state = stepMatch(state, input.read(), matchOptions(settings, humanSeat));
        events.push(...state.events);
        for (const event of state.events) {
          if (event.type === "arrival")
            notice = `Another ball joins the arena. ${state.balls.length} balls in play.`;
          if (event.type === "damage")
            notice = `${SEATS[event.seat]!.name} lost a piece. ${alive(state.players[event.seat]!) ? "Revenge serve." : "Fortress eliminated."}`;
        }
      });
    const observed = observer.observe(events, state.balls.length);
    music.observe(
      { elapsed: state.elapsed, balls: state.balls.length, alive: state.players.map(alive) },
      observed,
    );
    music.setPlaying(started && !paused && state.phase !== "finished");
    const musicVisuals = music.visuals();
    const view: ViewOptions = {
      humanSeat,
      quality: settings.effectsQuality,
      preview: settings.preview,
      slowdown: settings.slowdown,
      reducedEffects: settings.reducedEffects,
      musicPulse: settings.musicLights ? musicVisuals.pulse : 0,
      musicWave: settings.musicLights ? musicVisuals.phase : -1,
    };
    viewport.render({ ...state, events: observed }, paused && started ? 0 : delta, view);
    if (state.phase === "finished") input.release();
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
      initialSettings ??= { ...settings };
      started = true;
      music.unlock();
      setPaused(false);
      input.capture();
    },
    pause: () => setPaused(true),
    resume() {
      music.unlock();
      setPaused(false);
      input.capture();
    },
    configure(next: GameSettings) {
      settings = next;
      music.configure(next);
    },
    dispose() {
      cancelAnimationFrame(frame);
      abort.abort();
      input.dispose();
      music.dispose();
      viewport.dispose();
    },
  };
}
export type GameSession = ReturnType<typeof createSession>;
