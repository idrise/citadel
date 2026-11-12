import { OrthographicCamera, Scene, WebGLRenderer, WebGLRenderTarget } from "three";
import { createStage } from "../apps/web/src/rendering/stage";
import { createPaddleBlur } from "../apps/web/src/rendering/paddle-blur";
import { createMatch } from "../apps/web/src/simulation/match";
import { ARENA, fortress } from "../apps/web/src/simulation/arena";
import { disposeScene } from "../apps/web/src/rendering/dispose-scene";

/** GPU isolation: the moving trail must never paint the actual paddle footprint. */
export function reviewPaddleMask(unmasked = false) {
  const state = createMatch(2026),
    home = fortress(0, state.arena);
  state.phase = "playing";
  state.players.slice(1).forEach((p) => p.health.fill(false));
  const stage = createStage(),
    blur = createPaddleBlur(stage.root, stage.paddles);
  stage.paddles[0]!.position.set(home.anchor.x, 0.95, home.anchor.y);
  blur.update(state);
  state.tick = 12;
  state.players[0]!.angle += 0.32;
  blur.update(state);
  const trail = stage.root.getObjectByName("paddle-motion-blurs")!;
  if (unmasked)
    trail.traverse((object) => {
      const mesh = object as import("three").InstancedMesh<
        import("three").BufferGeometry,
        import("three").ShaderMaterial
      >;
      if (mesh.isInstancedMesh)
        mesh.material.fragmentShader = mesh.material.fragmentShader.replace(
          "if (radial <",
          "if (false && radial <",
        );
    });
  const scene = new Scene();
  scene.add(trail);
  const renderer = new WebGLRenderer(),
    target = new WebGLRenderTarget(512, 512);
  const camera = new OrthographicCamera(-6, 6, 6, -6, 0.1, 40);
  camera.position.set(home.anchor.x, 20, home.anchor.y);
  camera.up.set(0, 0, -1);
  camera.lookAt(home.anchor.x, 0, home.anchor.y);
  renderer.setClearColor(0, 0);
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  const pixels = new Uint8Array(512 * 512 * 4);
  renderer.readRenderTargetPixels(target, 0, 0, 512, 512, pixels);
  let inside = 0,
    outside = 0;
  const angle = state.players[0]!.angle;
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      if (!pixels[(y * 512 + x) * 4 + 3]) continue;
      const dx = ((x + 0.5) / 512) * 12 - 6,
        dz = 6 - ((y + 0.5) / 512) * 12;
      const px = Math.cos(angle) * dx + Math.sin(angle) * dz - (ARENA.railRadius - ARENA.batRadius);
      const pz = -Math.sin(angle) * dx + Math.cos(angle) * dz;
      const live =
        Math.abs(Math.hypot(px, pz) - ARENA.batRadius) < ARENA.paddleThickness / 2 &&
        Math.abs(Math.atan2(pz, px)) < ARENA.batHalfAngle;
      if (live) inside++;
      else outside++;
    }
  scene.remove(trail);
  stage.root.add(trail);
  disposeScene(stage.root);
  renderer.dispose();
  renderer.forceContextLoss();
  target.dispose();
  return { inside, outside };
}
