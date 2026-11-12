import {
  Color,
  DataTexture,
  FloatType,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { createNeonBloomPass } from "../apps/web/src/rendering/neon-bloom";
import { SEATS } from "../apps/web/src/rendering/palette";

/** Real GPU extraction: equal-powered seat colours, plus dim controls, with no lighting/camera bias. */
export function reviewBloomExtraction(legacy = false) {
  const renderer = new WebGLRenderer();
  const pass = createNeonBloomPass();
  if (legacy)
    pass.materialHighPassFilter.fragmentShader = pass.materialHighPassFilter.fragmentShader
      .replace(
        "float brightness = peak * 0.52;",
        "float brightness = max(luminance(texel.rgb), peak * 0.52);",
      )
      .replace("vec4(texel.rgb * gain, texel.a)", "texel");
  const input = new Float32Array(6 * 2 * 4);
  for (let row = 0; row < 2; row++)
    SEATS.forEach((seat, index) => {
      const colour = new Color(seat.colour).multiplyScalar(row === 0 ? 2.2 : 0.2);
      input.set([colour.r, colour.g, colour.b, 1], (row * 6 + index) * 4);
    });
  const texture = new DataTexture(input, 6, 2, RGBAFormat, FloatType);
  texture.needsUpdate = true;
  pass.materialHighPassFilter.uniforms.tDiffuse!.value = texture;
  const scene = new Scene(),
    camera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
  camera.position.z = 1;
  const geometry = new PlaneGeometry(2, 2);
  scene.add(new Mesh(geometry, pass.materialHighPassFilter));
  const target = new WebGLRenderTarget(6, 2, { type: FloatType, depthBuffer: false });
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  const output = new Float32Array(input.length);
  renderer.readRenderTargetPixels(target, 0, 0, 6, 2, output);
  const report = SEATS.map((seat, index) => ({
    seat: seat.name,
    input: Array.from(input.slice(index * 4, index * 4 + 3)),
    extracted: Array.from(output.slice(index * 4, index * 4 + 3)),
    dim: Array.from(output.slice((6 + index) * 4, (6 + index) * 4 + 3)),
  }));
  geometry.dispose();
  texture.dispose();
  target.dispose();
  pass.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return report;
}
