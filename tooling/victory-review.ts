import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch } from "../apps/web/src/simulation/match";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
import type { ViewOptions } from "../apps/web/src/rendering/arena-view";

/** Deterministic presentation fixture, deliberately separate from real match tests. */
export function renderVictoryReview(
  container: HTMLElement,
  count: PlayerCount,
  winner = 0,
  reduced = false,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  const state = createMatch(2026, count);
  state.phase = "finished";
  state.winner = winner;
  state.players.forEach((player) => {
    if (player.id !== winner) player.health.fill(false);
  });
  state.players[winner]!.health[1] = false;
  state.players[winner]!.health[4] = false;
  const saved = JSON.stringify(state);
  const viewport = createViewport(container, 0, state.arena);
  let lastTime = 0;
  const render = (elapsed: number) => {
    const options: ViewOptions = {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: reduced,
      quality: "high",
      menu: {
        mode: winner === 0 ? "victory" : "defeat",
        count,
        elapsed,
        reduced,
        touch: width < 700,
      },
    };
    viewport.render(state, Math.max(0, elapsed - lastTime), options);
    lastTime = elapsed;
    if (JSON.stringify(state) !== saved) throw new Error("Victory rendering changed the match");
  };
  render(0);
  return { render, dispose: () => viewport.dispose() };
}
