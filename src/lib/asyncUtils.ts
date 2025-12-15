export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Promise timeout helper to prevent infinite loading states.
 * Note: it does not cancel the underlying request; it just fails fast.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "Operación"
): Promise<T> {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new TimeoutError(`${label} tardó demasiado. Verifica tu conexión e inténtalo de nuevo.`));
    }, ms);
  });

  return Promise.race([
    promise.finally(() => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    }),
    timeoutPromise,
  ]);
}
