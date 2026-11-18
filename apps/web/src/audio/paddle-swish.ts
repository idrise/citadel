import { clamp } from "../simulation/vector";
/** Broad air texture brightens with speed; gentle movement stays audible without a motor pitch. */
export function swishParameters(velocity: number, position: number) {
  const speed = clamp(Number.isFinite(velocity) ? Math.abs(velocity) / 16 : 0, 0, 1);
  return {
    frequency: 1200 + speed * 2600,
    gain: speed < 0.015 ? 0 : speed ** 0.7 * 0.6,
    pan: clamp(Number.isFinite(position) ? position : 0, -1, 1) * 0.65,
  };
}
