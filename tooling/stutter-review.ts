import {
  createSession,
  type GameSession,
  type SessionSnapshot,
} from "../apps/web/src/session/session";
import { createSettings } from "../apps/web/src/session/settings";
import type { PlayerCount } from "../apps/web/src/simulation/arena";

/** Ordinary sessions and rematches; external runner installs virtual controls first. */
export function createStutterReview(
  container: HTMLElement,
  level: number,
  count: PlayerCount,
  mobile: boolean,
) {
  let latest: SessionSnapshot | undefined,
    game: GameSession,
    timer = 0,
    disposed = false;
  game = createSession(
    container,
    51,
    0,
    (snapshot) => {
      latest = snapshot;
      if (snapshot.state.phase === "finished" && !timer)
        timer = window.setTimeout(() => {
          timer = 0;
          if (!disposed) game.nextRound(level);
        }, 100);
    },
    count,
    () => {},
    level,
  );
  game.configure(createSettings());
  game.configureProgress(null, level, undefined, level);
  return {
    start() {
      game.start();
    },
    summary() {
      return {
        level,
        count,
        mobile,
        music: latest?.music.status,
        phase: latest?.state.phase,
        caps: latest?.state.stats.collisionCaps,
      };
    },
    dispose() {
      disposed = true;
      clearTimeout(timer);
      game.dispose();
    },
  };
}
