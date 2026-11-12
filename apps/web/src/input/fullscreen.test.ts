import { expect, it, vi } from "vite-plus/test";
import {
  enterMobileFullscreen,
  exitMobileFullscreen,
  fullscreenActive,
  fullscreenSupported,
} from "./fullscreen";

it("requests fullscreen from the stable document root with browser navigation hidden", async () => {
  const request = vi.fn().mockResolvedValue(undefined);
  const doc = {
    fullscreenEnabled: true,
    documentElement: { requestFullscreen: request },
  } as unknown as Document;
  expect(fullscreenSupported(doc)).toBe(true);
  expect(await enterMobileFullscreen(doc)).toBe(true);
  expect(request).toHaveBeenCalledWith({ navigationUI: "hide" });
});
it("leaves unsupported and rejected requests playable without an unhandled error", async () => {
  const doc = { fullscreenEnabled: false, documentElement: {} } as unknown as Document;
  expect(fullscreenSupported(doc)).toBe(false);
  expect(await enterMobileFullscreen(doc)).toBe(false);
  const request = vi.fn().mockRejectedValue(new Error("Denied"));
  expect(
    await enterMobileFullscreen({
      fullscreenEnabled: true,
      documentElement: { requestFullscreen: request },
    } as unknown as Document),
  ).toBe(false);
});
it("does not re-enter active fullscreen and supports prefixed Safari requests and exit", async () => {
  const request = vi.fn().mockResolvedValue(undefined),
    exit = vi.fn();
  const doc = {
    documentElement: { webkitRequestFullscreen: request },
    webkitFullscreenElement: null as object | null,
    webkitExitFullscreen: exit,
  };
  expect(await enterMobileFullscreen(doc as unknown as Document)).toBe(true);
  doc.webkitFullscreenElement = {};
  expect(fullscreenActive(doc as unknown as Document)).toBe(true);
  expect(await enterMobileFullscreen(doc as unknown as Document)).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
  await exitMobileFullscreen(doc as unknown as Document);
  expect(exit).toHaveBeenCalledTimes(1);
});
