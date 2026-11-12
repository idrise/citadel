import { PerspectiveCamera, Vector3 } from "three";
import { CAMERA_TARGET } from "./camera";
import { fortress } from "../simulation/arena";
import type { MatchState } from "../simulation/types";

/** An approaching active ball near the human fortress drives a visual cue only. */
export function cameraDanger(state: MatchState, seat: number): number {
  const home = fortress(seat, state.arena);
  if (state.phase !== "playing" || !state.players[seat]?.health.some(Boolean)) return 0;
  let danger = 0;
  for (const ball of state.balls) {
    if (ball.phase !== "active") continue;
    const x = home.anchor.x - ball.position.x,
      y = home.anchor.y - ball.position.y;
    const distance = Math.hypot(x, y);
    if (x * ball.velocity.x + y * ball.velocity.y <= 0) continue;
    danger = Math.max(danger, Math.max(0, Math.min(1, (9 - distance) / 5)));
  }
  return danger;
}

/** Slow bounded orbit and breathing zoom. Pauses/reduced effects hold the current pose. */
export function createCameraMotion(camera: PerspectiveCamera) {
  const target = new Vector3(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
  const offset = camera.position.clone().sub(target);
  const radius = offset.length();
  let homeYaw = Math.atan2(offset.x, offset.z);
  const homeTilt = Math.acos(offset.y / radius);
  const homeZoom = camera.zoom;
  let seconds = 0;
  let shimmy = 0,
    dangerZoom = 0;
  return {
    follow(yaw: number) {
      const delta = yaw - homeYaw;
      if (Math.abs(delta) > 1e-9) {
        const x = camera.position.x - target.x,
          z = camera.position.z - target.z;
        camera.position.x = target.x + x * Math.cos(delta) + z * Math.sin(delta);
        camera.position.z = target.z + z * Math.cos(delta) - x * Math.sin(delta);
        camera.lookAt(target);
      }
      homeYaw = yaw;
    },
    update(dt: number, reduced: boolean, paddleOffset = 0, danger = 0): void {
      if (reduced || dt <= 0) return;
      const step = Math.min(dt, 0.1);
      seconds += step;
      const blend = 1 - Math.exp(-step * 3);
      shimmy += (Math.max(-1, Math.min(1, paddleOffset)) * 0.018 - shimmy) * blend;
      dangerZoom += (Math.max(0, Math.min(1, danger)) * 0.02 - dangerZoom) * blend;
      const yaw = homeYaw + Math.sin(seconds * 0.2) * 0.03 + shimmy;
      const tilt = homeTilt + Math.sin(seconds * 0.145) * 0.016;
      camera.position.set(
        target.x + radius * Math.sin(tilt) * Math.sin(yaw),
        target.y + radius * Math.cos(tilt),
        target.z + radius * Math.sin(tilt) * Math.cos(yaw),
      );
      camera.lookAt(target);
      camera.zoom = homeZoom * (1 + Math.sin(seconds * 0.19) * 0.0045 + dangerZoom);
    },
  };
}
