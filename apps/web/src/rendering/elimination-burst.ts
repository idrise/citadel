import {
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import type { GameEvent } from "../simulation/types";
import { SEATS } from "./palette";

export function creditedPlayerKill(event: GameEvent, humanSeat: number) {
  return (
    event.type === "elimination" && event.attackerSeat === humanSeat && event.seat !== humanSeat
  );
}

const LIFE = 1.25,
  PARTS = 32;
/** A bounded fortress-sized breakup, independent of damage particles and simulation RNG. */
export function createEliminationBursts(root: Group) {
  const fragment = new TetrahedronGeometry(0.17),
    ringGeometry = new TorusGeometry(0.7, 0.035, 6, 48),
    coreGeometry = new SphereGeometry(0.36, 12, 8);
  const matrix = new Matrix4(),
    position = new Vector3(),
    scale = new Vector3(),
    axis = new Vector3(),
    rotation = new Quaternion();
  const bursts = Array.from({ length: 6 }, () => {
    const group = new Group();
    group.name = "elimination-burst";
    group.visible = false;
    root.add(group);
    const material = new MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const shards = new InstancedMesh(fragment, material, PARTS);
    shards.name = "elimination-shards";
    shards.frustumCulled = false;
    const ringMaterial = material.clone(),
      coreMaterial = material.clone();
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    const core = new Mesh(coreGeometry, coreMaterial);
    core.position.y = 0.65;
    group.add(shards, ring, core);
    return {
      group,
      material,
      ringMaterial,
      coreMaterial,
      shards,
      ring,
      core,
      age: LIFE,
      velocities: Array.from({ length: PARTS }, () => new Vector3()),
    };
  });
  return {
    reset() {
      for (const burst of bursts) {
        burst.age = LIFE;
        burst.group.visible = false;
      }
    },
    emit(event: GameEvent) {
      if (event.type !== "elimination") return;
      const burst =
        bursts.find((b) => b.age >= LIFE) ?? bursts.reduce((a, b) => (a.age > b.age ? a : b));
      burst.age = 0;
      burst.group.position.set(event.position.x, 0, event.position.y);
      const colour = SEATS[event.seat]?.colour ?? 0x7ce5ff;
      for (const material of [burst.material, burst.ringMaterial, burst.coreMaterial])
        material.color.setHex(colour).multiplyScalar(2.6);
      burst.velocities.forEach((v, i) => {
        const angle = i * 2.399963 + event.id * 0.41,
          speed = 2.1 + (i % 5) * 0.48;
        v.set(Math.cos(angle) * speed, 1.4 + (i % 7) * 0.36, Math.sin(angle) * speed);
      });
    },
    update(dt: number, reduced: boolean, budget: number) {
      for (const burst of bursts) {
        burst.age += Math.max(0, dt);
        const t = burst.age / LIFE;
        burst.group.visible = t < 1;
        if (!burst.group.visible) continue;
        burst.shards.visible = !reduced;
        burst.shards.count = budget <= 3 ? 12 : budget <= 7 ? 22 : PARTS;
        burst.material.opacity = Math.max(0, 1 - t) * 0.9;
        burst.ring.scale.setScalar(reduced ? 1.8 : 1 + burst.age * 4);
        burst.ringMaterial.opacity = (reduced ? 0.45 : 0.75) * (1 - t) ** 2;
        burst.core.visible = !reduced && burst.age < 0.16;
        burst.core.scale.setScalar(1 + burst.age * 4);
        burst.coreMaterial.opacity = Math.max(0, 0.7 * (1 - burst.age / 0.16));
        for (let i = 0; i < burst.shards.count && !reduced; i++) {
          const v = burst.velocities[i]!;
          position.copy(v).multiplyScalar(burst.age);
          position.y += 0.65 - 2.5 * burst.age ** 2;
          rotation.setFromAxisAngle(axis.copy(v).normalize(), burst.age * (3 + (i % 4)));
          scale.setScalar(Math.max(0.04, 1 - t));
          matrix.compose(position, rotation, scale);
          burst.shards.setMatrixAt(i, matrix);
        }
        burst.shards.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
