import { BoxGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Shape } from "three";
import { ARENA } from "../simulation/arena";

function slab(halfSize: number, depth: number, colour: number) {
  const outline = new Shape();
  outline.moveTo(-halfSize, -halfSize);
  outline.lineTo(halfSize, -halfSize);
  outline.lineTo(halfSize, halfSize);
  outline.lineTo(-halfSize, halfSize);
  outline.closePath();
  const geometry = new ExtrudeGeometry(outline, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.1,
    bevelThickness: 0.1,
    bevelSegments: 2,
    steps: 1,
  });
  geometry.rotateX(Math.PI / 2);
  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({ color: colour, roughness: 0.6, metalness: 0.35 }),
  );
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

/** Visible structure sits below play. Camera-facing walls are cut away below the ball. */
export function createArenaBase(): Group {
  const root = new Group();
  const body = slab(ARENA.halfSize + 0.23, 2.1, 0x18263c);
  body.position.y = -0.17;
  root.add(body);
  const foot = slab(ARENA.halfSize + 0.55, 0.45, 0x0d1524);
  foot.position.y = -2.28;
  root.add(foot);
  const surface = new Mesh(
    new BoxGeometry(ARENA.halfSize * 2, 0.12, ARENA.halfSize * 2),
    new MeshStandardMaterial({ color: 0x111e30, roughness: 0.8, metalness: 0.15 }),
  );
  surface.position.y = -0.05;
  surface.receiveShadow = true;
  root.add(surface);
  const trimMaterial = new MeshStandardMaterial({
    color: 0x4c94b7,
    emissive: 0x3184ae,
    emissiveIntensity: 1.2,
    roughness: 0.35,
    metalness: 0.55,
  });
  for (let side = 0; side < 4; side++) {
    const angle = (side * Math.PI) / 2;
    const tall = side === 2 || side === 3;
    const height = tall ? 1.15 : 0.28;
    const wall = new Mesh(
      new BoxGeometry(ARENA.halfSize * 2 + 0.14, height, 0.18),
      new MeshStandardMaterial({ color: 0x30465e, roughness: 0.4, metalness: 0.55 }),
    );
    wall.position.set(
      Math.sin(angle) * (ARENA.halfSize + 0.04),
      height / 2,
      Math.cos(angle) * (ARENA.halfSize + 0.04),
    );
    wall.name = tall ? "back-wall" : "cutaway-wall";
    wall.rotation.y = angle;
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);
    const edge = new Mesh(new BoxGeometry(ARENA.halfSize * 2 + 0.16, 0.035, 0.2), trimMaterial);
    edge.name = tall ? "back-wall-edge" : "cutaway-wall-edge";
    edge.position.copy(wall.position);
    edge.position.y = height;
    edge.rotation.y = angle;
    root.add(edge);
    const band = new Mesh(new BoxGeometry(ARENA.halfSize * 2 + 0.45, 0.035, 0.035), trimMaterial);
    band.position.set(
      Math.sin(angle) * (ARENA.halfSize + 0.28),
      -1.65,
      Math.cos(angle) * (ARENA.halfSize + 0.28),
    );
    band.rotation.y = angle;
    root.add(band);
  }
  return root;
}
