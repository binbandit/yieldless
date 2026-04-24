import { createQueue, QueueClosedError, type AsyncQueue } from "yieldless/queue";

export interface PubSubOptions {
  readonly replay?: number;
  readonly subscriberCapacity?: number;
}

export interface PubSubSubscription<T> extends AsyncIterable<T> {
  close(): void;
  next(): Promise<IteratorResult<T>>;
}

export interface PubSub<T, E = Error> {
  readonly closed: boolean;
  readonly subscriberCount: number;
  close(reason?: E): void;
  publish(value: T): number;
  subscribe(): PubSubSubscription<T>;
}

interface Subscriber<T, E> {
  readonly iterator: AsyncIterator<T>;
  readonly queue: AsyncQueue<T, E>;
  readonly subscription: PubSubSubscription<T>;
}

function validateReplay(replay: number): void {
  if (!Number.isInteger(replay) || replay < 0) {
    throw new RangeError("replay must be a non-negative integer.");
  }
}

export function createPubSub<T, E = Error>(
  options: PubSubOptions = {},
): PubSub<T, E> {
  const replay = options.replay ?? 0;
  const subscriberCapacity =
    options.subscriberCapacity ?? Number.POSITIVE_INFINITY;

  validateReplay(replay);

  const subscribers = new Set<Subscriber<T, E>>();
  const history: T[] = [];
  let closed = false;
  let closeReason: E = new QueueClosedError("PubSub is closed.") as E;

  const removeSubscriber = (subscriber: Subscriber<T, E>): void => {
    subscribers.delete(subscriber);
    subscriber.queue.close(closeReason);
  };

  return {
    get closed(): boolean {
      return closed;
    },
    get subscriberCount(): number {
      return subscribers.size;
    },
    close(reason: E = new QueueClosedError("PubSub is closed.") as E): void {
      if (closed) {
        return;
      }

      closed = true;
      closeReason = reason;

      for (const subscriber of subscribers) {
        subscriber.queue.close(reason);
      }

      subscribers.clear();
    },
    publish(value: T): number {
      if (closed) {
        return 0;
      }

      if (replay > 0) {
        history.push(value);

        if (history.length > replay) {
          history.shift();
        }
      }

      for (const subscriber of subscribers) {
        void subscriber.queue.offer(value);
      }

      return subscribers.size;
    },
    subscribe(): PubSubSubscription<T> {
      const queue = createQueue<T, E>({ capacity: subscriberCapacity });

      for (const item of history) {
        void queue.offer(item);
      }

      let subscriber: Subscriber<T, E>;
      const iterator = queue[Symbol.asyncIterator]();
      const subscription: PubSubSubscription<T> = {
        close(): void {
          removeSubscriber(subscriber);
        },
        async next(): Promise<IteratorResult<T>> {
          return await iterator.next();
        },
        [Symbol.asyncIterator](): AsyncIterator<T> {
          return subscription;
        },
      };

      subscriber = {
        iterator,
        queue,
        subscription,
      };

      if (closed) {
        queue.close(closeReason);
        return subscription;
      }

      subscribers.add(subscriber);

      return subscription;
    },
  };
}
