import type { SafeResult } from "yieldless/error";

export interface SafeParseSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface SafeParseFailure<E> {
  readonly success: false;
  readonly error: E;
}

export type SafeParseResult<T, E> =
  | SafeParseSuccess<T>
  | SafeParseFailure<E>;

export interface SafeParseSchema<T, E = Error> {
  safeParse(input: unknown): SafeParseResult<T, E>;
}

export interface SafeParseAsyncSchema<T, E = Error> {
  safeParseAsync(input: unknown): PromiseLike<SafeParseResult<T, E>>;
}

export interface ParseSchema<T> {
  parse(input: unknown): T;
}

export interface ParseAsyncSchema<T> {
  parseAsync(input: unknown): PromiseLike<T>;
}

type SyncSchema<T, E> = SafeParseSchema<T, E> | ParseSchema<T>;
type AsyncSchema<T, E> =
  | SyncSchema<T, E>
  | SafeParseAsyncSchema<T, E>
  | ParseAsyncSchema<T>;

function hasSafeParse<T, E>(
  schema: SyncSchema<T, E>,
): schema is SafeParseSchema<T, E> {
  return "safeParse" in schema;
}

function hasSafeParseAsync<T, E>(
  schema: AsyncSchema<T, E>,
): schema is SafeParseAsyncSchema<T, E> {
  return "safeParseAsync" in schema;
}

function hasParseAsync<T, E>(
  schema: AsyncSchema<T, E>,
): schema is ParseAsyncSchema<T> {
  return "parseAsync" in schema;
}

/**
 * Adapts a schema with `safeParse()` or `parse()` into Yieldless tuple
 * results.
 */
export function parseSafe<T, E = Error>(
  schema: SyncSchema<T, E>,
  input: unknown,
): SafeResult<T, E> {
  if (hasSafeParse(schema)) {
    const result = schema.safeParse(input);
    return result.success ? [null, result.data] : [result.error, null];
  }

  try {
    return [null, schema.parse(input)];
  } catch (error: unknown) {
    return [error as E, null];
  }
}

/**
 * Async version of {@link parseSafe}. Supports `safeParseAsync()` and
 * `parseAsync()` when the schema provides them.
 */
export async function parseAsyncSafe<T, E = Error>(
  schema: AsyncSchema<T, E>,
  input: unknown,
): Promise<SafeResult<T, E>> {
  if (hasSafeParseAsync(schema)) {
    const result = await schema.safeParseAsync(input);
    return result.success ? [null, result.data] : [result.error, null];
  }

  if (hasParseAsync(schema)) {
    try {
      return [null, await schema.parseAsync(input)];
    } catch (error: unknown) {
      return [error as E, null];
    }
  }

  return parseSafe(schema, input);
}
