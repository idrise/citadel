import type { LevelResult } from "../session/progression";
import { createRoundObserver } from "../session/round-observer";
import type { PlayerCount } from "../simulation/arena";
import { useEffect, useRef, useState } from "react";
import { createSession, type GameSession, type SessionSnapshot } from "../session/session";
import { createMatch } from "../simulation/match";
import { PauseMenu } from "./PauseMenu";
import { AccessibleStatus } from "./AccessibleStatus";
import type { GameSettings } from "../session/settings";
import { MobileDisplay } from "./MobileDisplay";

export function GamePanel({
  humanSeat,
  count,
  onCount,
  seed,
  onRematch,
  onRestart,
  onSeat,
  settings,
  onSettings,
  level,
  onComplete,
}: {
  level: number;
  onComplete: (result: LevelResult) => void;
  humanSeat: number;
  count: PlayerCount;
  onCount: (count: PlayerCount) => void;
  seed: number;
  onRematch: () => void;
  onRestart: () => void;
  settings: GameSettings;
  onSettings: (value: GameSettings) => void;
  onSeat: (seat: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const session = useRef<GameSession | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const callbacks = useRef({ count, onCount, onRematch, onComplete });
  callbacks.current = { count, onCount, onRematch, onComplete };
  const initialConfig = useRef({ seed, humanSeat, count, level });
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => ({
    state: createMatch(seed, count),
    level,
    paused: true,
    started: false,
    notice: "",
    totals: createRoundObserver(count).snapshot(),
    initialSettings: null,
    endingTime: 0,
    titleMoving: false,
    ballOwners: new Map(),
    music: {
      status: "idle",
      section: "intro",
      energy: 0.45,
      intensity: 0,
      streak: 0,
      notes: 0,
      layers: 1,
      seat: humanSeat,
    },
  }));
  useEffect(() => {
    if (!container.current) return;
    try {
      const { seed, humanSeat, count, level } = initialConfig.current;
      const game = createSession(
        container.current,
        seed,
        humanSeat,
        setSnapshot,
        count,
        (action) => {
          if (action === "options") setSettingsOpen(true);
          if (action === "decrease")
            callbacks.current.onCount(Math.max(2, callbacks.current.count - 1) as PlayerCount);
          if (action === "increase")
            callbacks.current.onCount(Math.min(6, callbacks.current.count + 1) as PlayerCount);
          if (action === "rematch") callbacks.current.onRematch();
        },
        level,
        (result) => callbacks.current.onComplete(result),
      );
      session.current = game;
      return () => {
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
    session.current?.configure(settings);
  }, [settings]);
  const mode =
    settingsOpen || (snapshot.started && snapshot.paused && snapshot.state.phase !== "finished")
      ? "paused"
      : null;
  return (
    <>
      <div className="viewport" ref={container} />
      {!snapshot.started && !unavailable && (
        <div className="title-display">
          <MobileDisplay />
        </div>
      )}
      {snapshot.started && !snapshot.paused && snapshot.state.phase !== "finished" && (
        <button className="touch-pause" onClick={() => session.current?.pause()} aria-label="Pause">
          Ⅱ
        </button>
      )}
      <AccessibleStatus snapshot={snapshot} humanSeat={humanSeat} />
      {!snapshot.started && !unavailable && (
        <p className="touch-hint">Drag to steer · Tap to serve</p>
      )}
      {unavailable ? (
        <div className="game-overlay">
          <p role="status">WebGL2 is needed to render the arena.</p>
        </div>
      ) : (
        mode && (
          <PauseMenu
            count={count}
            onCount={onCount}
            state={snapshot.state}
            totals={snapshot.totals}
            seed={seed}
            initialSettings={snapshot.initialSettings ?? settings}
            level={snapshot.level}
            humanSeat={humanSeat}
            settings={settings}
            musicStatus={snapshot.music.status}
            onSettings={onSettings}
            onSeat={onSeat}
            onRestart={onRestart}
            onResume={() => {
              setSettingsOpen(false);
              session.current?.resume();
            }}
          />
        )
      )}
    </>
  );
}
