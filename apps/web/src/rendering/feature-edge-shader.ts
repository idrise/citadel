/** Expand qualifying mesh edges in screen pixels; width is stable through perspective and resizing. */
export const edgeVertexShader = `
  uniform vec2 resolution;
  uniform float strokeWidth;
  uniform float pixelRatio;
  attribute vec3 edgeStart;
  attribute vec3 edgeEnd;
  varying vec2 strokePosition;
  varying float strokeLength;
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
    strokeLength = lengthPixels;
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
  void main() {
    float distanceToLine = length(vec2(strokePosition.x - clamp(strokePosition.x, 0.0, strokeLength), strokePosition.y));
    float halfWidth = strokeWidth * pixelRatio * 0.5;
    float coverage = 1.0 - smoothstep(halfWidth - 0.75, halfWidth + 0.75, distanceToLine);
    if (coverage < 0.01) discard;
    float core = 1.0 - smoothstep(0.0, halfWidth, distanceToLine);
    gl_FragColor = vec4(neonColour * (0.7 + core * 0.6), opacity * coverage);
    #include <colorspace_fragment>
  }
`;
