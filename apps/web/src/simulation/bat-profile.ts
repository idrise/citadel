import { levelFeatures } from "./levels";
import { ARENA } from "./arena-tuning";

export type BatProfile = "standard" | "shallow" | "deep";
export const BAT_PROFILES = {
  standard: { radius: ARENA.batRadius, label: "STANDARD BAT" },
  shallow: { radius: 2.6, label: "SHALLOW BAT" },
  deep: { radius: 1.35, label: "DEEPER BAT" },
} as const;
export const levelBatProfile = (level: number): BatProfile => levelFeatures(level).batProfile;
/** Match the existing level's physical chord width while varying only its convex bow. */
export function profileHalfAngle(profile: BatProfile, scale: number) {
  const standard = ARENA.batHalfAngle * scale;
  return profile === "standard"
    ? standard
    : Math.asin(
        Math.min(0.999, (ARENA.batRadius * Math.sin(standard)) / BAT_PROFILES[profile].radius),
      );
}
