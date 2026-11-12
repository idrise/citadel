import { createArena, fortress, type ArenaGeometry } from "../simulation/arena";
import { blendOutline, matchOutlines } from "../simulation/outline-transition";
import type { MatchState, PlayerState } from "../simulation/types";
import { add, angleDifference, scale, type Vec2 } from "../simulation/vector";

export const TITLE_TRANSITION_SECONDS = 0.85;
export interface TitleFrame {
  state: MatchState;
  scales: number[];
  yaw: number;
  moving: boolean;
}
const templates = createArena(6).fortresses;
const mix = (a: Vec2, b: Vec2, t: number) => add(scale(a, 1 - t), scale(b, t));
const angle = (a: number, b: number, t: number) => a + angleDifference(b, a) * t;
const yawFor = (state: MatchState, seat: number) => {
  const home = fortress(seat, state.arena).anchor;
  return Math.atan2(home.x, home.y);
};
const scalesFor = (state: MatchState) =>
  Array.from({ length: 6 }, (_, id) => (state.players.some((p) => p.id === id) ? 1 : 0));

/** Preview-only geometry/actor interpolation; no simulation steps, RNG or match changes. */
export function createTitleTransition() {
  let current: TitleFrame | undefined;
  let transition:
    | {
        from: TitleFrame;
        target: MatchState;
        seat: number;
        elapsed: number;
        outline: ReturnType<typeof matchOutlines>;
      }
    | undefined;
  return {
    begin(target: MatchState, seat: number, animate: boolean) {
      transition =
        animate && current
          ? {
              from: current,
              target,
              seat,
              elapsed: 0,
              outline: matchOutlines(current.state.arena.vertices, target.arena.vertices),
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
      const time = Math.min(1, transition.elapsed / TITLE_TRANSITION_SECONDS);
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
        vertices: blendOutline(transition.outline, t),
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
          pieces: b.pieces.map((body, i) => ({
            ...body,
            position: mix(a.pieces[i]?.position ?? body.position, body.position, t),
          })),
        };
      });
      current = {
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
