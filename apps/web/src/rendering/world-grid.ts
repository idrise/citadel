import { Color, Mesh, PlaneGeometry, ShaderMaterial } from "three";

export const GRID_HEIGHT = -3.08;
export const GRID_FADE_START = 38;
export const GRID_FADE_END = 125;

/** A static world-space ground plane. Derivatives keep distant cells from shimmering or forming moire. */
export function createWorldGrid() {
  const material = new ShaderMaterial({
    name: "DistantNeonGrid",
    uniforms: {
      minorSpacing: { value: 2 },
      majorSpacing: { value: 10 },
      fadeStart: { value: GRID_FADE_START },
      fadeEnd: { value: GRID_FADE_END },
      minorColour: { value: new Color(0x007799).multiplyScalar(0.45) },
      majorColour: { value: new Color(0x00c3ef).multiplyScalar(0.65) },
      groundColour: { value: new Color(0x030710) },
      hazeColour: { value: new Color(0x080f1c) },
    },
    vertexShader: `
      varying vec2 groundPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        groundPosition = world.xz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float minorSpacing;
      uniform float majorSpacing;
      uniform float fadeStart;
      uniform float fadeEnd;
      uniform vec3 minorColour;
      uniform vec3 majorColour;
      uniform vec3 groundColour;
      uniform vec3 hazeColour;
      varying vec2 groundPosition;

      float grid(float spacing) {
        vec2 cell = groundPosition / spacing;
        vec2 footprint = fwidth(cell);
        vec2 distancePixels = abs(fract(cell - 0.5) - 0.5) / max(footprint, vec2(0.0001));
        // Fade each direction independently as cells become smaller than a pixel.
        vec2 densityFade = 1.0 - smoothstep(vec2(0.25), vec2(0.75), footprint);
        vec2 core = 1.0 - smoothstep(vec2(0.45), vec2(1.05), distancePixels);
        vec2 shoulder = 1.0 - smoothstep(vec2(0.8), vec2(3.5), distancePixels);
        vec2 lines = (core + shoulder * 0.12) * densityFade;
        return max(lines.x, lines.y);
      }

      void main() {
        float distanceFromArena = length(groundPosition);
        float haze = smoothstep(fadeStart, fadeEnd, distanceFromArena);
        float nearArena = smoothstep(9.5, 16.0, max(abs(groundPosition.x), abs(groundPosition.y)));
        vec3 lines = minorColour * grid(minorSpacing) + majorColour * grid(majorSpacing);
        vec3 colour = mix(groundColour, hazeColour, haze);
        colour += lines * (1.0 - haze) * mix(0.45, 1.0, nearArena);
        gl_FragColor = vec4(colour, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const grid = new Mesh(new PlaneGeometry(600, 600), material);
  grid.name = "world-grid";
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = GRID_HEIGHT;
  return grid;
}
