import { ARENA } from "../simulation/arena";
import { serveDirection } from "../simulation/aim";
import { alive, type MatchState } from "../simulation/types";
import { predictReturn, traceAimGuide } from "../simulation/return-preview";
import { createEffects } from "./effects";
import { createBallView } from "./ball-view";
import { createArenaReflections } from "./arena-reflections";
import { createStage } from "./stage";
import { createAimGuide } from "./aim-guide";

export interface ViewOptions {
  preview: boolean;
  slowdown: boolean;
  reducedEffects: boolean;
  humanSeat: number;
  musicPulse?: number;
  musicWave?: number;
}
export function createArenaView(humanSeat = 0) {
  const stage = createStage(humanSeat);
  const reflection = createArenaReflections(humanSeat);
  stage.root.add(...reflection.meshes);
  const balls = createBallView(stage.root);
  const guide = createAimGuide(stage.root);
  const effects = createEffects(stage.root);
  let lastEvent = -1;
  return {
    root: stage.root,
    dispose: () => reflection.dispose(),
    update(state: MatchState, dt: number, options: ViewOptions) {
      reflection.setReduced(options.reducedEffects);
      state.players.forEach((player) => {
        const paddle = stage.paddles[player.id]!;
        paddle.rotation.y = -player.angle;
        paddle.visible = alive(player);
        stage.health[player.id]!.forEach((piece, index) => {
          piece.visible = Boolean(player.health[index]);
          const body = player.pieces[index]!;
          piece.position.set(body.position.x, 0, body.position.y);
          piece.scale.setScalar(body.radius / ARENA.pieceRadius);
        });
      });
      for (const event of state.events) {
        if (event.id <= lastEvent) continue;
        effects.emit(event, options.reducedEffects);
        lastEvent = event.id;
      }
      effects.update(dt, options.reducedEffects, state);
      balls.update(state, options.reducedEffects);
      guide.hide();
      const defender = state.players[options.humanSeat];
      if (!defender || !alive(defender)) return;
      const ownServe = state.balls.find(
        (ball) => ball.phase === "ready" && ball.seat === defender.id,
      );
      if (ownServe) {
        const points = traceAimGuide(
          state,
          ownServe.position,
          serveDirection(defender.id, defender.angle),
          12,
          defender.id,
        );
        guide.show(points, [points[1]!]);
        return;
      }
      if (!options.preview) return;
      const imminent = predictReturn(state, defender.id, options.slowdown);
      if (!imminent) return;
      guide.show(imminent.points, imminent.impacts);
    },
  };
}
