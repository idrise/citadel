import { Box3, PerspectiveCamera, Vector3 } from "three";
import { expect, it } from "vite-plus/test";
import { disposeScene } from "./dispose-scene";
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
          ? [
              "effectsVolume",
              "musicVolume",
              "graphicsQuality",
              "resume",
              "restart",
              "resetProgress",
            ]
          : [
              "effectsVolume",
              "musicVolume",
              "graphicsQuality",
              "mouseSensitivity",
              "resume",
              "restart",
              "resetProgress",
            ],
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

it("centres the header, spaces slider labels below it and aligns both button labels", () => {
  for (const [width, height] of [
    [320, 320],
    [568, 320],
    [844, 390],
    [390, 844],
    [1280, 900],
  ] as const)
    for (const touch of [false, true]) {
      const camera = new PerspectiveCamera(44, width / height, 0.1, 200),
        view = createSceneSettings(camera),
        settings = { ...state, touch, level: 7, bestLevel: 12 };
      const targets = view.update(settings, width, height);
      camera.updateMatrixWorld(true);
      expect(targets.some((t) => String(t.key) === "guide")).toBe(false);
      const progress = camera.getObjectByName("settings-level-status")!;
      expect(progress.position.x).toBe(0);
      const headerBottom = new Box3().setFromObject(progress).min.clone().project(camera);
      const labelTop = new Box3()
        .setFromObject(camera.getObjectByName("neon-text:SOUND EFFECTS")!)
        .max.clone()
        .project(camera);
      expect(((headerBottom.y - labelTop.y) * height) / 2).toBeGreaterThanOrEqual(24);
      for (const key of ["resume", "restart"] as const) {
        const label = camera.getObjectByName(`settings-label:${key}`)!,
          target = targets.find((t) => t.key === key)!,
          centre = new Box3().setFromObject(label).getCenter(new Vector3()).project(camera);
        expect(((centre.x + 1) * width) / 2).toBeCloseTo(target.left + target.width / 2, 0);
        expect(((1 - centre.y) * height) / 2).toBeCloseTo(target.top + target.height / 2, 0);
      }
      const first = progress.getObjectByName("neon-text:LEVEL 07");
      view.update({ ...settings, musicVolume: 0.2 }, width, height);
      expect(camera.getObjectByName("neon-text:LEVEL 07")).toBe(first);
      view.update(state, width, height);
      expect(camera.getObjectByName("neon-text:SETTINGS")!.position.x).toBe(0);
    }
});

it("offers a labelled touch-only Pause", () => {
  for (const touch of [false, true])
    expect(
      settingsTargets({ ...state, open: false, touch, showPause: true }, 390, 844).some(
        (t) => t.key === "pause",
      ),
    ).toBe(touch);
});

it("keeps report and diagnostic-test actions finger-sized without overlapping the pause controls", () => {
  for (const [width, height] of [
    [320, 568],
    [568, 320],
    [390, 844],
    [1280, 900],
  ] as const)
    for (const touch of [true, false]) {
      const targets = settingsTargets({ ...state, touch, diagnostics: true }, width, height);
      const footer = targets.filter((t) =>
        ["resume", "restart", "report", "benchmark"].includes(t.key),
      );
      expect(footer).toHaveLength(4);
      const resume = targets.find((t) => t.key === "resume")!,
        restart = targets.find((t) => t.key === "restart")!,
        reset = targets.find((t) => t.key === "resetProgress")!,
        report = targets.find((t) => t.key === "report")!,
        benchmark = targets.find((t) => t.key === "benchmark")!;
      expect(reset.left).toBe(resume.left);
      expect(reset.width).toBe(resume.width);
      expect(report.left).toBe(restart.left);
      expect(benchmark.left + benchmark.width).toBeCloseTo(restart.left + restart.width, 8);

      for (let i = 0; i < footer.length; i++) {
        const target = footer[i]!;
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
        expect(target.left + target.width).toBeLessThanOrEqual(width);
        expect(target.top + target.height).toBeLessThanOrEqual(height);
        for (const other of footer.slice(0, i))
          expect(
            target.left >= other.left + other.width ||
              other.left >= target.left + target.width ||
              target.top >= other.top + other.height ||
              other.top >= target.top + target.height,
          ).toBe(true);
      }
    }
});

it("keeps Reset progress reachable and separate from every slider and action on short screens", () => {
  for (const [width, height] of [
    [320, 320],
    [320, 568],
    [568, 320],
    [844, 390],
    [1280, 900],
  ])
    for (const touch of [false, true]) {
      const targets = settingsTargets({ ...state, touch, diagnostics: true }, width!, height!);
      const reset = targets.find((t) => t.key === "resetProgress")!;
      expect(reset.label).toBe("Reset progress");
      expect(reset.width).toBeGreaterThanOrEqual(44);
      expect(reset.height).toBeGreaterThanOrEqual(44);
      for (const other of targets.filter((t) => t !== reset))
        expect(
          reset.left >= other.left + other.width ||
            other.left >= reset.left + reset.width ||
            reset.top >= other.top + other.height ||
            other.top >= reset.top + reset.height,
        ).toBe(true);
      expect(
        settingsTargets({ ...state, open: false }, width!, height!).some(
          (t) => t.key === "resetProgress",
        ),
      ).toBe(false);
    }
});

it("fits four compressed desktop rows while retaining header space, footer padding and discrete graphics labels", () => {
  const camera = new PerspectiveCamera(44, 1280 / 900, 0.1, 200),
    view = createSceneSettings(camera);
  for (const graphicsQuality of [0, 1, 2]) {
    const targets = view.update({ ...state, graphicsQuality }, 1280, 900),
      sliders = targets.filter((t) => t.min !== undefined),
      graphics = sliders.find((t) => t.key === "graphicsQuality")!,
      reset = targets.find((t) => t.key === "resetProgress")!;
    expect(sliders).toHaveLength(4);
    expect(graphics).toMatchObject({ min: 0, max: 2, step: 1, value: graphicsQuality });
    expect(sliders[1]!.top - sliders[0]!.top).toBe(52);
    expect(reset.top - sliders.at(-1)!.top - 44).toBeGreaterThanOrEqual(12);
    for (const [index, label] of ["LOW", "MEDIUM", "HIGH"].entries())
      expect(camera.getObjectByName(`neon-text:GRAPHICS ${label}`)!.visible).toBe(
        index === graphicsQuality,
      );
  }
});

it("omits an unwon Best in Settings, shows a completed best, and removes it again after reset", () => {
  const camera = new PerspectiveCamera(44, 1, 0.1, 200),
    view = createSceneSettings(camera);
  for (const bestLevel of [0, 1, 100, 0]) {
    view.update({ ...state, level: 1, bestLevel }, 390, 844);
    const progress = camera.getObjectByName("settings-level-status")!;
    expect(progress.visible).toBe(true);
    expect(progress.getObjectByName("neon-text:LEVEL 01")).toBeDefined();
    expect(progress.getObjectByName("neon-text:BEST 00")).toBeUndefined();
    if (bestLevel > 0)
      expect(
        progress.getObjectByName(`neon-text:BEST ${String(bestLevel).padStart(2, "0")}`),
      ).toBeDefined();
    else expect(progress.children).toHaveLength(1);
    const ids = progress.children.map((child) => child.uuid);
    view.update({ ...state, level: 1, bestLevel }, 390, 844);
    expect(
      camera.getObjectByName("settings-level-status")!.children.map((child) => child.uuid),
    ).toEqual(ids);
  }
  disposeScene(camera);
});
