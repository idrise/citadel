import { useEffect, useRef, useState } from "react";
import { createSession, type GameSession, type SessionSnapshot } from "../session/session";
import { SEATS } from "../rendering/palette";
import { createMatch } from "../simulation/match";
import { GameMenu } from "./GameMenu";
import { AccessibleStatus } from "./AccessibleStatus";
import type { GameSettings } from "../session/settings";

export function GamePanel({
  humanSeat,
  seed,
  onRematch,
  onRestart,
  onSeat,
  settings,
  onSettings,
}: {
  humanSeat: number;
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
  const [snapshot, setSnapshot] = useState<SessionSnapshot>(() => ({
    state: createMatch(seed),
    paused: true,
    started: false,
    notice: "",
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
      const game = createSession(container.current, seed, humanSeat, setSnapshot);
      session.current = game;
      return () => {
        game.dispose();
        session.current = null;
      };
    } catch {
      setUnavailable(true);
    }
  }, [seed, humanSeat]);
  useEffect(() => {
    session.current?.configure(settings);
  }, [settings]);
  const mode = !snapshot.started
    ? "start"
    : snapshot.state.phase === "finished"
      ? "result"
      : snapshot.paused
        ? "paused"
        : null;
  const winner =
    snapshot.state.winner === humanSeat
      ? "You survived."
      : `${snapshot.state.winner === null ? "Nobody" : SEATS[snapshot.state.winner]!.name} wins.`;
  return (
    <>
      <div className="viewport" ref={container} />
      <AccessibleStatus snapshot={snapshot} humanSeat={humanSeat} />
      {unavailable ? (
        <div className="game-overlay">
          <p role="status">WebGL2 is needed to render the arena.</p>
        </div>
      ) : (
        mode && (
          <GameMenu
            mode={mode}
            winner={winner}
            humanSeat={humanSeat}
            settings={settings}
            musicStatus={snapshot.music.status}
            onSettings={onSettings}
            onSeat={onSeat}
            onRestart={mode === "result" ? onRematch : onRestart}
            onPlay={() => (mode === "start" ? session.current?.start() : session.current?.resume())}
          />
        )
      )}
    </>
  );
}
