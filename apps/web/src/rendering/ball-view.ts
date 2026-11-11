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
import { createSpinView, spinColour, spinStrength } from "./spin-view";

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
    const material = ballMaterial.clone();
    const mesh = new Mesh(sphere, material);
    mesh.name = "game-ball";
    mesh.castShadow = true;
    root.add(mesh);
    const occluded = new Mesh(sphere, occludedMaterial);
    occluded.name = "occluded-ball";
    occluded.renderOrder = 10;
    root.add(occluded);
    const tailMaterial = trailMaterial.clone();
    const trail = Array.from({ length: 20 }, () => {
      const particle = new Mesh(sphere, tailMaterial);
      particle.name = "ball-trail";
      root.add(particle);
      return particle;
    });
    return {
      mesh,
      material,
      occluded,
      trail,
      tailMaterial,
      spin: createSpinView(root),
      positions: [] as Vector3[],
      id: -1,
    };
  });
  ballMaterial.dispose();
  trailMaterial.dispose();
  let lastTick = -1;
  return {
    update(state: MatchState, reduced: boolean, trailLimit = 20) {
      balls.forEach((view, index) => {
        const active = state.balls[index];
        const strength = spinStrength(active?.spin ?? 0);
        const colour = spinColour(active?.spin ?? 0);
        view.tailMaterial.color.setHex(colour);
        view.material.color.setHex(0xffffff).lerp(view.tailMaterial.color, strength * 0.3);
        view.material.emissive.setHex(0xcfeaff).lerp(view.tailMaterial.color, strength * 0.6);
        view.tailMaterial.opacity = 0.22 + strength * 0.25;
        view.spin.update(active, state.tick, reduced);
        view.mesh.visible = Boolean(active);
        if (active) view.mesh.position.set(active.position.x, 0.58, active.position.y);
        view.occluded.visible = view.mesh.visible;
        view.occluded.position.copy(view.mesh.position);
        if (!active || active.phase !== "active" || active.id !== view.id)
          view.positions.length = 0;
        view.id = active?.id ?? -1;
        if (active?.phase === "active" && state.tick !== lastTick) {
          const head = view.positions[0];
          if (!head || head.distanceTo(view.mesh.position) > 6) {
            view.positions.length = 0;
            view.positions.push(view.mesh.position.clone());
          } else {
            const distance = head.distanceTo(view.mesh.position);
            for (let step = 1; step <= Math.floor(distance / 0.22); step++)
              view.positions.unshift(
                head.clone().lerp(view.mesh.position, (step * 0.22) / distance),
              );
            view.positions.length = Math.min(view.positions.length, view.trail.length);
          }
        }
        view.trail.forEach((particle, part) => {
          const count = Math.min(trailLimit, strength > 0.025 ? 20 : 8);
          particle.visible = !reduced && part < count && Boolean(view.positions[part]);
          particle.scale.setScalar(
            Math.max(0, 1 - part / Math.max(1, count)) * (0.5 + strength * 0.15),
          );
          if (view.positions[part]) particle.position.copy(view.positions[part]);
        });
      });
      lastTick = state.tick;
    },
  };
}
