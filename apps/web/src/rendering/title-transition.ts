import { createArena, fortress, type ArenaGeometry } from "../simulation/arena";
import { blendPresentationOutline, matchPresentationOutlines } from "./presentation-outline";
import type { MatchState, PlayerState } from "../simulation/types";
import { add, angleDifference, scale, type Vec2 } from "../simulation/vector";

export const TITLE_TRANSITION_SECONDS = 0.85;
export interface TitleFrame {
  state: MatchState;
  scales: number[];
  yaw: number;
  moving: boolean;
  marks?: Vec2[];
  lights?: Vec2[];
  pieceScales?: number[][];
  railGain?: number;
  victoryFraming?: number;
}
const templates = createArena(6).fortresses;
const mix = (a: Vec2, b: Vec2, t: number) => add(scale(a, 1 - t), scale(b, t));
const angle = (a: number, b: number, t: number) => a + angleDifference(b, a) * t;
const yawFor = (state: MatchState, seat: number) => {
  const home = fortress(seat, state.arena).anchor;
  return Math.atan2(home.x, home.y);
};
const scalesFor = (state: MatchState) =>
  Array.from({ length: 6 }, (_, id) =>
    state.players.some((p) => p.id === id && p.health.some(Boolean)) ? 1 : 0,
  );

/** Preview-only geometry/actor interpolation; no simulation steps, RNG or match changes. */
export function createTitleTransition() {
  let current: TitleFrame | undefined;
  let transition:
    | {
        from: TitleFrame;
        target: MatchState;
        seat: number;
        elapsed: number;
        duration: number;
        outline: ReturnType<typeof matchPresentationOutlines>;
      }
    | undefined;
  return {
    capture(frame: TitleFrame) {
      current = frame;
    },
    begin(target: MatchState, seat: number, animate: boolean) {
      transition =
        animate && current
          ? {
              from: current,
              target,
              seat,
              elapsed: 0,
              duration: current.state.phase === "finished" ? 1.4 : TITLE_TRANSITION_SECONDS,
              outline: matchPresentationOutlines(
                current.state.arena.vertices,
                target.arena.vertices,
              ),
            }
          : undefined;
    },
    update(state: MatchState, seat: number, dt: number, reduced: boolean): TitleFrame {
      if (!transition || reduced || state.phase === "playing" || state.phase === "finished") {
        transition = undefined;
        current = { state, scales: scalesFor(state), yaw: yawFor(state, seat), moving: false };
        return current;
      }
      transition.elapsed += Math.max(0, dt);
      const time = Math.min(1, transition.elapsed / transition.duration);
      if (time >= 1) {
        transition = undefined;
        current = { state, scales: scalesFor(state), yaw: yawFor(state, seat), moving: false };
        return current;
      }
      const t = time * time * (3 - 2 * time),
        before = transition.from.state;
      const fortresses = templates.map((template) => {
        const target = state.arena.fortresses.find((f) => f.id === template.id);
        const source = before.arena.fortresses.find((f) => f.id === template.id);
        const a = source ?? target ?? template,
          b = target ?? source ?? template;
        return {
          ...b,
          anchor: mix(a.anchor, b.anchor, t),
          direction: angle(a.direction, b.direction, t),
          halfAngle: a.halfAngle + (b.halfAngle - a.halfAngle) * t,
        };
      });
      const arena: ArenaGeometry = {
        ...state.arena,
        vertices: blendPresentationOutline(transition.outline, t),
        fortresses,
      };
      const players = templates.map((template): PlayerState => {
        const source = before.players.find((p) => p.id === template.id),
          target = state.players.find((p) => p.id === template.id);
        const a = source ?? target,
          b = target ?? source;
        if (!a || !b) return { id: template.id, angle: template.direction, health: [], pieces: [] };
        return {
          ...b,
          angle: angle(a.angle, b.angle, t),
          health: Array.from({ length: Math.max(a.pieces.length, b.pieces.length) }, (_, i) =>
            Boolean(a.health[i] || b.health[i]),
          ),
          pieces: Array.from({ length: Math.max(a.pieces.length, b.pieces.length) }, (_, i) => {
            const source = a.pieces[i] ?? b.pieces[i]!,
              target = b.pieces[i] ?? source;
            return {
              ...target,
              radius: source.radius + (target.radius - source.radius) * t,
              position: mix(source.position, target.position, t),
            };
          }),
        };
      });
      const positions = (distance: number, cached?: Vec2[]) =>
        templates.map((template) => {
          const a = before.arena.fortresses.find((f) => f.id === template.id) ?? template;
          const b = state.arena.fortresses.find((f) => f.id === template.id) ?? a;
          return mix(
            cached?.[template.id] ??
              add(
                a.anchor,
                scale({ x: Math.cos(a.direction), y: Math.sin(a.direction) }, distance),
              ),
            add(b.anchor, scale({ x: Math.cos(b.direction), y: Math.sin(b.direction) }, distance)),
            t,
          );
        });
      current = {
        marks: positions(0.9, transition.from.marks),
        lights: positions(2.7, transition.from.lights),
        railGain: (transition.from.railGain ?? 1) + (1 - (transition.from.railGain ?? 1)) * t,
        victoryFraming: (transition.from.victoryFraming ?? 0) * (1 - t),
        pieceScales: players.map((p) =>
          p.pieces.map((_, i) => {
            const source =
              transition!.from.pieceScales?.[p.id]?.[i] ??
              (before.players.find((a) => a.id === p.id)?.health[i] ? 1 : 0);
            const target = state.players.find((a) => a.id === p.id)?.health[i] ? 1 : 0;
            return source + (target - source) * t;
          }),
        ),
        state: { ...state, arena, players, balls: [] },
        scales: scalesFor(state).map(
          (target, id) =>
            transition!.from.scales[id]! + (target - transition!.from.scales[id]!) * t,
        ),
        yaw: angle(transition.from.yaw, yawFor(state, seat), t),
        moving: true,
      };
      return current;
    },
  };
}
