import { Box3, Vector3 } from "three";
import * as Tone from "tone";
import { createViewport } from "../apps/web/src/rendering/viewport";
import {
  createArenaCamera,
  fitArenaCamera,
  FOREGROUND_PADDING,
} from "../apps/web/src/rendering/camera";
import { fortress } from "../apps/web/src/simulation/arena";
import { alive, type GameEvent } from "../apps/web/src/simulation/types";
import { createTeaserSimulation } from "./teaser-simulation";
import { createTeaserLights } from "./teaser-lights";
import { createMusicDirector } from "../apps/web/src/audio/director";
import { createEventConductor } from "../apps/web/src/audio/event-grid";
import { createInstruments } from "../apps/web/src/audio/tone-instruments";
import { encodeWave } from "./pcm-wave";
import { renderMusicPreview } from "./music-preview";
import {
  CAPTURE_SIZE,
  TEASER_FPS,
  TEASER_SIZE,
  TEASER_SECONDS,
  TEASER_SAMPLE_RATE,
  TEASER_SHOTS,
  teaserCrop,
  type TeaserShot,
} from "./teaser-plan";

export interface TeaserEvent {
  time: number;
  events: GameEvent[];
  balls: number;
  alive: boolean[];
  steer: { velocity: number; position: number };
}

export function createTeaserScene(container: HTMLElement, id: TeaserShot) {
  const isTitle = id === "title" || id === "end";
  const curve = id.startsWith("curve");
  const simulation = createTeaserSimulation(id);
  const { take, level } = simulation;
  const viewer = take.viewer;
  let state = simulation.state;
  const view = createViewport(container, viewer, state.arena);
  const lights = createTeaserLights();
  const shotStart = TEASER_SHOTS.find((shot) => shot.id === id)!.start / TEASER_FPS;
  let lastPulse = 0;
  const output = document.createElement("canvas");
  Object.assign(output, TEASER_SIZE);
  const context = output.getContext("2d", { alpha: false })!;
  let centre = { x: 0.5, y: 0.5 };
  const draw = (elapsed: number, duration: number, events: GameEvent[]) => {
    const progress = Math.min(1, elapsed / Math.max(0.01, duration));
    const smooth = progress * progress * (3 - 2 * progress);
    const music = lights(shotStart + elapsed);
    lastPulse = music.pulse;
    view.render({ ...state, events }, take.speed / TEASER_FPS, {
      humanSeat: viewer,
      musicPulse: music.pulse,
      musicWave: music.phase,
      preview: false,
      slowdown: false,
      reducedEffects: false,
      quality: "high",
      ballOwners: simulation.owners(),
      titleDemo: isTitle,
      menu: {
        mode: isTitle ? "title" : "hidden",
        count: level.playerCount,
        level: level.level,
        ...(["chaos", "level100-intro"].includes(id) ? { bestLevel: 0 } : {}),
        elapsed: elapsed + 3,
        reduced: false,
      },
    });
    let zoom = isTitle
      ? id === "title"
        ? 1.12 + 0.73 * smooth
        : 1.65 + 0.1 * smooth
      : curve
        ? 1.5
        : id === "duel"
          ? 1.05 + 0.12 * smooth
          : id === "chaos"
            ? 1.02
            : 1.02;
    if (isTitle) centre = { x: 0.5, y: 0.46 };
    else {
      const ball =
        state.balls.find((candidate) => candidate.id === take.followBall) ??
        state.balls.find((candidate) => candidate.phase === "active") ??
        state.balls[0];
      if (ball && curve) {
        const camera = createArenaCamera(viewer, state.arena);
        const corners = state.arena.vertices.flatMap((p) => [
          new Vector3(p.x * 1.09, -2.73, p.y * 1.09),
          new Vector3(p.x * 1.09, 2.34, p.y * 1.09),
        ]);
        fitArenaCamera(
          camera,
          new Box3().setFromPoints(corners),
          16 / 9,
          corners,
          FOREGROUND_PADDING,
        );
        const point = new Vector3(ball.position.x, 0.52, ball.position.y).project(camera);
        const focus = { x: 0.5 + point.x * 0.4, y: 0.5 - point.y * 0.4 };
        centre.x += (focus.x - centre.x) * 0.08;
        centre.y += (focus.y - centre.y) * 0.08;
      } else centre = { x: 0.5, y: 0.5 };
      if (state.phase === "finished") zoom = 1.02;
    }
    const crop = teaserCrop(zoom, centre.x, centre.y);
    context.drawImage(
      view.canvas,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      output.width,
      output.height,
    );
  };
  // Warm graphics state (title rise, bloom and reflection buffers) without changing gameplay.
  for (let frame = 0; frame < (isTitle ? 45 : 4); frame++) draw(0, 1, []);
  return {
    output,
    view,
    level: level.level,
    summary: () => ({
      ...simulation.summary(),
      musicPulse: lastPulse,
      pixelRatio: window.devicePixelRatio,
    }),
    frame(index: number, total: number) {
      const beforeAngle = state.players[viewer]!.angle;
      const events = simulation.frame();
      state = simulation.state;
      draw(index / TEASER_FPS, total / TEASER_FPS, events);
      const home = fortress(viewer, state.arena);
      return {
        events,
        balls: state.balls.length,
        alive: state.players.map(alive),
        steer: {
          velocity: (state.players[viewer]!.angle - beforeAngle) * TEASER_FPS,
          position:
            (state.players[viewer]!.angle - home.direction) / Math.max(0.01, home.halfAngle),
        },
      };
    },
    dispose: () => view.dispose(),
  };
}

export async function renderTeaserAudio(log: TeaserEvent[]) {
  let instruments: ReturnType<typeof createInstruments> | undefined;
  let limiter: Tone.Limiter | undefined;
  const effects = await Tone.Offline(
    (context) => {
      limiter = new Tone.Limiter({ context, threshold: -2 }).toDestination();
      instruments = createInstruments(context, limiter);
      instruments.setMix(0, 0.75, 0);
      const conductor = createEventConductor();
      // Event IDs restart per clip, so keep one observer per segment.
      for (const shot of TEASER_SHOTS) {
        const director = createMusicDirector(0, 2026);
        for (const frame of log.filter(
          (entry) => entry.time >= shot.start / TEASER_FPS && entry.time < shot.end / TEASER_FPS,
        )) {
          const cues = director.observe(
            { elapsed: frame.time, balls: frame.balls, alive: frame.alive },
            frame.events,
          );
          for (const planned of conductor.plan(cues, frame.time + 0.015, { time: 0, step: 0 }))
            instruments!.play([planned.cue], planned.time, "effects");
          instruments!.steer(frame.steer.velocity, frame.steer.position, frame.time + 0.015);
        }
      }
    },
    TEASER_SECONDS + 1,
    2,
    TEASER_SAMPLE_RATE,
  );
  const fx = encodeWave([effects.getChannelData(0), effects.getChannelData(1)], TEASER_SAMPLE_RATE);
  effects.dispose();
  instruments?.dispose();
  limiter?.dispose();
  const score = await renderMusicPreview({
    duration: TEASER_SECONDS + 1,
    hits: false,
    sampleRate: TEASER_SAMPLE_RATE,
  });
  return { effects: fx, score };
}

export { CAPTURE_SIZE, TEASER_FPS, TEASER_SIZE, TEASER_SHOTS, TEASER_SECONDS };
