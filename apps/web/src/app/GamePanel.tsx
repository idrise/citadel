import { createRoundObserver } from "../session/round-observer";
import type { PlayerCount } from "../simulation/arena";
import { useEffect, useRef, useState } from "react";
import { createSession, type GameSession, type SessionSnapshot } from "../session/session";
import { createMatch } from "../simulation/match";
import { PauseMenu } from "./PauseMenu";
import { AccessibleStatus } from "./AccessibleStatus";
import type { GameSettings } from "../session/settings";

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
}: {
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
  const callbacks = useRef({ onCount, onRematch });
  callbacks.current = { onCount, onRematch };
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => ({
    state: createMatch(seed, count),
    paused: true,
    started: false,
    notice: "",
    totals: createRoundObserver(count).snapshot(),
    initialSettings: null,
    endingTime: 0,
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
      const game = createSession(
        container.current,
        seed,
        humanSeat,
        setSnapshot,
        count,
        (action) => {
          if (action === "options") setSettingsOpen(true);
          if (action === "decrease")
            callbacks.current.onCount(Math.max(2, count - 1) as PlayerCount);
          if (action === "increase")
            callbacks.current.onCount(Math.min(6, count + 1) as PlayerCount);
          if (action === "rematch") callbacks.current.onRematch();
        },
      );
      session.current = game;
      return () => {
        game.dispose();
        session.current = null;
      };
    } catch {
      setUnavailable(true);
    }
  }, [seed, humanSeat, count]);
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
      {snapshot.started && !snapshot.paused && snapshot.state.phase !== "finished" && (
        <button className="touch-pause" onClick={() => session.current?.pause()} aria-label="Pause">
          Ⅱ
        </button>
      )}
      <AccessibleStatus snapshot={snapshot} humanSeat={humanSeat} />
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
