import { defineConfig, devices } from "@playwright/test";
import { pagesBase } from "./tooling/pages-base.ts";

const basePath = pagesBase(process.env.PAGES_BASE_PATH ?? "/citadel/");
const previewUrl = `http://127.0.0.1:4173${basePath}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // WebGL software rendering competes for the same GPU/CPU resources.
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: previewUrl, trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Real pointer lock is unsupported by the lightweight headless shell.
        channel: "chromium",
        launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
      },
    },
  ],
  webServer: {
    command: "pnpm exec vp preview --host 127.0.0.1 --port 4173 --strictPort",
    url: previewUrl,
    reuseExistingServer: false,
    env: { PAGES_BASE_PATH: basePath },
  },
});
