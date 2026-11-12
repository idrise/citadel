import { Group, Mesh, MeshBasicMaterial, ShaderMaterial, TorusGeometry, Vector3 } from "three";
import { SUPPLIES } from "../simulation/supplies";
import type { MatchState } from "../simulation/types";
import { createHealthFactory } from "./health-piece";
import { SEATS } from "./palette";

const TRANSFER_SECONDS = 0.55;
/** Falling resources and collection transfers are pooled observers of authoritative state. */
export function createSupplyView(root: Group) {
  const neutral = createHealthFactory(0xe5ff9b);
  const drops = Array.from({ length: 3 }, () => {
    const group = new Group(),
      container = neutral();
    group.name = "supply-drop";
    container.scale.setScalar(1.55);
    const ring = new Mesh(
      new TorusGeometry(0.65, 0.035, 6, 40),
      new MeshBasicMaterial({
        color: 0xe5ff9b,
        transparent: true,
        opacity: 0.65,
        toneMapped: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    group.add(container, ring);
    root.add(group);
    return { group, container, ring };
  });
  const flights = SEATS.flatMap((seat, id) => {
    const factory = createHealthFactory(seat.colour);
    return Array.from({ length: 2 }, () => {
      const group = factory();
      group.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.castShadow = false;
        const originals = Array.isArray(object.material) ? object.material : [object.material];
        const materials = originals.map((original) => {
          // Feature edges update their original uniforms in onBeforeRender.
          const material = original instanceof ShaderMaterial ? original : original.clone();
          material.transparent = true;
          material.depthWrite = false;
          material.opacity = 0.35;
          if (material instanceof ShaderMaterial) material.uniforms.opacity!.value = 0.45;
          return material;
        });
        object.material = Array.isArray(object.material) ? materials : materials[0]!;
      });
      group.name = "supply-transfer";
      group.visible = false;
      root.add(group);
      return { group, seat: id, piece: -1, age: TRANSFER_SECONDS, start: new Vector3() };
    });
  });
  let lastEvent = -1;
  return {
    reset() {
      lastEvent = -1;
      for (const flight of flights) {
        flight.age = TRANSFER_SECONDS;
        flight.group.visible = false;
      }
    },
    inTransit(seat: number, piece: number) {
      return flights.some((f) => f.group.visible && f.seat === seat && f.piece === piece);
    },
    update(state: MatchState, dt: number, reduced: boolean) {
      for (const event of state.events) {
        if (event.id <= lastEvent) continue;
        lastEvent = event.id;
        if (event.type !== "collection" || event.piece === null) continue;
        const candidates = flights.filter((f) => f.seat === event.seat);
        const flight = candidates.find((f) => f.age >= TRANSFER_SECONDS) ?? candidates[0]!;
        flight.age = 0;
        flight.piece = event.piece;
        flight.start.set(event.position.x, 0.05, event.position.y);
      }
      drops.forEach((view, index) => {
        const drop = state.phase === "finished" ? undefined : state.supplies[index];
        view.group.visible = Boolean(drop);
        if (!drop) return;
        view.group.position.set(drop.position.x, 0, drop.position.y);
        const fall = Math.min(1, drop.age / SUPPLIES.fall);
        view.container.position.y = reduced ? 0 : 8 * (1 - fall) ** 2;
        view.container.rotation.y = reduced ? 0 : drop.age * 0.7;
        view.ring.scale.setScalar(reduced ? 1 : 1 + Math.sin(drop.age * 4) * 0.08);
        view.ring.material.opacity = Math.min(0.65, (SUPPLIES.lifetime - drop.age) / 3);
      });
      for (const flight of flights) {
        flight.age += Math.max(0, dt);
        const body = state.players[flight.seat]?.pieces[flight.piece];
        flight.group.visible =
          !reduced &&
          state.phase === "playing" &&
          flight.age < TRANSFER_SECONDS &&
          Boolean(state.players[flight.seat]?.health[flight.piece]) &&
          Boolean(body);
        if (!flight.group.visible || !body) continue;
        const t = flight.age / TRANSFER_SECONDS;
        const eased = t * t * (3 - 2 * t);
        flight.group.position
          .copy(flight.start)
          .lerp(new Vector3(body.position.x, 0, body.position.y), eased);
        flight.group.position.y += Math.sin(t * Math.PI) * 2;
        flight.group.scale.setScalar(((1.55 - t * 0.55) * body.radius) / 0.26);
      }
    },
  };
}
