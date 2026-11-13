export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 16;
export const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
export type PlayerCount = (typeof PLAYER_COUNTS)[number];
export function isPlayerCount(value: unknown): value is PlayerCount {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_PLAYERS &&
    value <= MAX_PLAYERS
  );
}
