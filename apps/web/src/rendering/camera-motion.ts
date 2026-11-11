import { PerspectiveCamera, Vector3 } from "three";
import { CAMERA_TARGET } from "./camera";

/** Slow bounded orbit and breathing zoom. Pauses/reduced effects hold the current pose. */
export function createCameraMotion(camera: PerspectiveCamera) {
  const target = new Vector3(CAMERA_TARGET.x, CAMERA_TARGET.y, CAMERA_TARGET.z);
  const offset = camera.position.clone().sub(target);
  const radius = offset.length();
  const homeYaw = Math.atan2(offset.x, offset.z);
  const homeTilt = Math.acos(offset.y / radius);
  const homeZoom = camera.zoom;
  let seconds = 0;
  return {
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
