import type { SessionSnapshot } from "../session/session";
import { createSignal, type Signal } from "./signal";

/** Read-only session notifications; no analytics/provider concepts in gameplay. */
export interface GameSignals {
  ready: Signal<void>;
  sessionUpdated: Signal<SessionSnapshot>;
  sessionClosed: Signal<void>;
}

export function createGameSignals(): GameSignals {
  return {
    ready: createSignal<void>(),
    sessionUpdated: createSignal<SessionSnapshot>(),
    sessionClosed: createSignal<void>(),
  };
}

const noop = { emit() {}, subscribe: () => () => {} };
/** Web and itch have no subscribers, network calls, storage or tracking setup. */
export const NO_GAME_SIGNALS: GameSignals = {
  ready: noop,
  sessionUpdated: noop,
  sessionClosed: noop,
};
