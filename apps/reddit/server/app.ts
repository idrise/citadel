import express, { type RequestHandler } from "express";
import { createRedditRoutes, type RedditPostCreator } from "./routes";

/** Reddit-only HTTP composition; the SDK router owns its telemetry protocol. */
export function createRedditApp(createPost: RedditPostCreator, journeys: RequestHandler) {
  const app = express();
  app.disable("x-powered-by");
  app.use(journeys);
  const route = createRedditRoutes(createPost);
  app.use(async (request, response) => {
    const result = await route(request.method, request.path);
    response.status(result.status).json(result.body);
  });
  return app;
}
