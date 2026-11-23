import { expect, it, vi } from "vite-plus/test";
import type { TelemetryJourneyStartResponse } from "@devvit/analytics/shared/reddit";
import { createGameSignals } from "../events/game-signals";
import type { SessionSnapshot } from "../session/session";
import { createMatch } from "../simulation/match";
import { createRoundObserver } from "../session/round-observer";
import { attachRedditJourneys, MAX_PENDING_JOURNEY_EVENTS } from "./journeys";

const receipt = { status: "JOURNEY_RECEIPT_VALID" as const, message: "Recorded" };
function snapshot(patch: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    started: false,
    paused: true,
    debug: false,
    humanSeat: 0,
    level: 12,
    state: createMatch(51, 4),
    totals: createRoundObserver(4).snapshot(),
    ...patch,
  } as SessionSnapshot;
}
function fixture() {
  const signals = createGameSignals();
  const client = {
    appReady: vi.fn(async () => ({ receipt })),
    startJourney: vi.fn(async (): Promise<TelemetryJourneyStartResponse> => ({
      journeyId: "j-1",
      receipt,
    })),
    progress: vi.fn(async () => ({ receipt })),
    interaction: vi.fn(async () => ({ receipt })),
    endJourney: vi.fn(async () => ({ receipt })),
    clearJourneyId: vi.fn(),
  };
  const adapter = attachRedditJourneys(signals, client);
  return {
    signals,
    client,
    adapter,
    update: (value: SessionSnapshot) => signals.sessionUpdated.emit(value),
  };
}
it("maps normal attempts to the SDK with only whitelisted game details", async () => {
  const f = fixture();
  f.signals.ready.emit();
  f.signals.ready.emit();
  const value = snapshot({ started: true, paused: false });
  f.update(value);
  value.totals.players[0]!.returns = 1;
  value.totals.players[0]!.scored = 2;
  value.state.players.slice(1).forEach((p) => p.health.fill(false));
  value.state.phase = "finished";
  value.state.winner = 0;
  f.update(value);
  f.update(value);
  await f.adapter.idle();
  expect(f.client.appReady).toHaveBeenCalledOnce();
  expect(f.client.startJourney).toHaveBeenCalledOnce();
  expect(f.client.interaction.mock.calls).toEqual([
    [{ action: "level_started", actionDetails: '{"level":12,"players":4}' }],
    [{ action: "first_return" }],
    [{ action: "first_score" }],
    [{ action: "level_won", actionDetails: '{"level":12,"score":2}' }],
  ]);
  expect(f.client.progress).toHaveBeenCalledWith({ progress: 1, action: "opponents_eliminated" });
  expect(f.client.endJourney).toHaveBeenCalledExactlyOnceWith({
    complete: true,
    game: { win: true, score: 2 },
  });
  expect(f.client.clearJourneyId).toHaveBeenCalledTimes(2);
});
it("records losses against the attempted level, separately from abandonment", async () => {
  const f = fixture();
  const value = snapshot({ started: true, paused: false, level: 42 });
  f.update(value);
  value.state.players[0]!.health.fill(false);
  value.level = 43; // A saved next-level update cannot relabel this attempt.
  f.update(value);
  await f.adapter.idle();
  expect(f.client.interaction).toHaveBeenCalledWith({
    action: "level_lost",
    actionDetails: '{"level":42,"score":0}',
  });
  expect(f.client.endJourney).toHaveBeenCalledExactlyOnceWith({
    complete: false,
    game: { win: false, score: 0 },
  });
});
it("serialises delayed start, abandonment and retry without merging journeys", async () => {
  const f = fixture();
  let release!: (value: TelemetryJourneyStartResponse) => void;
  f.client.startJourney.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  f.update(snapshot({ started: true, paused: false }));
  await Promise.resolve();
  f.update(snapshot());
  f.update(snapshot({ started: true, paused: false }));
  expect(f.client.startJourney).toHaveBeenCalledOnce();
  expect(f.client.endJourney).not.toHaveBeenCalled();
  release({ journeyId: "slow-start", receipt });
  await f.adapter.idle();
  expect(f.client.startJourney).toHaveBeenCalledTimes(2);
  expect(f.client.endJourney).toHaveBeenCalledExactlyOnceWith({ complete: false });
  expect(f.client.endJourney.mock.invocationCallOrder[0]).toBeLessThan(
    f.client.startJourney.mock.invocationCallOrder[1]!,
  );
});
it("does not let denied/offline starts cause SDK auto-starts from later milestones", async () => {
  const f = fixture();
  f.client.startJourney.mockResolvedValueOnce({
    journeyId: "",
    receipt: { status: "JOURNEY_RECEIPT_DENIED_NOT_ALLOWLISTED", message: "Not approved" },
  });
  const value = snapshot({ started: true, paused: false });
  f.update(value);
  value.totals.players[0]!.scored = 1;
  value.state.players[1]!.health.fill(false);
  f.update(value);
  f.signals.sessionClosed.emit();
  await f.adapter.idle();
  expect(f.client.interaction).not.toHaveBeenCalled();
  expect(f.client.progress).not.toHaveBeenCalled();
  expect(f.client.endJourney).not.toHaveBeenCalled();
  f.update(snapshot());
  f.update(snapshot({ started: true, paused: false }));
  await f.adapter.idle();
  expect(f.client.startJourney).toHaveBeenCalledTimes(2);
  expect(f.client.interaction).toHaveBeenCalledOnce();
});
it("contains thrown/rejected provider errors and permits the next explicit attempt", async () => {
  const f = fixture();
  f.client.appReady.mockRejectedValueOnce(new Error("offline"));
  f.client.startJourney.mockRejectedValueOnce(new Error("offline"));
  f.client.clearJourneyId.mockImplementation(() => {
    throw new Error("storage blocked");
  });
  f.signals.ready.emit();
  f.update(snapshot({ started: true, paused: false }));
  await expect(f.adapter.idle()).resolves.toBeUndefined();
  f.update(snapshot());
  f.update(snapshot({ started: true, paused: false }));
  await expect(f.adapter.idle()).resolves.toBeUndefined();
  expect(f.client.interaction).toHaveBeenCalledOnce();
  expect(() => f.adapter.dispose()).not.toThrow();
});
it("bounds queued telemetry and discards late starts after disposal/overflow", async () => {
  const f = fixture();
  let release!: (value: TelemetryJourneyStartResponse) => void;
  f.client.startJourney.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  f.update(snapshot({ started: true, paused: false }));
  await Promise.resolve();
  for (let i = 0; i < MAX_PENDING_JOURNEY_EVENTS + 2; i++) {
    f.update(snapshot({ started: true, paused: true }));
    f.update(snapshot({ started: true, paused: false }));
  }
  f.adapter.dispose();
  release({ journeyId: "late", receipt });
  await f.adapter.idle();
  expect(f.client.interaction).not.toHaveBeenCalled();
  expect(f.client.endJourney).not.toHaveBeenCalled();
  expect(f.client.clearJourneyId).toHaveBeenCalled();
});
