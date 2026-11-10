import { Group, Mesh, MeshStandardMaterial, TetrahedronGeometry, Vector3 } from "three";
import { fortress } from "../simulation/arena";
import type { GameEvent } from "../simulation/types";
import { SEATS } from "./palette";

/** Small reusable geometry pool; no flash overlays, images or per-hit allocations. */
export function createEffects(root: Group) {
  const geometry = new TetrahedronGeometry(0.13);
  const materials = SEATS.map(
    (seat) =>
      new MeshStandardMaterial({ color: seat.colour, emissive: seat.colour, emissiveIntensity: 1 }),
  );
  const shards = Array.from({ length: 32 }, (_, index) => {
    const mesh = new Mesh(geometry, materials[Math.floor(index / 8)]!);
    mesh.visible = false;
    root.add(mesh);
    return { mesh, age: 1, velocity: new Vector3() };
  });
  return {
    emit(event: GameEvent, reduced: boolean) {
      if (event.type !== "damage" || event.piece === null) return;
      const centre = fortress(event.seat).pieces[event.piece]!;
      for (let part = 0; part < 8; part++) {
        const shard = shards[event.seat * 8 + part]!;
        shard.age = 0;
        shard.mesh.visible = !reduced || part < 3;
        shard.mesh.position.set(centre.x, 0.5, centre.y);
        const angle = (part * Math.PI) / 4 + event.id;
        shard.velocity.set(Math.cos(angle) * 1.8, 1.8 + part * 0.08, Math.sin(angle) * 1.8);
      }
    },
    update(dt: number) {
      for (const shard of shards) {
        if (!shard.mesh.visible) continue;
        shard.age += dt;
        shard.mesh.visible = shard.age < 0.65;
        shard.velocity.y -= dt * 6;
        shard.mesh.position.addScaledVector(shard.velocity, dt);
        shard.mesh.rotation.x += dt * 3;
        shard.mesh.rotation.z += dt * 2;
        shard.mesh.scale.setScalar(Math.max(0.1, 1 - shard.age));
      }
    },
  };
}
