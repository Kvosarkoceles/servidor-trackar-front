/** Utilidades asíncronas: concurrencia limitada y debounce. */

/**
 * Ejecuta `task` sobre cada elemento con un máximo de `concurrency` en vuelo.
 * Se usa para no saturar el backend al agregar historial de muchos dispositivos.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  const limit = Math.max(1, Math.min(concurrency, items.length || 1));
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        const value = await task(items[index], index);
        results[index] = { status: 'fulfilled', value };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}

/** Debounce simple y tipado. */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs = 250,
): ((...args: Args) => void) & { cancel: () => void } {
  let handle: ReturnType<typeof setTimeout> | undefined;

  const wrapped = (...args: Args) => {
    if (handle !== undefined) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), delayMs);
  };

  wrapped.cancel = () => {
    if (handle !== undefined) clearTimeout(handle);
  };

  return wrapped;
}

/** Espera `ms` milisegundos. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
