import { context } from "@devvit/web/client";
import { createTelemetryClient } from "@devvit/analytics/client/reddit";
import { createGameSignals, NO_GAME_SIGNALS } from "../events/game-signals";
import { mountGame } from "../app/mount";
import { attachRedditJourneys } from "./journeys";

// Local preview has no Reddit context and never attempts analytics requests.
const signals = context ? createGameSignals() : NO_GAME_SIGNALS;
const journeys = context
  ? attachRedditJourneys(
      signals,
      createTelemetryClient({
        fetch: (path, options) => fetch(path, { ...options, signal: AbortSignal.timeout(5000) }),
      }),
    )
  : undefined;
window.addEventListener("pagehide", () => signals.sessionClosed.emit());
mountGame(signals);
if (import.meta.hot) import.meta.hot.dispose(() => journeys?.dispose());
