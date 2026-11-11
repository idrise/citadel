import { BoxGeometry, Group, Mesh, MeshBasicMaterial, TorusGeometry, Vector3 } from "three";
import { fortress } from "../simulation/arena";
import type { GameEvent, MatchState } from "../simulation/types";
import { SEATS } from "./palette";
/** Small pooled sparks and fortress rings. No hit-stop or simulation feedback. */
export function createImpactFeedback(root: Group) {
  const chip = new BoxGeometry(0.035, 0.035, 0.18),
    circle = new TorusGeometry(1, 0.025, 5, 48);
  const pool = Array.from({ length: 16 }, () => {
    const group = new Group();
    group.name = "impact-feedback";
    group.visible = false;
    root.add(group);
    const material = new MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    const ring = new Mesh(circle, material);
    ring.rotation.x = -Math.PI / 2;
    ring.name = "outcome-ring";
    group.add(ring);
    const sparks = Array.from({ length: 6 }, () => {
      const mesh = new Mesh(chip, material);
      mesh.name = "impact-spark";
      group.add(mesh);
      return { mesh, velocity: new Vector3() };
    });
    return { group, material, ring, sparks, age: 10, life: 0.2, outcome: false, victory: false };
  });
  return {
    emit(event: GameEvent, reduced: boolean, budget: number, state?: MatchState) {
      if (!["paddle", "wall", "elimination", "victory"].includes(event.type)) return;
      const outcome = event.type === "elimination" || event.type === "victory";
      if (!outcome && (reduced || budget === 0)) return;
      const item =
        pool.find((p) => p.age >= p.life) ?? pool.reduce((a, b) => (a.age > b.age ? a : b));
      item.age = 0;
      item.outcome = outcome;
      item.victory = event.type === "victory";
      item.life = outcome ? (reduced ? 0.3 : item.victory ? 1.6 : 0.6) : 0.2;
      const home = outcome && state && event.seat >= 0 ? fortress(event.seat, state.arena) : null;
      item.group.position.set(
        home ? home.anchor.x + Math.cos(home.direction) * 2.2 : event.position.x,
        0.1,
        home ? home.anchor.y + Math.sin(home.direction) * 2.2 : event.position.y,
      );
      item.material.color.setHex(SEATS[event.seat]?.colour ?? 0x6ce8ff).multiplyScalar(1.6);
      const normal = event.impact?.normal ?? { x: 1, y: 0 },
        base = Math.atan2(normal.y, normal.x);
      item.sparks.forEach((spark, index) => {
        const angle = base + (index - 2.5) * 0.4;
        spark.velocity.set(
          Math.cos(angle) * (1.2 + index * 0.12),
          0.5 + index * 0.12,
          Math.sin(angle) * (1.2 + index * 0.12),
        );
        spark.mesh.position.set(0, 0.55, 0);
        spark.mesh.rotation.set(angle, angle, 0);
      });
    },
    update(dt: number, reduced: boolean, budget: number) {
      for (const item of pool) {
        item.age += Math.max(0, dt);
        item.group.visible = item.age < item.life;
        if (!item.group.visible) continue;
        const t = item.age / item.life;
        item.material.opacity = (1 - t) * 0.8;
        item.ring.visible = item.outcome;
        item.ring.scale.setScalar(reduced ? 1.3 : 0.8 + t * (item.victory ? 2.2 : 1.3));
        item.sparks.forEach((spark, index) => {
          spark.mesh.visible = !item.outcome && !reduced && index < budget;
          spark.mesh.position.set(0, 0.55, 0).addScaledVector(spark.velocity, item.age);
          spark.mesh.position.y -= 2 * item.age * item.age;
        });
      }
    },
  };
}
