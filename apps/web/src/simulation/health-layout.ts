import { add, scale, unit, type Vec2 } from "./vector";

export const HEALTH_GROWTH_PER_LOSS = 0.035;
export const HEALTH_MAX_SCALE = 1 + 7 * HEALTH_GROWTH_PER_LOSS;

/** Stable piece IDs occupy compact staggered rows behind the defence rail. */
export function healthFormation(
  anchor: Vec2,
  direction: number,
  count: number,
  radius: number,
): Vec2[] {
  if (count === 0) return [];
  const spacing = radius * 2 + 0.1;
  const backCount = count > 4 ? Math.floor(count / 2) : count;
  const frontCount = count - backCount;
  const forward = unit(direction);
  const sideways = unit(direction + Math.PI / 2);
  return Array.from({ length: count }, (_, index) => {
    const front = index >= backCount;
    const rowIndex = front ? index - backCount : index;
    const rowCount = front ? frontCount : backCount;
    const distance = frontCount ? 1.85 + (front ? spacing * 1.1 : 0) : 2.15;
    const lateral = (rowIndex - (rowCount - 1) / 2) * spacing + (front ? spacing * 0.25 : 0);
    return add(anchor, add(scale(forward, distance), scale(sideways, lateral)));
  });
}
