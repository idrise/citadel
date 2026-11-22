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
    __CITADEL_REDDIT__: JSON.stringify(mode === "reddit"),
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
  base:
    mode === "reddit"
      ? "/"
      : command === "build" && mode === "itch"
        ? "./"
        : pagesBase(process.env.PAGES_BASE_PATH),
  plugins: [react()],
  build: {
    minify: "oxc",
    cssMinify: true,
    cssCodeSplit: true,
    sourcemap: false,
    outDir:
      mode === "local-debug"
        ? "../../dist-local"
        : mode === "reddit"
          ? "../../dist-reddit/client"
          : mode === "itch"
            ? "../../dist-itch"
            : "../../dist",
    emptyOutDir: true,
    rolldownOptions: {
      treeshake: true,
      input:
        mode === "reddit"
          ? {
              splash: fileURLToPath(new URL("./apps/web/reddit.html", import.meta.url)),
              game: fileURLToPath(new URL("./apps/web/reddit-game.html", import.meta.url)),
            }
          : {
              game: fileURLToPath(new URL("./apps/web/index.html", import.meta.url)),
              diagnostics: fileURLToPath(new URL("./apps/web/diagnostics.html", import.meta.url)),
            },
    },
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: [
      "dist/**",
      "dist-local/**",
      "dist-itch/**",
      "dist-reddit/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  fmt: {
    ignorePatterns: [
      "dist-local/**",
      "dist-itch/**",
      "dist-reddit/**",
      "PLAN.md",
      "AGENTS.md",
      "LICENSE",
      "pnpm-lock.yaml",
    ],
  },
  test: {
    root: ".",
    include: [
      "apps/web/src/**/*.test.{ts,tsx}",
      "apps/reddit/**/*.test.ts",
      // Opt in tools that protect gameplay, build output or publishing. Media/review
      // scripts must not silently become release gates just by adding a test file.
      "tooling/{app-artwork,audio-resource-summary,bot-serve-fixture,build-identity,build-profile,elite-bot-review,pages-base,pcm-level,performance-summary,physics-replay,publish-itch,publish-reddit,virtual-input}.test.ts",
    ],
    environment: "node",
    tags: [{ name: "soak" }],
    tagsFilter: ["!soak"],
    ...(process.env.CI ? { maxWorkers: 2 } : {}),
  },
}));
