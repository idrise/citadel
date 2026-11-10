import { ARENA, batCentre } from "./arena";
import {
  add,
  angleDifference,
  angleOf,
  dot,
  length,
  normalise,
  scale,
  sub,
  unit,
  type Vec2,
} from "./vector";

export interface Contact {
  time: number;
  normal: Vec2;
  separation?: number;
}
export interface PaddleContact extends Contact {
  offset: number;
}
const EPS = 1e-8;

/** Entering times only. Starting overlapped while departing must not bounce twice. */
export function sweepCircle(
  position: Vec2,
  velocity: Vec2,
  centre: Vec2,
  radius: number,
  duration: number,
): Contact | null {
  const relative = sub(position, centre);
  const a = dot(velocity, velocity);
  const b = dot(relative, velocity);
  const c = dot(relative, relative) - radius * radius;
  if (a < EPS || b >= 0) return null;
  const discriminant = b * b - a * c;
  if (discriminant < 0) return null;
  const time = c <= 0 ? 0 : (-b - Math.sqrt(discriminant)) / a;
  if (time < -EPS || time > duration + EPS) return null;
  return {
    time: Math.max(0, time),
    normal: normalise(add(relative, scale(velocity, time))),
    separation: Math.max(0, radius - length(relative)),
  };
}

export function sweepWalls(position: Vec2, velocity: Vec2, duration: number): Contact[] {
  const limit = ARENA.halfSize - ARENA.ballRadius;
  const contacts: Contact[] = [];
  for (const axis of ["x", "y"] as const) {
    const speed = velocity[axis];
    if (Math.abs(speed) < EPS) continue;
    const sign = Math.sign(speed);
    const outside = Math.abs(position[axis]) > limit && Math.sign(position[axis]) === sign;
    const time = outside ? 0 : (sign * limit - position[axis]) / speed;
    if (time >= -EPS && time <= duration + EPS) {
      contacts.push({
        time: Math.max(0, time),
        normal: axis === "x" ? { x: -sign, y: 0 } : { x: 0, y: -sign },
        separation: outside ? Math.abs(position[axis]) - limit : 0,
      });
    }
  }
  return contacts;
}

/** Radial faces are exact circles; moving rounded ends use their short fixed-tick chords. */
export function sweepPaddle(
  position: Vec2,
  velocity: Vec2,
  seat: number,
  angle: number,
  angularVelocity: number,
  duration: number,
): PaddleContact | null {
  const anchor = batCentre(seat, angle);
  const finishCentre = batCentre(seat, angle + angularVelocity * duration);
  const centreVelocity =
    duration > 0 ? scale(sub(finishCentre, anchor), 1 / duration) : { x: 0, y: 0 };
  const relative = sub(position, anchor);
  const relativeVelocity = sub(velocity, centreVelocity);
  const inflation = ARENA.ballRadius + ARENA.paddleThickness / 2;
  const candidates: PaddleContact[] = [];
  const a = dot(relativeVelocity, relativeVelocity);
  const b = dot(relative, relativeVelocity);
  if (a > EPS) {
    for (const side of [-1, 1]) {
      const radius = ARENA.batRadius + side * inflation;
      const discriminant = b * b - a * (dot(relative, relative) - radius * radius);
      if (discriminant < 0) continue;
      for (const root of [(-b - Math.sqrt(discriminant)) / a, (-b + Math.sqrt(discriminant)) / a]) {
        if (root < -EPS || root > duration + EPS) continue;
        const time = Math.max(0, root);
        const point = add(relative, scale(relativeVelocity, time));
        const normal = scale(normalise(point), side);
        const offset =
          angleDifference(angleOf(point), angle + angularVelocity * time) / ARENA.batHalfAngle;
        if (Math.abs(offset) <= 1 && dot(relativeVelocity, normal) < -EPS)
          candidates.push({ time, normal, offset });
      }
    }
  }
  for (const end of [-1, 1]) {
    const start = add(anchor, scale(unit(angle + end * ARENA.batHalfAngle), ARENA.batRadius));
    const finish = add(
      finishCentre,
      scale(unit(angle + angularVelocity * duration + end * ARENA.batHalfAngle), ARENA.batRadius),
    );
    const capVelocity = duration > 0 ? scale(sub(finish, start), 1 / duration) : { x: 0, y: 0 };
    const hit = sweepCircle(position, sub(velocity, capVelocity), start, inflation, duration);
    if (hit) candidates.push({ ...hit, offset: end });
  }
  return candidates.sort((left, right) => left.time - right.time)[0] ?? null;
}

export function paddleReturn(incoming: Vec2, offset: number, contactNormal: Vec2): Vec2 {
  const faceAngle = angleOf(contactNormal);
  let direction = unit(faceAngle + Math.max(-1, Math.min(1, offset)) * 0.32);
  // A rounded-end hit must still leave its actual contact surface.
  const outward = dot(direction, contactNormal);
  if (outward < 0.15) direction = normalise(add(direction, scale(contactNormal, 0.15 - outward)));
  return scale(direction, length(incoming));
}
