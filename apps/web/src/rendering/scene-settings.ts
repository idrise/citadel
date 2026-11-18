import {
  BoxGeometry,
  Box3,
  Vector3,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  type PerspectiveCamera,
} from "three";
import { qualityLabel } from "./quality";
import { createNeonLettering } from "./neon-lettering";
import { disposeScene } from "./dispose-scene";
import { createFeatureEdges } from "./feature-edges";
export type SettingKey = "effectsVolume" | "musicVolume" | "graphicsQuality" | "mouseSensitivity";
export type SettingsAction =
  | "pause"
  | "resume"
  | "restart"
  | "resetProgress"
  | "sound"
  | "report"
  | "benchmark";
export interface SceneSettingsState {
  diagnostics?: boolean;
  open: boolean;
  touch: boolean;
  showPause: boolean;
  needsSound: boolean;
  effectsVolume: number;
  musicVolume: number;
  mouseSensitivity: number;
  graphicsQuality?: number;
  level?: number;
  bestLevel?: number;
}
export interface SettingsTarget {
  key: SettingKey | SettingsAction;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  value?: number;
  min?: number;
  max?: number;
  step?: number;
}
const rows = [
  {
    key: "effectsVolume",
    label: "Sound effects volume",
    text: "SOUND EFFECTS",
    min: 0,
    max: 1,
    step: 0.01,
  },
  { key: "musicVolume", label: "Music volume", text: "MUSIC", min: 0, max: 1, step: 0.01 },
  { key: "graphicsQuality", label: "Graphics quality", text: "GRAPHICS", min: 0, max: 2, step: 1 },
  {
    key: "mouseSensitivity",
    label: "Mouse sensitivity",
    text: "SENSITIVITY",
    min: 0.5,
    max: 2,
    step: 0.05,
  },
] as const;
/** Shared pixel bounds keep the panel, rendered controls and accessible targets aligned. */
function settingsPanelLayout(state: SceneSettingsState, width: number, height: number) {
  const count = state.touch ? 3 : 4,
    columns = height < 420 ? count : 1,
    w = Math.min(height < 420 ? 620 : 430, width - 24),
    h = Math.min(state.touch ? 380 : 456, height - 24),
    rowTop = 100;
  return {
    count,
    columns,
    w,
    h,
    left: (width - w) / 2,
    top: (height - h) / 2,
    rowTop,
    rowWidth: (w - 48 - (columns - 1) * 20) / columns,
    gap: 52,
  };
}
export function settingsTargets(
  state: SceneSettingsState,
  width: number,
  height: number,
): SettingsTarget[] {
  if (!state.open)
    return [
      ...(state.showPause && state.touch
        ? [
            {
              key: "pause" as const,
              label: "Pause",
              left: width - 106,
              top: 18,
              width: 88,
              height: 44,
            },
          ]
        : []),
      ...(state.needsSound
        ? [
            {
              key: "sound" as const,
              label: "Enable sound",
              left: 18,
              top: 18,
              width: 160,
              height: 44,
            },
          ]
        : []),
    ];
  const { count, columns, w, h, left, top, gap, rowTop, rowWidth } = settingsPanelLayout(
    state,
    width,
    height,
  );
  return [
    ...rows.slice(0, count).map((row, i) => ({
      key: row.key,
      label: row.label,
      left: left + 24 + (i % columns) * (rowWidth + 20),
      top: top + rowTop + Math.floor(i / columns) * gap,
      width: rowWidth,
      height: 44,
      value: state[row.key] ?? 2,
      min: row.min,
      max: row.max,
      step: row.step,
    })),
    ...(["resume", "restart"] as const).map((key, i, all) => ({
      key,
      label: key === "resume" ? "Resume" : "Restart",
      left: left + 24 + i * ((w - 48 - (all.length - 1) * 12) / all.length + 12),
      top: top + h - 68,
      width: (w - 48 - (all.length - 1) * 12) / all.length,
      height: 44,
    })),
    ...(
      ["resetProgress", ...(state.diagnostics ? (["report", "benchmark"] as const) : [])] as const
    ).map((key, i) => {
      const columnWidth = (w - 60) / 2,
        diagnosticWidth = (columnWidth - 8) / 2;
      return {
        key,
        label:
          key === "resetProgress"
            ? "Reset progress"
            : key === "report"
              ? "Save performance report"
              : "Run performance test",
        left: left + 24 + (i === 0 ? 0 : columnWidth + 12 + (i - 1) * (diagnosticWidth + 8)),
        top: top + h - 120,
        width: state.diagnostics ? (i === 0 ? columnWidth : diagnosticWidth) : w - 48,
        height: 44,
      };
    }),
  ];
}
/** Procedural camera-mounted panel; transparent DOM controls supply semantics and gestures only. */
export function createSceneSettings(camera: PerspectiveCamera) {
  const root = new Group();
  root.name = "scene-settings";
  camera.add(root);
  const material = new MeshStandardMaterial({
    color: 0x071524,
    metalness: 0.5,
    roughness: 0.35,
    emissive: 0x166578,
    emissiveIntensity: 0.1,
  });
  const box = (name: string) => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 0.15), material);
    mesh.name = name;
    mesh.add(createFeatureEdges(mesh.geometry, 0x7ce5ff, { width: 2, power: 1.15 }));
    root.add(mesh);
    return mesh;
  };
  const panel = box("settings-panel"),
    title = createNeonLettering("SETTINGS", 22, 0x9ceaff);
  root.add(title);
  let progress = new Group(),
    progressKey = "";
  progress.name = "settings-level-status";
  root.add(progress);
  const buttons = (
    [
      ["pause", "PAUSE"],
      ["resume", "RESUME"],
      ["restart", "RESTART"],
      ["resetProgress", "RESET"],
      ["sound", "ENABLE SOUND"],
      ["report", "REPORT"],
      ["benchmark", "TEST"],
    ] as const
  ).map(([key, text]) => {
    const body = box(`settings:${key}`),
      label = createNeonLettering(text, key === "report" || key === "benchmark" ? 13 : 16);
    if (key === "resetProgress") {
      const detail = createNeonLettering("PROGRESS", 13);
      detail.position.y = -18;
      label.add(detail);
    }
    label.name = `settings-label:${key}`;
    root.add(label);
    return {
      key,
      body,
      label,
      textWidth: new Box3().setFromObject(label).getSize(new Vector3()).x,
    };
  });
  const sliders = rows.map((row) => {
    const group = new Group();
    root.add(group);
    const labels = (
      row.key === "graphicsQuality"
        ? [0, 1, 2].map((step) => `GRAPHICS ${qualityLabel(step).toUpperCase()}`)
        : [row.text]
    ).map((value) => {
      const text = createNeonLettering(value, 15, 0x9ceaff);
      group.add(text);
      return { text, width: new Box3().setFromObject(text).getSize(new Vector3()).x };
    });
    const track = new Mesh(new BoxGeometry(1, 4, 0.1), material);
    group.add(track);
    const fill = new Mesh(
      new BoxGeometry(1, 5, 0.1),
      new MeshStandardMaterial({ color: 0x7ce5ff, emissive: 0x7ce5ff, emissiveIntensity: 1 }),
    );
    group.add(fill);
    const thumb = new Mesh(new BoxGeometry(9, 19, 0.2), fill.material);
    group.add(thumb);
    return {
      ...row,
      group,
      labels,
      track,
      fill,
      thumb,
    };
  });
  for (const label of [
    title,
    ...buttons.map((button) => button.label),
    ...sliders.flatMap((row) => row.labels.map((label) => label.text)),
  ])
    label.traverse((node) => {
      if (
        node instanceof Mesh &&
        node.material instanceof ShaderMaterial &&
        node.material.name === "NeonFeatureEdges"
      )
        node.material.uniforms.strokeWidth!.value = 0.85;
    });
  return {
    update(state: SceneSettingsState | undefined, width: number, height: number) {
      root.visible = Boolean(state);
      if (!state) return [];
      const depth = 16,
        unit = (2 * Math.tan((camera.fov * Math.PI) / 360) * depth) / Math.max(1, height);
      root.position.set(0, 0, -depth);
      root.scale.setScalar(unit);
      const targets = settingsTargets(state, width, height);
      const centre = (left: number, top: number, w: number, h: number) => ({
        x: left + w / 2 - width / 2,
        y: height / 2 - top - h / 2,
      });
      panel.visible = title.visible = state.open;
      const hasProgress = state.open && state.level !== undefined && state.bestLevel !== undefined;
      progress.visible = hasProgress;
      title.visible = state.open && !hasProgress;
      if (hasProgress) {
        const key = `${state.level}:${state.bestLevel}`;
        if (key !== progressKey) {
          root.remove(progress);
          disposeScene(progress);
          progress = new Group();
          progress.name = "settings-level-status";
          progress.add(
            createNeonLettering(`LEVEL ${String(state.level).padStart(2, "0")}`, 16, 0x9ceaff),
          );
          if ((state.bestLevel ?? 0) > 0) {
            const best = createNeonLettering(
              `BEST ${String(state.bestLevel).padStart(2, "0")}`,
              13,
              0xffcf79,
            );
            best.position.y = -21;
            progress.add(best);
          }
          progress.traverse((node) => {
            if (
              node instanceof Mesh &&
              node.material instanceof ShaderMaterial &&
              node.material.name === "NeonFeatureEdges"
            )
              node.material.uniforms.strokeWidth!.value = 0.8;
          });
          root.add(progress);
          progressKey = key;
        }
      }
      if (state.open) {
        const { w, h } = settingsPanelLayout(state, width, height);
        panel.scale.set(w, h, 1);
        panel.position.z = -2;
        title.position.set(0, h / 2 - 34, 1);
        progress.position.set(0, h / 2 - 28, 1);
      }
      for (const button of buttons) {
        const target = targets.find((t) => t.key === button.key);
        button.body.visible = button.label.visible = Boolean(target);
        if (!target) continue;
        const p = centre(target.left, target.top, target.width, target.height);
        button.label.scale.setScalar(Math.min(1, (target.width - 16) / button.textWidth));
        button.body.scale.set(target.width, target.height, 1);
        button.body.position.set(p.x, p.y, 0);
        button.label.position.set(p.x, p.y + (button.key === "resetProgress" ? 9 : 0), 1);
      }
      for (const row of sliders) {
        const target = targets.find((t) => t.key === row.key);
        row.group.visible = Boolean(target);
        if (!target) continue;
        const p = centre(target.left, target.top, target.width, target.height),
          t = Math.max(0, Math.min(1, (target.value! - row.min) / (row.max - row.min)));
        row.group.position.set(p.x, p.y, 1);
        row.labels.forEach((label, index) => {
          label.text.visible = row.labels.length === 1 || index === Math.round(target.value!);
          label.text.position.set(0, 26, 0);
          label.text.scale.setScalar(Math.min(1, target.width / label.width));
        });
        row.track.scale.x = target.width;
        row.fill.scale.x = Math.max(0.001, target.width * t);
        row.fill.position.x = -(target.width * (1 - t)) / 2;
        row.thumb.position.x = target.width * (t - 0.5);
      }
      return targets;
    },
  };
}
