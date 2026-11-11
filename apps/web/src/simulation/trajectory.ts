import { add, length, scale, sub, type Vec2 } from "./vector";

/** Resample any simulated polyline, including future curved shots, into evenly spaced display dots. */
export function trajectoryDots(points: readonly Vec2[], spacing = 0.28, limit = 128): Vec2[] {
  if (!points.length || spacing <= 0 || limit <= 0) return [];
  const dots: Vec2[] = [{ ...points[0]! }];
  let needed = spacing;
  for (let index = 1; index < points.length && dots.length < limit; index++) {
    let start = points[index - 1]!;
    const end = points[index]!;
    let distance = length(sub(end, start));
    while (distance + 1e-10 >= needed && dots.length < limit) {
      start = add(start, scale(sub(end, start), needed / Math.max(distance, 1e-10)));
      dots.push(start);
      distance = length(sub(end, start));
      needed = spacing;
    }
    needed -= distance;
  }
  return dots;
}
