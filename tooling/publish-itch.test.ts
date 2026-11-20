import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vite-plus/test";

const script = fileURLToPath(new URL("./publish-itch.sh", import.meta.url));
let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "citadel-itch-"));
  mkdirSync(join(directory, "dist-itch"));
  writeFileSync(join(directory, "dist-itch/index.html"), "<!doctype html>");
  // A local stand-in captures the actual command; these tests never contact itch.io.
  writeFileSync(
    join(directory, "butler"),
    '#!/bin/bash\nprintf "%s\\n" "$@" > "$ITCH_TEST_ARGUMENTS"\n' +
      '[[ "$BUTLER_API_KEY" == "test-secret" ]] || exit 9\n' +
      'exit "${ITCH_TEST_EXIT:-0}"\n',
    { mode: 0o755 },
  );
});

afterEach(() => rmSync(directory, { recursive: true, force: true }));

function publish(overrides: Record<string, string> = {}) {
  return spawnSync("bash", [script], {
    cwd: directory,
    encoding: "utf8",
    env: {
      PATH: `${directory}:${process.env.PATH}`,
      BUTLER_API_KEY: "test-secret",
      ITCH_IO_TARGET: "test-user/citadel",
      ITCH_IO_VERSION: "abc123",
      ITCH_TEST_ARGUMENTS: join(directory, "arguments"),
      ...overrides,
    },
  });
}

it("uploads only the portable build with the default channel and commit version", () => {
  const result = publish();
  expect(result.status).toBe(0);
  expect(readFileSync(join(directory, "arguments"), "utf8").trim().split("\n")).toEqual([
    "push",
    "dist-itch",
    "test-user/citadel:html5",
    "--userversion",
    "abc123",
  ]);
  expect(result.stdout + result.stderr).not.toContain("test-secret");
});

it("updates the selected existing channel and keeps version text as one argument", () => {
  expect(publish({ ITCH_IO_CHANNEL: "web-beta", ITCH_IO_VERSION: "review build 2" }).status).toBe(
    0,
  );
  expect(readFileSync(join(directory, "arguments"), "utf8").trim().split("\n")).toEqual([
    "push",
    "dist-itch",
    "test-user/citadel:web-beta",
    "--userversion",
    "review build 2",
  ]);
});

it.each([
  ["BUTLER_API_KEY", "", "Missing BUTLER_API_KEY"],
  ["ITCH_IO_TARGET", "", "ITCH_IO_TARGET must"],
  ["ITCH_IO_TARGET", "https://test-user.itch.io/citadel", "ITCH_IO_TARGET must"],
  ["ITCH_IO_TARGET", "test-user/citadel:html5", "ITCH_IO_TARGET must"],
  ["ITCH_IO_TARGET", "Test-User/citadel", "ITCH_IO_TARGET must"],
  ["ITCH_IO_TARGET", "test-user/citadel; echo unexpected", "ITCH_IO_TARGET must"],
  ["ITCH_IO_CHANNEL", "web beta", "ITCH_IO_CHANNEL must"],
  ["ITCH_IO_CHANNEL", "--hidden", "ITCH_IO_CHANNEL must"],
  ["ITCH_IO_VERSION", "", "Missing ITCH_IO_VERSION"],
])("rejects %s=%s before invoking Butler", (key, value, message) => {
  const result = publish({ [key]: value });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain(message);
  expect(result.stdout + result.stderr).not.toContain("test-secret");
  expect(() => readFileSync(join(directory, "arguments"))).toThrow();
});

it("refuses to upload when the validated artifact is missing", () => {
  rmSync(join(directory, "dist-itch"), { recursive: true });
  const result = publish();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Missing dist-itch/index.html");
  expect(() => readFileSync(join(directory, "arguments"))).toThrow();
});

it("fails the deployment when Butler fails", () => {
  expect(publish({ ITCH_TEST_EXIT: "7" }).status).toBe(7);
});
