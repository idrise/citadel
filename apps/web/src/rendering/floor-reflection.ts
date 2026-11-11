import { Color, Matrix4, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { ARENA } from "../simulation/arena";

/** One softened planar reflection; its render target is a technical buffer, not artwork. */
export function createFrostedReflection(
  width: number,
  height: number,
  resolution = 512,
  opacity = 0.24,
) {
  const mirror = new Reflector(new PlaneGeometry(width, height), {
    textureWidth: resolution,
    textureHeight: resolution,
    multisample: 0,
    clipBias: 0.003,
    color: 0xb3c5d7,
    shader: {
      name: "FrostedNeonReflection",
      uniforms: {
        color: { value: new Color() },
        tDiffuse: { value: null },
        textureMatrix: { value: new Matrix4() },
        reflectionOpacity: { value: opacity },
        frostStep: { value: new Vector2(2.5 / resolution, 2.5 / resolution) },
      },
      vertexShader: `uniform mat4 textureMatrix;
        varying vec4 reflectedUv;
        void main() {
          reflectedUv = textureMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform vec3 color;
        uniform sampler2D tDiffuse;
        uniform vec2 frostStep;
        uniform float reflectionOpacity;
        varying vec4 reflectedUv;
        void main() {
          vec2 uv = reflectedUv.xy / reflectedUv.w;
          vec3 reflected = texture2D(tDiffuse, uv).rgb * 0.2;
          reflected += texture2D(tDiffuse, uv + vec2(frostStep.x, 0.0)).rgb * 0.15;
          reflected += texture2D(tDiffuse, uv - vec2(frostStep.x, 0.0)).rgb * 0.15;
          reflected += texture2D(tDiffuse, uv + vec2(0.0, frostStep.y)).rgb * 0.15;
          reflected += texture2D(tDiffuse, uv - vec2(0.0, frostStep.y)).rgb * 0.15;
          reflected += texture2D(tDiffuse, uv + frostStep).rgb * 0.05;
          reflected += texture2D(tDiffuse, uv - frostStep).rgb * 0.05;
          reflected += texture2D(tDiffuse, uv + vec2(frostStep.x, -frostStep.y)).rgb * 0.05;
          reflected += texture2D(tDiffuse, uv + vec2(-frostStep.x, frostStep.y)).rgb * 0.05;
          gl_FragColor = vec4(reflected * color, reflectionOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    },
  });
  const material = mirror.material as ShaderMaterial;
  material.transparent = true;
  material.depthWrite = false;
  return { mesh: mirror, dispose: () => mirror.getRenderTarget().dispose() };
}

export function createFloorReflection() {
  const reflection = createFrostedReflection(ARENA.halfSize * 2, ARENA.halfSize * 2);
  reflection.mesh.rotation.x = -Math.PI / 2;
  reflection.mesh.position.y = 0.025;
  return reflection;
}
