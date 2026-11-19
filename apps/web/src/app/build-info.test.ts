import { afterEach, expect, it, vi } from "vite-plus/test";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it.each([
  { dev: true, mode: "development", expected: true },
  { dev: false, mode: "local-debug", expected: true },
  { dev: false, mode: "production", expected: false },
  { dev: false, mode: "staging", expected: false },
])(
  "enables local diagnostic actions only for development or explicit local builds ($mode)",
  async ({ dev, mode, expected }) => {
    vi.stubEnv("DEV", dev);
    vi.stubEnv("MODE", mode);
    const { LOCAL_DIAGNOSTICS } = await import("./build-info");
    expect(LOCAL_DIAGNOSTICS).toBe(expected);
  },
);
