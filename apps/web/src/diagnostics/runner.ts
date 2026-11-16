import { BUILD_INFO } from "../app/build-info";
import { createGameMusic } from "../audio/music-session";
import { createPlaybackContext } from "../audio/mobile-context";
import { createFixedClock } from "../session/fixed-clock";
import { browserEnvironment } from "../session/performance-report";
import { createFrameDiagnostics, type FrameSample } from "../session/frame-diagnostics";
import { createViewport } from "../rendering/viewport";
import { alive, type GameEvent } from "../simulation/types";
import { BENCHMARK_SEED, BENCHMARK_SUPPLY_SEED, createScenario } from "./scenario";
import { comparisonPasses, type Comparison, type Pass } from "./protocol";

export async function runComparison(
  container: HTMLElement,
  config: Comparison,
  signal: AbortSignal,
  progress: (text: string) => void,
  seconds?: number,
) {
  const results: Awaited<ReturnType<typeof runPass>>[] = [];
  const passes = comparisonPasses(config, seconds);
  for (const pass of passes) {
    if (signal.aborted) break;
    results.push(await runPass(container, config, pass, signal, progress));
  }
  return {
    schema: "citadel.benchmark",
    version: 1,
    build: BUILD_INFO,
    capturedAt: new Date().toISOString(),
    config,
    seed: BENCHMARK_SEED,
    supplySeed: BENCHMARK_SUPPLY_SEED,
    browser: browserEnvironment(),
    complete: results.length === passes.length && results.every((p) => p.complete),
    comparableWorkload:
      results.length === 2 &&
      results.every((p) => p.complete) &&
      JSON.stringify(results[0]!.finalState) === JSON.stringify(results[1]!.finalState),
    minimumDurationMet:
      seconds === undefined && results.length === passes.length && results.every((p) => p.complete),
    notes: [
      "Local authored fixture, not a player replay. Defences repaired; resets every 24 simulated seconds.",
      "Adaptive resolution disabled. Same tick sequence and seeds per pass; wall time may differ.",
      "Audio counts detect late scheduling, not native audio-buffer underruns. Muting is not engine-off.",
      "CPU and GPU work overlap. GPU summaries deduplicate fresh asynchronous results.",
      "A shortened developer run is not a 60-second performance baseline.",
    ],
    results,
  };
}
async function runPass(
  container: HTMLElement,
  config: Comparison,
  pass: Pass,
  signal: AbortSignal,
  progress: (text: string) => void,
) {
  const fixture = createScenario(config);
  const recorder = createFrameDiagnostics(18_000);
  const viewport = pass.draw
    ? createViewport(container, 0, fixture.state.arena, undefined, undefined, pass.rendering)
    : null;
  const clock = createFixedClock();
  const music = pass.audio
    ? createGameMusic(BENCHMARK_SEED, 0, {
        createContext: () => createPlaybackContext(pass.latencyHint),
        load: async (context, onStep) =>
          (await import("../audio/tone-engine")).createToneEngine(context, onStep, {
            lookAhead: pass.lookAhead,
          }),
      })
    : null;
  const targetTicks = Math.round((pass.warmupSeconds + pass.seconds) * 120);
  const warmupTicks = Math.round(pass.warmupSeconds * 120);
  let activeWallMs = 0,
    stalls = 0,
    minBalls = Infinity,
    maxBalls = 0,
    morphFrames = 0;
  let audioStart: ReturnType<NonNullable<typeof music>["diagnostics"]> | null = null;
  let audioEnd: ReturnType<NonNullable<typeof music>["diagnostics"]> | null = null;
  let graphics: ReturnType<NonNullable<typeof viewport>["environment"]> | null = null;
  const states: { atMs: number; state: string }[] = [];
  const started = performance.now();
  let reason = "completed";
  try {
    music?.unlock();
    music?.setPlaying(true);
    await new Promise<void>((resolve, reject) => {
      let frame = 0,
        last = 0,
        nextStall = started + 800,
        lastProgress = 0;
      let previous: Omit<FrameSample, "intervalMs"> | null = null;
      let finished = false;
      const finish = (why: string, error?: unknown) => {
        if (finished) return;
        finished = true;
        reason = why;
        cancelAnimationFrame(frame);
        signal.removeEventListener("abort", abort);
        document.removeEventListener("visibilitychange", hidden);
        if (error) reject(error);
        else resolve();
      };
      const abort = () => finish("stopped");
      const hidden = () => {
        if (document.hidden) finish("tab hidden; comparison incomplete");
      };
      signal.addEventListener("abort", abort, { once: true });
      document.addEventListener("visibilitychange", hidden);
      const animate = (now: number) => {
        try {
          if (signal.aborted) {
            finish("stopped");
            return;
          }
          if (document.hidden) {
            finish("tab hidden; comparison incomplete");
            return;
          }
          const frameBegin = performance.now();
          const interval = last ? now - last : 0;
          if (previous) {
            recorder.record({ ...previous, intervalMs: interval });
            activeWallMs += interval;
          }
          last = now;
          const begin = performance.now();
          const events: GameEvent[] = [];
          clock.advance(interval / 1000, () => {
            if (fixture.ticks < targetTicks) events.push(...fixture.step().events);
          });
          const simulationMs = performance.now() - begin;
          const state = fixture.state;
          const audioBegin = performance.now();
          music?.observe(
            { elapsed: state.elapsed, balls: state.balls.length, alive: state.players.map(alive) },
            events,
          );
          const audioMs = performance.now() - audioBegin;
          const diag = music?.diagnostics() ?? null;
          if (diag && states.at(-1)?.state !== diag.contextState) {
            states.push({ atMs: now - started, state: diag.contextState });
            if (states.length > 128) states.shift();
          }
          viewport?.render(state, Math.min(interval / 1000, 0.1), {
            humanSeat: 0,
            preview: false,
            slowdown: false,
            reducedEffects: false,
            quality: pass.quality,
            musicPulse: music?.pulse() ?? 0,
          });
          if (fixture.ticks >= warmupTicks) {
            audioStart ??= diag;
            minBalls = Math.min(minBalls, state.balls.length);
            maxBalls = Math.max(maxBalls, state.balls.length);
            if (state.morph) morphFrames++;
            previous = {
              atMs: now - started,
              phase: state.morph ? "morph" : "playing",
              tick: fixture.ticks,
              simulationSeconds: fixture.simulatedSeconds(),
              simulationMs,
              audioMs,
              renderCpuMs: 0,
              gpuMs: null,
              resolutionScale: pass.rendering.fixedScale,
              calls: 0,
              ...viewport?.performance,
              level: 0,
              balls: state.balls.length,
              seats: state.players.filter(alive).length,
              frameCpuMs: performance.now() - frameBegin,
            };
          }
          if (now - lastProgress > 500) {
            lastProgress = now;
            progress(
              `${pass.id} · ${Math.min(pass.seconds, Math.max(0, (fixture.ticks - warmupTicks) / 120)).toFixed(1)} / ${pass.seconds}s simulated · ${state.balls.length} balls · ${diag?.schedule?.late ?? 0} late notes`,
            );
          }
          if (fixture.ticks >= targetTicks) {
            finish("completed");
            return;
          }
          if (now - started > (pass.warmupSeconds + pass.seconds) * 4000 + 10000) {
            finish("wall-time limit; simulation could not keep up");
            return;
          }
          if (pass.stallMs && fixture.ticks >= warmupTicks && now >= nextStall) {
            const until = performance.now() + pass.stallMs;
            while (performance.now() < until) {
              /* Controlled local main-thread interruption. */
            }
            stalls++;
            nextStall = performance.now() + 370;
          }
          frame = requestAnimationFrame(animate);
        } catch (error) {
          finish("error", error);
        }
      };
      frame = requestAnimationFrame(animate);
    });
    audioEnd = music?.diagnostics() ?? null;
    graphics = viewport?.environment() ?? null;
  } finally {
    music?.dispose();
    viewport?.dispose();
  }
  const frames = recorder.snapshot();
  return {
    id: pass.id,
    settings: pass,
    complete: reason === "completed",
    reason,
    audioAvailable:
      !pass.audio || (audioEnd?.contextState === "running" && audioEnd.schedule !== null),
    wallMs: performance.now() - started,
    activeWallMs,
    simulationSeconds: Math.max(0, (fixture.ticks - warmupTicks) / 120),
    cycles: fixture.cycles,
    finalState: {
      ticks: fixture.ticks,
      rng: fixture.state.rng,
      balls: fixture.state.balls.map((ball) => ({
        id: ball.id,
        position: ball.position,
        velocity: ball.velocity,
        phase: ball.phase,
      })),
      botAngles: fixture.state.players.map((player) => player.angle),
    },
    workload: { minBalls: Number.isFinite(minBalls) ? minBalls : null, maxBalls, morphFrames },
    controlledStalls: stalls,
    audio: { start: audioStart, end: audioEnd, states },
    graphics,
    frames,
  };
}
