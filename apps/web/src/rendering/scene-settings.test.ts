import { PerspectiveCamera, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { createSceneSettings, settingsTargets, type SceneSettingsState } from "./scene-settings";
const state: SceneSettingsState = {
  open: true,
  touch: false,
  showPause: false,
  needsSound: false,
  effectsVolume: 0.75,
  musicVolume: 0.45,
  mouseSensitivity: 1,
};
it("contains only requested controls with reachable targets on portrait, landscape and desktop", () => {
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [768, 1024],
    [1280, 900],
  ])
    for (const touch of [false, true]) {
      const controls = settingsTargets({ ...state, touch }, width!, height!);
      expect(controls.map((t) => t.key)).toEqual(
        touch
          ? ["effectsVolume", "musicVolume", "resume", "restart"]
          : ["effectsVolume", "musicVolume", "mouseSensitivity", "resume", "restart"],
      );
      for (const target of controls) {
        expect(target.left).toBeGreaterThanOrEqual(0);
        expect(target.top).toBeGreaterThanOrEqual(0);
        expect(target.left + target.width).toBeLessThanOrEqual(width!);
        expect(target.top + target.height).toBeLessThanOrEqual(height!);
        expect(target.height).toBeGreaterThanOrEqual(44);
      }
    }
});
it("keeps panel resources stable as values change, and replaces live buttons with settings while open", () => {
  const camera = new PerspectiveCamera(44, 1, 0.1, 200),
    view = createSceneSettings(camera);
  view.update(state, 390, 844);
  const ids: string[] = [];
  camera.traverse((o) => ids.push(o.uuid));
  for (const musicVolume of [0, 0.25, 1]) view.update({ ...state, musicVolume }, 390, 844);
  const after: string[] = [];
  camera.traverse((o) => after.push(o.uuid));
  expect(after).toEqual(ids);
  expect(
    settingsTargets(
      { ...state, touch: true, open: false, showPause: true, needsSound: true },
      390,
      844,
    ).map((t) => t.key),
  ).toEqual(["pause", "sound"]);
  expect(view.update(undefined, 390, 844)).toEqual([]);
});

it("keeps the rendered settings aligned with the accessible targets when rotating while the title menu is hidden", async () => {
  const { createMenuOverlay } = await import("./menu-overlay");
  const { Vector3 } = await import("three");
  const menu = createMenuOverlay();
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [1280, 900],
  ]) {
    menu.update(
      { mode: "hidden", count: 4, elapsed: 0, reduced: false, settings: state },
      0,
      width!,
      height!,
    );
    menu.camera.updateMatrixWorld(true);
    for (const key of ["resume", "restart"] as const) {
      const button = menu.scene.getObjectByName(`settings:${key}`)!;
      const left = button.localToWorld(new Vector3(-0.5, 0, 0)).project(menu.camera);
      const right = button.localToWorld(new Vector3(0.5, 0, 0)).project(menu.camera);
      const target = menu.settingsTargets.find((t) => t.key === key)!;
      expect(((left.x + 1) * width!) / 2).toBeCloseTo(target.left, 6);
      expect(((right.x + 1) * width!) / 2).toBeCloseTo(target.left + target.width, 6);
    }
  }
  menu.dispose();
});

it("offers distinct non-overlapping Resume and Restart targets only while settings are open", () => {
  for (const [width, height] of [
    [320, 568],
    [667, 320],
    [844, 390],
    [1280, 900],
  ])
    for (const touch of [false, true]) {
      const targets = settingsTargets({ ...state, touch }, width!, height!),
        resume = targets.find((t) => t.key === "resume")!,
        restart = targets.find((t) => t.key === "restart")!;
      expect(resume.left + resume.width + 12).toBeCloseTo(restart.left, 8);
      expect(restart.top).toBe(resume.top);
      for (const button of [resume, restart]) {
        expect(button.width).toBeGreaterThanOrEqual(44);
        expect(button.height).toBeGreaterThanOrEqual(44);
      }
      expect(
        settingsTargets({ ...state, touch, open: false }, width!, height!).some(
          (t) => t.key === "restart",
        ),
      ).toBe(false);
    }
});

it("leaves comfortable space below both rendered buttons without crowding sliders on short screens", async () => {
  const { createMenuOverlay } = await import("./menu-overlay");
  const menu = createMenuOverlay();
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [568, 320],
    [844, 390],
    [768, 1024],
    [1280, 900],
  ] as const)
    for (const touch of [false, true]) {
      menu.update(
        { mode: "hidden", count: 6, elapsed: 0, reduced: false, settings: { ...state, touch } },
        0,
        width,
        height,
      );
      menu.camera.updateMatrixWorld(true);
      const panel = menu.scene.getObjectByName("settings-panel")!,
        panelBottom = panel.localToWorld(new Vector3(0, -0.5, 0)).project(menu.camera),
        panelBottomY = ((1 - panelBottom.y) * height) / 2,
        sliders = menu.settingsTargets.filter((target) => target.value !== undefined);
      expect(panelBottomY).toBeLessThanOrEqual(height - 12);
      for (const key of ["resume", "restart"] as const) {
        const target = menu.settingsTargets.find((t) => t.key === key)!,
          button = menu.scene.getObjectByName(`settings:${key}`)!,
          bottom = button.localToWorld(new Vector3(0, -0.5, 0)).project(menu.camera),
          buttonBottomY = ((1 - bottom.y) * height) / 2;
        // The backdrop's shallow depth changes its projected padding by less than a pixel.
        expect(panelBottomY - buttonBottomY).toBeGreaterThanOrEqual(23);
        expect(panelBottomY - buttonBottomY).toBeLessThanOrEqual(25);
        expect(buttonBottomY).toBeCloseTo(target.top + target.height, 6);
        for (const slider of sliders)
          expect(target.top - (slider.top + slider.height)).toBeGreaterThanOrEqual(8);
      }
    }
  menu.dispose();
});

it("offers a labelled touch-only Pause and keeps the guide toggle clear of the sliders and footer", () => {
  for (const touch of [false, true]) {
    const live = { ...state, open: false, touch, showPause: true };
    expect(settingsTargets(live, 390, 844).some((t) => t.key === "pause")).toBe(touch);
    for (const height of [320, 390, 844]) {
      const targets = settingsTargets({ ...state, touch, serveGuide: false }, 390, height),
        guide = targets.find((t) => t.key === "guide")!,
        resume = targets.find((t) => t.key === "resume")!,
        sliders = targets.filter((t) => t.min !== undefined);
      expect(guide.height).toBeGreaterThanOrEqual(44);
      expect(guide.label).toBe("Ball guide: Off");
      for (const slider of sliders) {
        expect(slider.top).toBeGreaterThanOrEqual(guide.top + guide.height);
        expect(resume.top - slider.top - slider.height).toBeGreaterThanOrEqual(8);
      }
    }
  }
});
