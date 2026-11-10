import { afterEach, expect, it, vi } from "vite-plus/test";
import { createDesktopInput } from "./desktop";

afterEach(() => vi.unstubAllGlobals());

it("samples the current projection only on real pointer movement, so a moving camera cannot steer a stationary mouse", () => {
  const canvas = new EventTarget() as HTMLCanvasElement;
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", { activeElement: canvas });
  let projected = { x: -5, y: 4 };
  const project = vi.fn(() => projected);
  const controls = createDesktopInput(canvas, 0, project, () => {});
  canvas.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: 200, clientY: 300 }));
  const aimed = controls.read().targetAngle;
  // The camera can subsequently change what this same screen point would project to.
  projected = { x: -4, y: 3 };
  for (let tick = 0; tick < 120; tick++) expect(controls.read().targetAngle).toBe(aimed);
  expect(project).toHaveBeenCalledTimes(1);
  canvas.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: 201, clientY: 300 }));
  expect(controls.read().targetAngle).not.toBe(aimed);
  expect(project).toHaveBeenCalledTimes(2);
  controls.dispose();
});
