import type { Experiments as Settings } from "../session/session";
import { SEATS } from "../rendering/palette";
import { Experiments } from "./Experiments";

export function GameMenu({
  mode,
  winner,
  humanSeat,
  settings,
  onSettings,
  onSeat,
  onPlay,
  onRestart,
}: {
  mode: "start" | "paused" | "result";
  winner: string;
  humanSeat: number;
  settings: Settings;
  onSettings: (value: Settings) => void;
  onSeat: (seat: number) => void;
  onPlay: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="game-overlay">
      <div className="menu-panel">
        {mode === "paused" && <h2>Paused</h2>}
        {mode === "result" && <h2>{winner}</h2>}
        <button className="primary" onClick={mode === "result" ? onRestart : onPlay}>
          {mode === "start" ? "Play" : mode === "paused" ? "Resume" : "Rematch"}
        </button>
        {mode === "paused" && (
          <button className="secondary" onClick={onRestart}>
            Restart
          </button>
        )}
        <details className="settings-menu">
          <summary>Settings</summary>
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
          <Experiments value={settings} onChange={onSettings} />
        </details>
      </div>
    </div>
  );
}
