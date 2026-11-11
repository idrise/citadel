import {
  BoxGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type Object3D,
} from "three";
import { createFeatureEdges } from "./feature-edges";
import type { EffectsQuality } from "./quality";

const PARTS = 28;
/** Pooled 3D fireworks: instanced solid shards and one batched wall-edge-shader draw per burst. */
export function createVictoryFireworks(root: Object3D) {
  const geometry = new BoxGeometry(0.065, 0.065, 0.28),
    matrix = new Matrix4(),
    point = new Vector3(),
    position = new Vector3(),
    quaternion = new Quaternion(),
    scale = new Vector3(),
    forward = new Vector3(0, 0, 1);
  const bursts = Array.from({ length: 4 }, () => {
    const group = new Group();
    group.name = "victory-firework";
    group.visible = false;
    root.add(group);
    const face = new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
    const shards = new InstancedMesh(geometry, face, PARTS);
    shards.frustumCulled = false;
    const edges = createFeatureEdges(geometry, 0xffa456, { width: 2.8, power: 2 });
    edges.frustumCulled = false;
    const starts = (edges.geometry.getAttribute("edgeStart").array as Float32Array).slice(),
      ends = (edges.geometry.getAttribute("edgeEnd").array as Float32Array).slice(),
      lines = starts.length / 3;
    const a = new InstancedBufferAttribute(new Float32Array(PARTS * starts.length), 3),
      b = new InstancedBufferAttribute(new Float32Array(PARTS * ends.length), 3);
    edges.geometry.setAttribute("edgeStart", a);
    edges.geometry.setAttribute("edgeEnd", b);
    group.add(shards, edges);
    return {
      group,
      face,
      shards,
      edges,
      starts,
      ends,
      lines,
      a,
      b,
      age: 10,
      velocities: Array.from({ length: PARTS }, () => new Vector3()),
    };
  });
  let elapsed = 0,
    emitted = 0,
    wasActive = false;
  const emit = (colour: number, quality: EffectsQuality) => {
    const burst = bursts[emitted % bursts.length]!,
      angle = emitted * 2.39996;
    burst.age = 0;
    burst.group.position.set(Math.sin(angle) * 6, 5.3 + (emitted % 3) * 0.8, Math.cos(angle) * 4);
    const colourHex = emitted % 3 === 0 ? colour : emitted % 3 === 1 ? 0xffdf78 : 0xd9b4ff;
    burst.face.color.setHex(colourHex);
    burst.edges.material.uniforms.neonColour!.value.setHex(colourHex).multiplyScalar(2);
    burst.velocities.forEach((velocity, i) => {
      const y = 1 - (2 * (i + 0.5)) / PARTS,
        r = Math.sqrt(1 - y * y),
        phi = i * 2.39996 + angle;
      velocity.set(Math.cos(phi) * r, y, Math.sin(phi) * r).multiplyScalar(2.4 + (i % 4) * 0.55);
    });
    const count = quality === "low" ? 10 : quality === "medium" ? 18 : PARTS;
    burst.shards.count = count;
    burst.edges.geometry.instanceCount = count * burst.lines;
    emitted++;
  };
  return {
    update(
      dt: number,
      active: boolean,
      reduced: boolean,
      colour: number,
      quality: EffectsQuality = "high",
    ) {
      if (!active) {
        elapsed = 0;
        emitted = 0;
        wasActive = false;
        for (const p of bursts) p.group.visible = false;
        return;
      }
      if (!wasActive) {
        for (const p of bursts) p.age = 10;
        wasActive = true;
      }
      elapsed += Math.max(0, dt);
      if (!reduced && emitted < 12 && elapsed >= 0.2 + emitted * 0.62) emit(colour, quality);
      for (const burst of bursts) {
        burst.age += Math.max(0, dt);
        burst.group.visible = !reduced && burst.age < 1.8;
        if (!burst.group.visible) continue;
        const t = burst.age,
          opacity = Math.max(0, 1 - t / 1.8);
        burst.face.opacity = opacity * 0.55;
        burst.edges.material.uniforms.opacity!.value = opacity;
        for (let i = 0; i < burst.shards.count; i++) {
          const velocity = burst.velocities[i]!;
          position.copy(velocity).multiplyScalar(t);
          position.y -= 1.4 * t * t;
          quaternion.setFromUnitVectors(
            forward,
            point
              .copy(velocity)
              .setY(velocity.y - 2.8 * t)
              .normalize(),
          );
          scale.setScalar(0.4 + opacity * 0.8);
          scale.z *= 1 + t * 0.6;
          matrix.compose(position, quaternion, scale);
          burst.shards.setMatrixAt(i, matrix);
          for (let line = 0; line < burst.lines; line++) {
            point.fromArray(burst.starts, line * 3).applyMatrix4(matrix);
            burst.a.setXYZ(i * burst.lines + line, point.x, point.y, point.z);
            point.fromArray(burst.ends, line * 3).applyMatrix4(matrix);
            burst.b.setXYZ(i * burst.lines + line, point.x, point.y, point.z);
          }
        }
        burst.shards.instanceMatrix.needsUpdate = true;
        burst.a.needsUpdate = true;
        burst.b.needsUpdate = true;
      }
    },
  };
}
