import { GameHelp } from "./GameHelp";
import { ExportRound } from "./ExportRound";
import type { RoundTotals } from "../session/round-observer";
import type { MatchState } from "../simulation/types";
import type { PlayerCount } from "../simulation/arena";
import { RoundReport } from "./RoundReport";
import type { GameSettings as Settings } from "../session/settings";
import { SEATS } from "../rendering/palette";
import { Experiments } from "./Experiments";
import { useEffect, useState } from "react";
import { MusicSettings } from "./MusicSettings";
import type { MusicStatus } from "../audio/ports";

export function GameMenu({
  mode,
  count,
  onCount,
  state,
  totals,
  seed,
  initialSettings,
  winner,
  humanSeat,
  settings,
  onSettings,
  onSeat,
  onPlay,
  onRestart,
  musicStatus,
}: {
  count: PlayerCount;
  onCount: (count: PlayerCount) => void;
  state: MatchState;
  totals: RoundTotals;
  seed: number;
  initialSettings: Settings;
  mode: "start" | "paused" | "result";
  winner: string;
  humanSeat: number;
  settings: Settings;
  onSettings: (value: Settings) => void;
  onSeat: (seat: number) => void;
  onPlay: () => void;
  onRestart: () => void;
  musicStatus: MusicStatus;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (mode !== "paused") return;
    const toggle = (event: KeyboardEvent) => {
      if (event.code === "KeyH" && !event.repeat) {
        event.preventDefault();
        setHidden((value) => !value);
      }
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, [mode]);
  if (mode === "paused" && hidden) return null;
  return (
    <div className="game-overlay" data-mode={mode}>
      <div className="menu-panel">
        {mode === "start" && (
          <div className="menu-brand">
            <p className="menu-kicker">Solo arena</p>
            <h2>
              NEON <strong>CITADEL</strong>
            </h2>
            <p>Defend eight pieces. Last fortress standing wins.</p>
          </div>
        )}
        {mode === "paused" && <h2>Paused</h2>}
        {mode === "result" && <h2>{winner}</h2>}
        {mode === "start" && (
          <label className="players-choice">
            Players{" "}
            <select
              aria-label="Players"
              value={count}
              onChange={(event) => onCount(Number(event.target.value) as PlayerCount)}
            >
              {([2, 3, 4, 5, 6] as const).map((value) => (
                <option key={value} value={value}>
                  {value} · you + {value - 1} {value === 2 ? "bot" : "bots"}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="primary" onClick={mode === "result" ? onRestart : onPlay}>
          {mode === "start" ? "Play" : mode === "paused" ? "Resume" : "Rematch"}
        </button>
        {mode === "paused" && (
          <button className="secondary" onClick={onRestart}>
            Restart
          </button>
        )}
        {mode === "result" && <RoundReport state={state} humanSeat={humanSeat} totals={totals} />}
        <details className="settings-menu">
          <summary>Settings</summary>
          <p className="menu-hint">Changing players or fortress starts a new round.</p>
          {mode !== "start" && (
            <label>
              Players{" "}
              <select
                aria-label="Players"
                value={count}
                onChange={(event) => onCount(Number(event.target.value) as PlayerCount)}
              >
                {([2, 3, 4, 5, 6] as const).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Bot difficulty{" "}
            <select
              aria-label="Bot difficulty"
              value={settings.botDifficulty}
              onChange={(event) =>
                onSettings({
                  ...settings,
                  botDifficulty: event.target.value as Settings["botDifficulty"],
                })
              }
            >
              {["beginner", "standard", "expert"].map((value) => (
                <option key={value} value={value}>
                  {value[0]!.toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Your fortress{" "}
            <select
              aria-label="Your fortress"
              value={humanSeat}
              onChange={(event) => onSeat(Number(event.target.value))}
            >
              {SEATS.slice(0, count).map((seat, id) => (
                <option value={id} key={id}>
                  {seat.mark} {seat.name}
                </option>
              ))}
            </select>
          </label>
          <Experiments value={settings} onChange={onSettings} />
          <MusicSettings value={settings} onChange={onSettings} status={musicStatus} />
        </details>
        {mode === "paused" && (
          <details className="round-report">
            <summary>Round statistics</summary>
            <RoundReport state={state} humanSeat={humanSeat} totals={totals} />
          </details>
        )}
        {mode !== "start" && (
          <ExportRound
            state={state}
            totals={totals}
            seed={seed}
            humanSeat={humanSeat}
            settings={settings}
            initialSettings={initialSettings}
          />
        )}
        <GameHelp />
        {mode === "paused" && (
          <button className="hide-controls" aria-keyshortcuts="H" onClick={() => setHidden(true)}>
            Hide controls (H)
          </button>
        )}
      </div>
    </div>
  );
}
