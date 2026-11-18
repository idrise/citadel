import { BUILD_INFO } from "../app/build-info";
import { createPerformanceReport, browserEnvironment } from "./performance-report";
import { downloadJSON } from "./download-json";
import {
  createFrameDiagnostics,
  type FrameSample,
  type FrameDiagnostics,
  type FramePhase,
} from "./frame-diagnostics";
import { createDebugLevels, debugLevelStep } from "./debug-levels";
import { levelBriefingTiming } from "./briefing-timing";
import { levelDifficulty } from "../simulation/difficulty";
import { roundSeed } from "./round-seed";
import {
  createProgressRecorder,
  MAX_REPLAY_TOKENS,
  type Demotion,
  type LevelResult,
} from "./progression";
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
  bestLevel: number;
  replayTokens: number;
  serveGuide: boolean;
  lossLevel: number;
  introDuration: number;
  previousLevel: number | undefined;
  demotion: Demotion | null;
  paused: boolean;
  started: boolean;
  notice: string;
  music: MusicSnapshot;
  totals: RoundTotals;
  initialSettings: GameSettings | null;
  endingTime: number;
  titleMoving: boolean;
  debug: boolean;
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
  initialLossLevel = level,
  initialPreviousLevel?: number,
  onSettings: (settings: GameSettings) => void = () => {},
  onResetProgress: () => void = () => {},
) {
  const diagnostics = createFrameDiagnostics();
  const host = window as Window & {
    __citadelPerformance?: () => ReturnType<typeof diagnostics.snapshot>;
  };
  const previousDiagnostics = host.__citadelPerformance;
  const readDiagnostics = () => ({
    ...diagnostics.snapshot(),
    audio: music.diagnostics(),
    build: BUILD_INFO,
  });
  host.__citadelPerformance = readDiagnostics;
  let pausedEvidence: {
    frames: FrameDiagnostics;
    audio: ReturnType<ReturnType<typeof createGameMusic>["diagnostics"]>;
    graphics: ReturnType<ReturnType<typeof createViewport>["environment"]>;
    context: ReturnType<typeof reportContext>;
  } | null = null;
  const mark = (type: string, detail?: string) =>
    diagnostics.mark({
      atMs: performance.now(),
      type,
      ...(detail === undefined ? {} : { detail }),
    });
  function performanceReport() {
    return createPerformanceReport({
      build: BUILD_INFO,
      frames: pausedEvidence?.frames ?? diagnostics.snapshot(),
      audio: pausedEvidence?.audio ?? music.diagnostics(),
      graphics: pausedEvidence?.graphics ?? viewport.environment(),
      browser: browserEnvironment(),
      context: { ...(pausedEvidence?.context ?? reportContext()), paused },
    });
  }
  function reportContext() {
    return {
      seed,
      supplySeed,
      tick: state.tick,
      simulationSeconds: state.elapsed,
      level,
      initialSeats: count,
      liveSeats: state.players.filter(alive).length,
      arenaShape: state.arena.variant ?? "classic",
      phase: state.phase,
      paused,
      settings: { ...settings },
    };
  }
  let previousFrame: Omit<FrameSample, "intervalMs"> | undefined;
  const debug = createDebugLevels();
  let rosterOverride: PlayerCount | null = null;
  let savedLevel = level;
  let bestLevel = 0;
  let replayTokens = MAX_REPLAY_TOKENS;
  let supplySeed = roundSeed(window.location.search, undefined, "supplySeed");
  let state = createMatch(seed, count, ARENA.startingPieces, supplySeed, levelDifficulty(level));
  let demotion: Demotion | null = null;
  let resultFor = createProgressRecorder(humanSeat, level);
  const viewport = createViewport(
    container,
    humanSeat,
    state.arena,
    (action) => {
      if (action === "start") start();
      else if (action === "back") returnToTitle();
      else {
        if (action === "options") {
          menuSuppressed = true;
          settingsOpen = true;
          setPaused(true);
        }
        onSceneAction(action);
      }
    },
    {
      action(action) {
        if (action === "pause") setPaused(true);
        else if (action === "resume") resume();
        else if (action === "restart") returnToTitle();
        else if (action === "resetProgress") {
          debug.exit();
          rosterOverride = null;
          savedLevel = 1;
          pendingLossLevel = 1;
          pendingPreviousLevel = undefined;
          bestLevel = 0;
          replayTokens = MAX_REPLAY_TOKENS;
          demotion = null;
          resetRound(levelDifficulty(1).playerCount, humanSeat, 1, true);
          onResetProgress();
        } else if (action === "report") {
          downloadJSON(
            performanceReport(),
            `citadel-performance-${BUILD_INFO.buildId}-${state.tick}.json`,
          );
        } else if (action === "benchmark") {
          window.open(
            new URL(`${import.meta.env.BASE_URL}diagnostics.html`, window.location.href),
            "_blank",
            "noopener,noreferrer",
          );
        } else if (action === "guide") {
          settings = { ...settings, serveGuide: !settings.serveGuide };
          mark("settings", JSON.stringify(settings));
          onSettings(settings);
          present([], 0);
          report();
        } else music.unlock();
      },
      change(key, value) {
        if (!Number.isFinite(value)) return;
        const low = key === "mouseSensitivity" ? 0.5 : 0,
          high = key === "mouseSensitivity" ? 2 : 1;
        settings = {
          ...settings,
          [key]: Math.max(low, Math.min(high, value)),
          ...(key === "musicVolume" ? { music: value > 0 } : {}),
        };
        music.configure(settings);
        mark("settings", JSON.stringify(settings));
        onSettings(settings);
        present([], 0);
        report();
      },
    },
  );
  const clock = createFixedClock();
  let observer = createRoundObserver(count);
  let paused = true;
  let started = false;
  let continuationLevel = level;
  let pendingLossLevel = initialLossLevel;
  let pendingPreviousLevel = initialPreviousLevel;
  let previousLevel = initialPreviousLevel;
  let lossLevel = initialLossLevel;
  let introDuration = 1.5;
  let endingTime = 0;
  let menuSuppressed = false;
  let settingsOpen = false;
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
      bestLevel,
      replayTokens,
      serveGuide: settings.serveGuide,
      lossLevel,
      previousLevel,
      introDuration,
      demotion: debug.active ? null : demotion,
      debug: debug.active,
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
    if (value && !paused)
      pausedEvidence = {
        frames: diagnostics.snapshot(),
        audio: music.diagnostics(),
        graphics: viewport.environment(),
        context: reportContext(),
      };
    if (!value) pausedEvidence = null;
    mark(value ? "pause" : "resume");
    paused = value;
    if (started && state.phase !== "finished") {
      menuSuppressed = value;
      settingsOpen = value;
    }
    if (value) music.silence();
    else music.setPlaying(started && state.phase !== "finished");
    input.clear();
    touch.clear();
    if (value) input.release();
    if (value) touch.release();
    clock.reset();
    previousFrame = undefined;
    lastTimestamp = 0;
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
  const input = makeInput();
  const makeTouch = () =>
    createTouchInput(
      viewport.canvas,
      humanSeat,
      () => state.players[humanSeat]!.angle,
      () => state.arena,
    );
  const touch = makeTouch();
  const abort = new AbortController();
  window.addEventListener(
    "keydown",
    (event) => {
      const delta = debugLevelStep(event);
      if (delta === null) return;
      if (delta === "exit") {
        if (!debug.active) return;
        event.preventDefault();
        debug.exit();
        resetRound(count, humanSeat, savedLevel, true);
        return;
      }
      event.preventDefault();
      resetRound(count, humanSeat, debug.move(delta, level), true, true);
      start();
    },
    { signal: abort.signal },
  );
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
    const frameBegin = performance.now();
    const intervalMs = lastTimestamp ? timestamp - lastTimestamp : 0;
    if (previousFrame) {
      diagnostics.record({ ...previousFrame, intervalMs });
      if (
        previousFrame.drawingWidth !== viewport.canvas.width ||
        previousFrame.drawingHeight !== viewport.canvas.height
      )
        mark("drawing-buffer", `${viewport.canvas.width}x${viewport.canvas.height}`);
    }
    const simulationBegin = performance.now();
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
    const simulationMs = performance.now() - simulationBegin;
    const audioBegin = performance.now();
    const result = started ? resultFor(state) : null;
    if (result && !debug.active) onComplete(result);
    const observed = observer.observe(events, state.balls.length);
    music.observe(
      { elapsed: state.elapsed, balls: state.balls.length, alive: state.players.map(alive) },
      observed,
    );
    music.setPlaying(started && !paused && state.phase !== "finished");
    if (started && state.phase === "finished" && !paused) endingTime += delta;
    const audioMs = performance.now() - audioBegin;
    present(observed, paused && started ? 0 : delta);
    viewport.frameBudget(intervalMs, simulationMs + audioMs, !paused && state.phase === "playing");
    if (state.phase === "finished" || !alive(state.players[humanSeat]!)) {
      input.release();
      touch.release();
    }
    if (timestamp - lastReport > 80 || events.some((event) => event.type === "victory")) {
      lastReport = timestamp;
      report();
    }
    const phase: FramePhase = document.hidden
      ? "hidden"
      : !started
        ? "title"
        : paused
          ? "paused"
          : state.phase === "playing" && state.morph
            ? "morph"
            : state.phase;
    if (previousFrame?.phase !== phase) mark("phase", phase);
    for (const event of events)
      if (
        ["damage", "elimination", "victory", "arrival", "supply", "collection"].includes(event.type)
      )
        diagnostics.mark({
          atMs: performance.now(),
          tick: event.tick,
          type: event.type,
          detail: String(event.seat),
        });
    previousFrame = {
      simulationMs,
      audioMs,
      ...viewport.performance,
      level,
      balls: state.balls.length,
      atMs: timestamp,
      phase,
      tick: state.tick,
      simulationSeconds: state.elapsed,
      seats: state.players.filter(alive).length,
      frameCpuMs: performance.now() - frameBegin,
    };
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
          ? { spectator: { level: continuationLevel, demotion } }
          : {}),
        touch: touchMode,
        debug: debug.active,
        settings: {
          open: settingsOpen,
          diagnostics: true,
          touch: touchMode,
          showPause: started && !paused && state.phase !== "finished",
          needsSound: started && !paused && music.snapshot().needsGesture,
          effectsVolume: settings.effectsVolume,
          musicVolume: settings.music ? settings.musicVolume : 0,
          mouseSensitivity: settings.mouseSensitivity,
          serveGuide: settings.serveGuide,
          level,
          bestLevel,
        },
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
        bestLevel,
        replayTokens: debug.active ? undefined : replayTokens,
        lossLevel,
        previousLevel,
        introDuration,
        demotion: debug.active ? null : demotion,
        count,
        elapsed: endingTime,
        reduced: settings.reducedEffects,
      },
      quality: settings.effectsQuality,
      preview: settings.serveGuide,
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
    mark("start");
    initialSettings ??= { ...settings };
    lossLevel = debug.active ? level : pendingLossLevel;
    previousLevel = debug.active ? debug.previous : pendingPreviousLevel;
    introDuration = levelBriefingTiming(
      level,
      lossLevel,
      previousLevel,
      !debug.active && demotion?.to === level ? demotion.from : undefined,
      debug.active,
    ).duration;
    state = { ...state, countdown: introDuration };
    started = true;
    settingsOpen = false;
    menuSuppressed = false;
    music.unlock();
    setPaused(false);
    if (touchMode) touch.capture();
    else input.capture();
  };
  function resume() {
    settingsOpen = false;
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
  }
  function returnToTitle() {
    const target = debug.active ? savedLevel : continuationLevel;
    debug.exit();
    resetRound(count, humanSeat, target, true);
  }
  function resetRound(
    nextCount: PlayerCount,
    nextSeat: number,
    nextLevel: number,
    animate: boolean,
    keepCapture = false,
  ) {
    nextCount = rosterOverride ?? levelDifficulty(nextLevel).playerCount;
    nextSeat = Math.min(nextSeat, nextCount - 1);
    mark("reset");
    pausedEvidence = null;
    supplySeed = roundSeed(window.location.search, undefined, "supplySeed");
    const nextState = createMatch(
      seed,
      nextCount,
      ARENA.startingPieces,
      supplySeed,
      levelDifficulty(nextLevel),
    );
    viewport.transitionTitle(nextState, nextSeat, animate);
    // Debug navigation keeps the current lock: browsers can reject an immediate re-lock.
    if (!keepCapture) {
      input.release();
      touch.release();
    }
    music.dispose();
    count = nextCount;
    humanSeat = nextSeat;
    level = nextLevel;
    lossLevel = debug.active ? level : pendingLossLevel;
    previousLevel = debug.active ? debug.previous : pendingPreviousLevel;
    state = nextState;
    started = false;
    settingsOpen = false;
    paused = true;
    menuSuppressed = false;
    continuationLevel = nextLevel;
    endingTime = 0;
    initialSettings = null;
    notice = "Defend your three containers. Last fortress standing wins.";
    observer = createRoundObserver(count);
    resultFor = createProgressRecorder(humanSeat, level);
    input.resetSeat(humanSeat);
    touch.resetSeat(humanSeat);
    music = createGameMusic(seed, humanSeat);
    music.configure(settings);
    clock.reset();
    previousFrame = undefined;
    lastTimestamp = 0;
    present([], 0);
    report();
  }
  return {
    performanceReport,
    start,
    unlockAudio: () => music.unlock(),
    pause: () => setPaused(true),
    resume,
    restart() {
      resetRound(count, humanSeat, level, true);
    },
    nextRound(nextLevel: number) {
      seed = (seed + 1) >>> 0;
      resetRound(
        count,
        humanSeat,
        debug.active ? debug.move(state.winner === humanSeat ? 1 : 0, level) : nextLevel,
        true,
      );
      start();
    },
    configureRoster(
      nextCount: PlayerCount,
      nextSeat: number,
      nextLevel: number,
      testOverride = false,
    ) {
      savedLevel = nextLevel;
      continuationLevel = nextLevel;
      if (testOverride) rosterOverride = nextCount;
      // Results update the saved next challenge while the current attempt keeps playing/celebrating.
      if (!testOverride && started) return false;
      if (nextCount === count && nextSeat === humanSeat && nextLevel === level) return false;
      resetRound(nextCount, nextSeat, nextLevel, true);
      return true;
    },
    configureProgress(
      next: Demotion | null,
      nextLossLevel = level,
      nextPreviousLevel?: number,
      nextBest = bestLevel,
      nextReplayTokens = replayTokens,
    ) {
      bestLevel = nextBest;
      replayTokens = nextReplayTokens;
      demotion = next;
      pendingLossLevel = nextLossLevel;
      pendingPreviousLevel = nextPreviousLevel;
      if (!started) {
        lossLevel = nextLossLevel;
        previousLevel = nextPreviousLevel;
      }
      present([], 0);
      report();
    },
    configure(next: GameSettings) {
      mark("settings", JSON.stringify(next));
      settings = next;
      music.configure(next);
      present([], 0);
    },
    dispose() {
      if (host.__citadelPerformance === readDiagnostics) {
        if (previousDiagnostics) host.__citadelPerformance = previousDiagnostics;
        else delete host.__citadelPerformance;
      }
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
