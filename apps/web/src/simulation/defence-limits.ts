import { ARENA } from "./arena-tuning";
import type { ArenaGeometry } from "./arena";
import { polygonEdges } from "./polygon";
import { add, angleDifference, angleOf, dot, scale, sub, unit } from "./vector";

/** Fit the real curved bat to current walls, including flat two-player ends.
 * A small physical gap prevents clipping; ball radius never shortens player reach. */
export function fitDefenceLimits(arena: ArenaGeometry): ArenaGeometry {
  const edges = polygonEdges(arena.vertices);
  const halfAngle = arena.batHalfAngle ?? ARENA.batHalfAngle;
  return {
    ...arena,
    fortresses: arena.fortresses.map((home) => {
      const safe = (offset: number) => {
        const angle = home.direction + offset,
          centre = add(home.anchor, scale(unit(angle), ARENA.railRadius - ARENA.batRadius));
        return edges.every((edge) => {
          const opposite = angleDifference(angleOf(scale(edge.normal, -1)), angle);
          const samples = [-halfAngle, halfAngle];
          if (Math.abs(opposite) <= halfAngle) samples.push(opposite);
          const distance =
            dot(sub(centre, edge.start), edge.normal) +
            ARENA.batRadius *
              Math.min(...samples.map((delta) => dot(unit(angle + delta), edge.normal)));
          return distance >= ARENA.paddleThickness / 2 + 0.015;
        });
      };
      const extent = (side: number) => {
        let low = 0,
          // Inset triangle defenders can use the full rail sector. Actual arc/wall
          // clearance below remains authoritative, including during morphs.
          high = Math.max(0, home.halfAngle - (arena.count === 3 ? 0 : halfAngle / 2));
        for (let i = 0; i < 18; i++) {
          const mid = (low + high) / 2;
          if (safe(mid * side)) low = mid;
          else high = mid;
        }
        return low * side;
      };
      return { ...home, angleLimits: [extent(-1), extent(1)] as [number, number] };
    }),
  };
}
