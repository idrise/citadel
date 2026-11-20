import { containersProtected, CONTAINER_PROTECTION_SECONDS } from "../simulation/protection";
import type { PlayerState } from "../simulation/types";
/** Three soft pulses per protection window; reduced effects uses a steady tint. */
export function protectionPulse(player: PlayerState, elapsed: number, reduced: boolean) {
  if (!containersProtected(player, elapsed)) return 0;
  // The title demo uses permanent protection; avoid cos(Infinity) and flicker.
  if (reduced || player.protectedUntil === Infinity) return 0.6;
  const age = elapsed - (player.protectedUntil! - CONTAINER_PROTECTION_SECONDS);
  return 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(age * Math.PI * 3));
}
