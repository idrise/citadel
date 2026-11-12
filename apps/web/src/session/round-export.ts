import type { MatchState } from "../simulation/types";
import type { GameSettings } from "./settings";
import type { RoundTotals } from "./round-observer";
import { standings } from "../simulation/standings";

export function createRoundExport(
  context: {
    level?: number;
    seed: number;
    humanSeat: number;
    initialSettings: GameSettings;
    settings: GameSettings;
    build: { version: string; revision: string };
  },
  state: MatchState,
  totals: RoundTotals,
  createdAt = new Date().toISOString(),
) {
  return {
    schema: "citadel.round",
    version: 1,
    createdAt,
    build: { ...context.build },
    seed: context.seed,
    supplySeed: state.supplySeed,
    supplies: state.supplies.map((drop) => ({ ...drop, position: { ...drop.position } })),
    level: context.level ?? null,
    difficulty: state.difficulty ? { ...state.difficulty } : null,
    initialPlayers: state.players.length,
    humanSeat: context.humanSeat,
    phase: state.phase,
    winner: state.winner,
    tick: state.tick,
    elapsedSeconds: state.elapsed,
    settingsAtStart: { ...context.initialSettings },
    settingsAtExport: { ...context.settings },
    stats: { ...state.stats, peakBalls: totals.peakBalls },
    players: standings(state).map((row) => ({
      ...row,
      ...totals.players[row.seat],
      eliminatedAt: state.eliminations.find((entry) => entry.seat === row.seat)?.elapsed ?? null,
    })),
    note: "Local round summary, not an input replay. Nothing is uploaded.",
  };
}
export function downloadRound(report: ReturnType<typeof createRoundExport>) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2) + "\n"], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `citadel-${report.seed}-${report.tick}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
