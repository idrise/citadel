import {
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  TetrahedronGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import { ARENA } from "../simulation/arena";
import type { GameEvent } from "../simulation/types";
import { SEATS } from "./palette";

const LIFE = 0.62;
const PARTS = 10;

/** Bounded, reusable breakup pool: a low ring and fragments distributed through the lost piece's height. */
export function createFractureBursts(root: Group) {
  const shardGeometry = new TetrahedronGeometry(0.15);
  const ringGeometry = new TorusGeometry(0.32, 0.025, 6, 40);
  const bursts = Array.from({ length: 12 }, () => {
    const group = new Group();
    group.name = "fracture-burst";
    group.visible = false;
    root.add(group);
    const material = new MeshStandardMaterial({
      transparent: true,
      depthWrite: false,
      metalness: 0.65,
      roughness: 0.25,
      emissiveIntensity: 2,
    });
    const ringMaterial = new MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.name = "fracture-ring";
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    group.add(ring);
    const shards = Array.from({ length: PARTS }, () => {
      const mesh = new Mesh(shardGeometry, material);
      mesh.name = "fracture-shard";
      group.add(mesh);
      return { mesh, birth: new Vector3(), velocity: new Vector3(), turn: 0 };
    });
    return { group, material, ring, ringMaterial, shards, age: LIFE, size: 1 };
  });
  return {
    emit(event: GameEvent, reduced: boolean, parts = PARTS) {
      if (event.type !== "damage") return;
      const burst =
        bursts.find((item) => item.age >= LIFE) ?? bursts.reduce((a, b) => (a.age > b.age ? a : b));
      burst.age = 0;
      burst.size = (event.radius ?? ARENA.pieceRadius) / ARENA.pieceRadius;
      burst.group.position.set(event.position.x, 0, event.position.y);
      burst.group.visible = true;
      const colour = SEATS[event.seat]!.colour;
      burst.material.color.setHex(colour);
      burst.material.emissive.setHex(colour);
      burst.ringMaterial.color.setHex(colour).multiplyScalar(1.8);
      const push = event.impact?.incoming;
      const speed = Math.hypot(push?.x ?? 0, push?.y ?? 0) || 1;
      burst.shards.forEach((shard, index) => {
        const angle = index * 2.399963 + event.id * 0.7;
        shard.birth.set(
          Math.cos(angle) * 0.15 * burst.size,
          (0.2 + (index / PARTS) * 0.9) * burst.size,
          Math.sin(angle) * 0.15 * burst.size,
        );
        const force = reduced ? 0.65 : 2.1;
        shard.velocity.set(
          (Math.cos(angle) * force + ((push?.x ?? 0) / speed) * 0.45) * burst.size,
          (reduced ? 0.8 : 1.8) + index * 0.06,
          (Math.sin(angle) * force + ((push?.y ?? 0) / speed) * 0.45) * burst.size,
        );
        shard.turn = angle;
        shard.mesh.position.copy(shard.birth);
        shard.mesh.visible = index < (reduced ? 3 : Math.min(parts, PARTS));
      });
    },
    update(dt: number, reduced: boolean, parts = PARTS) {
      for (const burst of bursts) {
        if (burst.age >= LIFE) continue;
        burst.age += Math.max(0, dt);
        const t = burst.age / LIFE;
        burst.group.visible = t < 1;
        if (t >= 1) continue;
        burst.material.opacity = 0.95 * (1 - t);
        burst.ring.visible = !reduced && t < 0.8;
        burst.ring.scale.setScalar(burst.size * (1 + t * 2.2));
        burst.ringMaterial.opacity = 0.75 * (1 - t) * (1 - t);
        burst.shards.forEach((shard, index) => {
          shard.mesh.visible = index < (reduced ? 3 : Math.min(parts, PARTS));
          shard.mesh.position.copy(shard.birth).addScaledVector(shard.velocity, burst.age);
          shard.mesh.position.y -= 3 * burst.age * burst.age;
          shard.mesh.rotation.set(shard.turn + burst.age * 5, shard.turn, burst.age * 3);
          shard.mesh.scale.setScalar(burst.size * Math.max(0.05, 1 - t));
        });
      }
    },
  };
}
