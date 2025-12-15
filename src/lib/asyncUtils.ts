export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Promise timeout helper to prevent infinite loading states.
 * Accepts PromiseLike (Supabase queries) or Promise.
 */
export function withTimeout<T>(
  promiseLike: PromiseLike<T>,
  ms: number,
  label = "Operación"
): Promise<T> {
  // Convert PromiseLike to real Promise
  const promise = Promise.resolve(promiseLike);
  
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
