export interface Vec2 {
  x: number;
  y: number;
}
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (v: Vec2, n: number): Vec2 => ({ x: v.x * n, y: v.y * n });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const length = (v: Vec2): number => Math.hypot(v.x, v.y);
export const unit = (angle: number): Vec2 => ({ x: Math.cos(angle), y: Math.sin(angle) });
export const angleOf = (v: Vec2): number => Math.atan2(v.y, v.x);
export const angleDifference = (a: number, b: number): number =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const clamp = (n: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, n));
export const normalise = (v: Vec2): Vec2 => scale(v, 1 / (length(v) || 1));
