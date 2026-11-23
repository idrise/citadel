import { createServer, getServerPort, reddit } from "@devvit/web/server";
import { createTelemetryRouter } from "@devvit/analytics/server/reddit";
import { createRedditApp } from "./app";

const app = createRedditApp(
  () => reddit.submitCustomPost({ title: "CITADEL — defend, curve, survive" }),
  createTelemetryRouter(),
);
createServer(app).listen(getServerPort());
