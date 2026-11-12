import type { OutlineTransition } from "./outline-transition";
import type { ArenaGeometry } from "./arena";
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
  collectedFormation?: boolean;
}
export interface BotState {
  targetAngle: number;
  reactionAt: number;
  serveDelay: number;
  serveTarget: Vec2 | null;
}
export interface SupplyDrop {
  id: number;
  position: Vec2;
  age: number;
}
export interface BallState {
  striker?: number;
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
  type:
    | "arrival"
    | "launch"
    | "paddle"
    | "wall"
    | "damage"
    | "elimination"
    | "victory"
    | "supply"
    | "collection";
  position: Vec2;
  seat: number;
  piece: number | null;
  ballId?: number;
  /** Optional read-only observer credit; never determines damage or revenge serves. */
  attackerSeat?: number | null;
  radius?: number;
  returnTo?: Vec2;
  impact?: ImpactDetails;
}
export type BotDifficulty = "beginner" | "standard" | "expert";
export interface MatchOptions {
  /** Replay compatibility; current pointer response defaults to arena tuning. */
  pointerPaddleSpeed?: number;
  botDifficulty?: BotDifficulty;
  botLevel?: number;
  humanSeat: number;
  slowdown: boolean;
  serveTimeout: number;
  ballSpeed: number;
  ballInterval: number;
  maxBalls: number;
}
export interface ArenaMorph {
  outline: OutlineTransition;
  from: ArenaGeometry;
  to: ArenaGeometry;
  elapsed: number;
  duration: number;
}
export interface MatchState {
  arena: ArenaGeometry;
  morph: ArenaMorph | null;
  eliminations: { seat: number; elapsed: number }[];
  tick: number;
  elapsed: number;
  countdown: number;
  phase: "countdown" | "playing" | "finished";
  players: PlayerState[];
  bots: BotState[];
  balls: BallState[];
  supplies: SupplyDrop[];
  nextSupplyId: number;
  supplySeed: number;
  supplyRng: number;
  lastSupplyPosition: Vec2 | null;
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
