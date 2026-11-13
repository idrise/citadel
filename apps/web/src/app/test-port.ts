import type { GameSettings } from "../session/settings";
import type { PlayerCount } from "../simulation/arena";
export interface SessionTestPort {
  configure(patch: Partial<GameSettings>): void;
  roster(count: PlayerCount, seat: number): void;
  restart(): void;
  download(): void;
}
/** Available only when an external test runner installed document-local virtual input first.
 * Exposes ordinary configuration/actions, never match state, health, RNG or results. */
export function attachSessionTestPort(port: SessionTestPort) {
  const harness = (globalThis as { __citadelTestInput?: { session?: SessionTestPort } })
    .__citadelTestInput;
  if (!harness) return () => {};
  harness.session = port;
  return () => {
    if (harness.session === port) delete harness.session;
  };
}
