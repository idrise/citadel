import { expect, it } from "vite-plus/test";
import { createNeonBloomPass, neonBloomFragmentShader } from "./neon-bloom";

it("installs hue-independent HDR extraction without increasing global bloom or widening it", () => {
  const pass = createNeonBloomPass();
  expect(pass.threshold).toBe(1.05);
  expect(pass.strength).toBe(0.25);
  expect(pass.radius).toBe(0.45);
  expect(pass.materialHighPassFilter.fragmentShader).toBe(neonBloomFragmentShader);
  // UnrealBloomPass updates these uniforms every frame; extraction must share them.
  expect(pass.materialHighPassFilter.uniforms).toBe(pass.highPassUniforms);
  expect(pass.materialHighPassFilter.uniforms.luminosityThreshold!.value).toBe(pass.threshold);
  expect(pass.materialHighPassFilter.uniforms.smoothWidth!.value).toBe(0.01);
  pass.dispose();
});

it("keeps extraction resources independent between viewports", () => {
  const first = createNeonBloomPass(),
    second = createNeonBloomPass();
  first.materialHighPassFilter.uniforms.luminosityThreshold!.value = 2;
  expect(second.materialHighPassFilter.uniforms.luminosityThreshold!.value).toBe(1.05);
  expect(first.materialHighPassFilter).not.toBe(second.materialHighPassFilter);
  first.dispose();
  second.dispose();
});
