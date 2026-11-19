import { clamp } from "../simulation/vector";
/** A smooth air pass: soft rise, longer fall and zero amplitude at both ends. */
export const SWISH_ENVELOPE = Array.from({ length: 65 }, (_, index) => {
  const t = index / 64;
  return t < 0.28
    ? (1 - Math.cos((Math.PI * t) / 0.28)) / 2
    : (1 + Math.cos((Math.PI * (t - 0.28)) / 0.72)) / 2;
});
/** Dark broadband air follows stroke intensity without a pitched drum-like component. */
export function swishParameters(velocity: number, position: number) {
  const speed = clamp(Number.isFinite(velocity) ? Math.abs(velocity) / 16 : 0, 0, 1);
  return {
    frequency: 1000 + speed * 800,
    gain: speed < 0.1 ? 0 : (0.14 + Math.sqrt(speed) * 0.26) * 0.5,
    pan: clamp(Number.isFinite(position) ? position : 0, -1, 1) * 0.35,
  };
}
/** Group input packets into strokes, so noisy motion cannot become a rattle. */
export function createSwishTrigger() {
  let armed = true,
    direction = 0,
    quietSince: number | null = null,
    lastCue = -Infinity,
    lastTime = -Infinity;
  return (velocity: number, position: number, time: number) => {
    if (!Number.isFinite(time) || time < lastTime) return null;
    lastTime = time;
    const speed = Number.isFinite(velocity) ? Math.abs(velocity) : 0;
    if (speed < 0.5) {
      quietSince ??= time;
      return null;
    }
    if (quietSince !== null && time - quietSince >= 0.08) armed = true;
    quietSince = null;
    const parameters = swishParameters(velocity, position);
    if (parameters.gain === 0 || time - lastCue < 0.3) return null;
    const nextDirection = Math.sign(velocity);
    if (!armed && nextDirection === direction) return null;
    armed = false;
    direction = nextDirection;
    lastCue = time;
    return parameters;
  };
}
