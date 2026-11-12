import { ARENA, SQUARE_ARENA, fortress, type ArenaGeometry } from "../simulation/arena";
import { serveDirection } from "../simulation/aim";
import { alive, type MatchState } from "../simulation/types";
import { predictReturn, traceAimGuide } from "../simulation/return-preview";
import { createEffects } from "./effects";
import { createBallView } from "./ball-view";
import { createArenaReflections } from "./arena-reflections";
import { createStage } from "./stage";
import { arcMesh } from "./arc";
import { SEATS } from "./palette";
import { effectsProfile, type EffectsQuality } from "./quality";
import { createAimGuide } from "./aim-guide";
import type { SceneMenuState } from "./scene-menu";
import { createPaddleBlur } from "./paddle-blur";
import { createVictoryMorph } from "./victory-morph";

export interface ViewOptions {
  preview: boolean;
  slowdown: boolean;
  reducedEffects: boolean;
  humanSeat: number;
  ballOwners?: ReadonlyMap<number, number>;
  menu?: SceneMenuState;
  quality?: EffectsQuality;
  musicPulse?: number;
  musicWave?: number;
}
export function createArenaView(humanSeat = 0, initial: ArenaGeometry = SQUARE_ARENA) {
  const stage = createStage(humanSeat, initial);
  const reflection = createArenaReflections(humanSeat, initial);
  stage.root.add(...reflection.meshes);
  const balls = createBallView(stage.root);
  const guide = createAimGuide(stage.root);
  const effects = createEffects(stage.root);
  const paddleBlur = createPaddleBlur(stage.root, stage.paddles);
  const victory = createVictoryMorph(humanSeat);
  let displayArena = initial;
  let victoryProgress = 0;
  let victoryLight: { x: number; y: number } | undefined;
  let endingTime = 0;
  let lastEvent = -1;
  let geometry = initial;
  return {
    root: stage.root,
    dispose: () => reflection.dispose(),
    get displayArena() {
      return displayArena;
    },
    get victoryProgress() {
      return victoryProgress;
    },
    get victoryLight() {
      return victoryLight;
    },
    update(state: MatchState, dt: number, options: ViewOptions) {
      endingTime = state.phase === "finished" ? endingTime + Math.max(0, dt) : 0;
      const ending = victory.update(
        state,
        options.menu?.elapsed ?? endingTime,
        options.reducedEffects,
      );
      displayArena = ending?.arena ?? state.arena;
      victoryProgress = ending?.progress ?? 0;
      victoryLight = ending?.light;
      (stage.base.userData.update as (arena: ArenaGeometry) => void)(displayArena);
      reflection.update(displayArena);
      reflection.setVictory(Boolean(ending));
      const profile = effectsProfile(options.quality, options.reducedEffects);
      reflection.setReduced(!profile.reflections);
      state.players.forEach((player) => {
        const home = fortress(player.id, state.arena);
        const rail = stage.rails[player.id]!;
        rail.position.set(home.anchor.x, 0.02, home.anchor.y);
        rail.rotation.y = -home.direction;
        rail.visible = alive(player) && !ending;
        if (
          geometry !== state.arena &&
          Math.abs(fortress(player.id, geometry).halfAngle - home.halfAngle) > 1e-7
        ) {
          const replacement = arcMesh(
            ARENA.railRadius,
            -home.halfAngle,
            home.halfAngle,
            0.045,
            SEATS[player.id]!.colour,
            0.035,
            0.15,
          );
          rail.geometry.dispose();
          rail.geometry = replacement.geometry;
          // The temporary mesh contributes only its geometry.
          const materials = Array.isArray(replacement.material)
            ? replacement.material
            : [replacement.material];
          materials.forEach((material) => material.dispose());
        }
        const mark = stage.marks[player.id]!;
        mark.visible = alive(player);
        mark.position.set(
          home.anchor.x + Math.cos(home.direction) * 0.9,
          0.15,
          home.anchor.y + Math.sin(home.direction) * 0.9,
        );
        if (ending?.winner === player.id) mark.position.set(ending.centre.x, 0.15, ending.centre.y);
        const paddle = stage.paddles[player.id]!;
        paddle.position.set(home.anchor.x, 0.95, home.anchor.y);
        paddle.rotation.y = -player.angle;
        paddle.visible = alive(player);
        if (ending?.winner === player.id) {
          paddle.position.set(ending.paddle.position.x, 0.95, ending.paddle.position.y);
          paddle.rotation.y = -ending.paddle.angle;
        }
        stage.health[player.id]!.forEach((piece, index) => {
          piece.visible = Boolean(player.health[index]);
          const body = player.pieces[index]!;
          const position = ending?.winner === player.id ? ending.pieces[index]! : body.position;
          piece.position.set(position.x, 0, position.y);
          piece.scale.setScalar(body.radius / ARENA.pieceRadius);
        });
      });
      geometry = state.arena;
      paddleBlur.update(
        state,
        options.reducedEffects
          ? 0
          : options.quality === "low"
            ? 2
            : options.quality === "medium"
              ? 3
              : 4,
      );
      for (const event of state.events) {
        if (event.id <= lastEvent) continue;
        effects.emit(event, options.reducedEffects, profile.shards, profile.sparks, state);
        lastEvent = event.id;
      }
      effects.update(dt, options.reducedEffects, state, profile.shards, profile.sparks);
      balls.update(state, options.reducedEffects, profile.trails, options.ballOwners);
      guide.hide();
      const defender = state.players[options.humanSeat];
      if (state.phase === "finished" || !defender || !alive(defender)) return;
      const ownServe = state.balls.find(
        (ball) => ball.phase === "ready" && ball.seat === defender.id,
      );
      if (ownServe) {
        const points = traceAimGuide(
          state,
          ownServe.position,
          serveDirection(defender.id, defender.angle, state.arena),
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
