import {
  AmbientLight,
  Color,
  DirectionalLight,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { disposeScene } from "./dispose-scene";
import { createStage } from "./stage";

/** Owns browser/render resources only; no gameplay or per-frame React state. */
export function createViewport(container: HTMLElement): { dispose: () => void } {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute("aria-label", "Three-dimensional arena stage");
  renderer.domElement.setAttribute("role", "img");
  const scene = new Scene();
  scene.background = new Color(0x090f1c);
  scene.add(createStage(), new AmbientLight(0xcadfff, 2));
  const light = new DirectionalLight(0xc3eaff, 4);
  light.position.set(3, 8, 4);
  scene.add(light);
  const camera = new OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  camera.position.set(0, 16, 9);
  camera.lookAt(0, 0, 0);
  container.append(renderer.domElement);

  const render = () => {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const aspect = width / height;
    const halfHeight = Math.max(7, 7 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.render(scene, camera);
  };
  const observer = new ResizeObserver(render);
  observer.observe(container);
  render();

  return {
    dispose() {
      observer.disconnect();
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
