import { add, scale, type Vec2 } from "./vector";
export type ArenaShape = "classic" | "wide" | "faceted" | "compact" | "spacious" | "rounded";
/** A deterministic mixed itinerary: geometry varies between attempts without consuming match RNG. */
export function levelArenaShape(requested: number): ArenaShape {
  const level = Math.max(1, Math.min(100, Math.floor(Number.isFinite(requested) ? requested : 1)));
  if (level >= 99) return "classic";
  const families: ArenaShape[] = ["classic", "wide", "faceted", "compact", "spacious", "rounded"];
  const pattern = [0, 1, 5, 3, 1, 4, 2, 5, 3, 1];
  return families[(pattern[(level - 1) % 10]! + Math.floor((level - 1) / 10)) % families.length]!;
}
/** Convex outlines only: authoritative wall sweeps and all derived consumers use these same edges.
 * Original corners/fortress anchors remain, with a matching outward facet beside every defender. */
export function arenaVariant(vertices: readonly Vec2[], count: number, shape: ArenaShape): Vec2[] {
  if (shape === "classic" || shape === "compact" || shape === "spacious")
    return vertices.map((p) => ({ ...p }));
  const extension = count === 2 ? 1.18 : 1 / Math.cos(Math.PI / count);
  if (shape === "rounded") {
    // Quadratic outward bows retain the authored fortress corners. At most 32 edges
    // bound collision work, GPU wall slots and the victory correspondence.
    const samples = Math.max(2, Math.floor(32 / vertices.length));
    return vertices.flatMap((a, i) => {
      const b = vertices[(i + 1) % vertices.length]!;
      const control = scale(add(a, b), (1 + 1.3 * (extension - 1)) / 2);
      return Array.from({ length: samples }, (_, j) => {
        const t = j / samples,
          s = 1 - t;
        return add(add(scale(a, s * s), scale(control, 2 * s * t)), scale(b, t * t));
      });
    });
  }
  const gain = shape === "wide" ? extension : (1 + extension) / 2;
  return vertices.flatMap((p, i) => [
    { ...p },
    scale(add(p, vertices[(i + 1) % vertices.length]!), gain / 2),
  ]);
}
