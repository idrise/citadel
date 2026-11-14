import { createBallTrail } from "./ball-trail";
import { createReadyCharge } from "./ready-charge";
import type { EffectsQuality } from "./quality";
import {
  GreaterDepth,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
  InstancedMesh,
  Matrix4,
} from "three";
import { ARENA, FIXED_DT, MAX_BALLS } from "../simulation/arena";
import type { MatchState } from "../simulation/types";
import { createSpinView } from "./spin-view";
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
  const balls = Array.from({ length: MAX_BALLS }, () => {
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
    const trail = new InstancedMesh(new SphereGeometry(BALL_VISUAL_RADIUS, 8, 6), tailMaterial, 20);
    trail.name = "ball-trail";
    trail.count = 0;
    trail.frustumCulled = false;
    root.add(trail);
    return {
      mesh,
      material,
      occluded,
      trail,
      tailMaterial,
      spin: createSpinView(root),
      aura,
      rotation: 0,
      history: createBallTrail(),
      samples: new Float32Array(40),
      id: -1,
    };
  });
  occludedMaterial.dispose();
  trailMaterial.dispose();
  const charge = createReadyCharge(root);
  const matrix = new Matrix4(),
    scale = new Vector3();
  let lastTick = -1;
  return {
    update(
      state: MatchState,
      reduced: boolean,
      trailLimit = 20,
      owners?: ReadonlyMap<number, number>,
      hide = false,
      quality: EffectsQuality = "high",
    ) {
      charge.update(state, reduced, hide, quality);
      balls.forEach((view, index) => {
        const active = state.phase === "finished" || hide ? undefined : state.balls[index];
        const owner =
          active?.phase === "ready" ? active.seat : active ? owners?.get(active.id) : undefined;
        const colour = owner === undefined ? 0xe4f7ff : SEATS[owner]!.colour;
        view.tailMaterial.color.setHex(colour);
        view.tailMaterial.color.multiplyScalar(2);
        view.material.color.setHex(colour);
        view.material.emissive.setHex(colour);
        view.aura.material.uniforms.colour!.value.setHex(colour);
        view.occluded.material.color.setHex(colour);
        view.tailMaterial.opacity = 0.45;
        view.spin.update(active, state.tick, reduced);
        view.mesh.visible = Boolean(active);
        if (active?.id !== view.id || state.tick < lastTick || active?.phase !== "active")
          view.rotation = 0;
        else if (!reduced && lastTick >= 0)
          view.rotation += Math.max(0, state.tick - lastTick) * FIXED_DT * (active.spin ?? 0) * 5;
        view.mesh.rotation.y = -view.rotation;
        view.aura.scale.setScalar(reduced ? 1.45 : active?.phase === "ready" ? 2.15 : 1.8);
        if (active) view.mesh.position.set(active.position.x, 0.58, active.position.y);
        view.occluded.visible = view.mesh.visible;
        view.occluded.position.copy(view.mesh.position);
        view.occluded.rotation.copy(view.mesh.rotation);
        if (!active || active.phase !== "active" || active.id !== view.id || state.tick < lastTick)
          view.history.reset();
        view.id = active?.id ?? -1;
        if (active?.phase === "active")
          view.history.push(state.tick * FIXED_DT, active.position.x, active.position.y);
        const count =
          reduced || active?.phase !== "active"
            ? 0
            : view.history.sample(
                state.tick * FIXED_DT,
                Math.hypot(active.velocity.x, active.velocity.y),
                Math.min(trailLimit, 20),
                view.samples,
              );
        view.trail.count = count;
        view.trail.visible = count > 0;
        for (let part = 0; part < count; part++) {
          scale.setScalar(Math.max(0, 1 - part / Math.max(1, count)) * 0.8);
          matrix.makeTranslation(view.samples[part * 2]!, 0.58, view.samples[part * 2 + 1]!);
          matrix.scale(scale);
          view.trail.setMatrixAt(part, matrix);
        }
        view.trail.instanceMatrix.needsUpdate = count > 0;
      });
      lastTick = state.tick;
    },
  };
}
