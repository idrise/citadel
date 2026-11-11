import { PerspectiveCamera, Vector3 } from "three";
import { CAMERA_TARGET } from "./camera";

/** Slow bounded orbit and breathing zoom. Pauses/reduced effects hold the current pose. */
export function createCameraMotion(camera: PerspectiveCamera) {
  const target = new Vector3(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
  const offset = camera.position.clone().sub(target);
  const radius = offset.length();
  let homeYaw = Math.atan2(offset.x, offset.z);
  const homeTilt = Math.acos(offset.y / radius);
  const homeZoom = camera.zoom;
  let seconds = 0;
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
    update(dt: number, reduced: boolean): void {
      if (reduced || dt <= 0) return;
      seconds += Math.min(dt, 0.1);
      const yaw = homeYaw + Math.sin(seconds * 0.2) * 0.03;
      const tilt = homeTilt + Math.sin(seconds * 0.145) * 0.016;
      camera.position.set(
        target.x + radius * Math.sin(tilt) * Math.sin(yaw),
        target.y + radius * Math.cos(tilt),
        target.z + radius * Math.sin(tilt) * Math.cos(yaw),
      );
      camera.lookAt(target);
      camera.zoom = homeZoom * (1 + Math.sin(seconds * 0.19) * 0.0045);
    },
  };
}
