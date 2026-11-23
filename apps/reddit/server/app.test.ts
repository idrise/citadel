import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { createTelemetryRouter, telemetry } from "@devvit/analytics/server/reddit";
import { createRedditApp } from "./app";

afterEach(() => vi.restoreAllMocks());
function fixture() {
  const createPost = vi.fn(async () => ({ id: "t3_test" }));
  return { app: createRedditApp(createPost, createTelemetryRouter()), createPost };
}
/** Actual Node request/response objects and Express routing; no socket is opened. */
function request(
  app: ReturnType<typeof createRedditApp>,
  path: string,
  body?: unknown,
  method = "POST",
) {
  return new Promise<{ status: number; body: unknown }>((resolve) => {
    const input = new IncomingMessage(new Socket());
    input.method = method;
    input.url = path;
    const json = body === undefined ? "" : JSON.stringify(body);
    input.headers = {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(json)),
    };
    const output = new ServerResponse(input);
    vi.spyOn(output, "end").mockImplementation((data?: unknown) => {
      resolve({ status: output.statusCode, body: JSON.parse(String(data)) });
      return output;
    });
    app(input, output);
    if (json) input.push(json);
    input.push(null);
  });
}
it("mounts the real SDK telemetry router alongside the existing moderator menu", async () => {
  const f = fixture();
  const receipt = { status: "JOURNEY_RECEIPT_VALID" as const, message: "Recorded" };
  vi.spyOn(telemetry, "appReady").mockResolvedValue({ receipt });
  expect(await request(f.app, "/api/telemetry/journey/app-ready")).toEqual({
    status: 200,
    body: { receipt },
  });
  expect(f.createPost).not.toHaveBeenCalled();
  expect(await request(f.app, "/internal/menu/create-post")).toEqual({
    status: 200,
    body: { navigateTo: "https://www.reddit.com/comments/t3_test" },
  });
  expect(await request(f.app, "/internal/menu/create-post", undefined, "GET")).toMatchObject({
    status: 405,
  });
  expect(await request(f.app, "/api/unknown")).toMatchObject({ status: 404 });
});
it("uses SDK validation to reject malformed progress without submitting metrics", async () => {
  const f = fixture();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const interaction = vi.spyOn(telemetry, "journeyInteraction");
  expect(
    await request(f.app, "/api/telemetry/journey/progress", { journeyId: "test", progress: 2 }),
  ).toMatchObject({ status: 400 });
  expect(await request(f.app, "/api/telemetry/journey/interaction", { action: 5 })).toMatchObject({
    status: 400,
  });
  expect(interaction).not.toHaveBeenCalled();
});
