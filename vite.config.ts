import { buildIdentity } from "./tooling/build-identity";
import packageInfo from "./package.json";
import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { pagesBase } from "./tooling/pages-base.ts";

export default defineConfig({
  root: "apps/web",
  define: {
    __CITADEL_BUILD__: JSON.stringify(buildIdentity(packageInfo.version)),
  },
  base: pagesBase(process.env.PAGES_BASE_PATH),
  plugins: [react()],
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: { game: "apps/web/index.html", diagnostics: "apps/web/diagnostics.html" },
    },
  },
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: ["dist/**", "test-results/**", "playwright-report/**"],
  },
  fmt: { ignorePatterns: ["PLAN.md", "AGENTS.md", "LICENSE", "pnpm-lock.yaml"] },
  test: {
    root: ".",
    include: ["tooling/**/*.test.ts", "apps/web/src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
