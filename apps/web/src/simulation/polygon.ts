import { add, dot, length, normalise, scale, sub, type Vec2 } from "./vector";

/** Vertices are clockwise; each half-plane normal points into the playable floor. */
export function polygonEdges(vertices: readonly Vec2[]) {
  return vertices.map((start, index) => {
    const end = vertices[(index + 1) % vertices.length]!;
    const delta = sub(end, start);
    return { start, end, normal: normalise({ x: delta.y || 0, y: -delta.x || 0 }) };
  });
}
export function containCircle(position: Vec2, radius: number, vertices: readonly Vec2[]): Vec2 {
  let result = { ...position };
  for (let pass = 0; pass < 4; pass++)
    for (const edge of polygonEdges(vertices)) {
      const distance = dot(sub(result, edge.start), edge.normal);
      if (distance < radius) result = add(result, scale(edge.normal, radius - distance));
    }
  return result;
}
export function boundaryRadius(vertices: readonly Vec2[], direction: Vec2): number {
  return Math.min(
    ...polygonEdges(vertices).flatMap((edge) => {
      const speed = dot(direction, edge.normal);
      return speed < -1e-9 ? [dot(edge.start, edge.normal) / speed] : [];
    }),
  );
}
export function carryPoint(point: Vec2, before: readonly Vec2[], after: readonly Vec2[]): Vec2 {
  const radius = length(point);
  if (radius < 1e-9) return { ...point };
  const direction = scale(point, 1 / radius);
  return scale(point, boundaryRadius(after, direction) / boundaryRadius(before, direction));
}
function cross(a: Vec2, b: Vec2, c: Vec2) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
/** Minkowski interpolation preserves convexity throughout a topology change. */
export function blendPolygon(from: readonly Vec2[], to: readonly Vec2[], amount: number): Vec2[] {
  if (amount <= 0) return from.map((p) => ({ ...p }));
  if (amount >= 1) return to.map((p) => ({ ...p }));
  const points = from
    .flatMap((a) => to.map((b) => add(scale(a, 1 - amount), scale(b, amount))))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const lower: Vec2[] = [],
    upper: Vec2[] = [];
  for (const point of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower.at(-1)!, point) <= 1e-8)
      lower.pop();
    lower.push(point);
  }
  for (const point of [...points].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper.at(-1)!, point) <= 1e-8)
      upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)].reverse();
}
