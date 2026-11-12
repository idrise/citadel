import { levelDifficulty } from "../simulation/difficulty";
import { roundSeed } from "./round-seed";
import { createProgressRecorder, type Demotion, type LevelResult } from "./progression";
import { createRoundObserver, type RoundTotals } from "./round-observer";
import { createDesktopInput } from "../input/desktop";
import { createTouchInput } from "../input/touch";
import { enterMobileFullscreen, fullscreenActive } from "../input/fullscreen";
import { createViewport } from "../rendering/viewport";
import type { ViewOptions } from "../rendering/arena-view";
import { SEATS } from "../rendering/palette";
import { ARENA, fortress, type PlayerCount } from "../simulation/arena";
import { createMatch, stepMatch } from "../simulation/match";
import { alive, type GameEvent, type MatchState } from "../simulation/types";
import { createFixedClock } from "./fixed-clock";
import { createSettings, matchOptions, type GameSettings } from "./settings";
import { createGameMusic, type MusicSnapshot } from "../audio/music-session";
import type { SceneAction } from "../rendering/scene-menu";

export interface SessionSnapshot {
  state: MatchState;
  seed: number;
  humanSeat: number;
  level: number;
  demotion: Demotion | null;
  paused: boolean;
  started: boolean;
  notice: string;
  music: MusicSnapshot;
  totals: RoundTotals;
  initialSettings: GameSettings | null;
  endingTime: number;
  titleMoving: boolean;
  ballOwners: ReadonlyMap<number, number>;
}
export function createSession(
  container: HTMLElement,
  seed: number,
  humanSeat: number,
  onSnapshot: (snapshot: SessionSnapshot) => void,
  count: PlayerCount = 4,
  onSceneAction: (action: SceneAction) => void = () => {},
  level = 1,
  onComplete: (result: LevelResult) => void = () => {},
) {
  let supplySeed = roundSeed(window.location.search, undefined, "supplySeed");
  let state = createMatch(seed, count, ARENA.startingPieces, supplySeed, levelDifficulty(level));
  let demotion: Demotion | null = null;
  let resultFor = createProgressRecorder(humanSeat, level);
  const viewport = createViewport(container, humanSeat, state.arena, (action) => {
    if (action === "start") start();
    else if (action === "watch") {
      watching = true;
      present([], 0);
      report();
    } else {
      if (action === "options") {
        menuSuppressed = true;
        setPaused(true);
      }
      onSceneAction(action);
    }
  });
  const clock = createFixedClock();
  let observer = createRoundObserver(count);
  let paused = true;
  let started = false;
  let watching = false;
  let continuationLevel = level;
  let endingTime = 0;
  let menuSuppressed = false;
  let notice = "Defend your three containers. Last fortress standing wins.";
  let settings = createSettings(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  let initialSettings: GameSettings | null = null;
  let lastTimestamp = 0;
  let lastReport = 0;
  let frame = 0;
  let music = createGameMusic(seed, humanSeat);
  let touchMode = window.matchMedia("(pointer: coarse)").matches;
  const report = () =>
    onSnapshot({
      state,
      seed,
      humanSeat,
      level,
      demotion,
      paused,
      started,
      notice,
      totals: observer.snapshot(),
      initialSettings,
      endingTime,
      titleMoving: viewport.titleMoving,
      ballOwners: observer.owners(),
      music: music.snapshot(),
    });
  const setPaused = (value: boolean) => {
    paused = value;
    if (started && state.phase !== "finished") menuSuppressed = value;
    if (value) music.silence();
    else music.setPlaying(started && state.phase !== "finished");
    input.clear();
    touch.clear();
    if (value) input.release();
    if (value) touch.release();
    clock.reset();
    present([], 0);
    report();
  };
  const makeInput = () =>
    createDesktopInput(
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
  let input = makeInput();
  const makeTouch = () =>
    createTouchInput(
      viewport.canvas,
      humanSeat,
      () => state.players[humanSeat]!.angle,
      () => state.arena,
    );
  let touch = makeTouch();
  const abort = new AbortController();
  let hadFullscreen = fullscreenActive();
  const fullscreenChanged = () => {
    const active = fullscreenActive();
    if (hadFullscreen && !active && started && state.phase !== "finished") setPaused(true);
    hadFullscreen = active;
  };
  document.addEventListener("fullscreenchange", fullscreenChanged, { signal: abort.signal });
  document.addEventListener("webkitfullscreenchange", fullscreenChanged, { signal: abort.signal });
  window.addEventListener(
    "pointerdown",
    (event) => {
      if (!started || paused) {
        if (event.pointerType === "touch") touchMode = true;
        else if (event.pointerType === "mouse") touchMode = false;
      }
    },
    { capture: true, signal: abort.signal },
  );
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
        state = stepMatch(
          state,
          touchMode ? touch.read() : input.read(),
          matchOptions(settings, humanSeat, level),
        );
        events.push(...state.events);
        for (const event of state.events) {
          if (event.type === "arrival")
            notice = `Another ball joins the arena. ${state.balls.length} balls in play.`;
          if (event.type === "damage")
            notice = `${SEATS[event.seat]!.name} lost a piece. ${alive(state.players[event.seat]!) ? "Revenge serve." : "Fortress eliminated."}`;
        }
      });
    const result = started ? resultFor(state) : null;
    if (result) onComplete(result);
    const observed = observer.observe(events, state.balls.length);
    music.observe(
      { elapsed: state.elapsed, balls: state.balls.length, alive: state.players.map(alive) },
      observed,
    );
    music.setPlaying(started && !paused && state.phase !== "finished");
    if (started && state.phase === "finished" && !paused) endingTime += delta;
    present(observed, paused && started ? 0 : delta);
    if (state.phase === "finished" || !alive(state.players[humanSeat]!)) {
      input.release();
      touch.release();
    }
    if (timestamp - lastReport > 80 || events.some((event) => event.type === "victory")) {
      lastReport = timestamp;
      report();
    }
    frame = requestAnimationFrame(animate);
  };
  function present(events: GameEvent[], dt: number) {
    const human = state.players[humanSeat]!;
    const home = fortress(humanSeat, state.arena);
    music.steer(
      !paused && alive(human)
        ? (human.swipe?.velocity ?? 0) * Math.min(1, (human.swipe?.remaining ?? 0) / 0.1)
        : 0,
      (human.angle - home.direction) / home.halfAngle,
    );
    const musicVisuals = music.visuals();
    const view: ViewOptions = {
      humanSeat,
      ballOwners: observer.owners(),
      menu: {
        ...(started && !paused && !menuSuppressed && state.phase === "playing" && !alive(human)
          ? { spectator: { watching, level: continuationLevel, demotion } }
          : {}),
        touch: touchMode,
        mode: menuSuppressed
          ? "hidden"
          : !started
            ? "title"
            : state.phase === "finished"
              ? state.winner === humanSeat
                ? "victory"
                : "defeat"
              : state.phase === "countdown"
                ? "level"
                : "hidden",
        level,
        demotion,
        count,
        elapsed: endingTime,
        reduced: settings.reducedEffects,
      },
      quality: settings.effectsQuality,
      preview: settings.preview,
      slowdown: settings.slowdown,
      reducedEffects: settings.reducedEffects,
      musicPulse: settings.musicLights ? musicVisuals.pulse : 0,
      musicWave: settings.musicLights ? musicVisuals.phase : -1,
    };
    viewport.render({ ...state, events }, dt, view);
  }
  present([], 0);
  frame = requestAnimationFrame(animate);
  report();
  const start = () => {
    if (touchMode) void enterMobileFullscreen();
    initialSettings ??= { ...settings };
    started = true;
    menuSuppressed = false;
    music.unlock();
    setPaused(false);
    if (touchMode) touch.capture();
    else input.capture();
  };
  function resetRound(
    nextCount: PlayerCount,
    nextSeat: number,
    nextLevel: number,
    animate: boolean,
  ) {
    supplySeed = roundSeed(window.location.search, undefined, "supplySeed");
    const nextState = createMatch(
      seed,
      nextCount,
      ARENA.startingPieces,
      supplySeed,
      levelDifficulty(nextLevel),
    );
    viewport.transitionTitle(nextState, nextSeat, animate);
    input.dispose();
    touch.dispose();
    music.dispose();
    count = nextCount;
    humanSeat = nextSeat;
    level = nextLevel;
    state = nextState;
    started = false;
    paused = true;
    menuSuppressed = false;
    watching = false;
    continuationLevel = nextLevel;
    endingTime = 0;
    initialSettings = null;
    notice = "Defend your three containers. Last fortress standing wins.";
    observer = createRoundObserver(count);
    resultFor = createProgressRecorder(humanSeat, level);
    input = makeInput();
    touch = makeTouch();
    music = createGameMusic(seed, humanSeat);
    music.configure(settings);
    clock.reset();
    present([], 0);
    report();
  }
  return {
    start,
    unlockAudio: () => music.unlock(),
    pause: () => setPaused(true),
    resume() {
      if (touchMode && started) void enterMobileFullscreen();
      menuSuppressed = false;
      if (!started) {
        present([], 0);
        report();
        return;
      }
      music.unlock();
      setPaused(false);
      if (state.phase !== "finished" && alive(state.players[humanSeat]!)) {
        if (touchMode) touch.capture();
        else input.capture();
      }
    },
    restart() {
      resetRound(count, humanSeat, level, false);
    },
    nextRound(nextLevel: number) {
      seed = (seed + 1) >>> 0;
      resetRound(count, humanSeat, nextLevel, false);
      start();
    },
    configureRoster(nextCount: PlayerCount, nextSeat: number, nextLevel: number) {
      continuationLevel = nextLevel;
      if (nextCount === count && nextSeat === humanSeat) return false;
      resetRound(nextCount, nextSeat, nextLevel, !started);
      return true;
    },
    configureProgress(next: Demotion | null) {
      demotion = next;
      present([], 0);
      report();
    },
    configure(next: GameSettings) {
      settings = next;
      music.configure(next);
      present([], 0);
    },
    dispose() {
      cancelAnimationFrame(frame);
      abort.abort();
      input.dispose();
      touch.dispose();
      music.dispose();
      viewport.dispose();
    },
  };
}
export type GameSession = ReturnType<typeof createSession>;
