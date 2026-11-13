import { BRIEFING_RISE_SECONDS, BRIEFING_SINK_SECONDS } from "../session/briefing-timing";
import { levelBriefingLines } from "../session/level-briefing";
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
export function levelIntroRise(countdown: number, reduced: boolean, duration = 1.5) {
  if (countdown <= 0) return 0;
  if (reduced) return 1;
  const elapsed = Math.max(0, duration - countdown);
  return Math.min(
    smooth(elapsed / BRIEFING_RISE_SECONDS),
    smooth(countdown / BRIEFING_SINK_SECONDS),
  );
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
      lossLevel?: number,
      previousLevel?: number,
      introDuration = 1.5,
      debug = false,
    ) {
      root.visible = value !== null && countdown > 0 && rise !== 0;
      if (!root.visible || value === null) return;
      const demoted = demotion?.to === value && demotion.count === arena.count;
      const compact = Math.abs(tilt) > 0.5;
      const nextKey = `${value}:${demoted ? demotion.from : ""}:${lossLevel}:${previousLevel}:${compact}:${debug}`;
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
        if (typeof value === "number") {
          const lines = levelBriefingLines(
            value,
            lossLevel,
            previousLevel,
            demoted ? demotion.from : undefined,
            debug,
          );
          const fitted = compact
            ? lines.flatMap((line) => {
                if (line.text.startsWith("LOSS "))
                  return line.text
                    .split(" LEVEL ")
                    .map((part, i) => ({ ...line, text: i ? `LEVEL ${part}` : part }));
                if (line.text === "LEVEL 01 IS THE FLOOR")
                  return ["LEVEL 01", "IS THE FLOOR"].map((text) => ({ ...line, text }));
                if (line.text === "ONE BALL - WIDE BAT")
                  return ["ONE BALL", "WIDE BAT"].map((text) => ({ ...line, text }));
                if (line.text === "PICKUPS INTRODUCED")
                  return ["PICKUPS", "INTRODUCED"].map((text) => ({ ...line, text }));
                return [line];
              })
            : lines;
          fitted.forEach((line, index) => {
            const caption = createNeonLettering(line.text, compact ? 0.72 : 0.6, line.colour);
            caption.position.y = -1.2 - index * (compact ? 0.94 : 0.82);
            body.add(caption);
          });
          textWidth = Math.max(textWidth, new Box3().setFromObject(body).getSize(new Vector3()).x);
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
        height / 2 +
          0.07 -
          (1 - (rise ?? levelIntroRise(countdown, reduced, introDuration))) * (height + 0.18),
        0,
      );
      root.updateMatrixWorld(true);
    },
  };
}
