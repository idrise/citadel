import { Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from "three";
import { ARENA } from "../simulation/arena";
import type { MatchState } from "../simulation/types";

export function createBallView(root: Group) {
  const sphere = new SphereGeometry(ARENA.ballRadius, 16, 12);
  const ballMaterial = new MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xcfeaff,
    emissiveIntensity: 2,
    roughness: 0.2,
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
    root.add(mesh);
    const trail = Array.from({ length: 8 }, (_, index) => {
      const particle = new Mesh(sphere, trailMaterial);
      particle.scale.setScalar((1 - index / 8) * 0.55);
      root.add(particle);
      return particle;
    });
    return { mesh, trail, positions: [] as Vector3[] };
  });
  let lastTick = -1;
  return {
    update(state: MatchState, reduced: boolean) {
      balls.forEach((view, index) => {
        const active = state.balls[index];
        view.mesh.visible = Boolean(active);
        if (active) view.mesh.position.set(active.position.x, 0.58, active.position.y);
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
