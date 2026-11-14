import {
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { trajectoryDots } from "../simulation/trajectory";
import { length, sub, type Vec2 } from "../simulation/vector";

/** One instanced dot draw follows sampled physics; rings distinguish bounces and the projected end. */
export function createAimGuide(root: Group) {
  const material = new MeshBasicMaterial({
    color: 0xb6eafa,
    transparent: true,
    opacity: 0.75,
    toneMapped: false,
  });
  const dots = new InstancedMesh(new SphereGeometry(0.05, 6, 5), material, 128);
  dots.name = "aim-dots";
  dots.frustumCulled = false;
  dots.count = 0;
  root.add(dots);
  const markerMaterial = new MeshBasicMaterial({
    color: 0xc6f7ff,
    transparent: true,
    opacity: 0.65,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const rings = Array.from({ length: 3 }, () => {
    const ring = new Mesh(new TorusGeometry(0.15, 0.02, 5, 24), markerMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 5;
    ring.visible = false;
    root.add(ring);
    return ring;
  });
  const matrix = new Matrix4();
  return {
    hide() {
      dots.visible = false;
      for (const ring of rings) ring.visible = false;
    },
    show(points: Vec2[], impacts: Vec2[], markersVisible = true) {
      const samples = trajectoryDots(points);
      dots.count = samples.length;
      dots.visible = samples.length > 0;
      samples.forEach((point, index) => {
        matrix.makeTranslation(point.x, 0.65, point.y);
        dots.setMatrixAt(index, matrix);
      });
      dots.instanceMatrix.needsUpdate = true;
      const markers = [...impacts];
      const end = points.at(-1);
      if (markersVisible && end && (!markers.length || length(sub(end, markers.at(-1)!)) > 0.01))
        markers.push(end);
      rings.forEach((ring, index) => {
        const point = markers[index];
        ring.visible = Boolean(point);
        if (point) ring.position.set(point.x, 0.65, point.y);
        ring.scale.setScalar(index === markers.length - 1 ? 1.3 : 1);
      });
    },
  };
}
