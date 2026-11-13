import { add, scale, type Vec2 } from "./vector";
export type ArenaShape = "classic" | "wide" | "faceted" | "compact" | "spacious";
/** A deterministic mixed itinerary: geometry varies between attempts without consuming match RNG. */
export function levelArenaShape(requested: number): ArenaShape {
  const level = Math.max(1, Math.min(100, Math.floor(Number.isFinite(requested) ? requested : 1)));
  if (level >= 99) return "classic";
  const families: ArenaShape[] = ["classic", "wide", "faceted", "compact", "spacious"];
  const pattern = [0, 1, 2, 3, 1, 4, 2, 0, 3, 1];
  return families[(pattern[(level - 1) % 10]! + Math.floor((level - 1) / 10)) % families.length]!;
}
/** Convex outlines only: authoritative wall sweeps and all derived consumers use these same edges.
 * Original corners/fortress anchors remain, with a matching outward facet beside every defender. */
export function arenaVariant(vertices: readonly Vec2[], count: number, shape: ArenaShape): Vec2[] {
  if (shape === "classic" || shape === "compact" || shape === "spacious")
    return vertices.map((p) => ({ ...p }));
  const extension = count === 2 ? 1.18 : 1 / Math.cos(Math.PI / count);
  const gain = shape === "wide" ? extension : (1 + extension) / 2;
  return vertices.flatMap((p, i) => [
    { ...p },
    scale(add(p, vertices[(i + 1) % vertices.length]!), gain / 2),
  ]);
}
