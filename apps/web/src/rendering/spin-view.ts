import { ConeGeometry, Group, Mesh, MeshBasicMaterial, TorusGeometry } from "three";
import { FIXED_DT } from "../simulation/arena";
import { MAX_SWIPE_CURVE } from "../simulation/flight";
import type { BallState } from "../simulation/types";

export const POSITIVE_SPIN = 0x35ddff;
export const NEGATIVE_SPIN = 0xff60cd;
export const spinStrength = (spin: number) => Math.min(1, Math.abs(spin) / MAX_SWIPE_CURVE);
export const spinColour = (spin: number) => (spin < 0 ? NEGATIVE_SPIN : POSITIVE_SPIN);

/** Broken, arrow-tipped bands show actual spin direction and strength without enlarging the collider. */
export function createSpinView(root: Group) {
  const group = new Group();
  group.name = "ball-spin";
  group.visible = false;
  const rotor = new Group();
  rotor.rotation.x = Math.PI / 2;
  group.add(rotor);
  root.add(group);
  const material = new MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const arc = Math.PI * 0.72;
  const radius = 0.4;
  const band = new TorusGeometry(radius, 0.04, 5, 28, arc);
  const arrow = new ConeGeometry(0.085, 0.18, 3);
  const tips = [0, Math.PI].map((offset) => {
    const section = new Group();
    section.rotation.z = offset;
    section.add(new Mesh(band, material));
    const tip = new Mesh(arrow, material);
    section.add(tip);
    rotor.add(section);
    return tip;
  });
  let lastTick = -1;
  let ballId = -1;
  let phase = 0;
  return {
    update(ball: BallState | undefined, tick: number, reduced: boolean) {
      const spin = ball?.spin ?? 0;
      const strength = spinStrength(spin);
      if (ball?.id !== ballId || tick < lastTick) {
        phase = 0;
        lastTick = tick;
        ballId = ball?.id ?? -1;
      }
      if (ball && !reduced && lastTick >= 0)
        phase += Math.max(0, tick - lastTick) * FIXED_DT * Math.sign(spin) * (8 + strength * 12);
      lastTick = tick;
      group.visible = ball?.phase === "active" && strength > 0.025;
      if (!group.visible || !ball) return;
      group.position.set(ball.position.x, 0.58, ball.position.y);
      group.scale.setScalar(0.85 + strength * 0.15);
      rotor.rotation.z = phase;
      material.color.setHex(spinColour(spin)).multiplyScalar(1.7);
      material.opacity = 0.35 + strength * 0.55;
      const angle = spin < 0 ? 0 : arc;
      for (const tip of tips) {
        tip.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        tip.rotation.z = angle + (spin < 0 ? Math.PI : 0);
      }
    },
  };
}
