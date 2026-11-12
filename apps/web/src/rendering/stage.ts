import { CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { ARENA, SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import { createFeatureEdges } from "./feature-edges";
import { arcMesh } from "./arc";
import { createArenaBase } from "./base";
import { createHealthFactory } from "./health-piece";
import { SUPPLIES } from "../simulation/supplies";
import { SEATS } from "./palette";

export function createStage(humanSeat = 0, initial: ArenaGeometry = SQUARE_ARENA) {
  const root = new Group();
  const base = createArenaBase(humanSeat, initial);
  root.add(base);
  const rails: Mesh[] = [],
    marks: Mesh[] = [];
  const paddles: Mesh[] = [];
  const health: Group[][] = [];
  for (const seat of initial.fortresses) {
    const { colour, sides } = SEATS[seat.id]!;
    const rail = arcMesh(
      ARENA.railRadius,
      -seat.halfAngle,
      seat.halfAngle,
      0.045,
      colour,
      0.035,
      0.15,
    );
    rail.userData.halfAngle = seat.halfAngle;
    rail.name = `defence-rail-${seat.id}`;
    rail.position.set(seat.anchor.x, 0.02, seat.anchor.y);
    rail.rotation.y = -seat.direction;
    rails.push(rail);
    root.add(rail);
    const paddle = arcMesh(
      ARENA.batRadius,
      -ARENA.batHalfAngle,
      ARENA.batHalfAngle,
      ARENA.paddleThickness,
      colour,
      0.85,
      1.5,
    );
    paddle.name = `paddle-${seat.id}`;
    paddle.geometry.translate(ARENA.railRadius - ARENA.batRadius, 0, 0);
    paddle.add(createFeatureEdges(paddle.geometry, colour, { width: 4.5, power: 2 }));
    paddle.position.set(seat.anchor.x, 0.95, seat.anchor.y);
    paddles.push(paddle);
    root.add(paddle);
    const material = new MeshStandardMaterial({
      color: colour,
      emissive: colour,
      emissiveIntensity: 0.45,
      metalness: 0.25,
      roughness: 0.4,
    });
    const healthPiece = createHealthFactory(colour);
    health.push(
      Array.from({ length: SUPPLIES.maxPieces }, (_, index) => {
        const position = seat.pieces[index] ?? seat.anchor;
        const piece = healthPiece();
        piece.name = `health-${seat.id}-${index}`;
        piece.position.set(position.x, 0, position.y);
        root.add(piece);
        return piece;
      }),
    );
    const mark = new Mesh(new CylinderGeometry(0.42, 0.5, 0.3, sides), material);
    const markRadius = 0.9;
    mark.position.set(
      seat.anchor.x + Math.cos(seat.direction) * markRadius,
      0.15,
      seat.anchor.y + Math.sin(seat.direction) * markRadius,
    );
    marks.push(mark);
    root.add(mark);
  }
  return { root, paddles, health, rails, marks, base };
}
