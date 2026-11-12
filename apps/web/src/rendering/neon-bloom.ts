import { Vector2 } from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/** Give saturated HDR emitters a peak-channel floor calibrated to the existing cyan walls. */
export const neonBloomFragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec3 defaultColor;
  uniform float defaultOpacity;
  uniform float luminosityThreshold;
  uniform float smoothWidth;
  varying vec2 vUv;
  void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    float peak = max(texel.r, max(texel.g, texel.b));
    float brightness = max(luminance(texel.rgb), peak * 0.52);
    float coverage = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, brightness);
    gl_FragColor = mix(vec4(defaultColor, defaultOpacity), texel, coverage);
  }
`;

export function createNeonBloomPass() {
  const pass = new UnrealBloomPass(new Vector2(1, 1), 0.25, 0.45, 1.05);
  pass.materialHighPassFilter.name = "NeonBloomExtraction";
  pass.materialHighPassFilter.fragmentShader = neonBloomFragmentShader;
  return pass;
}
