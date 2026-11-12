import {
  HalfFloatType,
  WebGLRenderTarget,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { createNeonBloomPass } from "./neon-bloom";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { effectsProfile, type EffectsQuality } from "./quality";
import { musicLight } from "./music-light";
import type { MenuOverlay } from "./menu-overlay";

export function createBloom(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  overlay?: MenuOverlay,
  mobile = false,
) {
  const target = new WebGLRenderTarget(1, 1, {
    type: HalfFloatType,
    samples: mobile ? 0 : Math.min(4, renderer.capabilities.maxSamples),
  });
  const composer = new EffectComposer(renderer, target);
  let samples = target.samples;
  const renderPass = new RenderPass(scene, camera);
  const bloom = createNeonBloomPass();
  const output = new OutputPass();
  composer.addPass(renderPass);
  const foreground = overlay ? new RenderPass(overlay.scene, overlay.camera) : null;
  if (overlay && foreground) {
    foreground.clear = false;
    foreground.clearDepth = true;
    composer.addPass(overlay.dimmer);
    composer.addPass(foreground);
  }
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
        mobile,
      );
      if (samples !== profile.samples) {
        samples = profile.samples;
        for (const buffer of [composer.renderTarget1, composer.renderTarget2]) {
          buffer.dispose();
          buffer.samples = samples;
        }
      }
      bloom.strength = musicLight(pulse, reduced).bloomStrength;
      if (foreground) foreground.enabled = overlay!.visible;
      if (!profile.bloom) {
        renderer.render(scene, camera);
        overlay?.renderDirect(renderer);
      } else composer.render(dt);
    },
    dispose() {
      bloom.dispose();
      output.dispose();
      renderPass.dispose();
      foreground?.dispose();
      composer.dispose();
    },
  };
}
