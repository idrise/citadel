import { clamp } from "../simulation/vector";
/** A short, clean glide for deliberate strokes; tiny corrections stay silent. */
export function swishParameters(velocity: number, position: number) {
  const speed = clamp(Number.isFinite(velocity) ? Math.abs(velocity) / 16 : 0, 0, 1);
  return {
    frequency: 280 + speed * 90,
    endFrequency: 230 + speed * 60,
    gain: speed < 0.1 ? 0 : 0.035 + Math.sqrt(speed) * 0.045,
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
    if (parameters.gain === 0 || time - lastCue < 0.18) return null;
    const nextDirection = Math.sign(velocity);
    if (!armed && nextDirection === direction) return null;
    armed = false;
    direction = nextDirection;
    lastCue = time;
    return parameters;
  };
}
