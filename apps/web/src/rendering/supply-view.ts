import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from "three";
import { createNeonLettering } from "./neon-lettering";
import { fortress } from "../simulation/arena";
import { SUPPLIES } from "../simulation/supplies";
import type { MatchState } from "../simulation/types";
import { createHealthFactory } from "./health-piece";
import { SEATS } from "./palette";

export const TRANSFER_SECONDS = 0.85;
export const ARRIVAL_SECONDS = 0.65;
const LIFE = TRANSFER_SECONDS + ARRIVAL_SECONDS;
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
          material.opacity = 0.7;
          if (material instanceof ShaderMaterial) material.uniforms.opacity!.value = 0.8;
          return material;
        });
        object.material = Array.isArray(object.material) ? materials : materials[0]!;
      });
      group.name = "supply-transfer";
      group.visible = false;
      root.add(group);
      const material = new MeshBasicMaterial({
        color: seat.colour,
        transparent: true,
        opacity: 0.8,
        toneMapped: false,
        depthWrite: false,
      });
      const arrival = new Mesh(new TorusGeometry(0.7, 0.045, 6, 32), material);
      arrival.name = "supply-arrival";
      arrival.rotation.x = -Math.PI / 2;
      arrival.visible = false;
      root.add(arrival);
      const source = new Mesh(arrival.geometry, material.clone());
      source.name = "supply-collection-ring";
      source.rotation.x = -Math.PI / 2;
      source.visible = false;
      root.add(source);
      const label = createNeonLettering("+1", 0.9, seat.colour);
      label.name = "supply-award";
      label.visible = false;
      root.add(label);
      const geometry = new BufferGeometry();
      geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(36), 3));
      const line = new Line(
        geometry,
        new LineBasicMaterial({
          color: seat.colour,
          transparent: true,
          opacity: 0.8,
          toneMapped: false,
          depthWrite: false,
        }),
      );
      line.name = "supply-streak";
      line.frustumCulled = false;
      line.visible = false;
      root.add(line);
      return {
        group,
        arrival,
        source,
        label,
        line,
        seat: id,
        piece: -1,
        age: LIFE,
        start: new Vector3(),
      };
    });
  });
  const target = new Vector3(),
    sample = new Vector3();
  const point = (out: Vector3, start: Vector3, t: number) => {
    const eased = t * t * (3 - 2 * t);
    out.copy(start).lerp(target, eased);
    out.y += Math.sin(t * Math.PI) * 2.7;
    return out;
  };
  let lastEvent = -1;
  return {
    reset() {
      lastEvent = -1;
      for (const flight of flights) {
        flight.age = LIFE;
        flight.group.visible = false;
        flight.arrival.visible =
          flight.source.visible =
          flight.label.visible =
          flight.line.visible =
            false;
      }
    },
    inTransit(seat: number, piece: number) {
      return flights.some((f) => f.group.visible && f.seat === seat && f.piece === piece);
    },
    update(state: MatchState, dt: number, reduced: boolean, humanSeat = 0, portrait = false) {
      for (const event of state.events) {
        if (event.id <= lastEvent) continue;
        lastEvent = event.id;
        if (event.type !== "collection" || event.piece === null) continue;
        const candidates = flights.filter((f) => f.seat === event.seat);
        const flight = candidates.find((f) => f.age >= LIFE) ?? candidates[0]!;
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
        const live =
          state.phase === "playing" &&
          flight.age < LIFE &&
          Boolean(body) &&
          Boolean(state.players[flight.seat]?.health[flight.piece]);
        flight.group.visible = flight.line.visible =
          live && !reduced && flight.age < TRANSFER_SECONDS;
        flight.source.visible = live && !reduced && flight.age < 0.3;
        flight.arrival.visible = flight.label.visible =
          live && (reduced || flight.age >= TRANSFER_SECONDS);
        if (!live || !body) continue;
        target.set(body.position.x, 0, body.position.y);
        const t = Math.min(1, flight.age / TRANSFER_SECONDS);
        if (flight.group.visible) {
          point(flight.group.position, flight.start, t);
          flight.group.scale.setScalar(((1.7 - t * 0.7) * body.radius) / 0.26);
          const attribute = flight.line.geometry.getAttribute("position");
          for (let i = 0; i < 12; i++) {
            point(sample, flight.start, Math.max(0, t - 0.35) + (i / 11) * Math.min(t, 0.35));
            attribute.setXYZ(i, sample.x, sample.y + 0.55, sample.z);
          }
          attribute.needsUpdate = true;
        }
        flight.source.position.copy(flight.start);
        flight.source.position.y = 0.06;
        flight.source.scale.setScalar(0.7 + flight.age * 4);
        flight.source.material.opacity = 0.8 * Math.max(0, 1 - flight.age / 0.3);
        const arrival = Math.max(0, (flight.age - TRANSFER_SECONDS) / ARRIVAL_SECONDS);
        flight.arrival.position.copy(target);
        flight.arrival.position.y = 0.06;
        flight.arrival.scale.setScalar(reduced ? 1 : 1 + arrival * 0.8);
        flight.arrival.material.opacity = 0.9 * (1 - arrival);
        const viewer = fortress(humanSeat, state.arena).anchor,
          home = fortress(flight.seat, state.arena);
        flight.label.rotation.set(portrait ? -0.95 : 0, Math.atan2(viewer.x, viewer.y), 0, "YXZ");
        flight.label.position.set(
          body.position.x + Math.cos(home.direction) * 0.9,
          2.8 + (reduced ? 0 : arrival * 0.8),
          body.position.y + Math.sin(home.direction) * 0.9,
        );
        // The award labels face the same current viewer as the arena, rather than an opponent.
        flight.label.scale.setScalar(reduced ? 1 : 1 - arrival * 0.25);
      }
    },
  };
}
