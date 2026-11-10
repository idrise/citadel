import { useEffect, useRef, useState } from "react";
import {
  createSession,
  type Experiments as Settings,
  type GameSession,
  type SessionSnapshot,
} from "../session/session";
import { SEATS } from "../rendering/palette";
import { createMatch } from "../simulation/match";
import { alive } from "../simulation/types";
import { MatchHud } from "./MatchHud";
import { Experiments } from "./Experiments";

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
  const state = snapshot.state;
  const lost = !alive(state.players[humanSeat]!);
  const ball =
    state.balls.find((candidate) => candidate.phase === "ready" && candidate.seat === humanSeat) ??
    state.balls[0];
  const ready = state.phase === "playing" && ball?.phase === "ready";
  const winner = state.winner !== null ? SEATS[state.winner]!.name : "Nobody";
  return (
    <>
      <MatchHud snapshot={snapshot} humanSeat={humanSeat} />
      <div className="pressure-bar">
        <span>
          {state.balls.length} {state.balls.length === 1 ? "BALL" : "BALLS"}
        </span>
        <span>
          {state.phase === "finished"
            ? "ROUND OVER"
            : state.balls.length < settings.maxBalls
              ? `NEXT BALL IN ${Math.max(0, settings.ballInterval * state.balls.length - state.elapsed).toFixed(0)}s`
              : "FULL PRESSURE"}
        </span>
      </div>
      <div className="arena-preview">
        <div className="viewport" ref={container} />
        {unavailable ? (
          <div className="game-overlay">
            <p role="status">
              The arena needs WebGL2. Try a browser with graphics acceleration enabled.
            </p>
          </div>
        ) : !snapshot.started ? (
          <div className="game-overlay">
            <div className="overlay-card">
              <p className="eyebrow">One human · Three bots</p>
              <h2>Your fortress. Your last stand.</h2>
              <p>Block incoming balls. Break their pieces. Lose one? Take the revenge serve.</p>
              <label>
                Your fortress{" "}
                <select
                  aria-label="Your fortress"
                  value={humanSeat}
                  onChange={(event) => onSeat(Number(event.target.value))}
                >
                  {SEATS.map((seat, id) => (
                    <option value={id} key={id}>
                      {seat.mark} {seat.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="primary" onClick={() => session.current?.start()}>
                Play vs Bots
              </button>
            </div>
          </div>
        ) : state.phase === "finished" ? (
          <div className="game-overlay">
            <div className="overlay-card">
              <p className="eyebrow">Last fortress standing</p>
              <h2>{state.winner === humanSeat ? "You survived." : `${winner} wins.`}</h2>
              <p>
                {state.elapsed.toFixed(0)} seconds · {state.stats.paddleHits} returns
              </p>
              <button className="primary" onClick={onRematch}>
                Rematch
              </button>
            </div>
          </div>
        ) : snapshot.paused ? (
          <div className="game-overlay">
            <div className="overlay-card">
              <h2>Paused</h2>
              <p>Take a breath. The whole arena is paused.</p>
              <button className="primary" onClick={() => session.current?.resume()}>
                Resume
              </button>
            </div>
          </div>
        ) : state.phase === "countdown" ? (
          <div className="countdown" aria-live="polite">
            {Math.ceil(state.countdown)}
          </div>
        ) : null}
        {snapshot.started && lost && state.phase !== "finished" && !snapshot.paused && (
          <div className="elimination-banner">
            <span>Your fortress fell. Watch the finish or try again.</span>
            <button onClick={onRematch}>Rematch now</button>
          </div>
        )}
      </div>
      <div className="round-bar">
        <p aria-live="polite" className="round-notice">
          {ready
            ? `${SEATS[ball.seat]!.name}${ball.seat === humanSeat ? ": click or press Space to serve" : " is serving"} · auto ${Math.max(0, settings.serveTimeout - ball.age).toFixed(1)}s`
            : snapshot.notice}
        </p>
        {snapshot.started && state.phase !== "finished" && (
          <div className="round-actions">
            <button
              onClick={() =>
                snapshot.paused ? session.current?.resume() : session.current?.pause()
              }
            >
              {snapshot.paused ? "Resume round" : "Pause"}
            </button>
            <button onClick={onRematch}>Restart</button>
          </div>
        )}
      </div>
      <p id="game-controls" className="controls-hint">
        Mouse moves your paddle · Click to serve · A/D or ←/→ steer · Space serves · Esc/P pauses
      </p>
      <p className="fine-print">
        Use either end of your arc to aim a bank shot off the wall beside your bat. The serve guide
        shows the first wall rebound.
      </p>
      <Experiments
        value={settings}
        onChange={setSettings}
        elapsed={state.elapsed}
        hits={state.stats.paddleHits}
        damage={state.stats.damage}
        caps={state.stats.collisionCaps}
        seed={seed}
        paddleAngle={state.players[humanSeat]!.angle}
      />
    </>
  );
}
