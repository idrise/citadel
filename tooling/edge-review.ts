import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  HalfFloatType,
  Mesh,
  PCFSoftShadowMap,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createMatch } from "../apps/web/src/simulation/match";
import type { PlayerCount } from "../apps/web/src/simulation/arena";
import { createArenaView } from "../apps/web/src/rendering/arena-view";
import { createArenaCamera, fitArenaCamera } from "../apps/web/src/rendering/camera";
import { createBloom } from "../apps/web/src/rendering/bloom";
import { neonBloomFragmentShader } from "../apps/web/src/rendering/neon-bloom";
import { createWorldGrid } from "../apps/web/src/rendering/world-grid";
import { createNeonEnvironment } from "../apps/web/src/rendering/neon-environment";
import { lightArena } from "../apps/web/src/rendering/lighting";
import { disposeScene } from "../apps/web/src/rendering/dispose-scene";
/** Fixed presentation fixture: both images use identical meshes, pose and exposure. */
export function renderEdgeReview(
  container: HTMLElement,
  count: PlayerCount,
  legacy?: { vertex: string; fragment: string },
  reduced = false,
  dense = false,
  legacyBloom = false,
  paddleMotion: "none" | "before" | "after" = "none",
  ballReview?: { close?: boolean; width?: number; height?: number },
) {
  const width = ballReview?.width ?? 1280,
    height = ballReview?.height ?? 900;
  const state = createMatch(2026, count);
  const ball = state.balls[0]!;
  state.balls = dense
    ? Array.from({ length: 8 }, (_, id) => ({
        ...ball,
        id,
        phase: "active" as const,
        position: { x: (id % 4) * 3 - 4.5, y: Math.floor(id / 4) * 4 - 2 },
        spin: id % 2 ? 0.8 : -0.8,
      }))
    : [];
  if (ballReview) {
    state.phase = "playing";
    if (!dense)
      state.balls = [0, 1, 2].map((id) => ({
        ...ball,
        id,
        phase: "active" as const,
        position: { x: (id - 1) * (ballReview.close ? 2 : 4), y: 0 },
        velocity: { x: 0, y: 0 },
        spin: id === 0 ? 0 : id === 1 ? 1.4 : -1.4,
      }));
  }
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  container.append(renderer.domElement);
  const scene = new Scene();
  scene.background = new Color(0x080f1c);
  const arena = createArenaView(0, state.arena);
  scene.add(arena.root, createWorldGrid());
  const lights = lightArena(scene, state.arena),
    environment = createNeonEnvironment(renderer, scene, state.arena);
  if (legacy)
    arena.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        if (material instanceof ShaderMaterial && material.name === "NeonFeatureEdges") {
          material.vertexShader = legacy.vertex;
          material.fragmentShader = legacy.fragment;
          material.needsUpdate = true;
        }
    });
  const camera = createArenaCamera(0, state.arena),
    points = ballReview?.close
      ? [new Vector3(-3.2, 0, -1), new Vector3(3.2, 1.3, 1)]
      : state.arena.vertices.flatMap((p) => [
          new Vector3(p.x * 1.09, 0, p.y * 1.09),
          new Vector3(p.x * 1.09, 2.34, p.y * 1.09),
        ]);
  if (ballReview?.close) {
    camera.position.set(0, 5, 8);
    camera.lookAt(0, 0.58, 0);
  }
  fitArenaCamera(camera, new Box3().setFromPoints(points), width / height, points);
  const current = createBloom(renderer, scene, camera),
    old = new EffectComposer(
      renderer,
      legacyBloom
        ? new WebGLRenderTarget(1, 1, {
            type: HalfFloatType,
            samples: Math.min(4, renderer.capabilities.maxSamples),
          })
        : undefined,
    );
  const bloom = new UnrealBloomPass(new Vector2(1280, 900), 0.25, 0.45, 1.05),
    output = new OutputPass(),
    render = new RenderPass(scene, camera);
  if (legacyBloom)
    bloom.materialHighPassFilter.fragmentShader = neonBloomFragmentShader
      .replace(
        "float brightness = peak * 0.52;",
        "float brightness = max(luminance(texel.rgb), peak * 0.52);",
      )
      .replace("vec4(texel.rgb * gain, texel.a)", "texel");
  old.addPass(render);
  old.addPass(bloom);
  old.addPass(output);
  old.setSize(width, height);
  current.resize(width, height);
  const reviewOptions = {
    humanSeat: 0,
    preview: false,
    slowdown: false,
    reducedEffects: reduced,
    quality: "high" as const,
    ballOwners: new Map(state.balls.map((item) => [item.id, item.id % count])),
  };
  if (paddleMotion !== "none") {
    state.phase = "playing";
    for (let tick = 0; tick <= 12; tick++) {
      state.tick = tick;
      state.players.forEach((player) => {
        player.angle = state.arena.fortresses[player.id]!.direction + ((tick - 6) * 3.2) / 120;
      });
      arena.update(state, 1 / 120, { ...reviewOptions, reducedEffects: paddleMotion === "before" });
    }
  }
  arena.update(state, 0, reviewOptions);
  for (let i = 0; i < 3; i++)
    if ((legacy || legacyBloom) && !reduced) old.render(0);
    else current.render(0, reduced, 0, "high");
  return {
    samples: legacy || reduced ? 0 : Math.min(4, renderer.capabilities.maxSamples),
    advanceBallReview(ticks: number) {
      state.tick += ticks;
      arena.update(state, ticks / 120, reviewOptions);
      current.render(0, reduced, 0, "high");
    },
    dispose() {
      current.dispose();
      bloom.dispose();
      output.dispose();
      render.dispose();
      old.dispose();
      arena.dispose();
      lights();
      environment();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
