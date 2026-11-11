import type { Vec2 } from "./vector";
import type { BatSwipe } from "./flight";

export interface PlayerIntent {
  version: 1;
  targetAngle: number | null;
  steer: number;
  launch: boolean;
}
export const IDLE_INTENT: PlayerIntent = { version: 1, targetAngle: null, steer: 0, launch: false };
export interface PieceBody {
  position: Vec2;
  velocity: Vec2;
  radius: number;
}
export interface PlayerState {
  id: number;
  angle: number;
  health: boolean[];
  pieces: PieceBody[];
  swipe?: BatSwipe;
}
export interface BotState {
  targetAngle: number;
  reactionAt: number;
  serveDelay: number;
  serveTarget: Vec2 | null;
}
export interface BallState {
  id: number;
  phase: "ready" | "active";
  seat: number;
  age: number;
  position: Vec2;
  velocity: Vec2;
  slowSeat: number | null;
  spin?: number;
}
export interface ImpactDetails {
  time: number;
  normal: Vec2;
  incoming: Vec2;
  outgoing: Vec2;
  spin: number;
}
export interface GameEvent {
  id: number;
  tick: number;
  type: "arrival" | "launch" | "paddle" | "wall" | "damage" | "elimination" | "victory";
  position: Vec2;
  seat: number;
  piece: number | null;
  ballId?: number;
  radius?: number;
  returnTo?: Vec2;
  impact?: ImpactDetails;
}
export interface MatchOptions {
  humanSeat: number;
  slowdown: boolean;
  serveTimeout: number;
  ballSpeed: number;
  ballInterval: number;
  maxBalls: number;
}
export interface MatchState {
  tick: number;
  elapsed: number;
  countdown: number;
  phase: "countdown" | "playing" | "finished";
  players: PlayerState[];
  bots: BotState[];
  balls: BallState[];
  nextBallId: number;
  rng: number;
  winner: number | null;
  events: GameEvent[];
  nextEventId: number;
  stats: { paddleHits: number; damage: number; collisionCaps: number };
}
export const DEFAULT_OPTIONS: MatchOptions = {
  humanSeat: 0,
  slowdown: false,
  serveTimeout: 1.8,
  ballSpeed: 24,
  ballInterval: 15,
  maxBalls: 4,
};
export const alive = (player: PlayerState): boolean => player.health.some(Boolean);
