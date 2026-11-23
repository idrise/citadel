import { expect, it } from "vite-plus/test";
import { createGameSignals } from "../events/game-signals";
import { createMatch } from "../simulation/match";
import { createRoundObserver } from "../session/round-observer";
import type { SessionSnapshot } from "../session/session";
import { observeAttemptJourneys, type JourneyEvent } from "./attempt-journey";

/** Only fields consumed by the observer; unrelated rendering/audio data is omitted. */
function journeySnapshot(patch: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    started: false,
    paused: true,
    debug: false,
    humanSeat: 0,
    level: 7,
    state: createMatch(51, 4),
    totals: createRoundObserver(4).snapshot(),
    ...patch,
  } as SessionSnapshot;
}
function fixture() {
  const signals = createGameSignals(),
    events: JourneyEvent[] = [];
  const stop = observeAttemptJourneys(signals, (event) => events.push(event));
  return {
    signals,
    events,
    stop,
    update: (snapshot: SessionSnapshot) => signals.sessionUpdated.emit(snapshot),
  };
}
it("reports ready once across repeated/StrictMode setup without starting title-demo journeys", () => {
  const f = fixture();
  f.signals.ready.emit();
  f.update(journeySnapshot());
  f.signals.sessionClosed.emit();
  f.signals.ready.emit();
  f.update(journeySnapshot());
  expect(f.events).toEqual([{ type: "ready" }]);
  f.stop();
  f.signals.ready.emit();
  expect(f.events).toHaveLength(1);
});
it("starts once on committed play, coalesces milestones and reports a win once", () => {
  const f = fixture(),
    snapshot = journeySnapshot({ started: true, paused: false });
  f.update(journeySnapshot());
  f.update(snapshot);
  f.update(snapshot);
  expect(f.events).toEqual([{ type: "start", level: 7, players: 4 }]);
  snapshot.totals.players[0]!.returns = 2;
  snapshot.totals.players[0]!.scored = 3;
  snapshot.state.players[1]!.health.fill(false);
  const before = structuredClone(snapshot);
  f.update(snapshot);
  f.update(snapshot);
  expect(snapshot).toEqual(before);
  expect(f.events.slice(1)).toEqual([
    { type: "interaction", action: "first_return" },
    { type: "interaction", action: "first_score" },
    { type: "progress", progress: 1 / 3 },
  ]);
  for (const player of snapshot.state.players.slice(1)) player.health.fill(false);
  snapshot.state.phase = "finished";
  snapshot.state.winner = 0;
  f.update(snapshot);
  f.update(snapshot);
  f.signals.sessionClosed.emit();
  expect(f.events.slice(-2)).toEqual([
    { type: "progress", progress: 1 },
    { type: "end", complete: true, game: { win: true, score: 3 } },
  ]);
});
it("ends on human elimination without waiting for surviving bots, and tracks a subsequent retry", () => {
  const f = fixture(),
    snapshot = journeySnapshot({ started: true, paused: false });
  f.update(snapshot);
  snapshot.state.players[0]!.health.fill(false);
  f.update(snapshot);
  f.update(snapshot);
  expect(f.events.at(-1)).toEqual({ type: "end", complete: false, game: { win: false, score: 0 } });
  f.update(journeySnapshot());
  f.update(journeySnapshot({ started: true, paused: false }));
  expect(f.events.filter((e) => e.type === "start")).toHaveLength(2);
});
it("ends abandoned/restarted attempts once, without inventing a losing game result", () => {
  const f = fixture();
  f.update(journeySnapshot({ started: true, paused: false }));
  f.update(journeySnapshot());
  f.signals.sessionClosed.emit();
  expect(f.events.at(-1)).toEqual({ type: "end", complete: false });
  f.update(journeySnapshot({ started: true, paused: false }));
  f.signals.sessionClosed.emit();
  f.signals.sessionClosed.emit();
  expect(f.events.filter((e) => e.type === "end")).toHaveLength(2);
});
it("ignores debug play and does not silently start journeys when closed views resume updating", () => {
  const f = fixture();
  f.update(journeySnapshot({ started: true, debug: true }));
  expect(f.events).toEqual([]);
  f.update(journeySnapshot());
  const snapshot = journeySnapshot({ started: true, paused: false });
  f.update(snapshot);
  f.signals.sessionClosed.emit();
  f.update(snapshot);
  expect(f.events.map((e) => e.type)).toEqual(["start", "end"]);
});
it("does not treat passive focus-loss pauses as clicks; only reports a deliberate resume", () => {
  const f = fixture();
  f.update(journeySnapshot({ started: true, paused: false }));
  f.update(journeySnapshot({ started: true, paused: true }));
  f.update(journeySnapshot({ started: true, paused: true }));
  f.update(journeySnapshot({ started: true, paused: false }));
  expect(f.events).toEqual([
    { type: "start", level: 7, players: 4 },
    { type: "interaction", action: "resumed" },
  ]);
});
