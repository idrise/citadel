import type { TitleFrame } from "./title-transition";
import type { Vec2 } from "../simulation/vector";
import { resizePaddle } from "./paddle-shape";
import { createLevelIntro } from "./level-intro";
import { createSupplyView } from "./supply-view";
import {
  ARENA,
  batHalfAngle,
  SQUARE_ARENA,
  createArena,
  fortress,
  type ArenaGeometry,
} from "../simulation/arena";
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
  portrait?: boolean;
  preview: boolean;
  slowdown: boolean;
  reducedEffects: boolean;
  humanSeat: number;
  ballOwners?: ReadonlyMap<number, number>;
  menu?: SceneMenuState;
  quality?: EffectsQuality;
  musicPulse?: number;
  musicWave?: number;
  actorScales?: readonly number[];
  actorMarks?: readonly Vec2[];
  actorPieceScales?: readonly (readonly number[])[];
  railGain?: number;
  victoryFraming?: number;
  cameraAnchor?: { x: number; y: number };
}
export function createArenaView(
  humanSeat = 0,
  initial: ArenaGeometry = SQUARE_ARENA,
  mobile = false,
) {
  const roster = {
    ...initial,
    fortresses: [
      ...initial.fortresses,
      ...createArena(6).fortresses.filter(
        (f) => !initial.fortresses.some((other) => other.id === f.id),
      ),
    ].sort((a, b) => a.id - b.id),
  };
  const stage = createStage(humanSeat, roster);
  const intro = createLevelIntro(stage.root);
  const titleSign = createLevelIntro(stage.root);
  titleSign.root.name = "citadel-title";
  let titleRise = 0;
  const reflection = createArenaReflections(humanSeat, initial, mobile);
  stage.root.add(...reflection.meshes);
  const balls = createBallView(stage.root);
  const supplies = createSupplyView(stage.root);
  const guide = createAimGuide(stage.root);
  const effects = createEffects(stage.root);
  const paddleBlur = createPaddleBlur(stage.root, stage.paddles);
  let victory = createVictoryMorph(humanSeat);
  let lastEnding: ReturnType<typeof victory.update> = null;
  let victorySeat = humanSeat;
  let displayArena = initial;
  let victoryProgress = 0;
  let victoryLight: { x: number; y: number } | undefined;
  let endingTime = 0;
  let lastEvent = -1;
  return {
    root: stage.root,
    dispose: () => reflection.dispose(),
    captureTransition(frame: TitleFrame): TitleFrame {
      const ending = lastEnding;
      if (!ending) return frame;
      const positions = (distance: number) =>
        createArena(6).fortresses.map((template) => {
          const home = frame.state.arena.fortresses.find((f) => f.id === template.id) ?? template;
          return {
            x: home.anchor.x + Math.cos(home.direction) * distance,
            y: home.anchor.y + Math.sin(home.direction) * distance,
          };
        });
      const marks = positions(0.9),
        lights = positions(2.7);
      marks[ending.winner] = ending.centre;
      lights[ending.winner] = ending.light;
      return {
        ...frame,
        railGain: 0,
        victoryFraming: ending.progress,
        marks,
        lights,
        state: {
          ...frame.state,
          arena: {
            ...displayArena,
            fortresses: frame.state.arena.fortresses.map((f) =>
              f.id === ending.winner
                ? { ...f, anchor: ending.paddle.position, direction: ending.paddle.angle }
                : f,
            ),
          },
          players: frame.state.players.map((p) =>
            p.id === ending.winner
              ? {
                  ...p,
                  angle: ending.paddle.angle,
                  pieces: p.pieces.map((body, i) => ({ ...body, position: ending.pieces[i]! })),
                }
              : p,
          ),
        },
      };
    },
    reset() {
      lastEvent = -1;
      supplies.reset();
      paddleBlur.reset();
      effects.reset();
    },
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
      if (victorySeat !== options.humanSeat) {
        victorySeat = options.humanSeat;
        victory = createVictoryMorph(victorySeat);
      }
      endingTime = state.phase === "finished" ? endingTime + Math.max(0, dt) : 0;
      const ending = victory.update(
        state,
        options.menu?.elapsed ?? endingTime,
        options.reducedEffects,
      );
      lastEnding = ending;
      displayArena = ending?.arena ?? state.arena;
      victoryProgress = ending?.progress ?? 0;
      victoryLight = ending?.light;
      (
        stage.base.userData.update as (
          arena: ArenaGeometry,
          seat: number,
          anchor?: { x: number; y: number },
          dt?: number,
        ) => void
      )(displayArena, options.humanSeat, options.cameraAnchor, dt);
      reflection.update(displayArena, options.humanSeat, options.cameraAnchor);
      reflection.setVictory(Boolean(ending) || (options.victoryFraming ?? 0) > 0);
      const profile = effectsProfile(options.quality, options.reducedEffects, 1, 4, mobile);
      reflection.setReduced(!profile.reflections);
      const titleMode = options.menu?.mode === "title";
      titleRise = titleMode
        ? Math.min(1, titleRise + Math.max(0, dt) / 0.55)
        : Math.max(0, titleRise - Math.max(0, dt) / 0.22);
      if (options.reducedEffects) titleRise = titleMode ? 1 : 0;
      titleSign.update(
        "CITADEL",
        1,
        state.arena,
        options.humanSeat,
        options.reducedEffects,
        null,
        titleRise,
        options.portrait ? -0.95 : 0,
      );
      intro.update(
        options.menu?.mode === "level" ? (options.menu.level ?? 1) : null,
        state.countdown,
        state.arena,
        options.humanSeat,
        options.reducedEffects,
        options.menu?.demotion,
        undefined,
        options.portrait ? -0.95 : 0,
        options.menu?.lossLevel,
        options.menu?.previousLevel,
        options.menu?.introDuration,
      );
      supplies.update(state, dt, options.reducedEffects);
      for (const group of [
        ...stage.rails,
        ...stage.paddles,
        ...stage.marks,
        ...stage.health.flat(),
      ])
        group.visible = false;
      state.players.forEach((player) => {
        const appearance = options.actorScales?.[player.id] ?? 1;
        const home = fortress(player.id, state.arena);
        const rail = stage.rails[player.id]!;
        rail.position.set(home.anchor.x, 0.02, home.anchor.y);
        rail.rotation.y = -home.direction;
        rail.visible = alive(player) && !ending;
        rail.scale.setScalar(appearance);
        for (const material of Array.isArray(rail.material) ? rail.material : [rail.material]) {
          material.opacity = options.railGain ?? 1;
        }
        if (Math.abs((rail.userData.halfAngle as number) - home.halfAngle) > 1e-7) {
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
          rail.userData.halfAngle = home.halfAngle;
          // The temporary mesh contributes only its geometry.
          const materials = Array.isArray(replacement.material)
            ? replacement.material
            : [replacement.material];
          materials.forEach((material) => material.dispose());
        }
        const mark = stage.marks[player.id]!;
        mark.visible = alive(player);
        mark.scale.setScalar(appearance);
        mark.position.set(
          home.anchor.x + Math.cos(home.direction) * 0.9,
          0.15,
          home.anchor.y + Math.sin(home.direction) * 0.9,
        );
        const markPosition = options.actorMarks?.[player.id];
        if (markPosition) mark.position.set(markPosition.x, 0.15, markPosition.y);
        if (ending?.winner === player.id) mark.position.set(ending.centre.x, 0.15, ending.centre.y);
        const paddle = stage.paddles[player.id]!;
        resizePaddle(paddle, batHalfAngle(state.arena), SEATS[player.id]!.colour);
        paddle.position.set(home.anchor.x, 0.95 * appearance, home.anchor.y);
        paddle.rotation.y = -player.angle;
        paddle.visible = alive(player);
        paddle.scale.setScalar(appearance);
        if (ending?.winner === player.id) {
          paddle.position.set(ending.paddle.position.x, 0.95, ending.paddle.position.y);
          paddle.rotation.y = -ending.paddle.angle;
        }
        stage.health[player.id]!.forEach((piece, index) => {
          piece.visible = Boolean(player.health[index]);
          const body = player.pieces[index];
          if (!body) return;
          const position = ending?.winner === player.id ? ending.pieces[index]! : body.position;
          const gain = options.actorPieceScales?.[player.id]?.[index] ?? 1;
          piece.position.set(position.x, -(1 - gain) * 1.4, position.y);
          piece.scale.setScalar((appearance * gain * body.radius) / ARENA.pieceRadius);
        });
      });
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
      balls.update(
        state,
        options.reducedEffects,
        profile.trails,
        options.ballOwners,
        options.menu?.mode === "title" || options.menu?.mode === "level",
        options.quality,
      );
      guide.hide();
      const defender = state.players[options.humanSeat];
      if (
        options.menu?.mode === "title" ||
        options.menu?.mode === "level" ||
        state.phase === "finished" ||
        !defender ||
        !alive(defender)
      )
        return;
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
