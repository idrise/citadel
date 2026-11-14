import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  type PerspectiveCamera,
} from "three";
import { createNeonLettering } from "./neon-lettering";
import { createFeatureEdges } from "./feature-edges";
export type SettingKey = "effectsVolume" | "musicVolume" | "mouseSensitivity";
export type SettingsAction = "pause" | "resume" | "restart" | "sound";
export interface SceneSettingsState {
  open: boolean;
  touch: boolean;
  showPause: boolean;
  needsSound: boolean;
  effectsVolume: number;
  musicVolume: number;
  mouseSensitivity: number;
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
  {
    key: "mouseSensitivity",
    label: "Mouse sensitivity",
    text: "SENSITIVITY",
    min: 0.5,
    max: 2,
    step: 0.05,
  },
] as const;
export function settingsTargets(
  state: SceneSettingsState,
  width: number,
  height: number,
): SettingsTarget[] {
  if (!state.open)
    return [
      ...(state.showPause
        ? [
            {
              key: "pause" as const,
              label: "Pause",
              left: width - 68,
              top: 18,
              width: 50,
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
  const count = state.touch ? 2 : 3,
    w = Math.min(430, width - 24),
    h = Math.min(count * 76 + 120, height - 24),
    left = (width - w) / 2,
    top = (height - h) / 2,
    gap = (h - 116) / count;
  return [
    ...rows.slice(0, count).map((row, i) => ({
      key: row.key,
      label: row.label,
      left: left + 24,
      top: top + 65 + i * gap,
      width: w - 48,
      height: 44,
      value: state[row.key],
      min: row.min,
      max: row.max,
      step: row.step,
    })),
    {
      key: "resume",
      label: "Resume",
      left: left + 24,
      top: top + h - 54,
      width: (w - 60) / 2,
      height: 44,
    },
    {
      key: "restart",
      label: "Restart",
      left: left + 24 + (w - 60) / 2 + 12,
      top: top + h - 54,
      width: (w - 60) / 2,
      height: 44,
    },
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
  const buttons = (
    [
      ["pause", "II"],
      ["resume", "RESUME"],
      ["restart", "RESTART"],
      ["sound", "ENABLE SOUND"],
    ] as const
  ).map(([key, text]) => {
    const body = box(`settings:${key}`),
      label = createNeonLettering(text, key === "pause" ? 20 : 16);
    root.add(label);
    return { key, body, label };
  });
  const sliders = rows.map((row) => {
    const group = new Group();
    root.add(group);
    const text = createNeonLettering(row.text, 15, 0x9ceaff);
    group.add(text);
    const track = new Mesh(new BoxGeometry(1, 4, 0.1), material);
    group.add(track);
    const fill = new Mesh(
      new BoxGeometry(1, 5, 0.1),
      new MeshStandardMaterial({ color: 0x7ce5ff, emissive: 0x7ce5ff, emissiveIntensity: 1 }),
    );
    group.add(fill);
    const thumb = new Mesh(new BoxGeometry(9, 19, 0.2), fill.material);
    group.add(thumb);
    return { ...row, group, text, track, fill, thumb };
  });
  for (const label of [
    title,
    ...buttons.map((button) => button.label),
    ...sliders.map((row) => row.text),
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
      if (state.open) {
        const count = state.touch ? 2 : 3,
          w = Math.min(430, width - 24),
          h = Math.min(count * 76 + 120, height - 24);
        panel.scale.set(w, h, 1);
        panel.position.z = -2;
        title.position.set(0, h / 2 - 29, 1);
      }
      for (const button of buttons) {
        const target = targets.find((t) => t.key === button.key);
        button.body.visible = button.label.visible = Boolean(target);
        if (!target) continue;
        const p = centre(target.left, target.top, target.width, target.height);
        button.body.scale.set(target.width, target.height, 1);
        button.body.position.set(p.x, p.y, 0);
        button.label.position.set(p.x, p.y, 1);
      }
      for (const row of sliders) {
        const target = targets.find((t) => t.key === row.key);
        row.group.visible = Boolean(target);
        if (!target) continue;
        const p = centre(target.left, target.top, target.width, target.height),
          t = Math.max(0, Math.min(1, (target.value! - row.min) / (row.max - row.min)));
        row.group.position.set(p.x, p.y, 1);
        row.text.position.set(0, 32, 0);
        row.track.scale.x = target.width;
        row.fill.scale.x = Math.max(0.001, target.width * t);
        row.fill.position.x = -(target.width * (1 - t)) / 2;
        row.thumb.position.x = target.width * (t - 0.5);
      }
      return targets;
    },
  };
}
