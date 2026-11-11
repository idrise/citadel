import type { RoundTotals } from "../session/round-observer";
import type { MatchState } from "../simulation/types";
import { SEATS } from "../rendering/palette";
import { standings } from "../simulation/standings";

/** Results and diagnostics stay in menus, leaving the live canvas clear. */
export function RoundReport({
  state,
  humanSeat,
  totals,
}: {
  state: MatchState;
  humanSeat: number;
  totals: RoundTotals;
}) {
  const out = state.eliminations.find((entry) => entry.seat === humanSeat);
  return (
    <div className="round-report">
      <p>
        {state.elapsed.toFixed(1)} seconds · Your returns: {totals.players[humanSeat]!.returns} ·
        Rival pieces broken: {totals.players[humanSeat]!.scored}
      </p>
      {out && <p>Your fortress fell at {out.elapsed.toFixed(1)}s.</p>}
      <table aria-label="Round standings">
        <thead>
          <tr>
            <th>Place</th>
            <th>Fortress</th>
            <th>Pieces</th>
          </tr>
        </thead>
        <tbody>
          {standings(state).map((entry) => (
            <tr key={entry.seat}>
              <td>{entry.place ?? "—"}</td>
              <td>
                {SEATS[entry.seat]!.mark} {SEATS[entry.seat]!.name}
                {entry.seat === humanSeat ? " (you)" : ""}
              </td>
              <td>{entry.health}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details>
        <summary>Developer statistics</summary>
        <p>
          Tick {state.tick} · RNG {state.rng} · {state.stats.damage} pieces lost ·{" "}
          {state.stats.collisionCaps} collision caps ·{" "}
          {state.morph
            ? `${state.morph.elapsed.toFixed(1)} / ${state.morph.duration.toFixed(1)}s morph`
            : "arena settled"}
        </p>
      </details>
    </div>
  );
}
