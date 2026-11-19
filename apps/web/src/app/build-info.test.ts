import { afterEach, expect, it, vi } from "vite-plus/test";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it.each([
  { dev: true, mode: "development" },
  { dev: true, mode: "production" },
  { dev: false, mode: "local-debug" },
  { dev: false, mode: "production" },
  { dev: false, mode: "staging" },
])(
  "uses the compiled diagnostic flag regardless of Vite's runtime environment ($dev, $mode)",
  async ({ dev, mode }) => {
    vi.stubEnv("DEV", dev);
    vi.stubEnv("MODE", mode);
    const { LOCAL_DIAGNOSTICS } = await import("./build-info");
    expect(LOCAL_DIAGNOSTICS).toBe(__CITADEL_LOCAL_DIAGNOSTICS__);
  },
);
