async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toExn(e: unknown): Error {
  if (e instanceof Error) {
    return e;
  }

  return new Error(String(e), { cause: e });
}

/**
 * Retry a function a number of times. Wait 1s between each try.
 * @param fn
 * @param times
 */
export async function retry(fn: () => Promise<unknown>, times: number) {
  let err: unknown;

  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (exn) {
      err = exn;

      await sleep(1000);
    }
  }

  throw err;
}
