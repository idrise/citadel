import { SQUARE_ARENA, type ArenaGeometry } from "../simulation/arena";
import { SEATS } from "./palette";
import { DirectionalLight, HemisphereLight, PointLight, Scene } from "three";

export function lightArena(scene: Scene, arena: ArenaGeometry = SQUARE_ARENA): () => void {
  scene.add(new HemisphereLight(0xa6d4fa, 0x070c18, 0.25));
  const key = new DirectionalLight(0xa8ceff, 1.8);
  key.position.set(-8, 19, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  const radius = Math.max(15, ...arena.vertices.map((p) => Math.hypot(p.x, p.y))) + 4;
  key.shadow.camera.left = -radius;
  key.shadow.camera.right = radius;
  key.shadow.camera.top = radius;
  key.shadow.camera.bottom = -radius;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 120;
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.025;
  scene.add(key);
  const rim = new DirectionalLight(0x6e9bde, 0.7);
  rim.position.set(10, 6, -12);
  scene.add(rim);
  for (const [slot, seat] of arena.fortresses.slice(0, 6).entries()) {
    const glow = new PointLight(SEATS[seat.id]!.colour, 10, 8, 2);
    glow.position.set(
      seat.anchor.x + Math.cos(seat.direction) * 2.7,
      1.8,
      seat.anchor.y + Math.sin(seat.direction) * 2.7,
    );
    glow.userData.seat = seat.id;
    glow.userData.slot = slot;
    scene.add(glow);
  }
  return () => {
    key.shadow.dispose();
    rim.shadow.dispose();
  };
}
