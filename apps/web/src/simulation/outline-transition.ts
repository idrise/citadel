import { matchPresentationOutlines } from "./ordered-outlines";
import { convexHull } from "./polygon";
import { add, dot, length, scale, sub, type Vec2 } from "./vector";

export interface OutlineTransition {
  from: Vec2[];
  to: Vec2[];
}
function selections(size: number, count: number, start = 0, prefix: number[] = []): number[][] {
  if (!count) return [prefix];
  return Array.from({ length: size - start - count + 1 }, (_, offset) => start + offset).flatMap(
    (index) => selections(size, count - 1, index + 1, [...prefix, index]),
  );
}
function expand(
  small: readonly Vec2[],
  large: readonly Vec2[],
  indices: number[],
  offset: number,
): Vec2[] {
  const expanded: Vec2[] = Array.from({ length: large.length });
  indices.forEach((start, rank) => {
    const end = indices[(rank + 1) % indices.length]!,
      a = small[(rank + offset) % small.length]!,
      b = small[(rank + offset + 1) % small.length]!;
    const span = (end - start + large.length) % large.length;
    const distances = Array.from({ length: span }, (_, step) =>
      length(sub(large[(start + step + 1) % large.length]!, large[(start + step) % large.length]!)),
    );
    const total = distances.reduce((sum, d) => sum + d, 0);
    let travelled = 0;
    for (let step = 0; step < span; step++) {
      const t = total > 0 ? travelled / total : step / span;
      expanded[(start + step) % large.length] = add(scale(a, 1 - t), scale(b, t));
      travelled += distances[step]!;
    }
  });
  return expanded;
}
/** Pair actual corners in perimeter order. Extra corners flatten onto an edge,
 * so an n→n-1 change uses n wall sections, never n+(n-1) temporary sections. */
export function matchOutlines(from: readonly Vec2[], to: readonly Vec2[]): OutlineTransition {
  if (Math.max(from.length, to.length) > 12) return matchPresentationOutlines(from, to);
  const sourceLarger = from.length >= to.length,
    large = sourceLarger ? from : to,
    small = sourceLarger ? to : from;
  let best: OutlineTransition | undefined,
    cost = Infinity;
  for (const indices of selections(large.length, small.length))
    for (let offset = 0; offset < small.length; offset++) {
      const expanded = expand(small, large, indices, offset);
      const candidate = large.reduce((sum, p, index) => {
        const delta = sub(p, expanded[index]!);
        return sum + dot(delta, delta);
      }, 0);
      if (candidate >= cost - 1e-9) continue;
      cost = candidate;
      best = sourceLarger
        ? { from: from.map((p) => ({ ...p })), to: expanded }
        : { from: expanded, to: to.map((p) => ({ ...p })) };
    }
  return best!;
}
export function blendOutline(outline: OutlineTransition, amount: number): Vec2[] {
  // Hull also handles a retarget from a partially collapsed shape; it cannot fold inward.
  return convexHull(
    outline.from.map((p, index) => add(scale(p, 1 - amount), scale(outline.to[index]!, amount))),
  );
}
