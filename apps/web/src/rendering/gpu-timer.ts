/** One reusable asynchronous timer; never blocks rendering for a GPU result. */
export function createGpuTimer(gl: WebGL2RenderingContext) {
  const extension = gl.getExtension("EXT_disjoint_timer_query_webgl2") as {
    TIME_ELAPSED_EXT: number;
    GPU_DISJOINT_EXT: number;
  } | null;
  const query = extension ? gl.createQuery() : null;
  let pending = false,
    measuring = false,
    frames = 0,
    age = 0,
    last: number | null = null;
  return {
    get milliseconds() {
      return last;
    },
    begin() {
      if (!extension || !query || gl.isContextLost()) return;
      if (pending) {
        if (gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) {
          last = gl.getParameter(extension.GPU_DISJOINT_EXT)
            ? null
            : Number(gl.getQueryParameter(query, gl.QUERY_RESULT)) / 1e6;
          pending = false;
          age = 0;
        } else if (++age > 120) {
          last = null;
          return;
        }
      }
      if (!pending && ++frames % 30 === 0) {
        gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
        measuring = true;
      }
    },
    end() {
      if (!measuring || !extension) return;
      gl.endQuery(extension.TIME_ELAPSED_EXT);
      measuring = false;
      pending = true;
    },
    dispose() {
      if (query) gl.deleteQuery(query);
    },
  };
}
