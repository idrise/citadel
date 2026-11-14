/** Slow resolution changes for sustained graphics pressure, never one-off stalls. */
export function createAdaptiveResolution() {
  let scale = 1,
    warmup = 0,
    pressure = 0,
    headroom = 0,
    cooldown = 0,
    average = 16.67;
  return {
    get scale() {
      return scale;
    },
    reset() {
      warmup = pressure = headroom = cooldown = 0;
      average = 16.67;
    },
    sample(
      intervalMs: number,
      otherCpuMs: number,
      renderCpuMs: number,
      gpuMs: number | null,
      active = true,
    ) {
      if (!active || !Number.isFinite(intervalMs) || intervalMs <= 0 || intervalMs > 250) {
        warmup = pressure = headroom = 0;
        return scale;
      }
      const dt = intervalMs / 1000;
      warmup += dt;
      cooldown = Math.max(0, cooldown - dt);
      average += (intervalMs - average) * (1 - Math.exp(-dt / 1.5));
      if (warmup < 3) return scale;
      // Reducing pixels cannot repair a simulation/audio bottleneck.
      const graphicsPressure = otherCpuMs < 7 && (gpuMs === null ? renderCpuMs < 16 : gpuMs > 11);
      pressure =
        average > 18.5 && graphicsPressure ? pressure + dt : Math.max(0, pressure - dt * 2);
      headroom =
        average < 17.2 && otherCpuMs + renderCpuMs < 12 && (gpuMs === null || gpuMs < 11)
          ? headroom + dt
          : 0;
      if (cooldown <= 0 && pressure > 2 && scale > 0.6) {
        scale = Math.max(0.6, Math.round((scale - 0.025) * 1000) / 1000);
        cooldown = 2;
        pressure = headroom = 0;
      } else if (cooldown <= 0 && headroom > 8 && scale < 1) {
        scale = Math.min(1, Math.round((scale + 0.01) * 1000) / 1000);
        cooldown = 4;
        pressure = headroom = 0;
      }
      return scale;
    },
  };
}
