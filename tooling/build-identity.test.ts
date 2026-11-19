import { afterEach, expect, it } from "vite-plus/test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildIdentity } from "./build-identity";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
it("identifies dirty source content independently of checkout revision and works in source archives", () => {
  const root = mkdtempSync(join(tmpdir(), "citadel-identity-"));
  roots.push(root);
  mkdirSync(join(root, "apps/web/src"), { recursive: true });
  const file = join(root, "apps/web/src/main.ts");
  writeFileSync(file, "export const a=1;");
  const original = buildIdentity("1", root);
  expect(original.buildId).toHaveLength(16);
  expect(buildIdentity("1", root)).toEqual(original);
  expect(buildIdentity("2", root).buildId).not.toBe(original.buildId);
  expect(buildIdentity("1", root, "local-debug").buildId).not.toBe(original.buildId);
  expect(buildIdentity("1", root, "production").buildId).toBe(original.buildId);
  writeFileSync(file, "export const a=2;");
  expect(buildIdentity("1", root).buildId).not.toBe(original.buildId);
  expect(original.revision).toBe(process.env.GITHUB_SHA ?? "unknown");
  expect(original.dirty).toBeNull();
});
