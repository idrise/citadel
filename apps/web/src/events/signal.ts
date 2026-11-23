export interface Signal<T> {
  emit(value: T): void;
  subscribe(listener: (value: T) => void | Promise<void>): () => void;
}

/** Optional observers cannot interrupt the game or other observers. */
export function createSignal<T>(): Signal<T> {
  const listeners = new Set<(value: T) => void | Promise<void>>();
  return {
    emit(value) {
      // Listeners added by a callback start receiving the next emission.
      const current = Array.from(listeners);
      for (const listener of current)
        try {
          const pending = listener(value);
          if (pending) void pending.catch(() => {});
        } catch {
          // Observers own their errors; gameplay never depends on a subscriber.
        }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
