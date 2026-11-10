import { SEATS } from "../rendering/palette";
import type { SessionSnapshot } from "../session/session";
import { alive } from "../simulation/types";

export function MatchHud({
  snapshot,
  humanSeat,
}: {
  snapshot: SessionSnapshot;
  humanSeat: number;
}) {
  return (
    <div className="scoreboard" aria-label="Fortress health">
      {snapshot.state.players.map((player) => {
        const seat = SEATS[player.id]!;
        const health = player.health.filter(Boolean).length;
        return (
          <div
            className={`score-card ${player.id === humanSeat ? "your-seat" : ""} ${alive(player) ? "" : "eliminated"}`}
            key={player.id}
            style={{ "--seat-colour": seat.css } as React.CSSProperties}
          >
            <div className="seat-name">
              <span aria-hidden="true">{seat.mark}</span> {seat.name}{" "}
              <small>{player.id === humanSeat ? "YOU" : "BOT"}</small>
            </div>
            <div className="health-pieces" aria-label={`${seat.name}: ${health} of 8 pieces`}>
              {player.health.map((intact, index) => (
                <span className={intact ? "intact" : "lost"} key={index} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
