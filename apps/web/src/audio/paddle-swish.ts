import { clamp } from "../simulation/vector";
/** FM timbre follows actual bat velocity, with silence at rest and opposite stereo motion. */
export function swishParameters(velocity: number, position: number) {
  const speed = clamp(Number.isFinite(velocity) ? Math.abs(velocity) / 16 : 0, 0, 1);
  return {
    frequency: 110 + speed * 540,
    modulation: 0.5 + speed * 8,
    gain: speed < 0.015 ? 0 : speed * 0.075,
    pan: clamp(Number.isFinite(position) ? position : 0, -1, 1) * 0.65,
  };
}
