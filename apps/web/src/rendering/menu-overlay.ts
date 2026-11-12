import { VICTORY_HOLD_SECONDS } from "./victory-morph";
import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  type WebGLRenderer,
} from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { createSceneMenu, type SceneMenuState, type SceneAction } from "./scene-menu";
import { disposeScene } from "./dispose-scene";

export const MENU_BACKGROUND_GAIN = 0.14;
/** A camera-mounted 3D foreground. The arena keeps its own camera and exposure. */
export function createMenuOverlay() {
  const scene = new Scene(),
    camera = new PerspectiveCamera(44, 1, 0.1, 200);
  scene.add(camera, new AmbientLight(0xbad9ff, 0.9));
  const light = new DirectionalLight(0xf1f8ff, 2.5);
  light.position.set(3, 5, 8);
  scene.add(light);
  const menu = createSceneMenu(camera);
  const dimmer = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, gain: { value: 1 } },
    vertexShader:
      "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:
      "uniform sampler2D tDiffuse; uniform float gain; varying vec2 vUv; void main(){vec4 colour=texture2D(tDiffuse,vUv);gl_FragColor=vec4(colour.rgb*gain,colour.a);}",
  });
  const dimScene = new Scene(),
    dimCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
  const veil = new MeshBasicMaterial({
    color: 0,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
  dimScene.add(new Mesh(new PlaneGeometry(2, 2), veil));
  dimCamera.position.z = 1;
  let gain = 1,
    initial = true,
    visible = false;
  return {
    scene,
    camera,
    dimmer,
    hover: (action: SceneAction | null) => menu.hover(action),
    get visible() {
      return visible;
    },
    get backgroundGain() {
      return gain;
    },
    update(state: SceneMenuState, dt: number, width: number, height: number) {
      const celebrating =
        (state.mode === "victory" || state.mode === "defeat") &&
        state.elapsed < VICTORY_HOLD_SECONDS;
      const target =
        state.mode === "hidden" || state.mode === "level" || celebrating ? 1 : MENU_BACKGROUND_GAIN;
      gain =
        initial || state.reduced
          ? target
          : gain + (target - gain) * (1 - Math.exp(-Math.max(0, dt) * 8));
      if (Math.abs(gain - target) < 0.0005) gain = target;
      initial = false;
      visible = state.mode !== "hidden" && state.mode !== "level";
      dimmer.uniforms.gain!.value = gain;
      dimmer.enabled = gain !== 1;
      veil.opacity = 1 - gain;
      const controls = menu.update(state, width, height);
      return controls;
    },
    renderDirect(renderer: WebGLRenderer) {
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      try {
        if (gain !== 1) renderer.render(dimScene, dimCamera);
        if (visible) {
          renderer.clearDepth();
          renderer.render(scene, camera);
        }
      } finally {
        renderer.autoClear = autoClear;
      }
    },
    dispose() {
      dimmer.dispose();
      disposeScene(scene);
      disposeScene(dimScene);
    },
  };
}
export type MenuOverlay = ReturnType<typeof createMenuOverlay>;
