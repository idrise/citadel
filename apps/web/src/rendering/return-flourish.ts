import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from "three";
import type { GameEvent, MatchState } from "../simulation/types";
import { SEATS } from "./palette";

const DURATION = 0.18;

/** A brief raised arc indicates the revenge transfer without delaying or moving the real ball. */
export function createReturnFlourishes(root: Group) {
  const sphere = new SphereGeometry(0.075, 8, 6);
  const flights = Array.from({ length: 8 }, () => {
    const group = new Group();
    group.name = "revenge-flourish";
    group.visible = false;
    root.add(group);
    const material = new MeshBasicMaterial({ toneMapped: false });
    const comet = new Mesh(sphere, material);
    group.add(comet);
    const lineMaterial = new LineBasicMaterial({
      transparent: true,
      opacity: 0.6,
      toneMapped: false,
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(new Float32Array(36), 3));
    const line = new Line(geometry, lineMaterial);
    line.frustumCulled = false;
    group.add(line);
    return {
      group,
      material,
      lineMaterial,
      comet,
      geometry,
      start: new Vector3(),
      age: DURATION,
      ballId: -1,
    };
  });
  const target = new Vector3(),
    control = new Vector3();
  const point = (out: Vector3, start: Vector3, t: number) => {
    out.copy(start).multiplyScalar((1 - t) * (1 - t));
    out.addScaledVector(control, 2 * (1 - t) * t);
    out.addScaledVector(target, t * t);
    return out;
  };
  return {
    reset() {
      for (const item of flights) {
        item.age = DURATION;
        item.group.visible = false;
      }
    },
    emit(event: GameEvent) {
      if (event.type !== "damage" || !event.returnTo || event.ballId === undefined) return;
      const flight =
        flights.find((item) => item.age >= DURATION) ??
        flights.reduce((a, b) => (a.age > b.age ? a : b));
      flight.age = 0;
      flight.ballId = event.ballId;
      flight.start.set(event.position.x, 0.75, event.position.y);
      const colour = SEATS[event.seat]!.colour;
      flight.material.color.setHex(colour).multiplyScalar(1.8);
      flight.lineMaterial.color.copy(flight.material.color);
    },
    update(dt: number, reduced: boolean, state: MatchState) {
      for (const flight of flights) {
        flight.age += Math.max(0, dt);
        const ball = state.balls.find(
          (candidate) => candidate.id === flight.ballId && candidate.phase === "ready",
        );
        flight.group.visible = !reduced && flight.age < DURATION && Boolean(ball);
        if (!flight.group.visible || !ball) continue;
        target.set(ball.position.x, 0.58, ball.position.y);
        control.copy(flight.start).add(target).multiplyScalar(0.5);
        control.y = 1.9;
        const t = flight.age / DURATION;
        point(flight.comet.position, flight.start, t);
        const attribute = flight.geometry.getAttribute("position");
        const sample = new Vector3();
        for (let index = 0; index < 12; index++) {
          point(sample, flight.start, Math.max(0, t - 0.25) + (index / 11) * Math.min(t, 0.25));
          attribute.setXYZ(index, sample.x, sample.y, sample.z);
        }
        attribute.needsUpdate = true;
        flight.lineMaterial.opacity = 0.6 * (1 - t);
      }
    },
  };
}
