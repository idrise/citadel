import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";

const publicAsset = (path: string) =>
  readFileSync(new URL(`../apps/web/public/${path}`, import.meta.url));

function pngSize(path: string): [number, number] {
  const bytes = publicAsset(path);
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(bytes.toString("ascii", 12, 16)).toBe("IHDR");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

describe("app icons and platform artwork", () => {
  it.each([
    ["icon_512.png", 512, 512],
    ["icon-192.png", 192, 192],
    ["apple-touch-icon.png", 180, 180],
    ["favicon-32.png", 32, 32],
    ["artwork/itch-cover-630x500.png", 630, 500],
    ["artwork/itch-cover-315x250.png", 315, 250],
    ["artwork/itch-splash-960x540.png", 960, 540],
    ["artwork/devvit-icon-1024x1024.png", 1024, 1024],
    ["artwork/devvit-splash-880x512.png", 880, 512],
    ["artwork/facebook-share-1200x630.png", 1200, 630],
    ["artwork/facebook-cover-800x450.png", 800, 450],
    ["artwork/facebook-icon-1024x1024.png", 1024, 1024],
    ["artwork/facebook-splash-2048x2048.png", 2048, 2048],
  ] as const)("%s has its advertised pixel dimensions", (path, width, height) => {
    expect(pngSize(path)).toEqual([width, height]);
    expect(publicAsset(path).length).toBeLessThan(8 * 1024 * 1024);
  });

  it("provides real 16, 32 and 48 pixel ICO frames", () => {
    const bytes = publicAsset("favicon.ico");
    expect(bytes.readUInt16LE(0)).toBe(0);
    expect(bytes.readUInt16LE(2)).toBe(1);
    const sizes: number[] = [];
    for (let index = 0; index < bytes.readUInt16LE(4); index++) {
      const offset = 6 + index * 16;
      expect(bytes[offset]).toBe(bytes[offset + 1]);
      sizes.push(bytes[offset]!);
      const length = bytes.readUInt32LE(offset + 8);
      const start = bytes.readUInt32LE(offset + 12);
      expect(length).toBeGreaterThan(0);
      expect(start + length).toBeLessThanOrEqual(bytes.length);
    }
    expect(sizes.toSorted((a, b) => a - b)).toEqual([16, 32, 48]);
  });

  it("ships install icons with accurate sizes and no unsafe maskable crop", () => {
    const manifest = JSON.parse(publicAsset("manifest.webmanifest").toString()) as {
      icons: { src: string; sizes: string; type: string; purpose: string }[];
    };
    expect(manifest.icons.map((icon) => icon.sizes).toSorted()).toEqual(["192x192", "512x512"]);
    for (const icon of manifest.icons) {
      expect(icon.src).not.toMatch(/^(?:\/|https?:)/u);
      expect(icon.type).toBe("image/png");
      expect(icon.purpose).toBe("any");
      expect(pngSize(icon.src).join("x")).toBe(icon.sizes);
    }
  });
});
