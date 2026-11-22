import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";

const script = fileURLToPath(new URL("./publish-reddit.sh", import.meta.url));
let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "citadel-reddit-"));
  // Exercise the actual shell gate with a local CLI stand-in; no network/login.
  writeFileSync(
    join(directory, "vp"),
    `#!/usr/bin/env bash
set -euo pipefail
[[ "$DEVVIT_AUTH_TOKEN" == "test-reddit-secret" ]] || exit 9
printf '%s\\n' "$*" >> "$REDDIT_TEST_CALLS"
if [[ "$*" == "exec devvit whoami" ]]; then
  exit "\${REDDIT_TEST_AUTH_EXIT:-0}"
fi
[[ "$*" == "run reddit:upload" ]] || exit 10
exit "\${REDDIT_TEST_UPLOAD_EXIT:-0}"
`,
    { mode: 0o755 },
  );
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

function upload(overrides: Record<string, string> = {}) {
  return spawnSync("bash", [script], {
    cwd: directory,
    encoding: "utf8",
    env: {
      PATH: `${directory}:${process.env.PATH}`,
      DEVVIT_AUTH_TOKEN: "test-reddit-secret",
      REDDIT_TEST_CALLS: join(directory, "calls"),
      ...overrides,
    },
  });
}
function calls() {
  return readFileSync(join(directory, "calls"), "utf8").trim().split("\n");
}

it("authenticates before uploading with the pinned CLI without publishing or exposing credentials", () => {
  const result = upload();
  expect(result.status).toBe(0);
  expect(calls()).toEqual(["exec devvit whoami", "run reddit:upload"]);
  expect(result.stdout + result.stderr).not.toContain("test-reddit-secret");
});
it("rejects missing credentials before invoking the CLI or starting an interactive login", () => {
  const result = upload({ DEVVIT_AUTH_TOKEN: "" });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Missing DEVVIT_AUTH_TOKEN");
  expect(() => calls()).toThrow();
});
it("stops before build/upload when authentication fails", () => {
  const result = upload({ REDDIT_TEST_AUTH_EXIT: "6" });
  expect(result.status).toBe(6);
  expect(calls()).toEqual(["exec devvit whoami"]);
  expect(result.stdout + result.stderr).not.toContain("test-reddit-secret");
});
it("fails the deployment when the build or upload fails", () => {
  const result = upload({ REDDIT_TEST_UPLOAD_EXIT: "7" });
  expect(result.status).toBe(7);
  expect(calls()).toEqual(["exec devvit whoami", "run reddit:upload"]);
  expect(result.stdout + result.stderr).not.toContain("test-reddit-secret");
});
