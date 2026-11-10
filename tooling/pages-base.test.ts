import { describe, expect, it } from "vite-plus/test";
import { pagesBase } from "./pages-base";

describe("GitHub Pages asset base", () => {
  it.each([
    [undefined, "/"],
    ["/", "/"],
    ["/citadel", "/citadel/"],
    ["/citadel/", "/citadel/"],
    ["/nested/site", "/nested/site/"],
  ])("normalises %s to %s", (input, expected) => {
    expect(pagesBase(input)).toBe(expected);
  });

  it.each([
    "",
    "citadel",
    "https://example.com/",
    "//example.com/",
    "/a/../b",
    "/./",
    "/a?b",
    "/a#b",
    "/a\\b",
    "/a b",
    "/%2e%2e/",
  ])("rejects unsafe or ambiguous base %s", (input) => {
    expect(() => pagesBase(input)).toThrow("PAGES_BASE_PATH");
  });
});
