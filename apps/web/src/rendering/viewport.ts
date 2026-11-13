import { MAX_PLAYERS } from "../simulation/player-count";
import { seatLights } from "./seat-lights";
import { createSettingsControls } from "../input/settings-controls";
import type { SettingKey, SettingsAction } from "./scene-settings";
import { creditedPlayerKill } from "./elimination-burst";
import { createTitleTransition, type TitleFrame } from "./title-transition";
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  PCFSoftShadowMap,
  PointLight,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { createArena, fortress, SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import type { MatchState } from "../simulation/types";
import { disposeScene } from "./dispose-scene";
import { createArenaView, type ViewOptions } from "./arena-view";
import { createArenaCamera, fitArenaCamera, screenToArena } from "./camera";
import { cameraDanger, createCameraMotion } from "./camera-motion";
import { createBloom } from "./bloom";
import { createNeonEnvironment } from "./neon-environment";
import { lightArena } from "./lighting";
import { createWorldGrid } from "./world-grid";
import { effectsProfile } from "./quality";
import { musicLight } from "./music-light";
import type { SceneAction } from "./scene-menu";
import { createMenuOverlay } from "./menu-overlay";
import { createSceneControls } from "../input/scene-controls";
import { createVictoryFireworks } from "./victory-fireworks";
import { SEATS } from "./palette";

/** Owns camera, projection and graphics resources. Gameplay stays in the simulation. */
export function createViewport(
  container: HTMLElement,
  humanSeat = 0,
  initial: ArenaGeometry = SQUARE_ARENA,
  onSceneAction: (action: SceneAction) => void = () => {},
  settingsCallbacks?: {
    action: (action: SettingsAction) => void;
    change: (key: SettingKey, value: number) => void;
  },
) {
  const mobile = navigator.maxTouchPoints > 0 || matchMedia("(pointer: coarse)").matches;
  const renderer = new WebGLRenderer({ antialias: !mobile, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Citadel arena");
  canvas.setAttribute("aria-describedby", "game-controls");
  canvas.setAttribute("role", "application");
  const scene = new Scene();
  scene.background = new Color(0x080f1c);
  const arena = createArenaView(humanSeat, initial, mobile);
  const worldGrid = createWorldGrid();
  scene.add(arena.root, worldGrid);
  const menu = createMenuOverlay();
  const fireworks = createVictoryFireworks(scene);
  const controls = createSceneControls(container, onSceneAction, (action) => menu.hover(action));
  const settingsControls = createSettingsControls(
    container,
    (action) => settingsCallbacks?.action(action),
    (key, value) => settingsCallbacks?.change(key, value),
  );
  const disposeLighting = lightArena(scene, createArena(MAX_PLAYERS));
  const disposeEnvironment = createNeonEnvironment(renderer, scene, initial);
  const camera = createArenaCamera(humanSeat, initial);
  const motion = createCameraMotion(camera);
  const title = createTitleTransition();
  let lastPresentation: TitleFrame | undefined;
  let titleMoving = false;
  let lastCelebrationEvent = -1;
  let aspect = 1;
  let menuLift = 0;
  const bounds = new Box3().setFromObject(arena.root);
  // Frame the playing surface and wall tops; the structural plinth may extend below the view.
  bounds.min.y = 0;
  bounds.max.y = Math.max(bounds.max.y, 1.6);
  let framingPoints = initial.vertices.flatMap((p) => [
    new Vector3(p.x * 1.09, 0, p.y * 1.09),
    new Vector3(p.x * 1.09, 2.34, p.y * 1.09),
  ]);
  const bloom = createBloom(renderer, scene, camera, menu, mobile);
  container.append(canvas);
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    aspect = width / height;
    motion.layout(aspect);
    fitArenaCamera(camera, bounds, aspect, framingPoints);
    renderer.setSize(width, height);
    bloom.resize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  return {
    canvas,
    get titleMoving() {
      return titleMoving;
    },
    transitionTitle(state: MatchState, seat: number, animate: boolean) {
      if (lastPresentation) title.capture(arena.captureTransition(lastPresentation));
      title.begin(state, seat, animate);
      fireworks.reset();
      lastCelebrationEvent = -1;
      arena.reset();
    },
    pointFromClient(x: number, y: number) {
      const rect = canvas.getBoundingClientRect();
      return screenToArena(
        camera,
        new Vector2(((x - rect.left) / rect.width) * 2 - 1, 1 - ((y - rect.top) / rect.height) * 2),
      );
    },
    render(state: MatchState, dt: number, options: ViewOptions) {
      const pixelRatio = effectsProfile(
        options.quality,
        options.reducedEffects,
        window.devicePixelRatio,
        renderer.capabilities.maxSamples,
        mobile,
      ).pixelRatio;
      if (renderer.getPixelRatio() !== pixelRatio) {
        renderer.setPixelRatio(pixelRatio);
        bloom.resize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1));
      }
      const presentation = title.update(state, options.humanSeat, dt, options.reducedEffects);
      lastPresentation = presentation;
      titleMoving = presentation.moving;
      const displayed = presentation.state;
      arena.update(displayed, dt, {
        ...options,
        portrait: aspect < 0.85,
        actorScales: presentation.scales,
        ...(presentation.marks ? { actorMarks: presentation.marks } : {}),
        ...(presentation.pieceScales ? { actorPieceScales: presentation.pieceScales } : {}),
        ...(presentation.railGain !== undefined ? { railGain: presentation.railGain } : {}),
        ...(presentation.victoryFraming !== undefined
          ? { victoryFraming: presentation.victoryFraming }
          : {}),
        ...(presentation.moving
          ? { cameraAnchor: { x: Math.sin(presentation.yaw), y: Math.cos(presentation.yaw) } }
          : {}),
      });
      const displayArena = arena.displayArena;
      const litSeats = seatLights(displayed.players, options.humanSeat);
      for (const light of scene.children)
        if (light instanceof PointLight) {
          const id = litSeats[light.userData.slot as number] ?? -1;
          light.userData.seat = id;
          if (id >= 0) light.color.setHex(SEATS[id]!.colour);
          const player = displayed.players.find((p) => p.id === id);
          // Keep the light count stable: changing it recompiles every lit material on Safari.
          light.visible = true;
          light.intensity = 0;
          if (!player?.health.some(Boolean)) continue;
          const seat = fortress(id, displayed.arena);
          light.intensity = 10 * (presentation.scales[id] ?? 1);
          light.position.set(
            seat.anchor.x + Math.cos(seat.direction) * 2.7,
            1.8,
            seat.anchor.y + Math.sin(seat.direction) * 2.7,
          );
          const lightPosition = presentation.lights?.[id];
          if (lightPosition)
            light.position.set(
              lightPosition.x,
              1.8 + 0.7 * (presentation.victoryFraming ?? 0),
              lightPosition.y,
            );
          if (arena.victoryLight && state.winner === seat.id)
            light.position.set(arena.victoryLight.x, 2.5, arena.victoryLight.y);
        }
      const home = fortress(options.humanSeat, state.arena);
      motion.follow(presentation.yaw);
      motion.scale(Math.max(1, ...displayArena.vertices.map((p) => Math.hypot(p.x, p.y) / 15)));
      const paddleOffset =
        state.phase === "playing"
          ? (state.players[options.humanSeat]!.angle - home.direction) / home.halfAngle
          : 0;
      motion.update(
        dt,
        options.reducedEffects,
        paddleOffset,
        cameraDanger(state, options.humanSeat),
      );
      // Acute star tips have longer wall miters; include the plinth during the reveal.
      const victoryFraming = Math.max(arena.victoryProgress, presentation.victoryFraming ?? 0);
      const border = (aspect < 0.85 ? 1.03 : 1.09) + victoryFraming * 0.2;
      framingPoints = displayArena.vertices.flatMap((p) => [
        new Vector3(p.x * border, -2.73 * victoryFraming, p.y * border),
        new Vector3(p.x * border, 2.34, p.y * border),
      ]);
      const menuState = options.menu ?? {
        mode: "hidden" as const,
        count: state.players.length,
        elapsed: 0,
        reduced: options.reducedEffects,
      };
      if (state.phase === "finished" && state.winner !== null) {
        const reveal = options.reducedEffects ? 1 : 1 - Math.exp(-menuState.elapsed * 4);
        const skyHeight = 2.34 + (10 - 2.34) * reveal;
        framingPoints.push(new Vector3(-8, skyHeight, 0), new Vector3(8, skyHeight, 0));
      }
      if (presentation.victoryFraming) {
        const skyHeight = 2.34 + (10 - 2.34) * presentation.victoryFraming;
        framingPoints.push(new Vector3(-8, skyHeight, 0), new Vector3(8, skyHeight, 0));
      }
      bounds.makeEmpty();
      for (const p of displayArena.vertices) {
        bounds.expandByPoint(new Vector3(p.x * 1.09, 0, p.y * 1.09));
        bounds.expandByPoint(new Vector3(p.x * 1.09, 2.34, p.y * 1.09));
      }
      fitArenaCamera(camera, bounds, aspect, framingPoints);
      const lift = aspect < 0.85 && menuState.mode === "title" ? 1 : 0;
      menuLift = options.reducedEffects
        ? lift
        : menuLift + (lift - menuLift) * (1 - Math.exp(-Math.max(0, dt) * 7));
      if (camera.view) {
        camera.view.offsetY += 0.28 * menuLift;
        camera.updateProjectionMatrix();
      }
      for (const event of state.events) {
        if (event.id <= lastCelebrationEvent) continue;
        lastCelebrationEvent = event.id;
        if (creditedPlayerKill(event, options.humanSeat))
          fireworks.celebrate(event.position, SEATS[options.humanSeat]!.colour);
      }
      fireworks.update(
        dt,
        state.phase === "finished" && state.winner === options.humanSeat,
        options.reducedEffects,
        SEATS[options.humanSeat]!.colour,
        options.quality,
      );
      controls.update(
        menu.update(menuState, dt, container.clientWidth, container.clientHeight),
        state.players.length,
      );
      settingsControls.update(menu.settingsTargets, menuState.settings?.open ?? false);
      const pulse = options.musicPulse ?? 0;
      worldGrid.material.uniforms.musicGain!.value = musicLight(
        pulse,
        options.reducedEffects,
      ).gridGain;
      worldGrid.material.uniforms.musicWave!.value = options.reducedEffects
        ? -1
        : (options.musicWave ?? -1);
      bloom.render(dt, options.reducedEffects, pulse, options.quality);
    },
    dispose() {
      observer.disconnect();
      controls.dispose();
      settingsControls.dispose();
      bloom.dispose();
      menu.dispose();
      arena.dispose();
      disposeLighting();
      disposeEnvironment();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
