import config from "./playwright.config";

const origin = "http://127.0.0.1:4175";
export default {
  ...config,
  metadata: { platform: "reddit" },
  testMatch: "reddit.spec.ts",
  testIgnore: [],
  outputDir: "test-results/reddit",
  use: { ...config.use, baseURL: `${origin}/` },
  webServer: {
    command:
      "./node_modules/.bin/vp preview --mode reddit --host 127.0.0.1 --port 4175 --strictPort",
    url: `${origin}/reddit.html`,
    reuseExistingServer: false,
    env: { PAGES_BASE_PATH: "/" },
  },
};
