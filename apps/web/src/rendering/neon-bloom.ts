import { Vector2 } from "three";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/** Balance saturated HDR glow by perceived luminance, preserving the source hue. */
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
    float brightness = peak * 0.52;
    float coverage = smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, brightness);
    float light = luminance(texel.rgb);
    float saturation = peak > 0.0 ? (peak - min(texel.r, min(texel.g, texel.b))) / peak : 0.0;
    float gain = mix(1.0, clamp(0.52 * peak / max(light, 0.0001), 0.5, 2.5), saturation);
    gl_FragColor = mix(vec4(defaultColor, defaultOpacity), vec4(texel.rgb * gain, texel.a), coverage);
  }
`;

export function createNeonBloomPass() {
  const pass = new UnrealBloomPass(new Vector2(1, 1), 0.25, 0.45, 1.05);
  pass.materialHighPassFilter.name = "NeonBloomExtraction";
  pass.materialHighPassFilter.fragmentShader = neonBloomFragmentShader;
  return pass;
}
