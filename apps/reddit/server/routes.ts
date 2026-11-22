export interface RedditPostCreator {
  (): Promise<{ id: string }>;
}

/** Internal moderator menu only. Devvit supplies the authenticated request context. */
export function createRedditRoutes(createPost: RedditPostCreator) {
  return async (method: string, pathname: string) => {
    if (pathname !== "/internal/menu/create-post")
      return { status: 404, body: { error: "Not found" } };
    if (method !== "POST") return { status: 405, body: { error: "Method not allowed" } };
    try {
      const post = await createPost();
      return { status: 200, body: { navigateTo: `https://www.reddit.com/comments/${post.id}` } };
    } catch {
      return {
        status: 500,
        body: { showToast: "Could not create the CITADEL post. Please try again." },
      };
    }
  };
}
