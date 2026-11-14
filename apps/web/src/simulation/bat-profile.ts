import { ARENA } from "./arena-tuning";

export type BatProfile = "standard" | "shallow" | "deep";
export const BAT_PROFILES = {
  standard: { radius: ARENA.batRadius, label: "STANDARD BAT" },
  shallow: { radius: 2.6, label: "SHALLOW BAT" },
  deep: { radius: 1.35, label: "DEEPER BAT" },
} as const;
export function levelBatProfile(requested: number): BatProfile {
  const level = Math.max(1, Math.min(100, Math.floor(Number.isFinite(requested) ? requested : 1)));
  const sequence: readonly BatProfile[] = [
    "standard",
    "shallow",
    "deep",
    "standard",
    "deep",
    "shallow",
  ];
  return sequence[Math.floor((level - 1) / 5) % sequence.length]!;
}
/** Match the existing level's physical chord width while varying only its convex bow. */
export function profileHalfAngle(profile: BatProfile, scale: number) {
  const standard = ARENA.batHalfAngle * scale;
  return profile === "standard"
    ? standard
    : Math.asin(
        Math.min(0.999, (ARENA.batRadius * Math.sin(standard)) / BAT_PROFILES[profile].radius),
      );
}
