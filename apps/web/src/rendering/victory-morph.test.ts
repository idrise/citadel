import { expect, it } from "vite-plus/test";
import { Mesh } from "three";
import { beginArenaMorph, stepArenaMorph } from "../simulation/arena-morph";
import { createMatch } from "../simulation/match";
import { ARENA, createArena, type PlayerCount } from "../simulation/arena";
import {
  createVictoryMorph,
  victoryOutlines,
  VICTORY_HOLD_SECONDS,
  VICTORY_MORPH_SECONDS,
} from "./victory-morph";
import { createArenaView } from "./arena-view";
import { disposeScene } from "./dispose-scene";
import { createMenuOverlay } from "./menu-overlay";
import type { Vec2 } from "../simulation/vector";

const distance = (p: Vec2, a: Vec2, b: Vec2) => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
const boundaryDistance = (p: Vec2, vertices: Vec2[]) =>
  Math.min(...vertices.map((a, i) => distance(p, a, vertices[(i + 1) % vertices.length]!)));
function finished(count: PlayerCount, winner = 0) {
  const state = createMatch(2026, count);
  state.phase = "finished";
  state.winner = winner;
  state.players.forEach((p) => {
    if (p.id !== winner) p.health.fill(false);
  });
  state.players[winner]!.health[1] = false;
  return state;
}

it.each([2, 3, 4, 5, 6] as const)(
  "preserves every original corner and a five-point star in the %i-seat correspondence",
  (count) => {
    const source = createArena(count).vertices;
    for (const facing of [0, Math.PI, -Math.PI / 2, 0.371, 1e-12, -1e-12]) {
      const { from, to } = victoryOutlines(source, facing);
      expect(from.length).toBeLessThanOrEqual(24);
      expect(to.length).toBe(from.length);
      for (const p of source) expect(boundaryDistance(p, from)).toBeLessThan(1e-7);
      for (const p of from) expect(boundaryDistance(p, source)).toBeLessThan(1e-7);
      for (let i = 0; i < 10; i++) {
        const angle = facing - (i * Math.PI) / 5,
          radius = i % 2 ? 4.7 : 9.2;
        expect(
          boundaryDistance({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }, to),
        ).toBeLessThan(1e-7);
      }
      for (let i = 0; i < from.length; i++) {
        expect(
          Math.hypot(
            from[i]!.x - from[(i + 1) % from.length]!.x,
            from[i]!.y - from[(i + 1) % from.length]!.y,
          ),
        ).toBeGreaterThan(1e-7);
        expect(Math.hypot(to[i]!.x, to[i]!.y)).toBeGreaterThanOrEqual(4.7 - 1e-7);
      }
    }
  },
);

it.each([2, 3, 4, 5, 6] as const)(
  "moves every possible %i-seat winner into the centre without changing the match",
  (count) => {
    for (let winner = 0; winner < count; winner++) {
      const state = finished(count, winner),
        saved = structuredClone(state);
      const morph = createVictoryMorph(0);
      const start = morph.update(state, 0, false)!;
      expect(start.progress).toBe(0);
      expect(start.paddle.position).toEqual(state.arena.fortresses[winner]!.anchor);
      expect(start.paddle.angle).toBe(state.players[winner]!.angle);
      expect(start.pieces).toEqual(state.players[winner]!.pieces.map((p) => p.position));
      const middle = morph.update(state, VICTORY_MORPH_SECONDS / 2, false)!;
      expect(middle.progress).toBeCloseTo(0.5);
      for (let i = 0; i < middle.arena.vertices.length; i++) {
        const p = middle.arena.vertices[i]!;
        expect([p.x, p.y].every(Number.isFinite)).toBe(true);
        expect(Math.hypot(p.x, p.y)).toBeGreaterThan(0);
      }
      const end = morph.update(state, VICTORY_MORPH_SECONDS, false)!;
      expect(end.progress).toBe(1);
      const batMidpoint = {
        x: end.paddle.position.x + Math.cos(end.paddle.angle) * ARENA.railRadius,
        y: end.paddle.position.y + Math.sin(end.paddle.angle) * ARENA.railRadius,
      };
      expect(Math.hypot(batMidpoint.x, batMidpoint.y)).toBeCloseTo(1.8);
      end.pieces.forEach((p, i) => {
        if (state.players[winner]!.health[i]) expect(Math.hypot(p.x, p.y)).toBeLessThan(2.5);
      });
      expect(morph.update(state, 20, false)!.arena).toBe(end.arena);
      // The session wraps the frozen state with a fresh events array each frame.
      expect(morph.update({ ...state, events: [] }, 21, false)!.arena).toBe(end.arena);
      expect(morph.update(state, 0, true)!.arena.vertices).toEqual(end.arena.vertices);
      expect(state).toEqual(saved);
      const reset = createMatch(12, count);
      expect(morph.update(reset, 0, false)).toBeNull();
      expect(morph.update(state, 0, false)!.progress).toBe(0);
    }
  },
);

it("keeps the star bright and rematch unavailable during the victory hold, including reduced mode", () => {
  for (const mode of ["victory", "defeat"] as const)
    for (const reduced of [false, true]) {
      const overlay = createMenuOverlay();
      for (const elapsed of [0, VICTORY_MORPH_SECONDS, VICTORY_HOLD_SECONDS - 0.01]) {
        expect(overlay.update({ mode, elapsed, count: 4, reduced }, 1, 1280, 900)).toEqual([]);
        expect(overlay.backgroundGain).toBe(1);
      }
      expect(
        overlay
          .update({ mode, elapsed: VICTORY_HOLD_SECONDS, count: 4, reduced }, 2, 1280, 900)
          .map((c) => c.action),
      ).toEqual(["rematch", "options"]);
      expect(overlay.backgroundGain).toBeLessThan(0.2);
      overlay.dispose();
    }
});

it("renders the winner's real surviving pieces and finite concave walls while clearing balls and rails", () => {
  const state = finished(6, 4);
  // A final impact may have scattered the surviving containers.
  state.players[4]!.pieces[0]!.position = { x: 10, y: -8 };
  const saved = structuredClone(state);
  const view = createArenaView(0, state.arena);
  for (const elapsed of [0, 0.7, 1.4, 2.8, 8]) {
    view.update(state, 1 / 60, {
      humanSeat: 0,
      reducedEffects: false,
      quality: "low",
      slowdown: false,
      preview: true,
      menu: { mode: "defeat", elapsed, count: 6, reduced: false },
    });
    for (const player of state.players) {
      expect(view.root.getObjectByName(`defence-rail-${player.id}`)!.visible).toBe(false);
      expect(view.root.getObjectByName(`paddle-${player.id}`)!.visible).toBe(
        player.id === state.winner,
      );
      for (let index = 0; index < player.health.length; index++) {
        const piece = view.root.getObjectByName(`health-${player.id}-${index}`)!;
        expect(piece.visible).toBe(player.health[index]);
        if (elapsed >= VICTORY_MORPH_SECONDS && piece.visible)
          expect(Math.hypot(piece.position.x, piece.position.z)).toBeLessThan(2.5);
      }
    }
    view.root.traverse((object) => {
      expect(
        [
          ...object.position.toArray(),
          ...object.scale.toArray(),
          ...object.rotation.toArray().slice(0, 3),
        ].every((n) => typeof n === "number" && Number.isFinite(n)),
      ).toBe(true);
      if (object instanceof Mesh && object.visible)
        expect(
          Array.from(object.geometry.getAttribute("position").array).every(Number.isFinite),
        ).toBe(true);
      if (["game-ball", "occluded-ball", "ball-trail", "wall-reflection"].includes(object.name))
        expect(object.visible).toBe(false);
    });
  }
  expect(view.displayArena.vertices).not.toEqual(state.arena.vertices);
  expect(state).toEqual(saved);
  view.dispose();
  disposeScene(view.root);
});

it("starts from an unfinished elimination morph without snapping to its pending target", () => {
  const state = createMatch(2026, 6);
  state.players[5]!.health.fill(false);
  state.eliminations.push({ seat: 5, elapsed: 0 });
  beginArenaMorph(state);
  stepArenaMorph(state, 0.8);
  state.players.forEach((player) => {
    if (player.id !== 3) player.health.fill(false);
  });
  state.phase = "finished";
  state.winner = 3;
  const saved = structuredClone(state),
    morph = createVictoryMorph(5);
  const first = morph.update(state, 0, false)!;
  for (const point of state.arena.vertices)
    expect(boundaryDistance(point, first.arena.vertices)).toBeLessThan(1e-7);
  for (const point of first.arena.vertices)
    expect(boundaryDistance(point, state.arena.vertices)).toBeLessThan(1e-7);
  const middle = morph.update(state, 1.2, false)!;
  expect(morph.update({ ...state, events: [] }, 1.2, false)!.arena).toBe(middle.arena);
  const last = morph.update(state, 5, false)!;
  expect(last.progress).toBe(1);
  expect(state).toEqual(saved);
});
