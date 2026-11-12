import {
  AdditiveBlending,
  BackSide,
  Color,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  type BufferGeometry,
} from "three";

/** Procedural markings remain dark enough to show signed rotation through the glow. */
export function createBallMaterial() {
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1,
    roughness: 0.24,
    metalness: 0.15,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 ballPoint;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nballPoint = normalize(position);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 ballPoint;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 p = normalize(ballPoint);
        float wave = sin(atan(p.z, p.x) * 2.0 + p.y * 2.5);
        float edge = max(fwidth(wave), 0.04);
        float seam = 1.0 - smoothstep(0.55 - edge, 0.55 + edge, abs(wave));
        diffuseColor.rgb = mix(vec3(0.85, 0.94, 1.0), diffuseColor.rgb * 0.12, seam);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance = mix(vec3(1.15, 1.3, 1.5), emissive * 0.03, seam);`,
      );
  };
  material.customProgramCacheKey = () => "citadel-striped-ball-v1";
  return material;
}

/** A soft energy envelope gives presence without changing the simulated collider. */
export function createBallAura(geometry: BufferGeometry) {
  const material = new ShaderMaterial({
    uniforms: { colour: { value: new Color() } },
    vertexShader: `varying vec3 viewNormal; varying vec3 viewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        viewNormal = normalize(normalMatrix * normal);
        viewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }`,
    fragmentShader: `uniform vec3 colour; varying vec3 viewNormal; varying vec3 viewDirection;
      void main() {
        float falloff = pow(abs(dot(normalize(viewNormal), normalize(viewDirection))), 2.0);
        gl_FragColor = vec4(colour * 2.6, falloff * 0.22);
        #include <colorspace_fragment>
      }`,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: BackSide,
    toneMapped: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = "ball-aura";
  mesh.scale.setScalar(1.8);
  return mesh;
}
