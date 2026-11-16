import { expect, it, vi } from "vite-plus/test";
import { createGpuTimer } from "./gpu-timer";
it("is inert without timer support and consumes only completed, non-disjoint results", () => {
  let supported = false,
    available = false,
    disjoint = false;
  const extension = { TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 },
    gl = {
      getExtension: () => (supported ? extension : null),
      createQuery: () => ({}),
      isContextLost: () => false,
      getParameter: vi.fn(() => disjoint),
      QUERY_RESULT_AVAILABLE: 3,
      QUERY_RESULT: 4,
      getQueryParameter: vi.fn((_q: unknown, param: number) => (param === 3 ? available : 12e6)),
      beginQuery: vi.fn(),
      endQuery: vi.fn(),
      deleteQuery: vi.fn(),
    };
  const absent = createGpuTimer(gl as unknown as WebGL2RenderingContext);
  for (let i = 0; i < 60; i++) {
    absent.begin();
    absent.end();
  }
  expect(absent.milliseconds).toBeNull();
  expect(gl.beginQuery).not.toHaveBeenCalled();
  supported = true;
  const timer = createGpuTimer(gl as unknown as WebGL2RenderingContext);
  for (let i = 0; i < 30; i++) {
    timer.begin();
    timer.end();
  }
  expect(gl.beginQuery).toHaveBeenCalledTimes(1);
  timer.begin();
  timer.end();
  expect(gl.getQueryParameter).toHaveBeenCalledWith(expect.anything(), 3);
  expect(gl.getQueryParameter).not.toHaveBeenCalledWith(expect.anything(), 4);
  available = true;
  timer.begin();
  timer.end();
  expect(timer.milliseconds).toBe(12);
  disjoint = true;
  for (let i = 0; i < 30; i++) {
    timer.begin();
    timer.end();
  }
  timer.begin();
  timer.end();
  expect(timer.milliseconds).toBeNull();
  timer.dispose();
  expect(gl.deleteQuery).toHaveBeenCalledTimes(1);
});
it("identifies unique completed samples, exposes age, and invalidates context-lost results", () => {
  let lost = false;
  const gl = {
    getExtension: () => ({ TIME_ELAPSED_EXT: 1, GPU_DISJOINT_EXT: 2 }),
    createQuery: () => ({}),
    isContextLost: () => lost,
    getParameter: () => false,
    QUERY_RESULT_AVAILABLE: 3,
    QUERY_RESULT: 4,
    getQueryParameter: (_q: unknown, key: number) => (key === 3 ? true : 6e6),
    beginQuery: vi.fn(),
    endQuery: vi.fn(),
    deleteQuery: vi.fn(),
  };
  const timer = createGpuTimer(gl as unknown as WebGL2RenderingContext);
  expect(timer.sampleId).toBe(0);
  expect(timer.ageMs).toBeNull();
  for (let i = 0; i < 31; i++) {
    timer.begin();
    timer.end();
  }
  expect(timer.sampleId).toBe(1);
  expect(timer.milliseconds).toBe(6);
  expect(timer.ageMs).toBeGreaterThanOrEqual(0);
  timer.begin();
  expect(timer.sampleId).toBe(1);
  lost = true;
  timer.begin();
  expect(timer.milliseconds).toBeNull();
  expect(timer.ageMs).toBeNull();
  timer.dispose();
});
