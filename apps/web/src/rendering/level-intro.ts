import { Box3, Group, Mesh, ShaderMaterial, type Object3D, Vector3 } from "three";
import { fortress, type ArenaGeometry } from "../simulation/arena";
import type { Demotion } from "../session/progression";
import { createNeonLettering } from "./neon-lettering";
import { disposeScene } from "./dispose-scene";

const smooth = (t: number) => {
  const v = Math.max(0, Math.min(1, t));
  return v * v * (3 - 2 * v);
};
/** Uses the authoritative countdown: pause freezes it, and play never waits for an animation. */
export function levelIntroRise(countdown: number, reduced: boolean) {
  if (countdown <= 0) return 0;
  if (reduced) return 1;
  const elapsed = Math.max(0, 1.5 - countdown);
  return Math.min(smooth(elapsed / 0.4), smooth(countdown / 0.45));
}

/** Solid world-space lettering participates in the arena's existing planar reflections. */
export function createLevelIntro(parent: Object3D) {
  const root = new Group();
  root.name = "level-introduction";
  parent.add(root);
  let key = "",
    body = new Group(),
    textWidth = 1,
    bodyHeight = 1,
    bodyDepth = 0.1;
  root.add(body);
  return {
    root,
    update(
      value: number | string | null,
      countdown: number,
      arena: ArenaGeometry,
      seat: number,
      reduced: boolean,
      demotion: Demotion | null = null,
      rise?: number,
      tilt = 0,
    ) {
      root.visible = value !== null && countdown > 0 && rise !== 0;
      if (!root.visible || value === null) return;
      const demoted = demotion?.to === value && demotion.count === arena.count;
      const nextKey = `${value}:${demoted}`;
      if (key !== nextKey) {
        root.remove(body);
        disposeScene(body);
        body = new Group();
        const text = createNeonLettering(
          typeof value === "string" ? value : `LEVEL ${String(value).padStart(2, "0")}`,
          1.4,
          typeof value === "string" ? 0x9ceaff : 0xffcf79,
        );
        body.add(text);
        textWidth = new Box3().setFromObject(text).getSize(new Vector3()).x;
        if (demoted) {
          text.position.y = 0.25;
          const caption = createNeonLettering(
            `DEMOTED FROM ${String(demotion.from).padStart(2, "0")}`,
            0.28,
            0xffab83,
          );
          caption.position.y = -0.7;
          body.add(caption);
        }
        // World lettering projects much smaller on a phone than the camera-mounted menus.
        body.traverse((node) => {
          if (
            node instanceof Mesh &&
            node.material instanceof ShaderMaterial &&
            node.material.name === "NeonFeatureEdges"
          )
            node.material.uniforms.strokeWidth!.value = 1.25;
        });
        const box = new Box3().setFromObject(body);
        bodyHeight = box.getSize(new Vector3()).y;
        bodyDepth = box.getSize(new Vector3()).z;
        body.position.y = -(box.min.y + box.max.y) / 2;
        root.add(body);
        key = nextKey;
      }
      const anchor = fortress(seat, arena).anchor;
      const yaw = Math.atan2(anchor.x, anchor.y);
      const side = arena.vertices.map((p) => p.x * Math.cos(yaw) - p.y * Math.sin(yaw));
      const width = Math.min(
        typeof value === "string" ? 18 : 14,
        (Math.max(...side) - Math.min(...side)) * 0.75,
      );
      const size = width / textWidth;
      root.scale.setScalar(size);
      root.rotation.set(tilt, yaw, 0, "YXZ");
      const height = (bodyHeight * Math.cos(tilt) + bodyDepth * Math.abs(Math.sin(tilt))) * size;
      root.position.set(
        0,
        height / 2 + 0.07 - (1 - (rise ?? levelIntroRise(countdown, reduced))) * (height + 0.18),
        0,
      );
      root.updateMatrixWorld(true);
    },
  };
}
