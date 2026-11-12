import { Group, Mesh, type Material } from "three";
import { FIXED_DT, fortress } from "../simulation/arena";
import { alive, type MatchState } from "../simulation/types";
import { angleDifference } from "../simulation/vector";
import { createFeatureEdges } from "./feature-edges";
import { SEATS } from "./palette";

const COPIES = 4;
const INTERVAL = 1 / 30;
type Pose = { time: number; x: number; y: number; z: number; angle: number };

/** A few faded copies of the complete bat at actual recent poses. */
export function createPaddleBlur(root: Group, paddles: readonly Mesh[]) {
  const group = new Group();
  group.name = "paddle-motion-blurs";
  root.add(group);
  const history: Pose[][] = paddles.map(() => []);
  const ghosts = paddles.map((paddle, seat) =>
    Array.from({ length: COPIES }, (_, index) => {
      const opacity = [0.2, 0.14, 0.09, 0.05][index]!;
      const fade = (source: Material) => {
        const material = source.clone();
        material.transparent = true;
        material.opacity = opacity;
        material.depthWrite = false;
        return material;
      };
      const material = Array.isArray(paddle.material)
        ? paddle.material.map(fade)
        : fade(paddle.material);
      const mesh = new Mesh(paddle.geometry, material);
      mesh.name = "paddle-motion-blur";
      mesh.visible = false;
      mesh.renderOrder = -1;
      const edges = createFeatureEdges(paddle.geometry, SEATS[seat]!.colour, {
        width: 4.5,
        power: 1.5,
        opacity,
      });
      edges.renderOrder = -1;
      mesh.add(edges);
      group.add(mesh);
      return mesh;
    }),
  );
  let lastTick = -1;
  return {
    reset() {
      lastTick = -1;
      history.forEach((poses) => {
        poses.length = 0;
      });
      ghosts.flat().forEach((mesh) => {
        mesh.visible = false;
      });
    },
    update(state: MatchState, budget = COPIES) {
      if (state.tick < lastTick)
        history.forEach((poses) => {
          poses.length = 0;
        });
      const advanced = state.tick !== lastTick;
      lastTick = state.tick;
      const now = state.tick * FIXED_DT;
      ghosts.flat().forEach((mesh) => {
        mesh.visible = false;
      });
      for (const player of state.players) {
        const poses = history[player.id]!,
          home = fortress(player.id, state.arena);
        ghosts[player.id]!.forEach((mesh) => {
          mesh.visible = false;
        });
        if (!budget || !alive(player) || state.phase === "finished") {
          poses.length = 0;
          continue;
        }
        if (advanced || !poses.length)
          poses.push({
            time: now,
            x: home.anchor.x,
            y: paddles[player.id]!.position.y,
            z: home.anchor.y,
            angle: player.angle,
          });
        while (poses.length > 2 && poses[1]!.time < now - COPIES * INTERVAL) poses.shift();
        let previous: Pose | undefined;
        for (let index = 0; index < Math.min(COPIES, budget); index++) {
          const time = now - (index + 1) * INTERVAL;
          const pose = poses.findLast((candidate) => candidate.time <= time + 1e-9);
          if (!pose || pose === previous) continue;
          previous = pose;
          if (
            Math.abs(angleDifference(pose.angle, player.angle)) < 0.008 &&
            Math.hypot(pose.x - home.anchor.x, pose.z - home.anchor.y) < 0.02
          )
            continue;
          const mesh = ghosts[player.id]![index]!;
          mesh.visible = true;
          mesh.position.set(pose.x, pose.y, pose.z);
          mesh.rotation.y = -pose.angle;
        }
      }
    },
  };
}
