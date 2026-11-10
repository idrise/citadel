import { BufferGeometry, Float32BufferAttribute, Line, LineBasicMaterial } from "three";
import { ARENA } from "../simulation/arena";
import { serveDirection } from "../simulation/aim";
import { alive, type MatchState } from "../simulation/types";
import { paddleReturn, sweepPaddle, sweepWalls } from "../simulation/collision";
import { add, dot, normalise, scale, sub, type Vec2 } from "../simulation/vector";
import { createEffects } from "./effects";
import { createBallView } from "./ball-view";
import { createFloorReflection } from "./floor-reflection";
import { createStage } from "./stage";

export interface ViewOptions {
  preview: boolean;
  reducedEffects: boolean;
  humanSeat: number;
}
export function createArenaView(humanSeat = 0) {
  const stage = createStage(humanSeat);
  const reflection = createFloorReflection();
  stage.root.add(reflection.mesh);
  const balls = createBallView(stage.root);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(9), 3));
  const preview = new Line(
    geometry,
    new LineBasicMaterial({ color: 0xb6eafa, transparent: true, opacity: 0.65 }),
  );
  preview.frustumCulled = false;
  stage.root.add(preview);
  const effects = createEffects(stage.root);
  const showGuide = (start: Vec2, direction: Vec2, distance: number) => {
    const wall = sweepWalls(start, direction, distance).sort((a, b) => a.time - b.time)[0];
    const bend = add(start, scale(direction, wall?.time ?? distance));
    const reflected = wall
      ? sub(direction, scale(wall.normal, 2 * dot(direction, wall.normal)))
      : direction;
    const end = wall ? add(bend, scale(reflected, Math.min(3, distance - wall.time))) : bend;
    const attribute = geometry.getAttribute("position");
    attribute.setXYZ(0, start.x, 0.65, start.y);
    attribute.setXYZ(1, bend.x, 0.65, bend.y);
    attribute.setXYZ(2, end.x, 0.65, end.y);
    attribute.needsUpdate = true;
    preview.visible = true;
  };
  let lastEvent = -1;
  return {
    root: stage.root,
    dispose: () => reflection.dispose(),
    update(state: MatchState, dt: number, options: ViewOptions) {
      reflection.mesh.visible = !options.reducedEffects;
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
        showGuide(ownServe.position, serveDirection(defender.id, defender.angle), 12);
        return;
      }
      if (!options.preview) return;
      const imminent = state.balls
        .flatMap((ball) => {
          if (ball.phase !== "active") return [];
          const hit = sweepPaddle(
            ball.position,
            ball.velocity,
            defender.id,
            defender.angle,
            0,
            0.45,
          );
          if (!hit || sweepWalls(ball.position, ball.velocity, hit.time).length) return [];
          return [{ ball, hit }];
        })
        .sort((a, b) => a.hit.time - b.hit.time)[0];
      if (!imminent) return;
      const { ball, hit } = imminent;
      const point = add(ball.position, scale(ball.velocity, hit.time));
      const outgoing = normalise(paddleReturn(ball.velocity, hit.offset, hit.normal));
      showGuide(point, outgoing, 3);
    },
  };
}
