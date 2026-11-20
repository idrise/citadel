import { expect, it } from "vite-plus/test";
import { createTeaserSimulation } from "./teaser-simulation";
import { TEASER_SHOTS } from "./teaser-plan";

it.each(["curve-left"] as const)(
  "%s follows a real strongly curved shot through a capsule break",
  (id) => {
    const scene = createTeaserSimulation(id);
    for (let frame = 0; frame < TEASER_SHOTS.find((shot) => shot.id === id)!.frames; frame++)
      scene.frame();
    expect(scene.summary().curveHit).toBe(true);
    expect(scene.summary().selectedSpin).toBeGreaterThan(1.3);
    expect(scene.summary().stats.collisionCaps).toBe(0);
  },
);
it("shows the authored level 100 reaching sixteen balls with real eliminations", () => {
  const scene = createTeaserSimulation("chaos"),
    before = scene.state.stats.damage;
  for (let frame = 0; frame < TEASER_SHOTS.find((shot) => shot.id === "chaos")!.frames; frame++)
    scene.frame();
  expect(scene.level.level).toBe(100);
  expect(scene.level.playerCount).toBe(12);
  expect(scene.summary().peakBalls).toBe(16);
  expect(scene.state.stats.damage).toBeGreaterThan(before);
  expect(scene.summary().survivors).toBeGreaterThan(1);
}, 30000); // Simulates more than thirty seconds at 120 Hz, including sixteen colliding balls.
it("retains a real sixteen-player match and an active two-player duel", () => {
  for (const id of ["crowd", "duel"] as const) {
    const scene = createTeaserSimulation(id);
    for (let frame = 0; frame < TEASER_SHOTS.find((shot) => shot.id === id)!.frames; frame++)
      scene.frame();
    expect(scene.summary().phase).toBe("playing");
    expect(scene.summary().survivors).toBe(id === "crowd" ? 16 : 2);
  }
});

it("uses the requested one-capsule level-100 capture to show eliminations and board morphs", () => {
  const scene = createTeaserSimulation("level100-intro");
  expect(scene.level.level).toBe(100);
  expect(scene.summary().initialHealth.every((pieces) => pieces === 1)).toBe(true);
  for (
    let frame = 0;
    frame < TEASER_SHOTS.find((shot) => shot.id === "level100-intro")!.frames;
    frame++
  )
    scene.frame();
  expect(scene.summary().initialPieces).toBe(1);
  expect(scene.summary().eliminationsShown).toBeGreaterThanOrEqual(2);
  expect(scene.summary().morphFrames).toBeGreaterThan(60);
  expect(createTeaserSimulation("chaos").summary().initialPieces).toBe(3);
});
