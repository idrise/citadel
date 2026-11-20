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
export const BALL_DEPARTURE_SECONDS = 0.8;
export const BALL_APPEAR_SECONDS = 0.16;
type Departure = { age: number; start: Vector3; scale: number; tail: Float32Array; count: number };
const lift = (age: number) => 10 * age + 130 * age * age;

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
    mesh.visible = false;
    root.add(mesh);
    const aura = createBallAura(sphere);
    mesh.add(aura);
    const occluded = new Mesh(sphere, occludedMaterial.clone());
    occluded.name = "occluded-ball";
    occluded.visible = false;
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
      appearance: 1,
      appearing: false,
      departure: null as Departure | null,
    };
  });
  occludedMaterial.dispose();
  trailMaterial.dispose();
  const charge = createReadyCharge(root);
  const matrix = new Matrix4(),
    scale = new Vector3();
  let lastTick = -1;
  let lastPhase: MatchState["phase"] | undefined;
  const depart = () => {
    for (const view of balls) {
      if (!view.mesh.visible || view.departure) continue;
      view.departure = {
        age: 0,
        start: view.mesh.position.clone(),
        scale: view.mesh.scale.x,
        tail: new Float32Array(view.trail.instanceMatrix.array),
        count: view.trail.count,
      };
    }
  };
  return {
    depart,
    update(
      state: MatchState,
      reduced: boolean,
      trailLimit = 20,
      owners?: ReadonlyMap<number, number>,
      hide = false,
      quality: EffectsQuality = "high",
      dt = FIXED_DT,
    ) {
      if (state.phase === "finished" && lastPhase !== "finished") depart();
      lastPhase = state.phase;
      balls.forEach((view, index) => {
        const departing = view.departure;
        if (departing) {
          departing.age += Math.max(0, Math.min(0.1, dt));
          const duration = reduced ? 0.12 : BALL_DEPARTURE_SECONDS;
          if (departing.age < duration) {
            view.mesh.position.copy(departing.start);
            if (!reduced) view.mesh.position.y += lift(departing.age);
            view.mesh.scale.setScalar(
              departing.scale * (reduced ? 1 - departing.age / duration : 1),
            );
            view.occluded.position.copy(view.mesh.position);
            view.occluded.scale.copy(view.mesh.scale);
            view.spin.place(view.mesh.position.y);
            view.trail.count = reduced ? 0 : departing.count;
            for (let part = 0; part < view.trail.count; part++) {
              matrix.fromArray(departing.tail, part * 16);
              matrix.elements[13]! += lift(Math.max(0, departing.age - part * 0.008));
              view.trail.setMatrixAt(part, matrix);
            }
            view.trail.visible = view.trail.count > 0;
            view.trail.instanceMatrix.needsUpdate = view.trail.count > 0;
            return;
          }
          view.departure = null;
          view.id = -1;
          view.mesh.visible = false;
        }
        const active = state.phase === "finished" || hide ? undefined : state.balls[index];
        if (active && (active.id !== view.id || state.tick < lastTick)) {
          view.appearance = 0;
          view.appearing = true;
        }
        if (!active) {
          view.appearance = 0;
          view.appearing = true;
        } else if (view.appearing || active.id !== view.id || state.tick < lastTick) {
          view.appearance = Math.min(1, view.appearance + Math.max(0, dt) / BALL_APPEAR_SECONDS);
          view.appearing = view.appearance < 1;
        }
        const appearance = view.appearance * view.appearance * (3 - 2 * view.appearance);
        const owner =
          active?.phase === "ready" ? active.seat : active ? owners?.get(active.id) : undefined;
        const colour = owner === undefined ? 0xe4f7ff : SEATS[owner]!.colour;
        view.tailMaterial.color.setHex(colour);
        view.tailMaterial.color.multiplyScalar(2);
        view.material.color.setHex(colour);
        view.material.emissive.setHex(colour);
        view.aura.material.uniforms.colour!.value.setHex(colour);
        view.occluded.material.color.setHex(colour);
        view.tailMaterial.opacity = 0.45 * appearance;
        view.spin.update(active, state.tick, reduced);
        view.mesh.visible = Boolean(active);
        view.mesh.scale.setScalar(appearance);
        view.spin.place(0.58, appearance);
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
        view.occluded.scale.copy(view.mesh.scale);
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
      charge.update(state, reduced, hide, quality, (id) => {
        const view = balls.find((item) => item.id === id && !item.departure);
        return view ? view.appearance * view.appearance * (3 - 2 * view.appearance) : 0;
      });
      lastTick = state.tick;
    },
  };
}
