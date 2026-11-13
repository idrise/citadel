import { add, scale, type Vec2 } from "./vector";
export type ArenaShape = "classic" | "wide" | "faceted";
/** A shared, symmetric challenge every ten levels; level 100 keeps the toughest classic walls. */
export function levelArenaShape(level: number): ArenaShape {
  return (["classic", "wide", "faceted"] as const)[
    Math.floor(Math.min(99, Math.max(1, level)) / 10) % 3
  ]!;
}
/** Convex outlines only: authoritative wall sweeps and all derived consumers use these same edges.
 * Original corners/fortress anchors remain, with a matching outward facet beside every defender. */
export function arenaVariant(vertices: readonly Vec2[], count: number, shape: ArenaShape): Vec2[] {
  if (shape === "classic") return vertices.map((p) => ({ ...p }));
  const extension = count === 2 ? 1.18 : 1 / Math.cos(Math.PI / count);
  const gain = shape === "wide" ? extension : (1 + extension) / 2;
  return vertices.flatMap((p, i) => [
    { ...p },
    scale(add(p, vertices[(i + 1) % vertices.length]!), gain / 2),
  ]);
}
