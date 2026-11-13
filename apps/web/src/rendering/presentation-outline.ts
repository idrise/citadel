import type { OutlineTransition } from "../simulation/outline-transition";
import { add, dot, length, scale, sub, type Vec2 } from "../simulation/vector";

/** Drop only redundant points on an edge; retain every visible corner, including star notches. */
export function visibleCorners(points: readonly Vec2[]) {
  const distinct = points.filter(
    (p, i) => length(sub(p, points[(i + points.length - 1) % points.length]!)) > 1e-8,
  );
  const corners = distinct.filter((p, i) => {
    const a = sub(p, distinct[(i + distinct.length - 1) % distinct.length]!),
      b = sub(distinct[(i + 1) % distinct.length]!, p);
    return Math.abs(a.x * b.y - a.y * b.x) > 1e-8 || dot(a, b) < 0;
  });
  return (corners.length >= 3 ? corners : distinct).map((p) => ({ ...p }));
}
/** Ordered corner assignment in O(n²m), avoiding the combinatorial search on a victory star.
 * Expansion adds collinear points only, so both endpoint silhouettes remain exact.
 */
export function matchPresentationOutlines(
  source: readonly Vec2[],
  target: readonly Vec2[],
): OutlineTransition {
  const from = visibleCorners(source),
    to = visibleCorners(target),
    sourceLarger = from.length >= to.length;
  const large = sourceLarger ? from : to,
    small = sourceLarger ? to : from,
    n = large.length,
    m = small.length;
  let bestCost = Infinity,
    best: number[] = [];
  for (let start = 0; start < n; start++) {
    const costs = Array.from({ length: m }, () => new Float64Array(n).fill(Infinity));
    const parents = Array.from({ length: m }, () => new Int16Array(n).fill(-1));
    const delta = sub(large[start]!, small[0]!);
    costs[0]![0] = dot(delta, delta);
    for (let rank = 1; rank < m; rank++) {
      let prefix = Infinity,
        previous = -1;
      for (let j = 1; j < n; j++) {
        if (costs[rank - 1]![j - 1]! < prefix) {
          prefix = costs[rank - 1]![j - 1]!;
          previous = j - 1;
        }
        if (j < rank || j > n - (m - rank)) continue;
        const d = sub(large[(start + j) % n]!, small[rank]!);
        costs[rank]![j] = prefix + dot(d, d);
        parents[rank]![j] = previous;
      }
    }
    for (let end = m - 1; end < n; end++)
      if (costs[m - 1]![end]! < bestCost) {
        bestCost = costs[m - 1]![end]!;
        best = Array<number>(m);
        let j = end;
        for (let rank = m - 1; rank >= 0; rank--) {
          best[rank] = (start + j) % n;
          j = parents[rank]![j]!;
        }
      }
  }
  const expanded = Array<Vec2>(n);
  best.forEach((start, rank) => {
    const end = best[(rank + 1) % m]!,
      span = (end - start + n) % n;
    const distances = Array.from({ length: span }, (_, i) =>
      length(sub(large[(start + i + 1) % n]!, large[(start + i) % n]!)),
    );
    const total = distances.reduce((sum, d) => sum + d, 0);
    let travelled = 0;
    for (let i = 0; i < span; i++) {
      const t = total > 0 ? travelled / total : i / span;
      expanded[(start + i) % n] = add(scale(small[rank]!, 1 - t), scale(small[(rank + 1) % m]!, t));
      travelled += distances[i]!;
    }
  });
  return sourceLarger ? { from, to: expanded } : { from: expanded, to };
}
export function blendPresentationOutline(outline: OutlineTransition, t: number) {
  return outline.from.map((p, i) => add(scale(p, 1 - t), scale(outline.to[i]!, t)));
}
