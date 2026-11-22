import { expect, it, vi } from "vite-plus/test";
import { createRedditRoutes } from "./routes";

it("creates a game post only through the moderator's POST menu action", async () => {
  const createPost = vi.fn().mockResolvedValue({ id: "t3_abc123" }),
    route = createRedditRoutes(createPost);
  expect(await route("GET", "/internal/menu/create-post")).toMatchObject({ status: 405 });
  expect(await route("POST", "/api/create-post")).toMatchObject({ status: 404 });
  expect(createPost).not.toHaveBeenCalled();
  expect(await route("POST", "/internal/menu/create-post")).toEqual({
    status: 200,
    body: { navigateTo: "https://www.reddit.com/comments/t3_abc123" },
  });
  expect(createPost).toHaveBeenCalledOnce();
});
it("returns a recoverable menu error without exposing SDK error details", async () => {
  const route = createRedditRoutes(async () => {
    throw new Error("private SDK detail");
  });
  const result = await route("POST", "/internal/menu/create-post");
  expect(result.status).toBe(500);
  expect(result.body).toEqual({
    showToast: "Could not create the CITADEL post. Please try again.",
  });
});
