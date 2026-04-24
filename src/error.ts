export type SafeResult<T, E = Error> =
  | readonly [error: E, value: null]
  | readonly [error: null, value: T];

export interface MatchBranches<T, E, Return> {
  ok(value: T): Return;
  err(error: E): Return;
}

/**
 * Creates a successful tuple result.
 */
export function ok<T>(value: T): SafeResult<T, never> {
  return [null, value];
}

/**
 * Creates a failed tuple result.
 */
export function err<E>(error: E): SafeResult<never, E> {
  return [error, null];
}

/**
 * Resolves a promise into a tuple instead of throwing.
 *
 * The first slot is the error and the second slot is the value.
 */
export async function safeTry<T, E = Error>(
  promise: PromiseLike<T>,
): Promise<SafeResult<T, E>> {
  try {
    const value: T = await promise;
    return [null, value];
  } catch (error: unknown) {
    return [error as E, null];
  }
}

/**
 * Runs a synchronous function and captures thrown values in the same tuple
 * shape used by {@link safeTry}.
 */
export function safeTrySync<T, E = Error>(
  fn: () => T,
): SafeResult<T, E> {
  try {
    const value: T = fn();
    return [null, value];
  } catch (error: unknown) {
    return [error as E, null];
  }
}

/**
 * Returns the successful value or rethrows the captured error.
 */
export function unwrap<T, E>(result: SafeResult<T, E>): T {
  if (result[0] !== null) {
    throw result[0];
  }

  return result[1] as T;
}

/**
 * Folds a tuple result into another value without manual branching at the call
 * site.
 */
export function match<T, E, Return>(
  result: SafeResult<T, E>,
  branches: MatchBranches<T, E, Return>,
): Return {
  if (result[0] !== null) {
    return branches.err(result[0]);
  }

  return branches.ok(result[1] as T);
}
