/** A fixed light pool follows representative live seats; more players never recompile shaders. */
export function seatLights(
  players: readonly { id: number; health: readonly boolean[] }[],
  humanSeat: number,
  budget = 6,
): number[] {
  const live = players.filter((p) => p.health.some(Boolean)).map((p) => p.id);
  const chosen = live.includes(humanSeat) ? [humanSeat] : [];
  const rest = live.filter((id) => id !== humanSeat),
    slots = Math.min(budget - chosen.length, rest.length);
  for (let slot = 0; slot < slots; slot++)
    chosen.push(rest[Math.floor((slot * rest.length) / slots)]!);
  return chosen;
}
