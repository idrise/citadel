import { useEffect, useState } from "react";
import { GameHelp } from "./GameHelp";
import { MobileDisplay } from "./MobileDisplay";
import { ExportRound } from "./ExportRound";
import { RoundReport } from "./RoundReport";
import { Experiments } from "./Experiments";
import { MusicSettings } from "./MusicSettings";
import { SEATS } from "../rendering/palette";
import type { RoundTotals } from "../session/round-observer";
import type { MatchState } from "../simulation/types";
import type { PlayerCount } from "../simulation/arena";
import type { GameSettings } from "../session/settings";
import type { MusicStatus } from "../audio/ports";

/** Advanced controls appear only when explicitly paused; title and results live in Three.js. */
export function PauseMenu({
  count,
  onCount,
  state,
  totals,
  seed,
  initialSettings,
  level,
  humanSeat,
  settings,
  onSettings,
  onSeat,
  onResume,
  onRestart,
  musicStatus,
}: {
  count: PlayerCount;
  onCount: (count: PlayerCount) => void;
  state: MatchState;
  totals: RoundTotals;
  seed: number;
  initialSettings: GameSettings;
  level: number;
  humanSeat: number;
  settings: GameSettings;
  onSettings: (settings: GameSettings) => void;
  onSeat: (seat: number) => void;
  onResume: () => void;
  onRestart: () => void;
  musicStatus: MusicStatus;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.code === "KeyH" && !event.repeat) {
        event.preventDefault();
        setHidden((value) => !value);
      }
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, []);
  if (hidden) return null;
  return (
    <div className="game-overlay" data-mode="paused">
      <div className="menu-panel">
        <h2>Paused</h2>
        <button className="primary" onClick={onResume}>
          Resume
        </button>
        <button className="secondary" onClick={onRestart}>
          {state.players[humanSeat]!.health.some(Boolean) ? "Restart" : "Play again"}
        </button>
        {!state.players[humanSeat]!.health.some(Boolean) && (
          <p>Your result is saved. Play again at your adjusted level, or resume to watch.</p>
        )}
        <MobileDisplay />
        <details className="settings-menu">
          <summary>Settings</summary>
          <p className="menu-hint">Changing players or fortress starts a new round.</p>
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
          <p>Level {level} of 100 · Difficulty adjusts between rounds.</p>
          <label>
            Your fortress{" "}
            <select
              aria-label="Your fortress"
              value={humanSeat}
              onChange={(event) => onSeat(Number(event.target.value))}
            >
              {SEATS.slice(0, count).map((seat, id) => (
                <option key={id} value={id}>
                  {seat.mark} {seat.name}
                </option>
              ))}
            </select>
          </label>
          <Experiments value={settings} onChange={onSettings} />
          <MusicSettings value={settings} onChange={onSettings} status={musicStatus} />
        </details>
        <details className="round-report">
          <summary>Round statistics</summary>
          <RoundReport state={state} humanSeat={humanSeat} totals={totals} />
        </details>
        <ExportRound
          state={state}
          totals={totals}
          seed={seed}
          humanSeat={humanSeat}
          settings={settings}
          initialSettings={initialSettings}
          level={level}
        />
        <GameHelp />
        <button className="hide-controls" aria-keyshortcuts="H" onClick={() => setHidden(true)}>
          Hide controls (H)
        </button>
      </div>
    </div>
  );
}
