import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  PCFSoftShadowMap,
  Scene,
  Vector2,
  WebGLRenderer,
} from "three";
import type { MatchState } from "../simulation/types";
import { disposeScene } from "./dispose-scene";
import { createArenaView, type ViewOptions } from "./arena-view";
import { createArenaCamera, fitArenaCamera, screenToArena } from "./camera";
import { createCameraMotion } from "./camera-motion";
import { createBloom } from "./bloom";
import { createNeonEnvironment } from "./neon-environment";
import { lightArena } from "./lighting";
import { createWorldGrid } from "./world-grid";

/** Owns camera, projection and graphics resources. Gameplay stays in the simulation. */
export function createViewport(container: HTMLElement, humanSeat = 0) {
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
  const arena = createArenaView(humanSeat);
  scene.add(arena.root, createWorldGrid());
  const disposeLighting = lightArena(scene);
  const disposeEnvironment = createNeonEnvironment(renderer, scene);
  const camera = createArenaCamera(humanSeat);
  const motion = createCameraMotion(camera);
  let aspect = 1;
  const bounds = new Box3().setFromObject(arena.root);
  // Frame the playing surface and wall tops; the structural plinth may extend below the view.
  bounds.min.y = 0;
  bounds.max.y = Math.max(bounds.max.y, 1.6);
  const bloom = createBloom(renderer, scene, camera);
  container.append(canvas);
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    aspect = width / height;
    fitArenaCamera(camera, bounds, aspect);
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
      motion.update(dt, options.reducedEffects);
      fitArenaCamera(camera, bounds, aspect);
      arena.update(state, dt, options);
      bloom.render(dt, options.reducedEffects);
    },
    dispose() {
      observer.disconnect();
      bloom.dispose();
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
