import type { SafeResult } from "yieldless/error";

export interface JsonContext {
  json(body: unknown, status?: number): Response | Promise<Response>;
}

export interface ErrorResponseBody {
  readonly error: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface HttpErrorOptions {
  readonly code?: string;
  readonly details?: unknown;
  readonly expose?: boolean;
  readonly cause?: unknown;
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(
    status: number,
    message: string,
    options: HttpErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.status = status;
    this.code = options.code ?? "http_error";
    this.details = options.details;
    this.expose = options.expose ?? status < 500;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request", options: HttpErrorOptions = {}) {
    super(400, message, { ...options, code: options.code ?? "bad_request" });
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized", options: HttpErrorOptions = {}) {
    super(401, message, { ...options, code: options.code ?? "unauthorized" });
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden", options: HttpErrorOptions = {}) {
    super(403, message, { ...options, code: options.code ?? "forbidden" });
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not found", options: HttpErrorOptions = {}) {
    super(404, message, { ...options, code: options.code ?? "not_found" });
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict", options: HttpErrorOptions = {}) {
    super(409, message, { ...options, code: options.code ?? "conflict" });
  }
}

export class ValidationError extends HttpError {
  constructor(message = "Validation failed", options: HttpErrorOptions = {}) {
    super(422, message, { ...options, code: options.code ?? "validation_error" });
  }
}

export type TupleRouteHandler<Context, Data, ErrorType = Error> = (
  context: Context,
) => PromiseLike<SafeResult<Data, ErrorType>> | SafeResult<Data, ErrorType>;

export interface HonoHandlerOptions<Context, Data, ErrorType = Error> {
  readonly successStatus?: number;
  readonly mapError?: (error: ErrorType) => HttpError;
  readonly onSuccess?: (
    context: Context,
    data: Data,
  ) => Response | Promise<Response>;
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof Error) {
    return new HttpError(500, error.message, {
      cause: error,
      code: "internal_error",
      expose: false,
    });
  }

  return new HttpError(500, "Internal Server Error", {
    code: "internal_error",
    details: error,
    expose: false,
  });
}

function createErrorBody(error: HttpError): ErrorResponseBody {
  const message = error.expose ? error.message : "Internal Server Error";

  return error.expose && error.details !== undefined
    ? {
        error: error.code,
        message,
        details: error.details,
      }
    : {
        error: error.code,
        message,
      };
}

/**
 * Converts tuple-returning handlers into Hono-style route handlers.
 */
export function honoHandler<
  Context extends JsonContext,
  Data,
  ErrorType = Error,
>(
  handler: TupleRouteHandler<Context, Data, ErrorType>,
  options: HonoHandlerOptions<Context, Data, ErrorType> = {},
): (context: Context) => Promise<Response> {
  return async (context: Context): Promise<Response> => {
    const result = await handler(context);

    if (result[0] !== null) {
      const error = options.mapError?.(result[0]) ?? toHttpError(result[0]);
      return await context.json(createErrorBody(error), error.status);
    }

    if (options.onSuccess !== undefined) {
      return await options.onSuccess(context, result[1] as Data);
    }

    if (result[1] instanceof Response) {
      return result[1];
    }

    return await context.json(result[1], options.successStatus ?? 200);
  };
}
