import {
  AmbientLight,
  Color,
  DirectionalLight,
  OrthographicCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import type { MatchState } from "../simulation/types";
import { disposeScene } from "./dispose-scene";
import { createArenaView, type ViewOptions } from "./arena-view";

/** Owns camera, projection and graphics resources. Gameplay stays in the simulation. */
export function createViewport(container: HTMLElement) {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Neon Citadel arena");
  canvas.setAttribute("aria-describedby", "game-controls");
  canvas.setAttribute("role", "application");
  const scene = new Scene();
  scene.background = new Color(0x080f1c);
  const arena = createArenaView();
  scene.add(arena.root, new AmbientLight(0xbcd5ef, 1.1));
  const light = new DirectionalLight(0xd4e7ff, 3.5);
  light.position.set(-6, 12, 4);
  scene.add(light);
  const camera = new OrthographicCamera(-12, 12, 12, -12, 0.1, 100);
  camera.position.set(0, 20, 12);
  camera.lookAt(0, 0, 0);
  container.append(canvas);
  const resize = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const aspect = width / height;
    const halfHeight = Math.max(9.8, 10.5 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  const ray = new Raycaster();
  const plane = new Plane(new Vector3(0, 1, 0), -0.4);
  return {
    canvas,
    pointFromClient(x: number, y: number) {
      const bounds = canvas.getBoundingClientRect();
      ray.setFromCamera(
        new Vector2(
          ((x - bounds.left) / bounds.width) * 2 - 1,
          1 - ((y - bounds.top) / bounds.height) * 2,
        ),
        camera,
      );
      const point = ray.ray.intersectPlane(plane, new Vector3());
      return point ? { x: point.x, y: point.z } : null;
    },
    render(state: MatchState, dt: number, options: ViewOptions) {
      arena.update(state, dt, options);
      renderer.render(scene, camera);
    },
    dispose() {
      observer.disconnect();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
