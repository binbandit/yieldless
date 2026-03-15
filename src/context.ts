import { AsyncLocalStorage } from "node:async_hooks";

export interface YieldlessContext<T> {
  run<Return>(value: T, fn: () => Return): Return;
  get(): T | undefined;
  expect(message?: string): T;
  bind<Args extends unknown[], Return>(
    fn: (...args: Args) => Return,
  ): (...args: Args) => Return;
}

export interface SpanLike {
  end(): void;
  recordException?(error: unknown): void;
}

export interface TracerLike<Span extends SpanLike = SpanLike> {
  startActiveSpan<Return>(
    name: string,
    fn: (span: Span) => Return,
  ): Return;
}

class AsyncContextStore<T> implements YieldlessContext<T> {
  #storage: AsyncLocalStorage<T>;

  constructor() {
    this.#storage = new AsyncLocalStorage<T>();
  }

  run<Return>(value: T, fn: () => Return): Return {
    return this.#storage.run(value, fn);
  }

  get(): T | undefined {
    return this.#storage.getStore();
  }

  expect(message = "No context value is available for the current execution."): T {
    const value = this.get();

    if (value === undefined) {
      throw new Error(message);
    }

    return value;
  }

  bind<Args extends unknown[], Return>(
    fn: (...args: Args) => Return,
  ): (...args: Args) => Return {
    const value = this.get();

    return (...args: Args): Return => {
      if (value === undefined) {
        return fn(...args);
      }

      return this.run(value, (): Return => fn(...args));
    };
  }
}

/**
 * Creates a small async context store backed by Node's AsyncLocalStorage.
 */
export function createContext<T>(): YieldlessContext<T> {
  return new AsyncContextStore<T>();
}

/**
 * Alias for a context that carries the current tracing span.
 */
export function createTraceContext<Span>(): YieldlessContext<Span> {
  return createContext<Span>();
}

/**
 * Starts an active span, publishes it into async context, and ends it when the
 * callback settles.
 */
export async function withSpan<Span extends SpanLike, Return>(
  tracer: TracerLike<Span>,
  context: YieldlessContext<Span>,
  name: string,
  fn: (span: Span) => PromiseLike<Return> | Return,
): Promise<Return> {
  return await tracer.startActiveSpan(
    name,
    async (span: Span): Promise<Return> =>
      await context.run(span, async (): Promise<Return> => {
        try {
          return await fn(span);
        } catch (error: unknown) {
          span.recordException?.(error);
          throw error;
        } finally {
          span.end();
        }
      }),
  );
}
