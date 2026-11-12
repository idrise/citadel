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
import { fortress, SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
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
) {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Neon Citadel arena");
  canvas.setAttribute("aria-describedby", "game-controls");
  canvas.setAttribute("role", "application");
  const scene = new Scene();
  scene.background = new Color(0x080f1c);
  const arena = createArenaView(humanSeat, initial);
  const worldGrid = createWorldGrid();
  scene.add(arena.root, worldGrid);
  const menu = createMenuOverlay();
  const fireworks = createVictoryFireworks(scene);
  const controls = createSceneControls(container, onSceneAction, (action) => menu.hover(action));
  const disposeLighting = lightArena(scene, initial);
  const disposeEnvironment = createNeonEnvironment(renderer, scene, initial);
  const camera = createArenaCamera(humanSeat, initial);
  const motion = createCameraMotion(camera);
  let aspect = 1;
  const bounds = new Box3().setFromObject(arena.root);
  // Frame the playing surface and wall tops; the structural plinth may extend below the view.
  bounds.min.y = 0;
  bounds.max.y = Math.max(bounds.max.y, 1.6);
  let framingPoints = initial.vertices.flatMap((p) => [
    new Vector3(p.x * 1.09, 0, p.y * 1.09),
    new Vector3(p.x * 1.09, 2.34, p.y * 1.09),
  ]);
  const bloom = createBloom(renderer, scene, camera, menu);
  container.append(canvas);
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    aspect = width / height;
    fitArenaCamera(camera, bounds, aspect, framingPoints);
    renderer.setSize(width, height);
    bloom.resize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  return {
    canvas,
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
      ).pixelRatio;
      if (renderer.getPixelRatio() !== pixelRatio) {
        renderer.setPixelRatio(pixelRatio);
        bloom.resize(Math.max(container.clientWidth, 1), Math.max(container.clientHeight, 1));
      }
      for (const light of scene.children)
        if (light instanceof PointLight) {
          const seat = fortress(light.userData.seat as number, state.arena);
          light.position.set(
            seat.anchor.x + Math.cos(seat.direction) * 2.7,
            1.8,
            seat.anchor.y + Math.sin(seat.direction) * 2.7,
          );
          light.visible = state.players[seat.id]!.health.some(Boolean);
        }
      const home = fortress(humanSeat, state.arena);
      motion.follow(Math.atan2(home.anchor.x, home.anchor.y));
      const paddleOffset =
        state.phase === "playing"
          ? (state.players[humanSeat]!.angle - home.direction) / home.halfAngle
          : 0;
      motion.update(dt, options.reducedEffects, paddleOffset, cameraDanger(state, humanSeat));
      framingPoints = state.arena.vertices.flatMap((p) => [
        new Vector3(p.x * 1.09, 0, p.y * 1.09),
        new Vector3(p.x * 1.09, 2.34, p.y * 1.09),
      ]);
      const menuState = options.menu ?? {
        mode: "hidden" as const,
        count: state.players.length,
        elapsed: 0,
        reduced: options.reducedEffects,
      };
      if (state.phase === "finished" && state.winner === humanSeat) {
        const reveal = options.reducedEffects ? 1 : 1 - Math.exp(-menuState.elapsed * 4);
        const skyHeight = 2.34 + (10 - 2.34) * reveal;
        framingPoints.push(new Vector3(-8, skyHeight, 0), new Vector3(8, skyHeight, 0));
      }
      bounds.makeEmpty();
      for (const p of state.arena.vertices) {
        bounds.expandByPoint(new Vector3(p.x * 1.09, 0, p.y * 1.09));
        bounds.expandByPoint(new Vector3(p.x * 1.09, 2.34, p.y * 1.09));
      }
      fitArenaCamera(camera, bounds, aspect, framingPoints);
      arena.update(state, dt, options);
      fireworks.update(
        dt,
        state.phase === "finished" && state.winner === humanSeat,
        options.reducedEffects,
        SEATS[humanSeat]!.colour,
        options.quality,
      );
      controls.update(
        menu.update(menuState, dt, container.clientWidth, container.clientHeight),
        state.players.length,
      );
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
