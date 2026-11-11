import { alive, type MatchState } from "./types";

export function standings(state: MatchState) {
  return state.players
    .map((player) => {
      const index = state.eliminations.findIndex((entry) => entry.seat === player.id);
      return {
        seat: player.id,
        health: player.health.filter(Boolean).length,
        place: state.winner === player.id ? 1 : index >= 0 ? state.players.length - index : null,
        alive: alive(player),
      };
    })
    .sort((a, b) => (a.place ?? 0) - (b.place ?? 0) || b.health - a.health || a.seat - b.seat);
}
