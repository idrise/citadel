import { GreaterDepth, Group, Mesh, MeshBasicMaterial, SphereGeometry, Vector3 } from "three";
import { ARENA, FIXED_DT } from "../simulation/arena";
import type { MatchState } from "../simulation/types";
import { createSpinView, spinStrength } from "./spin-view";
import { SEATS } from "./palette";
import { createBallAura, createBallMaterial } from "./ball-surface";

// A larger luminous presentation shell; authoritative collision radius stays in simulation.
export const BALL_VISUAL_RADIUS = ARENA.ballRadius * 1.35;

export function createBallView(root: Group) {
  // Solid wall caps can occlude a low ball. Show a faint ghost only at pixels behind opaque geometry.
  const occludedMaterial = new MeshBasicMaterial({
    color: 0xb4efff,
    transparent: true,
    opacity: 0.45,
    depthFunc: GreaterDepth,
    depthWrite: false,
    toneMapped: false,
  });
  const sphere = new SphereGeometry(BALL_VISUAL_RADIUS, 24, 16);
  const trailMaterial = new MeshBasicMaterial({
    color: 0x68cde5,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    toneMapped: false,
  });
  const balls = Array.from({ length: 8 }, () => {
    const material = createBallMaterial();
    const mesh = new Mesh(sphere, material);
    mesh.name = "game-ball";
    mesh.castShadow = true;
    root.add(mesh);
    const aura = createBallAura(sphere);
    mesh.add(aura);
    const occluded = new Mesh(sphere, occludedMaterial.clone());
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
      aura,
      rotation: 0,
      positions: [] as Vector3[],
      id: -1,
    };
  });
  occludedMaterial.dispose();
  trailMaterial.dispose();
  let lastTick = -1;
  return {
    update(
      state: MatchState,
      reduced: boolean,
      trailLimit = 20,
      owners?: ReadonlyMap<number, number>,
    ) {
      balls.forEach((view, index) => {
        const active = state.balls[index];
        const strength = spinStrength(active?.spin ?? 0);
        const owner =
          active?.phase === "ready" ? active.seat : active ? owners?.get(active.id) : undefined;
        const colour = owner === undefined ? 0xe4f7ff : SEATS[owner]!.colour;
        view.tailMaterial.color.setHex(colour);
        view.tailMaterial.color.multiplyScalar(2);
        view.material.color.setHex(colour);
        view.material.emissive.setHex(colour);
        view.aura.material.uniforms.colour!.value.setHex(colour);
        view.occluded.material.color.setHex(colour);
        view.tailMaterial.opacity = 0.45 + strength * 0.2;
        view.spin.update(active, state.tick, reduced);
        view.mesh.visible = Boolean(active);
        if (active?.id !== view.id || state.tick < lastTick || active?.phase !== "active")
          view.rotation = 0;
        else if (!reduced && lastTick >= 0)
          view.rotation += Math.max(0, state.tick - lastTick) * FIXED_DT * (active.spin ?? 0) * 5;
        view.mesh.rotation.y = -view.rotation;
        view.aura.scale.setScalar(reduced ? 1.45 : 1.8);
        if (active) view.mesh.position.set(active.position.x, 0.58, active.position.y);
        view.occluded.visible = view.mesh.visible;
        view.occluded.position.copy(view.mesh.position);
        view.occluded.rotation.copy(view.mesh.rotation);
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
            for (let step = 1; step <= Math.floor(distance / 0.12); step++)
              view.positions.unshift(
                head.clone().lerp(view.mesh.position, (step * 0.12) / distance),
              );
            view.positions.length = Math.min(view.positions.length, view.trail.length);
          }
        }
        view.trail.forEach((particle, part) => {
          const count = Math.min(trailLimit, strength > 0.025 ? 20 : 8);
          particle.visible = !reduced && part < count && Boolean(view.positions[part]);
          particle.scale.setScalar(
            Math.max(0, 1 - part / Math.max(1, count)) * (0.8 + strength * 0.15),
          );
          if (view.positions[part]) particle.position.copy(view.positions[part]);
        });
      });
      lastTick = state.tick;
    },
  };
}
