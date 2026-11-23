import type { GameSignals } from "../events/game-signals";
import { alive } from "../simulation/types";
import type { SessionSnapshot } from "../session/session";

export type JourneyEvent =
  | { type: "ready" }
  | { type: "start"; level: number; players: number }
  | { type: "progress"; progress: number }
  | { type: "interaction"; action: "first_return" | "first_score" | "resumed" }
  | { type: "end"; complete: boolean; game?: { win: boolean; score: number } };

/** One real level attempt is one journey. This observer never modifies a session. */
export function observeAttemptJourneys(signals: GameSignals, emit: (event: JourneyEvent) => void) {
  let ready = false;
  let previouslyStarted = false;
  let attempt: {
    paused: boolean;
    progress: number;
    returned: boolean;
    scored: boolean;
  } | null = null;
  const abandon = () => {
    if (!attempt) return;
    attempt = null;
    emit({ type: "end", complete: false });
  };
  function observe(snapshot: SessionSnapshot) {
    const begins = snapshot.started && !previouslyStarted;
    previouslyStarted = snapshot.started;
    if (!snapshot.started || snapshot.debug) {
      abandon();
      return;
    }
    if (begins) {
      attempt = { paused: snapshot.paused, progress: 0, returned: false, scored: false };
      emit({ type: "start", level: snapshot.level, players: snapshot.state.players.length });
    }
    if (!attempt) return; // Spectating, completed attempts, or restored closed views.
    const { state, humanSeat, totals } = snapshot;
    const own = totals.players[humanSeat]!;
    if (attempt.paused && !snapshot.paused) emit({ type: "interaction", action: "resumed" });
    attempt.paused = snapshot.paused;
    if (!attempt.returned && own.returns > 0) {
      attempt.returned = true;
      emit({ type: "interaction", action: "first_return" });
    }
    if (!attempt.scored && own.scored > 0) {
      attempt.scored = true;
      emit({ type: "interaction", action: "first_score" });
    }
    const opponents = state.players.filter((_player, seat) => seat !== humanSeat);
    const progress =
      opponents.filter((player) => !alive(player)).length / Math.max(1, opponents.length);
    if (progress > attempt.progress) {
      attempt.progress = progress;
      emit({ type: "progress", progress });
    }
    if (!alive(state.players[humanSeat]!) || state.phase === "finished") {
      const win = state.winner === humanSeat;
      attempt = null;
      emit({ type: "end", complete: win, game: { win, score: own.scored } });
    }
  }
  const unsubscribe = [
    signals.ready.subscribe(() => {
      if (ready) return;
      ready = true;
      emit({ type: "ready" });
    }),
    signals.sessionUpdated.subscribe(observe),
    signals.sessionClosed.subscribe(abandon),
  ];
  return () => unsubscribe.forEach((stop) => stop());
}
