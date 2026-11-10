import { useEffect, useRef, useState } from "react";
import { createViewport } from "../rendering/viewport";

export function ArenaPreview() {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    try {
      const viewport = createViewport(container.current);
      return () => viewport.dispose();
    } catch {
      setUnavailable(true);
    }
  }, []);

  return (
    <section className="arena-preview" aria-label="Arena preview">
      <div className="viewport" ref={container} />
      {unavailable && (
        <p className="render-message" role="status">
          The arena preview needs WebGL2. Try a browser with graphics acceleration enabled.
        </p>
      )}
    </section>
  );
}
