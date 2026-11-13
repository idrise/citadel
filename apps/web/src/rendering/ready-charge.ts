import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  TorusGeometry,
  Vector3,
} from "three";
import { MAX_BALLS } from "../simulation/arena";
import { serveDirection } from "../simulation/aim";
import { sweepWalls } from "../simulation/collision";
import type { MatchState } from "../simulation/types";
import type { EffectsQuality } from "./quality";
import { SEATS } from "./palette";

/** Held balls get an energy envelope and short aim chevrons; two draws even at sixteen serves. */
export function createReadyCharge(root: Group) {
  const ring = new InstancedMesh(
    new TorusGeometry(0.52, 0.028, 5, 32),
    new MeshBasicMaterial({
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      toneMapped: false,
      blending: AdditiveBlending,
    }),
    MAX_BALLS * 2,
  );
  const arrow = new InstancedMesh(
    new ConeGeometry(0.18, 0.45, 3),
    new MeshBasicMaterial({
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      toneMapped: false,
    }),
    MAX_BALLS * 2,
  );
  ring.name = "ready-ball-halos";
  arrow.name = "ready-ball-chevrons";
  ring.frustumCulled = arrow.frustumCulled = false;
  const matrix = new Matrix4(),
    point = new Vector3(),
    scale = new Vector3(),
    direction = new Vector3(),
    colour = new Color();
  const flat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2),
    rotation = new Quaternion(),
    up = new Vector3(0, 1, 0);
  for (let i = 0; i < MAX_BALLS * 2; i++) {
    ring.setColorAt(i, colour);
    arrow.setColorAt(i, colour);
  }
  root.add(ring, arrow);
  return {
    update(state: MatchState, reduced: boolean, hide = false, quality: EffectsQuality = "high") {
      let rings = 0,
        arrows = 0;
      if (!hide && state.phase === "playing")
        for (const ball of state.balls) {
          if (ball.phase !== "ready") continue;
          const home = state.players[ball.seat];
          if (!home?.health.some(Boolean)) continue;
          const aim = serveDirection(ball.seat, home.angle, state.arena);
          const limit = Math.min(
            1.5,
            ...sweepWalls(ball.position, aim, 1.5, state.arena).map((c) => c.time),
          );
          const pulse = reduced ? 1 : 0.9 + 0.1 * Math.sin(ball.age * Math.PI * 4);
          const phase = (ball.age % 0.8) / 0.8;
          const count = reduced || quality === "low" ? 1 : 2;
          for (let part = 0; part < count; part++) {
            const size = part === 0 ? pulse : 1.15 + phase * 0.95;
            point.set(ball.position.x, 0.58 + part * 0.04, ball.position.y);
            scale.setScalar(size);
            matrix.compose(point, flat, scale);
            ring.setMatrixAt(rings, matrix);
            colour
              .setHex(part === 0 ? 0xdaf7ff : SEATS[ball.seat]!.colour)
              .multiplyScalar(part === 0 ? 1.8 : 1.5 * (1 - phase));
            ring.setColorAt(rings++, colour);
            const distance = 0.65 + part * 0.45;
            if (distance + 0.23 > limit) continue;
            direction.set(aim.x, 0, aim.y);
            rotation.setFromUnitVectors(up, direction);
            point.set(ball.position.x + aim.x * distance, 0.22, ball.position.y + aim.y * distance);
            scale.setScalar(part === 0 ? 1 : 0.8);
            matrix.compose(point, rotation, scale);
            arrow.setMatrixAt(arrows, matrix);
            colour
              .setHex(part === 0 ? 0xe0f7ff : SEATS[ball.seat]!.colour)
              .multiplyScalar(2.2 * pulse);
            arrow.setColorAt(arrows++, colour);
          }
        }
      ring.count = rings;
      arrow.count = arrows;
      ring.visible = rings > 0;
      arrow.visible = arrows > 0;
      ring.instanceMatrix.needsUpdate = rings > 0;
      arrow.instanceMatrix.needsUpdate = arrows > 0;
      if (ring.instanceColor) ring.instanceColor.needsUpdate = rings > 0;
      if (arrow.instanceColor) arrow.instanceColor.needsUpdate = arrows > 0;
    },
  };
}
