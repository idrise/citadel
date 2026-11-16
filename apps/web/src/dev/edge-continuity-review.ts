import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { createFeatureEdges } from "../rendering/feature-edges";
import { disposeScene } from "../rendering/dispose-scene";

/** A visible box crease must stay lit along its entire length under perspective.
 * Compare against depth-disabled drawing, then introduce a real foreground blocker. */
export function reviewEdgeContinuity(legacy = false) {
  const width = 800,
    height = 600;
  const renderer = new WebGLRenderer({ antialias: false });
  renderer.setSize(width, height);
  const target = new WebGLRenderTarget(width, height);
  const scene = new Scene(),
    camera = new PerspectiveCamera(44, width / height, 0.1, 100);
  const root = new Group();
  root.scale.x = 18;
  scene.add(root);
  const body = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0x101010 }));
  root.add(body);
  const edge = createFeatureEdges(body.geometry, 0x00ffff, { width: 4.5, power: 2 });
  body.add(edge);
  const starts = edge.geometry.getAttribute("edgeStart"),
    ends = edge.geometry.getAttribute("edgeEnd");
  starts.setXYZ(0, -0.5, 0.5, 0.5);
  ends.setXYZ(0, 0.5, 0.5, 0.5);
  starts.needsUpdate = ends.needsUpdate = true;
  edge.geometry.instanceCount = 1;
  const material = edge.material as import("three").ShaderMaterial;
  if (legacy)
    material.vertexShader = material.vertexShader.replace(
      "clip.z = mix(start.z / start.w, end.z / end.w, along) * clip.w;",
      "",
    );
  const blocker = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial({ color: 0x000000 }));
  blocker.visible = false;
  scene.add(blocker);
  const pixels = new Uint8Array(width * height * 4);
  const capture = (depth: boolean, occluded: boolean) => {
    material.depthTest = depth;
    blocker.visible = occluded;
    blocker.position
      .copy(camera.position)
      .multiplyScalar(0.5)
      .add(new Vector3(0, 0.25, 0.25));
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    let visible = 0;
    for (let i = 0; i < 100; i++) {
      const point = new Vector3(-8.5 + (17 * i) / 99, 0.5, 0.5).project(camera);
      const x = Math.round(((point.x + 1) * width) / 2),
        y = Math.round(((point.y + 1) * height) / 2);
      let found = false;
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const p = ((y + dy) * width + x + dx) * 4;
          if (pixels[p + 1]! > 100 && pixels[p + 2]! > 100 && pixels[p]! < 50) found = true;
        }
      if (found) visible++;
    }
    let coverage = 0;
    for (let p = 0; p < pixels.length; p += 4)
      if (pixels[p + 1]! > 100 && pixels[p + 2]! > 100 && pixels[p]! < 50) coverage++;
    return { visible, coverage };
  };
  const samples = [0, 12, 24].map((x) => {
    camera.position.set(x, 12, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    return {
      cameraX: x,
      reference: capture(false, false),
      depthTested: capture(true, false),
      occluded: capture(true, true),
    };
  });
  target.dispose();
  disposeScene(scene);
  renderer.dispose();
  return samples;
}
