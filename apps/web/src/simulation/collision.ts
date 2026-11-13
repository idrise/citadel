import { ARENA, batCentre, batHalfAngle, SQUARE_ARENA, type ArenaGeometry } from "./arena";
import { polygonEdges } from "./polygon";
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

export function sweepWalls(
  position: Vec2,
  velocity: Vec2,
  duration: number,
  arena: ArenaGeometry = SQUARE_ARENA,
): Contact[] {
  const contacts: Contact[] = [];
  for (const { start, normal } of polygonEdges(arena.vertices)) {
    const distance = dot(sub(position, start), normal) - ARENA.ballRadius;
    const speed = dot(velocity, normal);
    if (speed >= -EPS) continue;
    const time = distance <= 0 ? 0 : -distance / speed;
    if (time >= -EPS && time <= duration + EPS)
      contacts.push({ time: Math.max(0, time), normal, separation: Math.max(0, -distance) });
  }
  return contacts.sort((a, b) => Math.abs(b.normal.x) - Math.abs(a.normal.x));
}

/** Radial faces are exact circles; moving rounded ends use their short fixed-tick chords. */
export function sweepPaddle(
  position: Vec2,
  velocity: Vec2,
  seat: number,
  angle: number,
  angularVelocity: number,
  duration: number,
  arena: ArenaGeometry = SQUARE_ARENA,
): PaddleContact | null {
  const halfAngle = batHalfAngle(arena);
  const anchor = batCentre(seat, angle, arena);
  const finishCentre = batCentre(seat, angle + angularVelocity * duration, arena);
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
        const offset = angleDifference(angleOf(point), angle + angularVelocity * time) / halfAngle;
        if (Math.abs(offset) <= 1 && dot(relativeVelocity, normal) < -EPS)
          candidates.push({ time, normal, offset });
      }
    }
  }
  for (const end of [-1, 1]) {
    const start = add(anchor, scale(unit(angle + end * halfAngle), ARENA.batRadius));
    const finish = add(
      finishCentre,
      scale(unit(angle + angularVelocity * duration + end * halfAngle), ARENA.batRadius),
    );
    const capVelocity = duration > 0 ? scale(sub(finish, start), 1 / duration) : { x: 0, y: 0 };
    const hit = sweepCircle(position, sub(velocity, capVelocity), start, inflation, duration);
    if (hit) candidates.push({ ...hit, offset: end });
  }
  return candidates.sort((left, right) => left.time - right.time)[0] ?? null;
}

export const PADDLE_EDGE_AIM = 0.45;

export function paddleReturn(incoming: Vec2, offset: number, contactNormal: Vec2): Vec2 {
  const faceAngle = angleOf(contactNormal);
  let direction = unit(faceAngle + Math.max(-1, Math.min(1, offset)) * PADDLE_EDGE_AIM);
  // A rounded-end hit must still leave its actual contact surface.
  const outward = dot(direction, contactNormal);
  if (outward < 0.15) direction = normalise(add(direction, scale(contactNormal, 0.15 - outward)));
  return scale(direction, length(incoming));
}
