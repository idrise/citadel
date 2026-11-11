import {
  GreaterDepth,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import { ARENA } from "../simulation/arena";
import type { MatchState } from "../simulation/types";

export function createBallView(root: Group) {
  const sphere = new SphereGeometry(ARENA.ballRadius, 16, 12);
  const ballMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xcfeaff,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  // Solid wall caps can occlude a low ball. Show a faint ghost only at pixels behind opaque geometry.
  const occludedMaterial = new MeshBasicMaterial({
    color: 0xb4efff,
    transparent: true,
    opacity: 0.45,
    depthFunc: GreaterDepth,
    depthWrite: false,
    toneMapped: false,
  });
  const trailMaterial = new MeshStandardMaterial({
    color: 0x68cde5,
    emissive: 0x68cde5,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.22,
  });
  const balls = Array.from({ length: 8 }, () => {
    const mesh = new Mesh(sphere, ballMaterial);
    mesh.castShadow = true;
    root.add(mesh);
    const occluded = new Mesh(sphere, occludedMaterial);
    occluded.name = "occluded-ball";
    occluded.renderOrder = 10;
    root.add(occluded);
    const trail = Array.from({ length: 8 }, (_, index) => {
      const particle = new Mesh(sphere, trailMaterial);
      particle.scale.setScalar((1 - index / 8) * 0.55);
      root.add(particle);
      return particle;
    });
    return { mesh, occluded, trail, positions: [] as Vector3[] };
  });
  let lastTick = -1;
  return {
    update(state: MatchState, reduced: boolean) {
      balls.forEach((view, index) => {
        const active = state.balls[index];
        view.mesh.visible = Boolean(active);
        if (active) view.mesh.position.set(active.position.x, 0.58, active.position.y);
        view.occluded.visible = view.mesh.visible;
        view.occluded.position.copy(view.mesh.position);
        if (!active || active.phase !== "active") view.positions.length = 0;
        else if (state.tick !== lastTick) {
          view.positions.unshift(view.mesh.position.clone());
          view.positions.length = Math.min(view.positions.length, view.trail.length);
        }
        view.trail.forEach((particle, part) => {
          particle.visible = !reduced && Boolean(view.positions[part]);
          if (view.positions[part]) particle.position.copy(view.positions[part]);
        });
      });
      lastTick = state.tick;
    },
  };
}
