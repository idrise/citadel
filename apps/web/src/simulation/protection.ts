import type { PlayerState } from "./types";
export const CONTAINER_PROTECTION_SECONDS = 2;
/** Absolute playing-time deadline; paused/countdown time never advances it. */
export function containersProtected(player: PlayerState, at: number): boolean {
  return (
    player.protectedUntil !== undefined &&
    player.health.some(Boolean) &&
    player.protectedUntil - at > 1e-9
  );
}
