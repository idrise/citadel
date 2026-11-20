import { expect, it } from "vite-plus/test";
import { ARENA, FIXED_DT, fortress } from "../simulation/arena";
import { levelDifficulty } from "../simulation/difficulty";
import { createMatch } from "../simulation/match";
import { containersProtected } from "../simulation/protection";
import { add, scale, unit } from "../simulation/vector";
import { createTitleDemo } from "./title-demo";

it.each([2, 4, 6, 16] as const)(
  "keeps every title fortress immortal while bots rally indefinitely with %i seats",
  (count) => {
    const opening = createMatch(2026, count, 3, 7, levelDifficulty(100));
    const saved = structuredClone(opening);
    const demo = createTitleDemo(opening);
    const kinds = new Set<string>();
    for (let frame = 0; frame < 90 * 20; frame++)
      for (const event of demo.advance(0.05)) kinds.add(event.type);
    expect(demo.state.elapsed).toBeCloseTo(90, 5);
    expect(demo.state.phase).toBe("playing");
    expect(demo.state.balls).toHaveLength(3);
    expect(demo.state.stats.paddleHits).toBeGreaterThan(0);
    expect(kinds.has("launch")).toBe(true);
    expect(kinds.has("paddle")).toBe(true);
    expect(kinds.has("shield")).toBe(true);
    for (const kind of ["damage", "elimination", "victory", "supply", "collection"])
      expect(kinds.has(kind)).toBe(false);
    for (const player of demo.state.players) {
      expect(player.health).toEqual([true, true, true]);
      expect(containersProtected(player, 1e12)).toBe(true);
      expect(player.angle).not.toBe(opening.players[player.id]!.angle);
    }
    expect(demo.state.stats.damage).toBe(0);
    expect(demo.state.morph).toBeNull();
    expect(demo.state.eliminations).toEqual([]);
    expect(demo.state.supplies).toEqual([]);
    expect(demo.state.winner).toBeNull();
    expect(demo.owners().size).toBeGreaterThan(0);
    expect(opening).toEqual(saved);
    expect(opening.players.every((player) => player.protectedUntil === undefined)).toBe(true);
  },
  30_000,
);

it("rebounds an actual capsule hit without damage instead of repairing lost health", () => {
  const opening = createMatch(2);
  const normal = unit(fortress(0, opening.arena).direction);
  const body = opening.players[0]!.pieces[0]!;
  opening.balls[0] = {
    ...opening.balls[0]!,
    phase: "active",
    position: add(body.position, scale(normal, body.radius + ARENA.ballRadius + 0.01)),
    velocity: scale(normal, -24),
  };
  const saved = structuredClone(opening);
  const demo = createTitleDemo(opening);
  expect(demo.advance(FIXED_DT).map((event) => event.type)).toContain("shield");
  expect(demo.state.players[0]!.health).toEqual([true, true, true]);
  expect(demo.state.stats.damage).toBe(0);
  expect(demo.state.balls[0]!.phase).toBe("active");
  expect(opening).toEqual(saved);
});

it("drops suspended time and pause remainders, with independent deterministic demo instances", () => {
  const opening = createMatch(21, 6);
  const a = createTitleDemo(opening),
    b = createTitleDemo(opening);
  a.advance(FIXED_DT / 2);
  a.pause();
  a.advance(FIXED_DT / 2);
  expect(a.state.tick).toBe(0);
  a.pause();
  a.advance(100);
  b.advance(0.1);
  expect(a.state.tick).toBe(12);
  expect(a.state).toEqual(b.state);
  expect(a.state.players[0]).not.toBe(b.state.players[0]);
});
