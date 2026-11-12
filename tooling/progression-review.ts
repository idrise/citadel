import { createViewport } from "../apps/web/src/rendering/viewport";
import { createMatch, stepMatch } from "../apps/web/src/simulation/match";
import { DEFAULT_OPTIONS } from "../apps/web/src/simulation/types";
import type { PlayerCount } from "../apps/web/src/simulation/arena";

/** Staged resource arrival; collection uses the real fixed-step collision and award code. */
export function renderProgressionReview(
  container: HTMLElement,
  count: PlayerCount,
  level = 1,
  reduced = false,
  width = 1280,
  height = 900,
) {
  container.style.cssText = `width:${width}px;height:${height}px;position:relative`;
  let state = createMatch(2026, count),
    time = 0,
    shot = false,
    delivered = false,
    collections = 0;
  const viewport = createViewport(container, 0, state.arena);
  const ballOwners = new Map([[0, 0]]);
  const advance = (target: number) => {
    while (time + 1 / 120 <= target + 1e-8) {
      time += 1 / 120;
      if (time >= 1.5 && !delivered) {
        state.phase = "playing";
        state.elapsed = 5;
        state.nextSupplyId = 1;
        state.supplies = [{ id: 0, age: 0, position: { x: 0, y: 0 } }];
        state.balls = [];
        delivered = true;
      }
      if (time >= 2.6 && !shot) {
        state.balls = [
          {
            id: 0,
            seat: 0,
            striker: 0,
            age: 0,
            phase: "active",
            position: { x: -7, y: 0 },
            velocity: { x: 24, y: 0 },
            slowSeat: null,
            spin: 0,
          },
        ];
        shot = true;
      }
      if (delivered) state = stepMatch(state, undefined, { ...DEFAULT_OPTIONS, botLevel: level });
      collections += state.events.filter((e) => e.type === "collection").length;
      viewport.render(state, 1 / 120, {
        ballOwners,
        humanSeat: 0,
        preview: false,
        slowdown: false,
        quality: "high",
        reducedEffects: reduced,
        menu: { mode: time < 1.5 ? "level" : "hidden", level, count, elapsed: 0, reduced },
      });
    }
  };
  viewport.render(state, 0, {
    ballOwners,
    humanSeat: 0,
    preview: false,
    slowdown: false,
    quality: "high",
    reducedEffects: reduced,
    menu: { mode: "level", level, count, elapsed: 0, reduced },
  });
  const summary = () => {
    const gl = viewport.canvas.getContext("webgl2")!;
    const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(
      0,
      0,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    let warm = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (pixels[i]! > 220 && pixels[i + 1]! > 180 && pixels[i + 2]! > 160) warm++;
    const living = state.players[0]!.pieces.filter((_, i) => state.players[0]!.health[i]);
    let clearance = Infinity;
    living.forEach((piece, i) =>
      living.slice(i + 1).forEach((other) => {
        clearance = Math.min(
          clearance,
          Math.hypot(piece.position.x - other.position.x, piece.position.y - other.position.y) -
            piece.radius -
            other.radius,
        );
      }),
    );
    return {
      minimumContainerClearance: clearance,
      collections,
      health: state.players[0]!.health.filter(Boolean).length,
      warmFloodFraction: warm / (pixels.length / 4),
    };
  };
  return {
    advance,
    summary,
    dispose: () => viewport.dispose(),
  };
}
