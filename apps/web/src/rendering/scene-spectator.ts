import {
  Box3,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  ShaderMaterial,
  Vector3,
} from "three";
import { createNeonLettering } from "./neon-lettering";
import { createFeatureEdges } from "./feature-edges";
import { disposeScene } from "./dispose-scene";
import type { SceneAction, SceneControl, SceneMenuState } from "./scene-menu";

function lettering(text: string, height: number, colour: number) {
  const label = createNeonLettering(text, height, colour);
  label.traverse((node) => {
    if (
      node instanceof Mesh &&
      node.material instanceof ShaderMaterial &&
      node.material.name === "NeonFeatureEdges"
    )
      node.material.uniforms.strokeWidth!.value = 1.1;
  });
  return label;
}

/** A small scene-rendered result card keeps the live spectator board unobstructed. */
export function createSpectatorMenu(camera: PerspectiveCamera) {
  const root = new Group();
  root.name = "scene-spectator";
  camera.add(root);
  const heading = lettering("FORTRESS LOST", 16, 0xffab83);
  const headingWidth = new Box3().setFromObject(heading).getSize(new Vector3()).x;
  root.add(heading);
  let caption = new Group(),
    key = "",
    captionWidth = 1;
  root.add(caption);
  const buttons = (
    [
      ["watch", "WATCH"],
      ["retry", "RETRY"],
    ] as const
  ).map(([action, text]) => {
    const item = new Group();
    item.name = `scene-control:${action}`;
    const material = new MeshStandardMaterial({
      color: 0x071524,
      metalness: 0.7,
      roughness: 0.28,
      emissive: 0x166578,
      emissiveIntensity: 0.12,
    });
    const body = new Mesh(new BoxGeometry(1, 1, 1), material);
    item.add(body);
    const edges = createFeatureEdges(body.geometry, 0x7ce5ff, { width: 2.5, power: 1.25 });
    body.add(edges);
    const letters = lettering(text, 17, action === "retry" ? 0xffa078 : 0x96eaff);
    letters.position.z = 5;
    item.add(letters);
    root.add(item);
    return { action, item, body, material, edges };
  });
  let hovered: SceneAction | null = null;
  return {
    hover(action: SceneAction | null) {
      hovered = action;
    },
    update(state: SceneMenuState["spectator"], width: number, height: number): SceneControl[] {
      root.visible = Boolean(state);
      if (!state) return [];
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      const depth = 18,
        units = (2 * Math.tan((camera.fov * Math.PI) / 360) * depth) / height;
      root.position.set(0, 0, -depth);
      root.scale.setScalar(units);
      const cardWidth = Math.min(300, width - 40),
        right = width - 24,
        bottom = height - 44;
      const x = right - cardWidth / 2 - width / 2;
      heading.visible = caption.visible = !state.watching;
      heading.position.set(x, height / 2 - (bottom - 116), 0);
      heading.scale.setScalar(Math.min(1, cardWidth / headingWidth));
      const message = state.demotion
        ? `DEMOTED TO LEVEL ${String(state.level).padStart(2, "0")}`
        : `LEVEL ${String(state.level).padStart(2, "0")}`;
      if (message !== key) {
        root.remove(caption);
        disposeScene(caption);
        caption = lettering(message, 12, 0xa9c9ff);
        captionWidth = new Box3().setFromObject(caption).getSize(new Vector3()).x;
        root.add(caption);
        key = message;
      }
      caption.visible = !state.watching;
      caption.position.set(x, height / 2 - (bottom - 88), 0);
      caption.scale.setScalar(Math.min(1, cardWidth / captionWidth));
      const placements = buttons.map((button) => {
        const shown = button.action === "retry" || !state.watching;
        button.item.visible = shown;
        const buttonWidth = state.watching ? 168 : (cardWidth - 12) / 2;
        const centre = state.watching
          ? right - buttonWidth / 2
          : right -
            cardWidth +
            (button.action === "watch" ? buttonWidth / 2 : cardWidth - buttonWidth / 2);
        button.item.position.set(centre - width / 2, height / 2 - (bottom - 25), 0);
        button.body.scale.set(buttonWidth, 50, 6);
        button.material.emissiveIntensity = hovered === button.action ? 0.6 : 0.12;
        button.edges.material.uniforms.opacity!.value = hovered === button.action ? 1 : 0.7;
        return { button, shown, buttonWidth };
      });
      camera.updateMatrixWorld(true);
      return placements
        .filter((p) => p.shown)
        .map(({ button }) => {
          const points = [-1, 1].flatMap((x) =>
            [-1, 1].map((y) =>
              button.body.localToWorld(new Vector3(x / 2, y / 2, 0.5)).project(camera),
            ),
          );
          const xs = points.map((p) => ((p.x + 1) * width) / 2),
            ys = points.map((p) => ((1 - p.y) * height) / 2);
          return {
            action: button.action,
            label: button.action === "retry" ? `Retry level ${state.level}` : "Watch",
            disabled: false,
            left: Math.min(...xs),
            top: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys),
          };
        });
    },
  };
}
