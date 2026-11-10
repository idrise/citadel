/** Normalise a Pages pathname, rejecting URLs and ambiguous traversal. */
export function pagesBase(path = "/"): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("PAGES_BASE_PATH must be an absolute pathname, for example /citadel/.");
  }
  if (/[?#\\\s%]/u.test(path) || path.split("/").some((part) => part === "." || part === "..")) {
    throw new Error("PAGES_BASE_PATH must not contain traversal, escapes, queries or fragments.");
  }
  return path.endsWith("/") ? path : `${path}/`;
}
