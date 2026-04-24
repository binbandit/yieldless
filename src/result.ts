import type { SafeResult } from "yieldless/error";

export type OkResult<T> = readonly [error: null, value: T];
export type ErrResult<E> = readonly [error: E, value: null];

export type ResultMapper<T, Value> = (value: T) => Value;
export type ResultAsyncMapper<T, Value> = (
  value: T,
) => PromiseLike<Value> | Value;
export type ResultNext<Value, NextError> =
  | SafeResult<Value, NextError>
  | PromiseLike<SafeResult<Value, NextError>>;

export function isOk<T, E>(result: SafeResult<T, E>): result is OkResult<T> {
  return result[0] === null;
}

export function isErr<T, E>(result: SafeResult<T, E>): result is ErrResult<E> {
  return result[0] !== null;
}

export function fromNullable<T, E>(
  value: T,
  createError: () => E,
): SafeResult<NonNullable<T>, E> {
  if (value === null || value === undefined) {
    return [createError(), null];
  }

  return [null, value as NonNullable<T>];
}

export function mapOk<T, E, Value>(
  result: SafeResult<T, E>,
  mapper: ResultMapper<T, Value>,
): SafeResult<Value, E> {
  if (isErr(result)) {
    return result;
  }

  return [null, mapper(result[1])];
}

export async function mapOkAsync<T, E, Value>(
  result: SafeResult<T, E>,
  mapper: ResultAsyncMapper<T, Value>,
): Promise<SafeResult<Value, E>> {
  if (isErr(result)) {
    return result;
  }

  return [null, await mapper(result[1])];
}

export function mapErr<T, E, NextError>(
  result: SafeResult<T, E>,
  mapper: ResultMapper<E, NextError>,
): SafeResult<T, NextError> {
  if (isOk(result)) {
    return result;
  }

  return [mapper(result[0]), null];
}

export async function mapErrAsync<T, E, NextError>(
  result: SafeResult<T, E>,
  mapper: ResultAsyncMapper<E, NextError>,
): Promise<SafeResult<T, NextError>> {
  if (isOk(result)) {
    return result;
  }

  return [await mapper(result[0]), null];
}

export function andThen<T, E, Value, NextError>(
  result: SafeResult<T, E>,
  mapper: (value: T) => SafeResult<Value, NextError>,
): SafeResult<Value, E | NextError> {
  if (isErr(result)) {
    return result;
  }

  return mapper(result[1]);
}

export async function andThenAsync<T, E, Value, NextError>(
  result: SafeResult<T, E>,
  mapper: (value: T) => ResultNext<Value, NextError>,
): Promise<SafeResult<Value, E | NextError>> {
  if (isErr(result)) {
    return result;
  }

  return await mapper(result[1]);
}

export function tapOk<T, E>(
  result: SafeResult<T, E>,
  effect: (value: T) => void,
): SafeResult<T, E> {
  if (isOk(result)) {
    effect(result[1]);
  }

  return result;
}

export async function tapOkAsync<T, E>(
  result: SafeResult<T, E>,
  effect: (value: T) => PromiseLike<void> | void,
): Promise<SafeResult<T, E>> {
  if (isOk(result)) {
    await effect(result[1]);
  }

  return result;
}

export function tapErr<T, E>(
  result: SafeResult<T, E>,
  effect: (error: E) => void,
): SafeResult<T, E> {
  if (isErr(result)) {
    effect(result[0]);
  }

  return result;
}

export async function tapErrAsync<T, E>(
  result: SafeResult<T, E>,
  effect: (error: E) => PromiseLike<void> | void,
): Promise<SafeResult<T, E>> {
  if (isErr(result)) {
    await effect(result[0]);
  }

  return result;
}

export function toPromise<T, E>(result: SafeResult<T, E>): Promise<T> {
  if (isErr(result)) {
    return Promise.reject(result[0]);
  }

  return Promise.resolve(result[1]);
}
