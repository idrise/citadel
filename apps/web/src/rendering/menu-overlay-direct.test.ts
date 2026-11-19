import { Color, Mesh, type MeshBasicMaterial, type WebGLRenderer } from "three";
import { expect, it, vi } from "vite-plus/test";
import { createMenuOverlay, MENU_BACKGROUND_GAIN } from "./menu-overlay";

it.each(["settings", "victory", "defeat"] as const)(
  "preserves the intended linear brightness when direct rendering dims %s",
  (mode) => {
    const overlay = createMenuOverlay();
    for (const reduced of [false, true]) {
      overlay.update(
        {
          mode: mode === "settings" ? "title" : mode,
          count: 6,
          elapsed: 5,
          reduced,
          ...(mode === "settings"
            ? {
                settings: {
                  open: true,
                  touch: false,
                  showPause: false,
                  needsSound: false,
                  effectsVolume: 1,
                  musicVolume: 0.4,
                  mouseSensitivity: 1,
                },
              }
            : {}),
        },
        0,
        1280,
        900,
      );
      const render = vi.fn(),
        clearDepth = vi.fn();
      const renderer = { autoClear: true, render, clearDepth };
      overlay.renderDirect(renderer as unknown as WebGLRenderer);
      expect(render).toHaveBeenCalledTimes(2); // Existing veil and foreground, no post-processing.
      const veil = render.mock.calls[0]![0].children[0] as Mesh;
      const material = veil.material as MeshBasicMaterial;
      const retainedDisplay = 1 - material.opacity;
      expect(retainedDisplay).toBeGreaterThan(0.4);
      expect(retainedDisplay).toBeLessThan(0.5);
      const retainedLinear = new Color(
        retainedDisplay,
        retainedDisplay,
        retainedDisplay,
      ).convertSRGBToLinear().r;
      expect(retainedLinear).toBeCloseTo(MENU_BACKGROUND_GAIN, 4);
      expect(overlay.dimmer.uniforms.gain!.value).toBe(MENU_BACKGROUND_GAIN);
      expect(material.depthWrite).toBe(false);
      expect(material.depthTest).toBe(false);
      expect(clearDepth).toHaveBeenCalledOnce();
      expect(renderer.autoClear).toBe(true);
    }
    overlay.dispose();
  },
);

it("omits the veil in normal play and restores the renderer state even if drawing fails", () => {
  const overlay = createMenuOverlay();
  overlay.update({ mode: "hidden", count: 6, elapsed: 0, reduced: false }, 0, 390, 844);
  const renderer = { autoClear: true, render: vi.fn(), clearDepth: vi.fn() };
  overlay.renderDirect(renderer as unknown as WebGLRenderer);
  expect(renderer.render).toHaveBeenCalledTimes(1);
  for (const autoClear of [false, true]) {
    renderer.autoClear = autoClear;
    renderer.render.mockImplementation(() => {
      throw new Error("draw failed");
    });
    expect(() => overlay.renderDirect(renderer as unknown as WebGLRenderer)).toThrow("draw failed");
    expect(renderer.autoClear).toBe(autoClear);
  }
  overlay.dispose();
});
