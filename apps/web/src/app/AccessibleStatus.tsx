import { levelHighlights, lossMessage } from "../session/level-briefing";
import { clampPaddleAngle, fortress } from "../simulation/arena";
import { SUPPLIES } from "../simulation/supplies";
import { VICTORY_HOLD_SECONDS } from "../rendering/victory-morph";
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
  const home = fortress(humanSeat, state.arena);
  return (
    <div className="sr-only" aria-live="off">
      <p id="game-controls">
        Relative mouse steers. Click or Space serves. A/D or arrows also steer. Escape releases the
        mouse and pauses. On touch screens, drag left or right to steer and tap to serve.
      </p>
      {snapshot.started &&
        state.phase !== "finished" &&
        !state.players[humanSeat]!.health.some(Boolean) && (
          <output aria-label="Elimination result" aria-live="polite">
            Fortress lost. Back to title or retry.
          </output>
        )}
      <output aria-label="Progress update" aria-live="polite">
        {snapshot.demotion
          ? `Demoted to level ${snapshot.demotion.to} after three consecutive losses.`
          : ""}
      </output>
      <output aria-label="Round ball limit">{state.difficulty?.maxBalls ?? 4}</output>
      <output aria-label="Round ball speed">
        {(state.difficulty?.ballSpeed ?? 24).toFixed(2)}
      </output>
      <output aria-label="Round pickup budget">{state.difficulty?.pickupCount ?? 7}</output>
      <output aria-label="Round bat scale">{(state.difficulty?.batScale ?? 1).toFixed(2)}</output>
      <output aria-label="Debug mode">
        {snapshot.debug ? "Debug - progress not saved" : "Off"}
      </output>
      <output aria-label="Ball guide">
        {snapshot.serveGuide ? "Serve direction only" : "Off"}
      </output>
      <output aria-label="Round level">{snapshot.level}</output>
      {snapshot.started && snapshot.state.phase === "countdown" && (
        <>
          <output aria-label="Introduction remaining">{state.countdown.toFixed(3)}</output>
          <output aria-label="Introduction duration">{snapshot.introDuration.toFixed(2)}</output>
          <output aria-label="Level introduction" aria-live="polite">
            Level {snapshot.level}
          </output>
          <output aria-label="Level changes">
            {levelHighlights(snapshot.level, snapshot.previousLevel).join(". ")}
          </output>
          <output aria-label="Loss consequence" aria-live="polite">
            {snapshot.debug
              ? "DEBUG - PROGRESS NOT SAVED"
              : lossMessage(snapshot.level, snapshot.lossLevel)}
          </output>
        </>
      )}
      <output aria-label="Arena preview">{snapshot.titleMoving ? "moving" : "settled"}</output>
      <output aria-label="Round phase">{state.phase}</output>
      <output aria-label="Round winner" aria-live="polite">
        {state.phase === "finished"
          ? state.winner === humanSeat
            ? "You win"
            : `${state.winner === null ? "Nobody" : SEATS[state.winner]!.name} wins`
          : ""}
      </output>
      <output aria-label="Round presentation">
        {!snapshot.started
          ? "title"
          : state.phase === "finished"
            ? snapshot.endingTime < VICTORY_HOLD_SECONDS
              ? "celebrating"
              : "result"
            : snapshot.paused
              ? "paused"
              : "playing"}
      </output>
      {state.balls.map((ball) => (
        <output key={ball.id} aria-label={`Ball ${ball.id} owner`}>
          {SEATS[ball.phase === "ready" ? ball.seat : (snapshot.ballOwners.get(ball.id) ?? -1)]
            ?.name ?? "Unclaimed"}
        </output>
      ))}
      {state.balls.map((ball) => (
        <output key={`phase-${ball.id}`} aria-label={`Ball ${ball.id} phase`}>
          {ball.phase}
        </output>
      ))}
      {state.balls.map((ball) => (
        <span key={`flight-${ball.id}`}>
          <output aria-label={`Ball ${ball.id} speed`}>
            {Math.hypot(ball.velocity.x, ball.velocity.y).toFixed(2)}
          </output>
          <output aria-label={`Ball ${ball.id} rally time`}>
            {(ball.rallyTime ?? 0).toFixed(2)}
          </output>
        </span>
      ))}
      <output aria-label="Arena players">{state.arena.count}</output>
      <output aria-label="Arena transition">{state.morph ? "moving" : "settled"}</output>
      <output aria-label="Survivors">
        {state.players.filter((player) => player.health.some(Boolean)).length}
      </output>
      <output aria-label="Your pieces broken">{snapshot.totals.players[humanSeat]!.scored}</output>
      <output aria-label="Your returns">{snapshot.totals.players[humanSeat]!.returns}</output>
      {state.balls.map((ball) => (
        <output key={`spin-${ball.id}`} aria-label={`Ball ${ball.id} spin`}>
          {(ball.spin ?? 0).toFixed(3)}
        </output>
      ))}
      <output aria-label="Supply containers">{state.supplies.length}</output>
      <output aria-label="Supply phase">
        {state.difficulty?.pickupCount === 0
          ? "unavailable"
          : state.elapsed < SUPPLIES.cutoff
            ? "supplying"
            : "final stretch"}
      </output>
      <output aria-label="Balls in play">{state.balls.length}</output>
      <output aria-label="Music status">{snapshot.music.status}</output>
      <output aria-label="Music section">{snapshot.music.section}</output>
      <output aria-label="Music layers">{snapshot.music.layers}</output>
      <output aria-label="Melody notes">{snapshot.music.notes}</output>
      <output aria-label="Bat minimum angle">
        {(
          (clampPaddleAngle(humanSeat, home.direction - Math.PI / 2, state.arena) * 180) /
          Math.PI
        ).toFixed(1)}
      </output>
      <output aria-label="Bat maximum angle">
        {(
          (clampPaddleAngle(humanSeat, home.direction + Math.PI / 2, state.arena) * 180) /
          Math.PI
        ).toFixed(1)}
      </output>
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
