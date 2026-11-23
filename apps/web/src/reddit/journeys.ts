import type { TelemetryClient } from "@devvit/analytics/client/reddit";
import type { GameSignals } from "../events/game-signals";
import { observeAttemptJourneys, type JourneyEvent } from "../metrics/attempt-journey";

type Client = Pick<
  TelemetryClient,
  "appReady" | "startJourney" | "progress" | "interaction" | "endJourney" | "clearJourneyId"
>;
export const MAX_PENDING_JOURNEY_EVENTS = 64;

/** Serialise SDK calls so delayed starts/ends cannot merge consecutive attempts. */
export function attachRedditJourneys(signals: GameSignals, client: Client) {
  let tail = Promise.resolve();
  let pending = 0;
  let stopped = false;
  let recording = false;
  let level = 0;
  function clearJourney() {
    try {
      client.clearJourneyId();
    } catch {
      /* Storage/provider failures stay optional. */
    }
  }
  async function send(event: JourneyEvent) {
    if (event.type === "ready") await client.appReady();
    else if (event.type === "start") {
      recording = false;
      level = event.level;
      clearJourney();
      const response = await client.startJourney();
      if (stopped) {
        clearJourney();
        return;
      }
      recording =
        Boolean(response.journeyId) && response.receipt.status === "JOURNEY_RECEIPT_VALID";
      if (recording)
        await client.interaction({
          action: "level_started",
          actionDetails: JSON.stringify({ level: event.level, players: event.players }),
        });
      else clearJourney();
    } else if (recording) {
      if (event.type === "progress")
        await client.progress({ progress: event.progress, action: "opponents_eliminated" });
      else if (event.type === "interaction") await client.interaction({ action: event.action });
      else {
        recording = false;
        try {
          try {
            await client.interaction({
              action: event.complete ? "level_won" : event.game ? "level_lost" : "level_abandoned",
              actionDetails: JSON.stringify({
                level,
                ...(event.game ? { score: event.game.score } : {}),
              }),
            });
          } finally {
            await client.endJourney({
              complete: event.complete,
              ...(event.game ? { game: event.game } : {}),
            });
          }
        } finally {
          clearJourney();
        }
      }
    }
  }
  const unsubscribe = observeAttemptJourneys(signals, (event) => {
    if (stopped) return;
    if (pending >= MAX_PENDING_JOURNEY_EVENTS) {
      stopped = true; // Bounded memory during an offline/stalled telemetry service.
      recording = false;
      clearJourney();
      return;
    }
    pending++;
    tail = tail
      .then(async () => {
        if (!stopped) await send(event);
      })
      .catch(() => {
        recording = false;
        clearJourney();
      })
      .finally(() => {
        pending--;
        if (stopped) clearJourney();
      });
  });
  return {
    idle: () => tail,
    dispose() {
      unsubscribe();
      stopped = true;
      recording = false;
      clearJourney();
    },
  };
}
