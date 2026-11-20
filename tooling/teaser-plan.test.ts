import { expect, it } from "vite-plus/test";
import { resolveLevel } from "../apps/web/src/simulation/levels";
import {
  CAPTURE_SIZE,
  CROWD_LEVEL,
  DUEL_LEVEL,
  TEASER_FPS,
  TEASER_FRAMES,
  TEASER_SECONDS,
  TEASER_SHOTS,
  teaserCrop,
} from "./teaser-plan";

it("cuts on a continuous frame timeline with a title opening and a Start-screen ending", () => {
  expect(TEASER_SHOTS[0]!.id).toBe("title");
  expect(TEASER_SHOTS.at(-1)!.id).toBe("end");
  let end = 0;
  for (const shot of TEASER_SHOTS) {
    expect(shot.start).toBe(end);
    expect(shot.frames).toBeGreaterThan(0);
    expect(shot.seconds).toBe(shot.frames / TEASER_FPS);
    end = shot.end;
  }
  expect(end).toBe(TEASER_FRAMES);
  expect(TEASER_SECONDS).toBeGreaterThan(35);
  expect(TEASER_SECONDS).toBeLessThan(40);
});

it("uses authored two-player and sixteen-player levels rather than changing the game rules", () => {
  expect(resolveLevel(DUEL_LEVEL).playerCount).toBe(2);
  expect(resolveLevel(CROWD_LEVEL).playerCount).toBe(16);
  expect(TEASER_SHOTS.map((shot) => shot.id)).toContain("curve-left");
  expect(TEASER_SHOTS.map((shot) => shot.id)).toContain("level100-intro");
});

it("never reveals the outside of the frame while zooming and following edge action", () => {
  for (const zoom of [0.5, 1, 1.1, 1.35, 1.7])
    for (const x of [-0.2, 0, 0.5, 1, 1.2])
      for (const y of [-0.2, 0.5, 1.2]) {
        const crop = teaserCrop(zoom, x, y);
        expect(crop.x).toBeGreaterThanOrEqual(0);
        expect(crop.y).toBeGreaterThanOrEqual(0);
        expect(crop.x + crop.width).toBeLessThanOrEqual(CAPTURE_SIZE.width + 1e-8);
        expect(crop.y + crop.height).toBeLessThanOrEqual(CAPTURE_SIZE.height + 1e-8);
        expect(crop.width / crop.height).toBeCloseTo(16 / 9);
      }
});
