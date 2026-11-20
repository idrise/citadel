import { afterEach, expect, it, vi } from "vite-plus/test";
import { localDiagnosticsEnabled } from "./build-profile";

afterEach(() => vi.unstubAllEnvs());

it.each(["development", "production", "test"])(
  "keeps release builds closed and local diagnostics available regardless of NODE_ENV=%s",
  (nodeEnv) => {
    vi.stubEnv("NODE_ENV", nodeEnv);
    for (const mode of ["production", "development", "staging", "test", "itch"]) {
      expect(localDiagnosticsEnabled("build", mode)).toBe(false);
      expect(localDiagnosticsEnabled("serve", mode)).toBe(true);
      expect(localDiagnosticsEnabled("serve", mode, true)).toBe(false);
    }
    expect(localDiagnosticsEnabled("build", "local-debug")).toBe(true);
    expect(localDiagnosticsEnabled("serve", "local-debug")).toBe(true);
    expect(localDiagnosticsEnabled("serve", "local-debug", true)).toBe(true);
  },
);
