import type { SafeResult } from "yieldless/error";
import { createTimeoutSignal } from "yieldless/signal";

export interface FetchSafeOptions extends RequestInit {
  readonly fetch?: typeof fetch;
  readonly isOkStatus?: (response: Response) => boolean;
  readonly timeoutMs?: number;
}

export type FetchSafeError = Error | HttpStatusError;
export type FetchJsonError = FetchSafeError | JsonParseError;

export class FetchUnavailableError extends Error {
  readonly code: "ERR_FETCH_UNAVAILABLE";

  constructor(message = "No fetch implementation is available.") {
    super(message);
    this.name = "FetchUnavailableError";
    this.code = "ERR_FETCH_UNAVAILABLE";
  }
}

export class HttpStatusError extends Error {
  readonly code: "ERR_HTTP_STATUS";
  readonly response: Response;
  readonly status: number;
  readonly statusText: string;
  readonly url: string;

  constructor(
    response: Response,
    message = `HTTP request failed with status ${String(response.status)}.`,
  ) {
    super(message);
    this.name = "HttpStatusError";
    this.code = "ERR_HTTP_STATUS";
    this.response = response;
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
  }
}

export class JsonParseError extends Error {
  readonly code: "ERR_JSON_PARSE";
  override readonly cause: unknown;

  constructor(cause: unknown, message = "Failed to parse response JSON.") {
    super(message, { cause });
    this.name = "JsonParseError";
    this.code = "ERR_JSON_PARSE";
    this.cause = cause;
  }
}

function buildRequestInit(
  init: RequestInit,
  signal: AbortSignal | null | undefined,
): RequestInit {
  const requestInit: RequestInit = { ...init };

  if (signal !== undefined && signal !== null) {
    requestInit.signal = signal;
  }

  return requestInit;
}

/**
 * Runs native fetch with tuple errors, optional timeout, and non-2xx response
 * handling.
 */
export async function fetchSafe(
  input: RequestInfo | URL,
  options: FetchSafeOptions = {},
): Promise<SafeResult<Response, FetchSafeError>> {
  const {
    fetch: fetcher = globalThis.fetch,
    isOkStatus = (response: Response): boolean => response.ok,
    timeoutMs,
    ...init
  } = options;

  if (typeof fetcher !== "function") {
    return [new FetchUnavailableError(), null];
  }

  const timeoutOptions =
    init.signal === undefined || init.signal === null
      ? {}
      : { signal: init.signal };
  const timeout =
    timeoutMs === undefined
      ? null
      : createTimeoutSignal(timeoutMs, timeoutOptions);

  try {
    const response = await fetcher(
      input,
      buildRequestInit(init, timeout?.signal ?? init.signal),
    );

    if (!isOkStatus(response)) {
      return [new HttpStatusError(response), null];
    }

    return [null, response];
  } catch (error: unknown) {
    return [error as Error, null];
  } finally {
    timeout?.[Symbol.dispose]();
  }
}

/**
 * Reads a response body as JSON and captures parser failures in a typed error.
 */
export async function readJsonSafe<T = unknown>(
  response: Response,
): Promise<SafeResult<T, JsonParseError>> {
  try {
    return [null, (await response.json()) as T];
  } catch (error: unknown) {
    return [new JsonParseError(error), null];
  }
}

/**
 * Fetches a URL and parses a successful response as JSON.
 */
export async function fetchJsonSafe<T = unknown>(
  input: RequestInfo | URL,
  options: FetchSafeOptions = {},
): Promise<SafeResult<T, FetchJsonError>> {
  const [fetchError, response] = await fetchSafe(input, options);

  if (fetchError) {
    return [fetchError, null];
  }

  return await readJsonSafe<T>(response);
}
