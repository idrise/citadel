import { expect, it } from "vite-plus/test";
import { createCornerMotion, type CornerPose } from "./corner-motion";
const corner = (x: number, z: number, index: number): CornerPose => ({
  point: { x, y: z },
  x,
  z,
  yaw: 0,
  strength: 1,
  index,
});
it("preserves pillar identity when the hull changes its first vertex, and grows/retires from the floor", () => {
  const motion = createCornerMotion(8);
  const initial = [corner(-4, -4, 0), corner(4, -4, 1), corner(4, 4, 2), corner(-4, 4, 3)];
  expect(motion.update(initial, 0).map((p) => p.growth)).toEqual([1, 1, 1, 1]);
  const reordered = [initial[2]!, initial[3]!, initial[0]!, initial[1]!].map((p, index) => ({
    ...p,
    index,
  }));
  const next = motion.update(reordered, 1 / 60);
  expect(next.map((p) => p.point)).toEqual(initial.map((p) => p.point));
  const added = [...reordered, corner(0, 0, 4)];
  const birth = motion.update(added, 1 / 60)[4]!;
  expect(birth.growth).toBeGreaterThan(0);
  expect(birth.growth).toBeLessThan(0.1);
  for (let i = 0; i < 20; i++) motion.update(added, 1 / 60);
  expect(motion.update(added, 1 / 60)[4]!.growth).toBe(1);
  const retire = motion.update(reordered, 1 / 60)[4]!;
  expect(retire.growth).toBeGreaterThan(0.9);
  for (let i = 0; i < 20; i++) motion.update(reordered, 1 / 60);
  expect(motion.update(reordered, 1 / 60)[4]!.growth).toBe(0);
});
