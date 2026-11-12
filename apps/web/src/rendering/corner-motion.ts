import type { Vec2 } from "../simulation/vector";
export interface CornerPose {
  point: Vec2;
  x: number;
  z: number;
  yaw: number;
  strength: number;
  index: number;
}
/** Match spatial neighbours rather than hull-array indices (which rotate during a morph).
 * Pillars grow from the floor and retire in place. Simulation never sees these poses. */
export function createCornerMotion(capacity = 24) {
  const slots: { pose: CornerPose; growth: number; target: number }[] = [];
  return {
    update(corners: readonly CornerPose[], dt: number) {
      const available = new Set(slots.map((_, i) => i));
      const pending = new Set(corners.map((_, i) => i));
      const assignments = new Map<number, number>();
      const pairs = slots.flatMap((slot, s) =>
        corners.map((corner, c) => ({
          s,
          c,
          distance: Math.hypot(
            slot.pose.point.x - corner.point.x,
            slot.pose.point.y - corner.point.y,
          ),
        })),
      );
      pairs.sort((a, b) => a.distance - b.distance);
      for (const pair of pairs)
        if (pair.distance < 8 && available.has(pair.s) && pending.has(pair.c)) {
          assignments.set(pair.s, pair.c);
          available.delete(pair.s);
          pending.delete(pair.c);
        }
      for (const c of pending) {
        let s = slots.findIndex((slot, i) => available.has(i) && slot.growth < 0.001);
        if (s < 0 && slots.length < capacity) {
          s = slots.length;
          slots.push({ pose: corners[c]!, growth: dt <= 0 ? corners[c]!.strength : 0, target: 0 });
        }
        if (s >= 0) {
          assignments.set(s, c);
          available.delete(s);
        }
      }
      slots.forEach((slot, i) => {
        const c = assignments.get(i);
        if (c !== undefined) slot.pose = corners[c]!;
        slot.target = c === undefined ? 0 : slot.pose.strength;
        const step = dt <= 0 ? 1 : Math.min(1, dt / 0.24);
        // A linear envelope reaches zero, so retired slots can be reused.
        slot.growth += Math.max(-step, Math.min(step, slot.target - slot.growth));
      });
      return slots.map((slot) => ({ ...slot.pose, growth: slot.growth, target: slot.target }));
    },
  };
}
