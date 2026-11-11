import { useEffect, useRef, useState } from "react";
import {
  createSession,
  type Experiments as Settings,
  type GameSession,
  type SessionSnapshot,
} from "../session/session";
import { SEATS } from "../rendering/palette";
import { createMatch } from "../simulation/match";
import { GameMenu } from "./GameMenu";
import { AccessibleStatus } from "./AccessibleStatus";

export function GamePanel({
  humanSeat,
  seed,
  onRematch,
  onSeat,
}: {
  humanSeat: number;
  seed: number;
  onRematch: () => void;
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
  }));
  const [settings, setSettings] = useState<Settings>(() => ({
    preview: false,
    slowdown: false,
    reducedEffects: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    serveTimeout: 1.8,
    ballInterval: 15,
    maxBalls: 4,
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
            onSettings={setSettings}
            onSeat={onSeat}
            onRestart={onRematch}
            onPlay={() => (mode === "start" ? session.current?.start() : session.current?.resume())}
          />
        )
      )}
    </>
  );
}
