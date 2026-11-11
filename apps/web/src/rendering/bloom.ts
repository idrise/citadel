import {
  HalfFloatType,
  WebGLRenderTarget,
  Vector2,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { effectsProfile, type EffectsQuality } from "./quality";
import { musicLight } from "./music-light";

export function createBloom(renderer: WebGLRenderer, scene: Scene, camera: Camera) {
  const target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    samples: Math.min(4, renderer.capabilities.maxSamples),
  });
  const composer = new EffectComposer(renderer, target);
  let samples = target.samples;
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.25, 0.45, 1.05);
  const output = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(bloom);
  composer.addPass(output);
  return {
    resize(width: number, height: number) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    render(dt: number, reduced: boolean, pulse = 0, quality: EffectsQuality = "high") {
      const profile = effectsProfile(
        quality,
        reduced,
        renderer.getPixelRatio(),
        renderer.capabilities.maxSamples,
      );
      if (samples !== profile.samples) {
        samples = profile.samples;
        for (const buffer of [composer.renderTarget1, composer.renderTarget2]) {
          buffer.dispose();
          buffer.samples = samples;
        }
      }
      bloom.strength = musicLight(pulse, reduced).bloomStrength;
      if (!profile.bloom) renderer.render(scene, camera);
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
