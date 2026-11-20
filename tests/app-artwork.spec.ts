import { expect, test } from "./fixtures";

test("browser and Home Screen icons load beneath the configured asset base", async ({
  page,
  request,
}) => {
  await page.goto("./");
  const base = new URL("./", page.url());
  const icons = page.locator('link[rel="icon"],link[rel="apple-touch-icon"]');
  await expect(icons).toHaveCount(4);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("sizes", "180x180");
  for (const href of await icons.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLLinkElement).href),
  )) {
    expect(href.startsWith(base.href)).toBe(true);
    const response = await request.get(href);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toMatch(/image\//u);
  }
  const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifestResponse = await request.get(new URL(manifestUrl!, base).href);
  const manifest = (await manifestResponse.json()) as { icons: { src: string }[] };
  for (const icon of manifest.icons) {
    const response = await request.get(new URL(icon.src, manifestResponse.url()).href);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});

test("Facebook preview names a shipped landscape image with accurate dimensions", async ({
  page,
  request,
}) => {
  await page.goto("./");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(new URL(image!).protocol).toBe("https:");
  const response = await request.get("./artwork/facebook-share-1200x630.png");
  expect(response.ok()).toBe(true);
  const bytes = await response.body();
  expect(bytes.readUInt32BE(16)).toBe(1200);
  expect(bytes.readUInt32BE(20)).toBe(630);
  expect(new URL(image!).pathname.endsWith("/artwork/facebook-share-1200x630.png")).toBe(true);
});
