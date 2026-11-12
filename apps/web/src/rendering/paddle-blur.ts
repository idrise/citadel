import {
  Color,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Mesh,
} from "three";
import { ARENA, FIXED_DT, fortress } from "../simulation/arena";
import { alive, type MatchState } from "../simulation/types";
import { angleDifference } from "../simulation/vector";
import { SEATS } from "./palette";

const EXPOSURE = 0.1;
const SAMPLES = 12;
type Pose = { time: number; offset: number };

/** Instanced exposures exclude the solid bat footprint, preventing overlapping-face flashes. */
export function createPaddleBlur(root: Group, paddles: readonly Mesh[]) {
  const group = new Group();
  group.name = "paddle-motion-blurs";
  root.add(group);
  const history: Pose[][] = paddles.map(() => []);
  const ghosts = paddles.map((paddle, seat) => {
    const geometry = paddle.geometry.clone();
    geometry.setAttribute(
      "trailOpacity",
      new InstancedBufferAttribute(new Float32Array(SAMPLES), 1),
    );
    const material = new ShaderMaterial({
      uniforms: {
        colour: { value: new Color(SEATS[seat]!.colour).multiplyScalar(1.6) },
        anchor: { value: new Vector2() },
        angle: { value: 0 },
      },
      vertexShader: `attribute float trailOpacity;
        varying float opacity; varying vec2 worldPoint;
        void main() {
          vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
          worldPoint = world.xz; opacity = trailOpacity;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: `uniform vec3 colour; uniform vec2 anchor; uniform float angle;
        varying float opacity; varying vec2 worldPoint;
        void main() {
          vec2 d = worldPoint - anchor;
          vec2 p = vec2(cos(angle)*d.x + sin(angle)*d.y, -sin(angle)*d.x + cos(angle)*d.y);
          p.x -= ${ARENA.railRadius - ARENA.batRadius};
          float radial = abs(length(p) - ${ARENA.batRadius});
          float angular = abs(atan(p.y, p.x));
          // Clear the current bat, including bevels and neon edges, at every height.
          if (radial < ${ARENA.paddleThickness / 2 + 0.07} && angular < ${ARENA.batHalfAngle + 0.03}) discard;
          gl_FragColor = vec4(colour, opacity);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const mesh = new InstancedMesh(geometry, material, SAMPLES);
    mesh.name = "paddle-motion-blur";
    mesh.count = 0;
    mesh.frustumCulled = false;
    group.add(mesh);
    return mesh;
  });
  const matrix = new Matrix4(),
    rotation = new Quaternion(),
    axis = new Vector3(0, 1, 0),
    scale = new Vector3(1, 1, 1);
  let lastTick = -1;
  return {
    update(state: MatchState, budget = SAMPLES) {
      if (state.tick < lastTick)
        history.forEach((poses) => {
          poses.length = 0;
        });
      const advanced = state.tick !== lastTick;
      lastTick = state.tick;
      const now = state.tick * FIXED_DT;
      for (const player of state.players) {
        const poses = history[player.id]!,
          mesh = ghosts[player.id]!;
        const home = fortress(player.id, state.arena);
        const offset = angleDifference(player.angle, home.direction);
        mesh.count = 0;
        if (!budget || !alive(player) || state.phase === "finished") {
          poses.length = 0;
          continue;
        }
        if (advanced || !poses.length) poses.push({ time: now, offset });
        while (poses.length > 2 && poses[1]!.time < now - EXPOSURE) poses.shift();
        const alpha = mesh.geometry.getAttribute("trailOpacity") as InstancedBufferAttribute;
        const samples = Math.min(SAMPLES, budget);
        for (let index = 0; index < samples; index++) {
          const age = (EXPOSURE * (index + 1)) / samples,
            time = now - age;
          if (time < poses[0]!.time - 1e-9) continue;
          let before = poses[0]!,
            after = poses[0]!;
          for (const pose of poses) {
            if (pose.time <= time) before = pose;
            after = pose;
            if (pose.time >= time) break;
          }
          const fraction =
            after.time > before.time
              ? Math.max(0, Math.min(1, (time - before.time) / (after.time - before.time)))
              : 0;
          const past = before.offset + angleDifference(after.offset, before.offset) * fraction;
          const gap = angleDifference(past, offset);
          if (Math.abs(gap) < 0.003) continue;
          rotation.setFromAxisAngle(axis, -(player.angle + gap));
          matrix.compose(paddles[player.id]!.position, rotation, scale);
          mesh.setMatrixAt(mesh.count, matrix);
          const strength = Math.min(1, Math.abs(gap) / (ARENA.paddleSpeed * age));
          alpha.setX(mesh.count, strength * 0.11 * (1 - index / samples));
          mesh.count++;
        }
        mesh.material.uniforms.anchor!.value.set(home.anchor.x, home.anchor.y);
        mesh.material.uniforms.angle!.value = player.angle;
        mesh.instanceMatrix.needsUpdate = true;
        alpha.needsUpdate = true;
      }
    },
  };
}
