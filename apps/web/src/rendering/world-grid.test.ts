import { Box3, Vector3 } from "three";
import { expect, it, vi } from "vite-plus/test";
import { createStage } from "./stage";
import { createWorldGrid, GRID_FADE_END, GRID_FADE_START } from "./world-grid";
import { createArenaCamera } from "./camera";
import { disposeScene } from "./dispose-scene";

it("places the exterior grid below the entire plinth with enough extent to hide its boundary", () => {
  const grid = createWorldGrid();
  const stage = createStage();
  const bounds = new Box3().setFromObject(grid);
  const arena = new Box3().setFromObject(stage.root);
  expect(bounds.max.y).toBeLessThan(arena.min.y);
  expect(bounds.min.y).toBeCloseTo(bounds.max.y);
  expect(bounds.max.x).toBeGreaterThan(GRID_FADE_END);
  expect(bounds.min.x).toBeLessThan(-GRID_FADE_END);
  expect(bounds.max.z).toBeGreaterThan(GRID_FADE_END);
  expect(bounds.min.z).toBeLessThan(-GRID_FADE_END);
  expect(grid.geometry.index!.count).toBe(6);
  disposeScene(grid);
  disposeScene(stage.root);
});

it("fades into the background before the far clip and keeps larger navigational cells distinct", () => {
  const grid = createWorldGrid();
  const camera = createArenaCamera();
  expect(GRID_FADE_START).toBeGreaterThan(20);
  expect(GRID_FADE_END).toBeGreaterThan(GRID_FADE_START);
  const furthestFadedPoint =
    camera.position.length() + new Vector3(GRID_FADE_END, 3.08, 0).length();
  expect(furthestFadedPoint).toBeLessThan(camera.far);
  expect(grid.material.uniforms.majorSpacing!.value).toBeGreaterThan(
    grid.material.uniforms.minorSpacing!.value,
  );
  expect(grid.castShadow).toBe(false);
  disposeScene(grid);
});

it("releases the grid shader and geometry with normal scene cleanup", () => {
  const grid = createWorldGrid();
  const geometry = vi.spyOn(grid.geometry, "dispose"),
    material = vi.spyOn(grid.material, "dispose");
  disposeScene(grid);
  expect(geometry).toHaveBeenCalledOnce();
  expect(material).toHaveBeenCalledOnce();
});
