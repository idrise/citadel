import { expect, it, vi } from "vite-plus/test";
import { attachSessionTestPort } from "./test-port";
it("installs configuration-only test actions only behind the injected virtual-input hook and detaches its own binding", () => {
  const port = { configure: vi.fn(), roster: vi.fn(), restart: vi.fn(), download: vi.fn() };
  vi.stubGlobal("__citadelTestInput", undefined);
  attachSessionTestPort(port)();
  const harness: { session?: typeof port } = {};
  vi.stubGlobal("__citadelTestInput", harness);
  const detach = attachSessionTestPort(port);
  expect(harness.session).toBe(port);
  expect(Object.keys(harness.session!)).toEqual(["configure", "roster", "restart", "download"]);
  detach();
  expect(harness.session).toBeUndefined();
  vi.unstubAllGlobals();
});
