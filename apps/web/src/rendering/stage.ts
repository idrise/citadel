import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from "three";
import { ARENA, FORTRESSES } from "../simulation/arena";
import { arcMesh } from "./arc";
import { SEATS } from "./palette";

export function createStage() {
  const root = new Group();
  const floor = new Mesh(
    new BoxGeometry(ARENA.halfSize * 2 + 0.5, 0.45, ARENA.halfSize * 2 + 0.5),
    new MeshStandardMaterial({ color: 0x101b2a, roughness: 0.85, metalness: 0.15 }),
  );
  floor.position.y = -0.5;
  root.add(floor);
  const wallGeometry = new BoxGeometry(ARENA.halfSize * 2 + 0.1, 0.48, 0.12);
  const wallMaterial = new MeshStandardMaterial({
    color: 0x526d85,
    emissive: 0x28465f,
    emissiveIntensity: 0.55,
  });
  for (let side = 0; side < 4; side++) {
    const wall = new Mesh(wallGeometry, wallMaterial);
    const angle = (side * Math.PI) / 2;
    wall.position.set(
      Math.sin(angle) * (ARENA.halfSize + 0.05),
      -0.06,
      Math.cos(angle) * (ARENA.halfSize + 0.05),
    );
    wall.rotation.y = angle;
    root.add(wall);
  }
  const healthGeometry = new CylinderGeometry(ARENA.pieceRadius, ARENA.pieceRadius, 0.7, 32);
  const paddles: Mesh[] = [];
  const health: Mesh[][] = [];
  for (const seat of FORTRESSES) {
    const { colour, sides } = SEATS[seat.id]!;
    const rail = arcMesh(
      ARENA.railRadius,
      seat.direction - ARENA.sectorHalfAngle,
      seat.direction + ARENA.sectorHalfAngle,
      0.045,
      colour,
      0.035,
      0.15,
    );
    rail.position.set(seat.anchor.x, 0.02, seat.anchor.y);
    root.add(rail);
    const paddle = arcMesh(
      ARENA.batRadius,
      -ARENA.batHalfAngle,
      ARENA.batHalfAngle,
      ARENA.paddleThickness,
      colour,
      0.38,
      1.1,
    );
    paddle.geometry.translate(ARENA.railRadius - ARENA.batRadius, 0, 0);
    paddle.position.set(seat.anchor.x, 0.6, seat.anchor.y);
    paddles.push(paddle);
    root.add(paddle);
    const material = new MeshStandardMaterial({
      color: colour,
      emissive: colour,
      emissiveIntensity: 0.45,
      metalness: 0.25,
      roughness: 0.4,
    });
    health.push(
      seat.pieces.map((position) => {
        const piece = new Mesh(healthGeometry, material);
        piece.position.set(position.x, 0.32, position.y);
        root.add(piece);
        return piece;
      }),
    );
    const mark = new Mesh(new CylinderGeometry(0.42, 0.5, 0.18, sides), material);
    const markRadius = 0.9;
    mark.position.set(
      seat.anchor.x + Math.cos(seat.direction) * markRadius,
      0.1,
      seat.anchor.y + Math.sin(seat.direction) * markRadius,
    );
    root.add(mark);
  }
  return { root, paddles, health };
}
