import { createServer, getServerPort, reddit } from "@devvit/web/server";
import { createRedditRoutes } from "./routes";

const route = createRedditRoutes(() =>
  reddit.submitCustomPost({ title: "CITADEL — defend, curve, survive" }),
);
createServer((request, response) => {
  void route(request.method ?? "GET", new URL(request.url ?? "/", "http://devvit").pathname).then(
    ({ status, body }) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    },
  );
}).listen(getServerPort());
