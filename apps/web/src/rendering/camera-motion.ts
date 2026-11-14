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

/** Bat-relative shimmy around a stable neutral view. Pause/reduced effects hold the pose. */
export function createCameraMotion(camera: PerspectiveCamera) {
  const target = new Vector3(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
  const offset = camera.position.clone().sub(target);
  let radius = offset.length();
  const baseRadius = radius / ((camera.userData.arenaScale as number | undefined) ?? 1);
  let homeYaw = Math.atan2(offset.x, offset.z);
  let homeTilt = Math.acos(offset.y / radius);
  const desktopTilt = homeTilt;
  const homeZoom = camera.zoom;
  let shimmy = 0,
    dangerZoom = 0;
  return {
    scale(value: number) {
      const next = baseRadius * Math.max(1, value);
      if (Math.abs(next - radius) < 1e-8) return;
      camera.position
        .sub(target)
        .multiplyScalar(next / radius)
        .add(target);
      radius = next;
      camera.lookAt(target);
    },
    layout(aspect: number) {
      // A steeper portrait view spends the narrow screen on playable floor rather than perspective.
      const tilt =
        desktopTilt + (0.38 - desktopTilt) * Math.max(0, Math.min(1, (1 - aspect) / 0.4));
      if (Math.abs(tilt - homeTilt) < 1e-9) return;
      const current = camera.position.clone().sub(target);
      const yaw = Math.atan2(current.x, current.z);
      const nextTilt = Math.acos(current.y / current.length()) + tilt - homeTilt;
      camera.position.set(
        target.x + radius * Math.sin(nextTilt) * Math.sin(yaw),
        target.y + radius * Math.cos(nextTilt),
        target.z + radius * Math.sin(nextTilt) * Math.cos(yaw),
      );
      camera.lookAt(target);
      homeTilt = tilt;
    },
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
      const blend = 1 - Math.exp(-step * 8);
      const offset = Math.max(-1, Math.min(1, paddleOffset));
      const targetShimmy =
        Math.sign(offset) * Math.max(0, (Math.abs(offset) - 0.03) / 0.97) * 0.018;
      shimmy += (targetShimmy - shimmy) * blend;
      if (Math.abs(shimmy - targetShimmy) < 1e-5) shimmy = targetShimmy;
      dangerZoom += (Math.max(0, Math.min(1, danger)) * 0.02 - dangerZoom) * blend;
      if (dangerZoom < 1e-5 && danger <= 0) dangerZoom = 0;
      const yaw = homeYaw + shimmy;
      const tilt = homeTilt;
      camera.position.set(
        target.x + radius * Math.sin(tilt) * Math.sin(yaw),
        target.y + radius * Math.cos(tilt),
        target.z + radius * Math.sin(tilt) * Math.cos(yaw),
      );
      camera.lookAt(target);
      camera.zoom = homeZoom * (1 + dangerZoom);
    },
  };
}
