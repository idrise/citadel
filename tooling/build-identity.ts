import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export interface BuildIdentity {
  version: string;
  revision: string;
  buildId: string;
  dirty: boolean | null;
}
/** Fingerprint build inputs, including local uncommitted source; never infer the served revision at capture time. */
export function buildIdentity(
  version: string,
  root = process.cwd(),
  mode = "production",
): BuildIdentity {
  const hash = createHash("sha256")
    .update(version)
    .update("\0")
    .update(mode)
    .update("\0")
    .update(process.env.PAGES_BASE_PATH ?? "/")
    .update("\0");
  const walk = (path: string) => {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) walk(next);
      else {
        hash.update(relative(root, next)).update("\0");
        hash.update(readFileSync(next)).update("\0");
      }
    }
  };
  walk(join(root, "apps/web/src"));
  for (const name of [
    "apps/web/index.html",
    "apps/web/diagnostics.html",
    "package.json",
    "pnpm-lock.yaml",
    "vite.config.ts",
    "tooling/build-identity.ts",
    "tooling/pages-base.ts",
  ]) {
    try {
      hash.update(name);
      hash.update(readFileSync(join(root, name)));
    } catch {
      /* Partial source archives can still be identified; production builds supply every input. */
    }
  }
  let revision = "unknown",
    dirty: boolean | null = null;
  try {
    revision =
      process.env.GITHUB_SHA ??
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    dirty =
      execFileSync("git", ["status", "--porcelain", "--untracked-files=normal"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim().length > 0;
  } catch {
    /* Source archives still have a content identity. */
  }
  return { version, revision, buildId: hash.digest("hex").slice(0, 16), dirty };
}
