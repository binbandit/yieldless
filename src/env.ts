import type {
  ParseAsyncSchema,
  ParseSchema,
  SafeParseAsyncSchema,
  SafeParseSchema,
} from "yieldless/schema";
import { parseAsyncSafe, parseSafe } from "yieldless/schema";
import type { SafeResult } from "yieldless/error";

export type EnvSource = Record<string, string | undefined>;
export type EnvSchema<T, E = Error> =
  | SafeParseSchema<T, E>
  | ParseSchema<T>;
export type EnvAsyncSchema<T, E = Error> =
  | EnvSchema<T, E>
  | SafeParseAsyncSchema<T, E>
  | ParseAsyncSchema<T>;
export type EnvVarErrorCode = "ERR_ENV_EMPTY" | "ERR_ENV_MISSING";

export interface ReadEnvOptions {
  readonly allowEmpty?: boolean;
}

export class EnvVarError extends Error {
  readonly code: EnvVarErrorCode;
  readonly key: string;

  constructor(key: string, code: EnvVarErrorCode, message: string) {
    super(message);
    this.name = "EnvVarError";
    this.code = code;
    this.key = key;
  }
}

function getDefaultEnv(): EnvSource {
  return typeof process === "undefined" ? {} : process.env;
}

function isEmpty(value: string, options: ReadEnvOptions): boolean {
  return value.length === 0 && options.allowEmpty !== true;
}

export function pickEnv<Keys extends readonly string[]>(
  source: EnvSource,
  keys: Keys,
): { readonly [Key in Keys[number]]: string | undefined } {
  const picked: Partial<Record<Keys[number], string | undefined>> = {};

  for (const key of keys) {
    picked[key as Keys[number]] = source[key];
  }

  return picked as { readonly [Key in Keys[number]]: string | undefined };
}

export function readEnv(
  source: EnvSource,
  key: string,
  options: ReadEnvOptions = {},
): SafeResult<string, EnvVarError> {
  const value = source[key];

  if (value === undefined) {
    return [
      new EnvVarError(key, "ERR_ENV_MISSING", `Missing environment variable: ${key}.`),
      null,
    ];
  }

  if (isEmpty(value, options)) {
    return [
      new EnvVarError(key, "ERR_ENV_EMPTY", `Environment variable is empty: ${key}.`),
      null,
    ];
  }

  return [null, value];
}

export function readOptionalEnv(
  source: EnvSource,
  key: string,
  options: ReadEnvOptions = {},
): SafeResult<string | undefined, EnvVarError> {
  const value = source[key];

  if (value === undefined) {
    return [null, undefined];
  }

  if (isEmpty(value, options)) {
    return [
      new EnvVarError(key, "ERR_ENV_EMPTY", `Environment variable is empty: ${key}.`),
      null,
    ];
  }

  return [null, value];
}

export function parseEnvSafe<T, E = Error>(
  schema: EnvSchema<T, E>,
  source: EnvSource = getDefaultEnv(),
): SafeResult<T, E> {
  return parseSafe(schema, source);
}

export async function parseEnvAsyncSafe<T, E = Error>(
  schema: EnvAsyncSchema<T, E>,
  source: EnvSource = getDefaultEnv(),
): Promise<SafeResult<T, E>> {
  return await parseAsyncSafe(schema, source);
}
