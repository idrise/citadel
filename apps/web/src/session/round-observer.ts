import type { GameEvent } from "../simulation/types";

export interface PlayerTotals {
  returns: number;
  scored: number;
  lost: number;
  eliminations: number;
}
export interface RoundTotals {
  players: PlayerTotals[];
  peakBalls: number;
}
/** Read-only last-touch credit. Launch/return events identify the striker; walls
 * preserve it, and a revenge launch replaces it. Never writes into match state. */
export function createRoundObserver(count: number) {
  const players: PlayerTotals[] = Array.from({ length: count }, () => ({
    returns: 0,
    scored: 0,
    lost: 0,
    eliminations: 0,
  }));
  const strikers = new Map<number, number>();
  let lastEvent = -1,
    peakBalls = 1;
  return {
    observe(events: readonly GameEvent[], balls = 1): GameEvent[] {
      peakBalls = Math.max(peakBalls, Math.min(8, balls));
      const observed: GameEvent[] = [];
      for (const event of events) {
        if (event.id <= lastEvent) continue;
        lastEvent = event.id;
        const defender = players[event.seat],
          ball = event.ballId;
        if (
          (event.type === "launch" || event.type === "paddle") &&
          defender &&
          ball !== undefined &&
          (strikers.has(ball) || strikers.size < 8)
        )
          strikers.set(ball, event.seat);
        if (event.type === "paddle" && defender) defender.returns++;
        const attacker = ball === undefined ? undefined : strikers.get(ball);
        const credited =
          event.type === "damage" || event.type === "elimination" ? (attacker ?? null) : undefined;
        if (event.type === "damage" && defender) {
          defender.lost++;
          if (attacker !== undefined && attacker !== event.seat) players[attacker]!.scored++;
        }
        if (event.type === "elimination" && attacker !== undefined && attacker !== event.seat)
          players[attacker]!.eliminations++;
        observed.push(credited === undefined ? { ...event } : { ...event, attackerSeat: credited });
      }
      return observed;
    },
    snapshot(): RoundTotals {
      return { players: players.map((p) => ({ ...p })), peakBalls };
    },
    owners(): ReadonlyMap<number, number> {
      return new Map(strikers);
    },
  };
}
