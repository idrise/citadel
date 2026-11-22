import { builtinModules } from "node:module";
import { defineConfig } from "vite-plus";

export default defineConfig({
  ssr: { noExternal: true },
  build: {
    ssr: "apps/reddit/server/index.ts",
    target: "node22",
    outDir: "dist-reddit/server",
    emptyOutDir: true,
    sourcemap: false,
    rolldownOptions: {
      external: [...builtinModules, ...builtinModules.map((name) => `node:${name}`)],
      output: { format: "cjs", entryFileNames: "index.cjs", codeSplitting: false },
    },
  },
});
