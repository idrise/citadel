import type { SessionSnapshot } from "../session/session";
import { SEATS } from "../rendering/palette";

/** Status remains available to assistive technology without painting a HUD over the arena. */
export function AccessibleStatus({
  snapshot,
  humanSeat,
}: {
  snapshot: SessionSnapshot;
  humanSeat: number;
}) {
  const { state } = snapshot;
  return (
    <div className="sr-only" aria-live="off">
      <p id="game-controls">
        Relative mouse steers. Click or Space serves. A/D or arrows also steer. Escape releases the
        mouse and pauses.
      </p>
      <output aria-label="Round phase">{state.phase}</output>
      <output aria-label="Balls in play">{state.balls.length}</output>
      <output aria-label="Music status">{snapshot.music.status}</output>
      <output aria-label="Music section">{snapshot.music.section}</output>
      <output aria-label="Music layers">{snapshot.music.layers}</output>
      <output aria-label="Melody notes">{snapshot.music.notes}</output>
      <output aria-label="Bat angle">
        {((state.players[humanSeat]!.angle * 180) / Math.PI).toFixed(1)}
      </output>
      <p className="diagnostics">
        Seed {state.rng} · {state.elapsed.toFixed(1)}s · {state.stats.paddleHits} returns ·{" "}
        {state.stats.damage} pieces lost · {state.stats.collisionCaps} collision caps
      </p>
      {state.players.map((player) => (
        <output key={player.id} aria-label={`${SEATS[player.id]!.name} health`}>
          {player.health.filter(Boolean).length}
        </output>
      ))}
    </div>
  );
}
