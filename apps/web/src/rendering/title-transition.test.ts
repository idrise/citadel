import { expect, it } from "vite-plus/test";
import { createMatch } from "../simulation/match";
import { createTitleTransition, TITLE_TRANSITION_SECONDS } from "./title-transition";
import type { PlayerCount } from "../simulation/arena";
import { length, sub } from "../simulation/vector";

it("morphs every pair of title layouts with continuous actor poses, then returns the exact target state", () => {
  for (const from of [2, 3, 4, 5, 6] as PlayerCount[])
    for (const to of [2, 3, 4, 5, 6] as PlayerCount[]) {
      const a = createMatch(2026, from),
        b = createMatch(2026, to),
        savedA = structuredClone(a),
        savedB = structuredClone(b);
      const transition = createTitleTransition();
      transition.update(a, from - 1, 0, false);
      transition.begin(b, to - 1, true);
      const start = transition.update(b, to - 1, 0, false);
      for (const player of a.players) {
        expect(start.state.players[player.id]!.pieces.map((p) => p.position)).toEqual(
          player.pieces.map((p) => p.position),
        );
        expect(start.scales[player.id]).toBe(1);
      }
      const middle = transition.update(b, to - 1, TITLE_TRANSITION_SECONDS / 2, false);
      expect(middle.moving).toBe(true);
      expect(
        middle.state.arena.vertices.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      ).toBe(true);
      if (to > from) expect(middle.scales[to - 1]).toBeCloseTo(0.5);
      if (from > to) expect(middle.scales[from - 1]).toBeCloseTo(0.5);
      const end = transition.update(b, to - 1, TITLE_TRANSITION_SECONDS, false);
      expect(end.moving).toBe(false);
      expect(end.state).toBe(b);
      expect(a).toEqual(savedA);
      expect(b).toEqual(savedB);
    }
});
it("retargets from the visible intermediate shape, pauses without moving, and respects reduced motion", () => {
  const transition = createTitleTransition(),
    a = createMatch(5, 2),
    b = createMatch(5, 6),
    c = createMatch(5, 3);
  transition.update(a, 0, 0, false);
  transition.begin(b, 0, true);
  const halfway = transition.update(b, 0, 0.4, false);
  const positions = halfway.state.players[0]!.pieces.map((p) => p.position);
  expect(transition.update(b, 0, 0, false).state.arena.vertices).toEqual(
    halfway.state.arena.vertices,
  );
  transition.begin(c, 0, true);
  const retarget = transition.update(c, 0, 0, false);
  expect(retarget.state.players[0]!.pieces.map((p) => p.position)).toEqual(positions);
  for (const p of halfway.state.arena.vertices)
    expect(Math.min(...retarget.state.arena.vertices.map((q) => length(sub(p, q))))).toBeLessThan(
      1e-6,
    );
  expect(transition.update(c, 0, 0, true).state).toBe(c);
});

it("returns from the actually displayed victory star and centre actors, then revives the next roster without changing either match", async () => {
  const { createArenaView } = await import("./arena-view");
  const { createVictoryMorph } = await import("./victory-morph");
  for (const count of [2, 4, 6] as PlayerCount[]) {
    const finished = createMatch(2026, count),
      target = createMatch(3, 6);
    finished.phase = "finished";
    finished.winner = 0;
    for (const p of finished.players) if (p.id !== 0) p.health.fill(false);
    finished.players[0]!.health[1] = false;
    const saved = structuredClone(finished),
      savedTarget = structuredClone(target);
    const transition = createTitleTransition(),
      view = createArenaView(0, finished.arena);
    const frame = transition.update(finished, 0, 0, false);
    view.update(finished, 0, {
      humanSeat: 0,
      preview: false,
      slowdown: false,
      reducedEffects: false,
      menu: { mode: "victory", count, elapsed: 4, reduced: false },
    });
    const ending = createVictoryMorph(0).update(finished, 4, false)!;
    transition.capture(view.captureTransition(frame));
    transition.begin(target, 0, true);
    const first = transition.update(target, 0, 0, false);
    expect(first.state.arena.vertices).toEqual(
      ending.arena.vertices.filter((_, i, all) => {
        const prev = all[(i + all.length - 1) % all.length]!,
          p = all[i]!,
          next = all[(i + 1) % all.length]!;
        return Math.abs((p.x - prev.x) * (next.y - p.y) - (p.y - prev.y) * (next.x - p.x)) > 1e-8;
      }),
    );
    expect(first.state.arena.fortresses[0]!.anchor).toEqual(ending.paddle.position);
    expect(first.state.players[0]!.pieces.map((p) => p.position)).toEqual(ending.pieces);
    expect(first.marks?.[0]).toEqual(ending.centre);
    expect(first.lights?.[0]).toEqual(ending.light);
    expect(first.scales[1]).toBe(0);
    expect(first.pieceScales?.[0]?.[1]).toBe(0);
    expect(first.railGain).toBe(0);
    expect(first.victoryFraming).toBe(1);
    const halfway = transition.update(target, 0, 0.7, false);
    expect(halfway.scales[1]).toBeCloseTo(0.5);
    expect(halfway.pieceScales?.[0]?.[1]).toBeCloseTo(0.5);
    expect(halfway.railGain).toBeCloseTo(0.5);
    expect(halfway.victoryFraming).toBeCloseTo(0.5);
    expect(transition.update(target, 0, 1, false).state).toBe(target);
    expect(finished).toEqual(saved);
    expect(target).toEqual(savedTarget);
    view.dispose();
  }
});

it("grows new seats from the current board and retires them inward instead of appearing outside an expanding boundary", () => {
  for (const [from, to] of [
    [2, 16],
    [16, 2],
  ] as const) {
    const transition = createTitleTransition(),
      a = createMatch(2, from),
      b = createMatch(2, to);
    transition.update(a, 0, 0, false);
    transition.begin(b, 0, true);
    const first = transition.update(b, 0, 0, false);
    if (to === 16) expect(first.state.arena.fortresses[15]!.anchor).toEqual({ x: 0, y: 0 });
    const halfway = transition.update(b, 0, TITLE_TRANSITION_SECONDS / 2, false);
    const anchor = halfway.state.arena.fortresses[15]!.anchor;
    const full = (to === 16 ? b : a).arena.fortresses[15]!.anchor;
    expect(anchor.x).toBeCloseTo(full.x / 2);
    expect(anchor.y).toBeCloseTo(full.y / 2);
    const retarget = createMatch(3, 8),
      pose = halfway.state.players[15]!.pieces[0]!.position;
    transition.begin(retarget, 0, true);
    expect(transition.update(retarget, 0, 0, false).state.players[15]!.pieces[0]!.position).toEqual(
      pose,
    );
  }
});
