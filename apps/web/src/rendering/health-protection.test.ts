import { expect, it, vi } from "vite-plus/test";
import { Mesh, MeshPhysicalMaterial, Group } from "three";
import { createMatch } from "../simulation/match";
import { protectionPulse } from "./health-protection";
import { createHealthFactory } from "./health-piece";
import { disposeScene } from "./dispose-scene";
it("renders immortal title capsules with a finite steady tint at any elapsed time", () => {
  const player = createMatch().players[0]!;
  player.protectedUntil = Infinity;
  for (const elapsed of [0, 2, 120, 1e12])
    for (const reduced of [false, true])
      expect(protectionPulse(player, elapsed, reduced)).toBe(0.6);
  player.health.fill(false);
  expect(protectionPulse(player, 2, false)).toBe(0);
});
it("pulses protected containers with simulation time, keeps a visible floor and stops exactly at expiry", () => {
  const player = createMatch().players[0]!;
  player.protectedUntil = 12;
  expect(protectionPulse(player, 10, false)).toBeCloseTo(1);
  expect(protectionPulse(player, 10 + 1 / 3, false)).toBeCloseTo(0.45);
  vi.useFakeTimers();
  try {
    const frozen = protectionPulse(player, 11, false);
    vi.advanceTimersByTime(10_000);
    expect(protectionPulse(player, 11, false)).toBe(frozen);
  } finally {
    vi.useRealTimers();
  }
  expect(protectionPulse(player, 11.999, false)).toBeGreaterThan(0.4);
  expect(protectionPulse(player, 12, false)).toBe(0);
  expect(protectionPulse(player, 10, true)).toBe(protectionPulse(player, 11, true));
  expect(protectionPulse(player, 10, true)).toBeGreaterThan(0);
  player.health.fill(false);
  expect(protectionPulse(player, 10, false)).toBe(0);
});
it("pulses shared bank materials without changing transforms, geometry or another player's materials", () => {
  const make = createHealthFactory(0xff4422),
    other = createHealthFactory(0x22ff44);
  const a = make(),
    b = make(),
    rival = other();
  const material = (a.children[0] as Mesh).material as MeshPhysicalMaterial;
  const geometry = (a.children[0] as Mesh).geometry;
  const rivalMaterial = (rival.children[0] as Mesh).material as MeshPhysicalMaterial;
  const rivalIntensity = rivalMaterial.emissiveIntensity;
  const pose = a.matrix.clone();
  make.setProtection(0);
  const normal = material.emissiveIntensity;
  make.setProtection(1);
  expect(material.emissiveIntensity).toBeGreaterThan(normal);
  expect((b.children[0] as Mesh).material).toBe(material);
  expect(rivalMaterial.emissiveIntensity).toBe(rivalIntensity);
  expect((a.children[0] as Mesh).geometry).toBe(geometry);
  expect(a.matrix).toEqual(pose);
  make.setProtection(0);
  expect(material.emissiveIntensity).toBe(normal);
  const root = new Group();
  root.add(a, b, rival);
  disposeScene(root);
});
