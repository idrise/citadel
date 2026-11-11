import {
  BoxGeometry,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Scene,
  type WebGLRenderer,
} from "three";
import { SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import { disposeScene } from "./dispose-scene";
import { SEATS } from "./palette";

/** Procedural light cards for rough metallic reflections; no image/HDRI assets. */
export function createNeonEnvironment(
  renderer: WebGLRenderer,
  scene: Scene,
  arena: ArenaGeometry = SQUARE_ARENA,
): () => void {
  const studio = new Scene();
  studio.background = new Color(0x030710);
  const geometry = new BoxGeometry(4.5, 6, 0.1);
  for (const seat of arena.fortresses) {
    const card = new Mesh(
      geometry,
      new MeshBasicMaterial({
        color: new Color(SEATS[seat.id]!.colour).multiplyScalar(2.2),
        side: DoubleSide,
      }),
    );
    card.position.set(seat.anchor.x, 4, seat.anchor.y);
    card.lookAt(0, 0, 0);
    studio.add(card);
  }
  const ceiling = new Mesh(
    new BoxGeometry(18, 0.1, 18),
    new MeshBasicMaterial({ color: new Color(0.055, 0.08, 0.12) }),
  );
  ceiling.position.y = 12;
  studio.add(ceiling);
  const generator = new PMREMGenerator(renderer);
  const environment = generator.fromScene(studio, 0.06, 0.1, 60, { size: 128 });
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.55;
  disposeScene(studio);
  generator.dispose();
  return () => {
    scene.environment = null;
    environment.dispose();
  };
}
