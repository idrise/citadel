import { VICTORY_HOLD_SECONDS, VICTORY_MORPH_SECONDS } from "./victory-morph";
import {
  BoxGeometry,
  Box3,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type PerspectiveCamera,
} from "three";
import { createNeonLettering } from "./neon-lettering";
import { createFeatureEdges } from "./feature-edges";
import { disposeScene } from "./dispose-scene";
import { mobileMenuLayout } from "./mobile-menu-layout";

export type SceneAction = "start" | "decrease" | "increase" | "options" | "rematch";
export interface SceneMenuState {
  touch?: boolean;
  mode: "title" | "victory" | "defeat" | "hidden";
  count: number;
  elapsed: number;
  reduced: boolean;
}
export interface SceneControl {
  action: SceneAction;
  label: string;
  disabled: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Floating solid lettering and solid buttons. HTML provides invisible accessible hit targets only. */
export function createSceneMenu(camera: PerspectiveCamera) {
  const group = new Group();
  group.name = "scene-menu";
  camera.add(group);
  const heading = new Group();
  group.add(heading);
  const title = createNeonLettering("CITADEL", 2.15, 0x9ceaff);
  heading.add(title);
  const victory = createNeonLettering("YOU WIN", 1.65, 0xffcf79);
  heading.add(victory);
  const defeat = createNeonLettering("ROUND OVER", 1.3, 0xa9c9ff);
  heading.add(defeat);
  const textWidths = new Map(
    [title, victory, defeat].map((text) => [
      text,
      new Box3().setFromObject(text).getSize(new Vector3()).x,
    ]),
  );
  const players = createNeonLettering("PLAYERS", 0.32);
  players.position.y = -1.6;
  group.add(players);
  let countText = createNeonLettering("4", 0.9, 0xffab83);
  countText.position.y = -2.5;
  group.add(countText);
  const controls = (
    [
      ["decrease", "Decrease players", "-", -2.1, -2.5, 1.15, 0.95],
      ["increase", "Increase players", "+", 2.1, -2.5, 1.15, 0.95],
      ["start", "Start", "START", 0, -4.05, 5.2, 1.05],
      ["rematch", "Rematch", "AGAIN", 0, -3.4, 5.2, 1.05],
      ["options", "Settings", "SETTINGS", 0, -5.1, 3.1, 0.6],
    ] as const
  ).map(([action, label, text, x, y, width, height]) => {
    const item = new Group();
    item.position.set(x, y, 0);
    item.name = `scene-control:${action}`;
    const material = new MeshStandardMaterial({
      color: 0x071524,
      metalness: 0.7,
      roughness: 0.28,
      emissive: 0x166578,
      emissiveIntensity: 0.12,
    });
    const body = new Mesh(new BoxGeometry(width, height, 0.2), material);
    const glow = createFeatureEdges(body.geometry, 0x7ce5ff, { width: 2.5, power: 1.25 });
    body.add(glow);
    const lettering = createNeonLettering(
      text,
      action === "options" ? 0.22 : 0.45,
      action === "start" ? 0xffa078 : 0x96eaff,
    );
    lettering.position.z = 0.15;
    item.add(body, lettering);
    group.add(item);
    return { action, label, item, body, material, glow, width, height, disabled: false };
  });
  let count = 4,
    hover: SceneAction | null = null;
  return {
    hover(action: SceneAction | null) {
      hover = action;
    },
    update(state: SceneMenuState, width: number, height: number): SceneControl[] {
      group.visible = state.mode !== "hidden";
      if (!group.visible) return [];
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      const depth = 18,
        halfHeight = Math.tan((camera.fov * Math.PI) / 360) * depth;
      group.position.set(0, halfHeight * 0.67, -depth);
      group.rotation.set(-0.35, 0, 0);
      group.scale.setScalar(Math.min(0.78, (halfHeight * camera.aspect * 1.7) / 16));
      const compact = state.touch || width < 700 || height < 500;
      const result = state.mode !== "title",
        reveal = state.reduced
          ? 1
          : Math.max(0, Math.min(1, (state.elapsed - VICTORY_MORPH_SECONDS) / 0.6));
      title.visible = !result;
      victory.visible = state.mode === "victory" && reveal > 0;
      defeat.visible = state.mode === "defeat" && reveal > 0;
      heading.scale.setScalar(result ? 0.85 + 0.15 * reveal : 1);
      heading.position.set(0, result ? (1 - reveal) * -0.4 : 0, 0);
      players.visible = countText.visible = !result;
      if (count !== state.count) {
        group.remove(countText);
        disposeScene(countText);
        countText = createNeonLettering(String(state.count), 0.9, 0xffab83);
        countText.position.y = -2.5;
        group.add(countText);
        count = state.count;
      }
      const available = state.elapsed >= VICTORY_HOLD_SECONDS;
      for (const button of controls) {
        button.item.visible = result
          ? (button.action === "rematch" || button.action === "options") && available
          : button.action !== "rematch";
        if (button.action === "options") button.item.position.y = result ? -4.5 : -5.1;
        button.disabled =
          (button.action === "decrease" && state.count <= 2) ||
          (button.action === "increase" && state.count >= 6);
        button.material.emissiveIntensity =
          hover === button.action && !button.disabled ? 0.6 : 0.12;
        button.glow.material.uniforms.opacity!.value = button.disabled
          ? 0.2
          : hover === button.action
            ? 1
            : 0.7;
      }
      if (compact) {
        const layout = mobileMenuLayout(width, height, result);
        group.position.set(0, 0, -depth);
        group.rotation.set(0, 0, 0);
        group.scale.setScalar((2 * halfHeight) / height);
        heading.position.set(layout.title.x, height / 2 - layout.title.y, 0);
        heading.scale.setScalar(1);
        for (const text of [title, victory, defeat])
          text.scale.setScalar(layout.title.width / textWidths.get(text)!);
        players.position.set(layout.label.x, height / 2 - layout.label.y, 0);
        players.scale.setScalar(16 / 0.32);
        countText.position.set(layout.count.x, height / 2 - layout.count.y, 0);
        countText.scale.setScalar(34 / 0.9);
        for (const button of controls) {
          const placement = layout.controls[button.action];
          button.item.position.set(placement.x, height / 2 - placement.y, 0);
          button.item.scale.set(
            placement.width / button.width,
            placement.height / button.height,
            10,
          );
        }
      } else {
        for (const text of [title, victory, defeat]) text.scale.setScalar(1);
        players.position.set(0, -1.6, 0);
        players.scale.setScalar(1);
        countText.position.set(0, -2.5, 0);
        countText.scale.setScalar(1);
        const positions = {
          decrease: [-2.1, -2.5],
          increase: [2.1, -2.5],
          start: [0, -4.05],
          rematch: [0, -3.4],
          options: [0, result ? -4.5 : -5.1],
        };
        for (const button of controls) {
          const [x, y] = positions[button.action];
          button.item.position.set(x!, y!, 0);
          button.item.scale.setScalar(1);
        }
      }
      camera.updateMatrixWorld(true);
      return controls
        .filter((b) => b.item.visible)
        .map((button) => {
          const points = [-1, 1].flatMap((x) =>
            [-1, 1].map((y) =>
              button.body
                .localToWorld(new Vector3((x * button.width) / 2, (y * button.height) / 2, 0.12))
                .project(camera),
            ),
          );
          const xs = points.map((p) => ((p.x + 1) * width) / 2),
            ys = points.map((p) => ((1 - p.y) * height) / 2);
          return {
            action: button.action,
            label: button.label,
            disabled: button.disabled,
            left: Math.min(...xs),
            top: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
        });
    },
  };
}
