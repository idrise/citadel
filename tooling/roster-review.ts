import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "../apps/web/src/simulation/types";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
/** Real fixed-step sixteen-ball bot play and the ordinary renderer; no capture/input adapter. */
export function createRosterReview(
  container: HTMLElement,
  count: PlayerCount,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  let state = createMatch(51, count, 3, 51, levelDifficulty(100));
  state.phase = "playing";
  state.elapsed = 40;
  state = stepMatch(
    state,
    IDLE_INTENT,
    { ...DEFAULT_OPTIONS, humanSeat: -1, serveTimeout: Infinity },
    0,
  );
  const view = createViewport(container, count - 1, state.arena),
    times: number[] = [],
    simulation: number[] = [],
    submission: number[] = [];
  const gl = view.canvas.getContext("webgl2")!,
    info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "unavailable";
  let previous = 0;
  return {
    async run(frames = 120) {
      for (let frame = 0; frame < frames + 15; frame++) {
        const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
        if (previous && frame >= 15) times.push(now - previous);
        previous = now;
        const begin = performance.now();
        state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
        state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, humanSeat: -1 });
        const rendered = performance.now();
        if (frame >= 15) simulation.push(rendered - begin);
        view.render(state, 1 / 60, {
          humanSeat: count - 1,
          preview: false,
          slowdown: false,
          reducedEffects: false,
          quality: "high",
          menu: { mode: "hidden", count, elapsed: 0, reduced: false },
        });
        if (frame >= 15) submission.push(performance.now() - rendered);
      }
      const quantile = (values: number[], fraction: number) =>
        [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * fraction)]!;
      return {
        count,
        width,
        height,
        frames,
        balls: state.balls.length,
        renderer,
        frameMedianMs: quantile(times, 0.5),
        frameP95Ms: quantile(times, 0.95),
        simulationP95Ms: quantile(simulation, 0.95),
        submissionP95Ms: quantile(submission, 0.95),
        collisionCaps: state.stats.collisionCaps,
      };
    },
    dispose: () => view.dispose(),
  };
}
