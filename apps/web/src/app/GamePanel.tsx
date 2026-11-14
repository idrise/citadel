import { MAX_PLAYERS } from "../simulation/player-count";
import { levelFor, loadProgress } from "../session/progression";
import { attachSessionTestPort } from "./test-port";
import { parsePreferences } from "../session/preferences";
import { createRoundExport, downloadRound } from "../session/round-export";
import { BUILD_INFO } from "./build-info";
import { levelDifficulty } from "../simulation/difficulty";
import { ARENA } from "../simulation/arena";
import type { Demotion, LevelResult } from "../session/progression";
import { createRoundObserver } from "../session/round-observer";
import type { PlayerCount } from "../simulation/arena";
import { useEffect, useRef, useState } from "react";
import { createSession, type GameSession, type SessionSnapshot } from "../session/session";
import { createMatch } from "../simulation/match";
import { AccessibleStatus } from "./AccessibleStatus";
import type { GameSettings } from "../session/settings";

export function GamePanel({
  humanSeat,
  count,
  onCount,
  seed,
  onSeat,
  settings,
  onSettings,
  level,
  bestLevel,
  onReached,
  lossLevel,
  previousLevel,
  demotion,
  onComplete,
}: {
  level: number;
  bestLevel: number;
  onReached: (level: number) => void;
  lossLevel: number;
  previousLevel: number | undefined;
  demotion: Demotion | null;
  onComplete: (result: LevelResult) => void;
  humanSeat: number;
  count: PlayerCount;
  onCount: (count: PlayerCount) => void;
  seed: number;
  settings: GameSettings;
  onSettings: (value: GameSettings) => void;
  onSeat: (seat: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const session = useRef<GameSession | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const callbacks = useRef({
    count,
    onCount,
    level,
    onComplete,
    onReached,
    onSettings,
    onSeat,
    settings,
  });
  callbacks.current = {
    count,
    onCount,
    level,
    onComplete,
    onReached,
    onSettings,
    onSeat,
    settings,
  };
  const initialConfig = useRef({ seed, humanSeat, count, level, lossLevel, previousLevel });
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => ({
    state: createMatch(seed, count, ARENA.startingPieces, undefined, levelDifficulty(level)),
    seed,
    humanSeat,
    level,
    bestLevel,
    serveGuide: settings.serveGuide,
    lossLevel,
    introDuration: 1.5,
    previousLevel,
    demotion,
    paused: true,
    started: false,
    notice: "",
    totals: createRoundObserver(count).snapshot(),
    initialSettings: null,
    endingTime: 0,
    titleMoving: false,
    debug: false,
    ballOwners: new Map(),
    music: {
      status: "idle",
      needsGesture: false,
      section: "intro",
      energy: 0.45,
      intensity: 0,
      streak: 0,
      notes: 0,
      layers: 1,
      seat: humanSeat,
    },
  }));
  const latest = useRef(snapshot);
  latest.current = snapshot;
  useEffect(() => {
    if (!container.current) return;
    try {
      const { seed, humanSeat, count, level, lossLevel, previousLevel } = initialConfig.current;
      const game = createSession(
        container.current,
        seed,
        humanSeat,
        setSnapshot,
        count,
        (action) => {
          if (action === "decrease")
            callbacks.current.onCount(Math.max(2, callbacks.current.count - 1) as PlayerCount);
          if (action === "increase")
            callbacks.current.onCount(
              Math.min(MAX_PLAYERS, callbacks.current.count + 1) as PlayerCount,
            );
          if (action === "rematch" || action === "retry")
            session.current?.nextRound(callbacks.current.level);
        },
        level,
        (result) => callbacks.current.onComplete(result),
        lossLevel,
        previousLevel,
        (value) => callbacks.current.onSettings(value),
        (reached) => callbacks.current.onReached(reached),
      );
      session.current = game;
      const detach = attachSessionTestPort({
        configure(patch) {
          const current = callbacks.current;
          const parsed = parsePreferences(
            JSON.stringify({
              version: 1,
              count: current.count,
              humanSeat: latest.current.humanSeat,
              settings: { ...current.settings, ...patch },
            }),
          );
          current.settings = parsed.settings;
          game.configure(parsed.settings);
          current.onSettings(parsed.settings);
        },
        roster(count, seat) {
          game.configureRoster(count, Math.min(count - 1, seat), levelFor(loadProgress(), count));
          callbacks.current.onCount(count);
          callbacks.current.onSeat(seat);
        },
        restart: () => game.restart(),
        download() {
          const snap = latest.current,
            current = callbacks.current;
          downloadRound(
            createRoundExport(
              {
                seed: snap.seed,
                humanSeat: snap.humanSeat,
                settings: current.settings,
                initialSettings: snap.initialSettings ?? current.settings,
                level: snap.level,
                build: BUILD_INFO,
              },
              snap.state,
              snap.totals,
            ),
          );
        },
      });
      return () => {
        detach();
        game.dispose();
        session.current = null;
      };
    } catch {
      setUnavailable(true);
    }
  }, []);
  useEffect(() => {
    session.current?.configureRoster(count, humanSeat, level);
  }, [count, humanSeat, level]);
  useEffect(() => {
    session.current?.configureProgress(demotion, lossLevel, previousLevel, bestLevel);
  }, [demotion, lossLevel, previousLevel, bestLevel]);
  useEffect(() => {
    session.current?.configure(settings);
  }, [settings]);
  return (
    <>
      <div className="viewport" ref={container} />
      <AccessibleStatus snapshot={snapshot} humanSeat={snapshot.humanSeat} />
      {unavailable && (
        <div className="game-overlay">
          <p role="status">WebGL2 is needed to render the arena.</p>
        </div>
      )}
    </>
  );
}
