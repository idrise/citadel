import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from "three";

/** Presentation-only placeholder. Real arena geometry will come from simulation data. */
export function createStage(): Group {
  const stage = new Group();
  const floor = new Mesh(
    new BoxGeometry(10, 0.3, 10),
    new MeshStandardMaterial({ color: 0x111e32, roughness: 0.75, metalness: 0.25 }),
  );
  floor.position.y = -0.3;
  stage.add(floor);

  const edgeMaterial = new MeshStandardMaterial({
    color: 0x59e1ee,
    emissive: 0x187783,
    emissiveIntensity: 1.5,
  });
  const edgeGeometry = new BoxGeometry(10, 0.08, 0.07);
  for (let side = 0; side < 4; side++) {
    const edge = new Mesh(edgeGeometry, edgeMaterial);
    const angle = (side * Math.PI) / 2;
    edge.position.set(Math.sin(angle) * 5, -0.1, Math.cos(angle) * 5);
    edge.rotation.y = angle;
    stage.add(edge);
  }

  const markerGeometry = new BoxGeometry(0.65, 0.5, 0.65);
  const colours = [0x5ce5ed, 0xffbe69, 0xc69aff, 0xff738e];
  colours.forEach((colour, index) => {
    const marker = new Mesh(
      markerGeometry,
      new MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: 0.4 }),
    );
    const angle = Math.PI / 4 + (index * Math.PI) / 2;
    marker.position.set(Math.cos(angle) * 5.5, 0.1, Math.sin(angle) * 5.5);
    stage.add(marker);
  });
  return stage;
}
