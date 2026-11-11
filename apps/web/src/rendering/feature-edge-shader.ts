/** Expand qualifying mesh edges in screen pixels; width is stable through perspective and resizing. */
export const edgeVertexShader = `
  uniform vec2 resolution;
  uniform float strokeWidth;
  uniform float pixelRatio;
  attribute vec3 edgeStart;
  attribute vec3 edgeEnd;
  varying vec2 strokePosition;
  varying float strokeLength;
  varying float strokeW;
  void main() {
    vec4 start = projectionMatrix * modelViewMatrix * vec4(edgeStart, 1.0);
    vec4 end = projectionMatrix * modelViewMatrix * vec4(edgeEnd, 1.0);
    vec2 delta = (end.xy / end.w - start.xy / start.w) * resolution * 0.5;
    float lengthPixels = max(length(delta), 0.001);
    vec2 direction = delta / lengthPixels;
    vec2 perpendicular = vec2(-direction.y, direction.x);
    float halfWidth = strokeWidth * pixelRatio * 0.5 + 1.0;
    float endpoint = step(0.0, position.x);
    vec4 clip = mix(start, end, endpoint);
    vec2 offset = (direction * position.x + perpendicular * position.y) * halfWidth;
    clip.xy += offset * 2.0 / resolution * clip.w;
    // Small bias prevents a solid's own surface eating its edge; other solids still occlude it.
    clip.z -= 0.000002 * clip.w;
    gl_Position = clip;
    strokePosition = vec2(mix(-halfWidth, lengthPixels + halfWidth, endpoint), position.y * halfWidth);
    // Multiplying by w and dividing in the fragment shader cancels perspective
    // interpolation, keeping the signed distance truly linear in screen pixels.
    strokePosition *= clip.w;
    strokeLength = lengthPixels * clip.w;
    strokeW = clip.w;
  }
`;

/** A bright core and softer shoulder feed bloom; analytic round caps hide joins between segments. */
export const edgeFragmentShader = `
  uniform vec3 neonColour;
  uniform float opacity;
  uniform float strokeWidth;
  uniform float pixelRatio;
  varying vec2 strokePosition;
  varying float strokeLength;
  varying float strokeW;
  void main() {
    vec2 p = strokePosition / strokeW;
    float lineLength = strokeLength / strokeW;
    float distanceToLine = length(vec2(p.x - clamp(p.x, 0.0, lineLength), p.y));
    float halfWidth = strokeWidth * pixelRatio * 0.5;
    float feather = max(fwidth(distanceToLine), 0.65);
    float coverage = 1.0 - smoothstep(halfWidth - feather, halfWidth + feather, distanceToLine);
    if (coverage < 0.01) discard;
    float core = 1.0 - smoothstep(0.0, halfWidth, distanceToLine);
    gl_FragColor = vec4(neonColour * (0.7 + core * 0.6), opacity * coverage);
    #include <colorspace_fragment>
  }
`;
