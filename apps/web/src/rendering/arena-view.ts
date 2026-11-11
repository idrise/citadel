import { BufferGeometry, Float32BufferAttribute, Line, LineDashedMaterial } from "three";
import { ARENA } from "../simulation/arena";
import { serveDirection } from "../simulation/aim";
import { alive, type MatchState } from "../simulation/types";
import { predictReturn, traceAimGuide } from "../simulation/return-preview";
import { type Vec2 } from "../simulation/vector";
import { createEffects } from "./effects";
import { createBallView } from "./ball-view";
import { createArenaReflections } from "./arena-reflections";
import { createStage } from "./stage";

export interface ViewOptions {
  preview: boolean;
  slowdown: boolean;
  reducedEffects: boolean;
  humanSeat: number;
}
export function createArenaView(humanSeat = 0) {
  const stage = createStage(humanSeat);
  const reflection = createArenaReflections(humanSeat);
  stage.root.add(...reflection.meshes);
  const balls = createBallView(stage.root);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(9), 3));
  const preview = new Line(
    geometry,
    new LineDashedMaterial({
      color: 0xb6eafa,
      transparent: true,
      opacity: 0.65,
      dashSize: 0.18,
      gapSize: 0.12,
    }),
  );
  preview.frustumCulled = false;
  stage.root.add(preview);
  const effects = createEffects(stage.root);
  const showGuide = (
    state: MatchState,
    seat: number,
    start: Vec2,
    direction: Vec2,
    distance: number,
  ) => {
    const points = traceAimGuide(state, start, direction, distance, seat);
    const attribute = geometry.getAttribute("position");
    points.forEach((point, index) => attribute.setXYZ(index, point.x, 0.65, point.y));
    attribute.needsUpdate = true;
    preview.computeLineDistances();
    preview.visible = true;
  };
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
      effects.update(dt);
      balls.update(state, options.reducedEffects);
      preview.visible = false;
      const defender = state.players[options.humanSeat];
      if (!defender || !alive(defender)) return;
      const ownServe = state.balls.find(
        (ball) => ball.phase === "ready" && ball.seat === defender.id,
      );
      if (ownServe) {
        showGuide(
          state,
          defender.id,
          ownServe.position,
          serveDirection(defender.id, defender.angle),
          12,
        );
        return;
      }
      if (!options.preview) return;
      const imminent = predictReturn(state, defender.id, options.slowdown);
      if (!imminent) return;
      showGuide(state, defender.id, imminent.contact, imminent.outgoing, 3);
    },
  };
}
