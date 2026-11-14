import { Box3, Group, Mesh, ShaderMaterial, Vector3, type PerspectiveCamera } from "three";
import { createNeonLettering } from "./neon-lettering";
import { disposeScene } from "./dispose-scene";
import type { SceneMenuState } from "./scene-menu";

/** Quiet persistent challenge status; rebuild lettering only when its content changes. */
export function createLevelStatus(camera: PerspectiveCamera) {
  const root = new Group();
  root.name = "level-status";
  camera.add(root);
  let key = "",
    extent = 1;
  return {
    update(state: SceneMenuState, width: number, height: number) {
      root.visible = state.bestLevel !== undefined && !state.settings?.open;
      if (!root.visible) return;
      const text = `${state.debug ? "DEBUG " : ""}LEVEL ${String(state.level ?? 1).padStart(2, "0")} - ${state.count} PLAYERS`,
        best = `BEST ${String(state.bestLevel).padStart(2, "0")}`,
        next = `${text}|${best}`;
      if (next !== key) {
        for (const child of root.children.slice()) {
          root.remove(child);
          disposeScene(child);
        }
        const current = createNeonLettering(text, 13, 0x9ceaff),
          peak = createNeonLettering(best, 12, 0xffcf79);
        peak.position.y = -20;
        root.add(current, peak);
        root.traverse((node) => {
          if (
            node instanceof Mesh &&
            node.material instanceof ShaderMaterial &&
            node.material.name === "NeonFeatureEdges"
          ) {
            node.material.uniforms.strokeWidth!.value = 0.7;
            node.material.uniforms.neonColour!.value.multiplyScalar(0.65);
          }
        });
        root.position.set(0, 0, 0);
        root.scale.setScalar(1);
        const bounds = new Box3().setFromObject(root);
        extent = bounds.getSize(new Vector3()).x;
        for (const child of root.children) child.position.x -= bounds.min.x;
        key = next;
      }
      const depth = 17,
        unit = (2 * Math.tan((camera.fov * Math.PI) / 360) * depth) / height,
        fit = Math.min(1, (width - (state.settings?.showPause && state.touch ? 124 : 36)) / extent),
        top = state.debug || state.settings?.needsSound ? 74 : 26;
      root.scale.setScalar(unit * fit);
      root.position.set((18 - width / 2) * unit, (height / 2 - top) * unit, -depth);
      root.userData.text = next;
    },
  };
}
