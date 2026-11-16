import { afterEach, expect, it, vi } from "vite-plus/test";
import { downloadJSON } from "./download-json";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it.each([false, true])(
  "releases the object URL and temporary element even if click throws (%s)",
  (throws) => {
    vi.useFakeTimers();
    const click = vi.fn(() => {
      if (throws) throw Error("download unavailable");
    });
    const link = { href: "", download: "", click, remove: vi.fn() };
    vi.stubGlobal("document", { createElement: () => link, body: { append: vi.fn() } });
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    if (throws)
      expect(() => downloadJSON({ schema: "test" }, "local.json")).toThrow("download unavailable");
    else downloadJSON({ schema: "test" }, "local.json");
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(link.download).toBe("local.json");
    expect(link.remove).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:test");
  },
);
