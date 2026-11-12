import { Color, Group, Mesh, MeshBasicMaterial } from "three";
import { ARENA, FIXED_DT, fortress } from "../simulation/arena";
import { alive, type MatchState } from "../simulation/types";
import { angleDifference } from "../simulation/vector";
import { SEATS } from "./palette";

const EXPOSURE = 0.075;
type Pose = { time: number; offset: number };

/** Short translucent exposures follow the actual paddle arc; no simulation writes. */
export function createPaddleBlur(root: Group, paddles: readonly Mesh[]) {
  const group = new Group();
  group.name = "paddle-motion-blurs";
  root.add(group);
  const history: Pose[][] = paddles.map(() => []);
  const ghosts = paddles.map((paddle, seat) =>
    Array.from({ length: 5 }, () => {
      const material = new MeshBasicMaterial({
        color: new Color(SEATS[seat]!.colour).multiplyScalar(1.6),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      });
      const mesh = new Mesh(paddle.geometry, material);
      mesh.name = "paddle-motion-blur";
      mesh.visible = false;
      group.add(mesh);
      return mesh;
    }),
  );
  let lastTick = -1;
  return {
    update(state: MatchState, budget = 5) {
      if (state.tick < lastTick)
        history.forEach((poses) => {
          poses.length = 0;
        });
      const advanced = state.tick !== lastTick;
      lastTick = state.tick;
      const now = state.tick * FIXED_DT;
      for (const player of state.players) {
        const poses = history[player.id]!;
        const home = fortress(player.id, state.arena);
        const offset = angleDifference(player.angle, home.direction);
        if (!budget || !alive(player) || state.phase === "finished") {
          poses.length = 0;
          ghosts[player.id]!.forEach((mesh) => {
            mesh.visible = false;
          });
          continue;
        }
        if (advanced || !poses.length) poses.push({ time: now, offset });
        while (poses.length > 2 && poses[1]!.time < now - EXPOSURE) poses.shift();
        ghosts[player.id]!.forEach((mesh, index) => {
          const age = (EXPOSURE * (index + 1)) / budget;
          const time = now - age;
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
          const strength = Math.min(1, Math.abs(gap) / (ARENA.paddleSpeed * age));
          mesh.visible = index < budget && Math.abs(gap) > 0.003;
          mesh.material.opacity = strength * 0.13 * (1 - index / 6);
          mesh.position.copy(paddles[player.id]!.position);
          mesh.rotation.y = -(player.angle + gap);
        });
      }
    },
  };
}
