import { Vector2, type Camera, type Scene, type WebGLRenderer } from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function createBloom(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.45, 0.22, 1.1);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  return {
    resize(width: number, height: number) {
      composer.setSize(width, height);
    },
    render(dt: number, reduced: boolean) {
      if (reduced) renderer.render(scene, camera);
      else composer.render(dt);
    },
    dispose() {
      bloom.dispose();
      output.dispose();
      renderPass.dispose();
      composer.dispose();
    },
  };
}
