import { fileURLToPath } from "node:url";
import { buildIdentity } from "./tooling/build-identity";
import { localDiagnosticsEnabled } from "./tooling/build-profile";
import packageInfo from "./package.json";
import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { pagesBase } from "./tooling/pages-base.ts";

export default defineConfig(({ command, mode, isPreview }) => ({
  root: "apps/web",
  define: {
    __CITADEL_LOCAL_DIAGNOSTICS__: JSON.stringify(
      localDiagnosticsEnabled(command, mode, isPreview),
    ),
    __CITADEL_BUILD__: JSON.stringify(
      buildIdentity(
        packageInfo.version,
        process.cwd(),
        mode,
        localDiagnosticsEnabled(command, mode, isPreview),
      ),
    ),
  },
  base: pagesBase(process.env.PAGES_BASE_PATH),
  plugins: [react()],
  build: {
    outDir: mode === "local-debug" ? "../../dist-local" : "../../dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        game: fileURLToPath(new URL("./apps/web/index.html", import.meta.url)),
        diagnostics: fileURLToPath(new URL("./apps/web/diagnostics.html", import.meta.url)),
      },
    },
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ["dist/**", "dist-local/**", "test-results/**", "playwright-report/**"],
  },
  fmt: { ignorePatterns: ["dist-local/**", "PLAN.md", "AGENTS.md", "LICENSE", "pnpm-lock.yaml"] },
  test: {
    root: ".",
    include: ["tooling/**/*.test.ts", "apps/web/src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
}));
