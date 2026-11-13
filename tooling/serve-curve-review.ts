import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { levelDifficulty } from "../apps/web/src/simulation/difficulty";
import {
  ARENA,
  FIXED_DT,
  fortress,
  railPosition,
  type PlayerCount,
} from "../apps/web/src/simulation/arena";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "../apps/web/src/simulation/types";
import { launchBall } from "../apps/web/src/simulation/serving";
import { createSneakServeFixture } from "./bot-serve-fixture";

export function createServeCurveReview(
  container: HTMLElement,
  count: PlayerCount,
  side: number,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  let state = createMatch(2026, count, 3, 2026, levelDifficulty(1));
  state.phase = "playing";
  const ball = state.balls[0]!,
    home = fortress(0, state.arena);
  Object.assign(ball, {
    seat: 0,
    striker: 0,
    age: 0.5,
    position: railPosition(0, home.direction, ARENA.railRadius + 0.4, state.arena),
  });
  state = stepMatch(
    state,
    { ...IDLE_INTENT, targetAngle: home.direction + side * 0.08 },
    { ...DEFAULT_OPTIONS, humanSeat: 0 },
  );
  const view = createViewport(container, 0, state.arena),
    draw = (dt: number) =>
      view.render(state, dt, {
        humanSeat: 0,
        preview: false,
        slowdown: false,
        reducedEffects: false,
        quality: "high",
        menu: { mode: "hidden", count, elapsed: 0, reduced: false },
      });
  draw(0);
  return {
    launch() {
      launchBall(state, state.balls[0]!, {
        ...DEFAULT_OPTIONS,
        ballSpeed: state.difficulty!.ballSpeed,
      });
      const initialSpin = state.balls[0]!.spin;
      const target = state.elapsed + 0.35;
      while (state.elapsed + 1e-8 < target) {
        state = stepMatch(state, IDLE_INTENT, { ...DEFAULT_OPTIONS, humanSeat: 0 });
        draw(FIXED_DT);
      }
      return {
        count,
        side,
        initialSpin,
        spin: state.balls[0]!.spin,
        collisionCaps: state.stats.collisionCaps,
      };
    },
    dispose: () => view.dispose(),
  };
}
export function createBotServeReview(container: HTMLElement, width = 1280, height = 900) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const fixture = createSneakServeFixture(),
    view = createViewport(container, 0, fixture.state.arena);
  const draw = (dt: number) =>
    view.render(fixture.state, dt, {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: false,
      quality: "high",
      menu: { mode: "hidden", count: 2, elapsed: 0, reduced: false },
    });
  draw(0);
  return {
    frame(time: number, turnAway = false) {
      fixture.advance(time, turnAway, draw);
      return { ...fixture.summary(), phase: fixture.state.balls[0]!.phase };
    },
    dispose: () => view.dispose(),
  };
}
