export type ResourceAcquire<T> = () => PromiseLike<T> | T;
export type ResourceRelease<T> = (resource: T) => PromiseLike<void> | void;

export interface AsyncResource<T> extends AsyncDisposable {
  readonly value: T;
}

class ManagedAsyncResource<T> implements AsyncResource<T> {
  readonly value: T;

  #disposed: boolean;
  #release: ResourceRelease<T>;

  constructor(value: T, release: ResourceRelease<T>) {
    this.value = value;
    this.#disposed = false;
    this.#release = release;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;
    await this.#release(this.value);
  }
}

/**
 * Acquires a resource and returns an object that participates in native
 * `await using` cleanup.
 */
export async function acquireResource<T>(
  acquire: ResourceAcquire<T>,
  release: ResourceRelease<T>,
): Promise<AsyncResource<T>> {
  const value: T = await acquire();
  return new ManagedAsyncResource<T>(value, release);
}
