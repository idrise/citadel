import { ARENA, FIXED_DT, fortress, type PlayerCount } from "../apps/web/src/simulation/arena";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { DEFAULT_OPTIONS, IDLE_INTENT } from "../apps/web/src/simulation/types";
import { containersProtected } from "../apps/web/src/simulation/protection";
import { protectionPulse } from "../apps/web/src/rendering/health-protection";
import { createViewport } from "../apps/web/src/rendering/viewport";
import type { EffectsQuality } from "../apps/web/src/rendering/quality";
import { add, scale, unit } from "../apps/web/src/simulation/vector";
/** Stage a real swept hit, then run ordinary simulation through the entire recovery window. */
export function containerProtectionReview(
  container: HTMLElement,
  count: PlayerCount,
  seat = 0,
  quality: EffectsQuality = "high",
  reduced = false,
) {
  container.style.cssText = "position:relative;width:100vw;height:100dvh";
  let state = createMatch(2026, count);
  state.phase = "playing";
  const home = fortress(seat, state.arena),
    piece = state.players[seat]!.pieces[0]!;
  // The shot starts behind the rail to isolate the requested physical container hit.
  state.balls[0] = {
    ...state.balls[0]!,
    phase: "active",
    striker: (seat + 1) % count,
    position: add(
      piece.position,
      scale(unit(home.direction), piece.radius + ARENA.ballRadius + 0.01),
    ),
    velocity: scale(unit(home.direction), -24),
  };
  const view = createViewport(container, 0, state.arena);
  const render = () =>
    view.render(state, 0, {
      humanSeat: 0,
      quality,
      preview: false,
      slowdown: false,
      reducedEffects: reduced,
    });
  render();
  return {
    advance(time: number) {
      while (state.elapsed + FIXED_DT <= time + 1e-8)
        state = stepMatch(state, IDLE_INTENT, { ...DEFAULT_OPTIONS, humanSeat: seat });
      render();
      const player = state.players[seat]!;
      return {
        count,
        seat,
        quality,
        reduced,
        time: state.elapsed,
        protected: containersProtected(player, state.elapsed),
        health: player.health.filter(Boolean).length,
        until: player.protectedUntil,
        pulse: protectionPulse(player, state.elapsed, reduced),
        caps: state.stats.collisionCaps,
      };
    },
    dispose: () => view.dispose(),
  };
}
