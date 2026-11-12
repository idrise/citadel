import { useState } from "react";
import { createRoundExport, downloadRound } from "../session/round-export";
import { BUILD_INFO } from "./build-info";
import type { MatchState } from "../simulation/types";
import type { GameSettings } from "../session/settings";
import type { RoundTotals } from "../session/round-observer";
export function ExportRound({
  state,
  totals,
  seed,
  humanSeat,
  settings,
  initialSettings,
  level,
}: {
  state: MatchState;
  totals: RoundTotals;
  seed: number;
  humanSeat: number;
  settings: GameSettings;
  initialSettings: GameSettings;
  level: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <>
      <button
        className="export-round"
        onClick={() => {
          try {
            downloadRound(
              createRoundExport(
                { seed, humanSeat, settings, initialSettings, level, build: BUILD_INFO },
                state,
                totals,
              ),
            );
            setFailed(false);
          } catch {
            setFailed(true);
          }
        }}
      >
        Export round
      </button>
      {failed && <p role="status">The download could not be started. Try again in this browser.</p>}
    </>
  );
}
