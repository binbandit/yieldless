import type { SafeResult } from "yieldless/error";

export interface SerializedIpcError {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
  readonly stack?: string;
  readonly cause?: unknown;
  readonly details?: unknown;
}

export interface IpcProcedure<
  Args extends readonly unknown[] = readonly unknown[],
  Data = unknown,
  ErrorType = SerializedIpcError,
> {
  readonly args: Args;
  readonly data: Data;
  readonly error: ErrorType;
}

export type IpcContract = Record<string, IpcProcedure<any, any, any>>;

export type ProcedureArgs<Procedure> =
  Procedure extends IpcProcedure<infer Args extends readonly unknown[], any, any>
    ? Args
    : never;

export type ProcedureData<Procedure> =
  Procedure extends IpcProcedure<any, infer Data, any> ? Data : never;

export type ProcedureError<Procedure> =
  Procedure extends IpcProcedure<any, any, infer ErrorType> ? ErrorType : never;

export type IpcResult<Procedure> = SafeResult<
  ProcedureData<Procedure>,
  ProcedureError<Procedure>
>;

export type IpcHandler<Procedure, Event> = (
  event: Event,
  ...args: ProcedureArgs<Procedure>
) => PromiseLike<IpcResult<Procedure>> | IpcResult<Procedure>;

export type AbortableIpcHandler<Procedure, Event> = (
  event: Event,
  signal: AbortSignal,
  ...args: ProcedureArgs<Procedure>
) => PromiseLike<IpcResult<Procedure>> | IpcResult<Procedure>;

export type IpcClient<Contract extends IpcContract> = {
  invoke<Channel extends keyof Contract & string>(
    channel: Channel,
    ...args: ProcedureArgs<Contract[Channel]>
  ): Promise<IpcResult<Contract[Channel]>>;
};

export interface AbortableIpcClient<Contract extends IpcContract>
  extends IpcClient<Contract> {
  invokeWithSignal<Channel extends keyof Contract & string>(
    signal: AbortSignal,
    channel: Channel,
    ...args: ProcedureArgs<Contract[Channel]>
  ): Promise<IpcResult<Contract[Channel]>>;
}

export type IpcBridge<Contract extends IpcContract> = {
  [Channel in keyof Contract]: (
    ...args: ProcedureArgs<Contract[Channel]>
  ) => Promise<IpcResult<Contract[Channel]>>;
};

export type AbortSignalIpcBridge<Contract extends IpcContract> = {
  [Channel in keyof Contract]: (
    signal: AbortSignal,
    ...args: ProcedureArgs<Contract[Channel]>
  ) => Promise<IpcResult<Contract[Channel]>>;
};

export type AbortableIpcBridge<Contract extends IpcContract> =
  IpcBridge<Contract> & {
    readonly withSignal: AbortSignalIpcBridge<Contract>;
  };

export interface IpcMainLike<Event = unknown> {
  handle(
    channel: string,
    listener: (event: Event, ...args: unknown[]) => unknown,
  ): void;
  removeHandler(channel: string): void;
}

export interface IpcRendererLike {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

export interface IpcServer<Contract extends IpcContract> {
  handle<Channel extends keyof Contract & string>(
    channel: Channel,
    handler: IpcHandler<Contract[Channel], unknown>,
  ): void;
  removeHandler<Channel extends keyof Contract & string>(channel: Channel): void;
}

export interface AbortableIpcServer<Contract extends IpcContract> {
  handle<Channel extends keyof Contract & string>(
    channel: Channel,
    handler: AbortableIpcHandler<Contract[Channel], unknown>,
  ): void;
  removeHandler<Channel extends keyof Contract & string>(channel: Channel): void;
}

interface AbortableInvokePayload {
  readonly requestId: string;
  readonly args: readonly unknown[];
}

interface AbortableCancelPayload {
  readonly requestId: string;
}

const abortChannelSuffix = "::yieldless:abort";
let nextAbortableRequestId = 0;

function buildSerializedIpcError(
  name: string,
  message: string,
  extras: {
    readonly code?: string | undefined;
    readonly stack?: string | undefined;
    readonly cause?: unknown;
    readonly details?: unknown;
  } = {},
): SerializedIpcError {
  const serialized: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
    cause?: unknown;
    details?: unknown;
  } = {
    name,
    message,
  };

  if (extras.code !== undefined) {
    serialized.code = extras.code;
  }

  if (extras.stack !== undefined) {
    serialized.stack = extras.stack;
  }

  if (extras.cause !== undefined) {
    serialized.cause = extras.cause;
  }

  if (extras.details !== undefined) {
    serialized.details = extras.details;
  }

  return serialized;
}

function getObjectRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as Record<string, unknown>;
}

function createAbortReason(signal: AbortSignal): unknown {
  if ("reason" in signal && signal.reason !== undefined) {
    return signal.reason;
  }

  return new DOMException("This operation was aborted.", "AbortError");
}

function getAbortChannel(channel: string): string {
  return `${channel}${abortChannelSuffix}`;
}

function createAbortableRequestId(channel: string): string {
  nextAbortableRequestId += 1;
  return `${channel}:${String(nextAbortableRequestId)}`;
}

function parseAbortableInvokePayload(
  payload: unknown,
): AbortableInvokePayload | null {
  const record = getObjectRecord(payload);

  if (
    record === null ||
    typeof record.requestId !== "string" ||
    !Array.isArray(record.args)
  ) {
    return null;
  }

  return {
    requestId: record.requestId,
    args: record.args,
  };
}

function parseAbortableCancelPayload(
  payload: unknown,
): AbortableCancelPayload | null {
  const record = getObjectRecord(payload);

  if (record === null || typeof record.requestId !== "string") {
    return null;
  }

  return {
    requestId: record.requestId,
  };
}

/**
 * Converts an arbitrary thrown value into a structured-clone-safe object.
 */
export function serializeIpcError(error: unknown): SerializedIpcError {
  if (error instanceof Error) {
    const record = error as Error & {
      code?: string;
      details?: unknown;
      cause?: unknown;
    };

    return buildSerializedIpcError(error.name, error.message, {
      code: record.code,
      stack: error.stack,
      cause: record.cause,
      details: record.details,
    });
  }

  const record = getObjectRecord(error);

  if (record !== null) {
    const extraKeys = Object.keys(record).filter(
      (key) =>
        key !== "name" &&
        key !== "message" &&
        key !== "code" &&
        key !== "stack" &&
        key !== "cause" &&
        key !== "details",
    );

    const details =
      "details" in record
        ? record.details
        : extraKeys.length > 0
          ? Object.fromEntries(extraKeys.map((key) => [key, record[key]]))
          : undefined;

    return buildSerializedIpcError(
      typeof record.name === "string" ? record.name : "Error",
      typeof record.message === "string"
        ? record.message
        : "Unknown IPC error",
      {
        code: typeof record.code === "string" ? record.code : undefined,
        stack: typeof record.stack === "string" ? record.stack : undefined,
        cause: record.cause,
        details,
      },
    );
  }

  return buildSerializedIpcError(
    "Error",
    typeof error === "string" ? error : String(error),
    {
      details: error,
    },
  );
}

function isSerializedIpcError(value: unknown): value is SerializedIpcError {
  const record = getObjectRecord(value);

  return (
    record !== null &&
    typeof record.name === "string" &&
    typeof record.message === "string"
  );
}

/**
 * Normalizes a raw IPC return payload into a Yieldless tuple.
 */
export function deserializeIpcResult<T, E = SerializedIpcError>(
  payload: unknown,
): SafeResult<T, E> {
  if (!Array.isArray(payload) || payload.length !== 2) {
    return [serializeIpcError(new Error("Invalid IPC tuple payload.")) as E, null];
  }

  const [error, value] = payload;

  if (error === null) {
    return [null, value as T];
  }

  if (isSerializedIpcError(error)) {
    return [error as E, null];
  }

  return [serializeIpcError(error) as E, null];
}

/**
 * Wraps Electron-style `ipcMain.handle()` with tuple-aware handlers.
 */
export function createIpcMain<Contract extends IpcContract, Event = unknown>(
  ipcMain: IpcMainLike<Event>,
): IpcServer<Contract> {
  return {
    handle<Channel extends keyof Contract & string>(
      channel: Channel,
      handler: IpcHandler<Contract[Channel], Event>,
    ): void {
      ipcMain.handle(
        channel,
        async (
          event: Event,
          ...rawArgs: unknown[]
        ): Promise<SafeResult<ProcedureData<Contract[Channel]>, SerializedIpcError>> => {
          const args = rawArgs as ProcedureArgs<Contract[Channel]>;

          try {
            const result = await handler(event, ...args);

            if (result[0] !== null) {
              return [serializeIpcError(result[0]), null];
            }

            return result;
          } catch (error: unknown) {
            return [serializeIpcError(error), null];
          }
        },
      );
    },

    removeHandler<Channel extends keyof Contract & string>(
      channel: Channel,
    ): void {
      ipcMain.removeHandler(channel);
    },
  };
}

/**
 * Wraps Electron-style `ipcRenderer.invoke()` with tuple-aware decoding.
 */
export function createIpcRenderer<Contract extends IpcContract>(
  ipcRenderer: IpcRendererLike,
): IpcClient<Contract> {
  const invokeRaw = ipcRenderer.invoke.bind(ipcRenderer) as (
    channel: string,
    ...args: unknown[]
  ) => Promise<unknown>;

  return {
    async invoke<Channel extends keyof Contract & string>(
      channel: Channel,
      ...args: ProcedureArgs<Contract[Channel]>
    ): Promise<IpcResult<Contract[Channel]>> {
      const payload = await invokeRaw(channel, ...(args as unknown[]));
      return deserializeIpcResult<
        ProcedureData<Contract[Channel]>,
        ProcedureError<Contract[Channel]>
      >(payload);
    },
  };
}

/**
 * Wraps Electron IPC with tuple-aware handlers that can be canceled from the
 * renderer through an AbortSignal-aware side channel.
 */
export function createAbortableIpcMain<
  Contract extends IpcContract,
  Event = unknown,
>(
  ipcMain: IpcMainLike<Event>,
): AbortableIpcServer<Contract> {
  const activeRequests = new Map<string, Map<string, AbortController>>();

  return {
    handle<Channel extends keyof Contract & string>(
      channel: Channel,
      handler: AbortableIpcHandler<Contract[Channel], Event>,
    ): void {
      const channelRequests = new Map<string, AbortController>();
      activeRequests.set(channel, channelRequests);

      ipcMain.handle(
        channel,
        async (
          event: Event,
          rawPayload: unknown,
        ): Promise<SafeResult<ProcedureData<Contract[Channel]>, SerializedIpcError>> => {
          const payload = parseAbortableInvokePayload(rawPayload);

          if (payload === null) {
            return [
              serializeIpcError(new Error("Invalid abortable IPC request payload.")),
              null,
            ];
          }

          const controller = new AbortController();
          channelRequests.set(payload.requestId, controller);

          try {
            const args = payload.args as ProcedureArgs<Contract[Channel]>;
            const result = await handler(event, controller.signal, ...args);

            if (result[0] !== null) {
              return [serializeIpcError(result[0]), null];
            }

            return result;
          } catch (error: unknown) {
            return [serializeIpcError(error), null];
          } finally {
            channelRequests.delete(payload.requestId);
          }
        },
      );

      ipcMain.handle(
        getAbortChannel(channel),
        async (_event: Event, rawPayload: unknown): Promise<null> => {
          const payload = parseAbortableCancelPayload(rawPayload);

          if (payload !== null) {
            channelRequests
              .get(payload.requestId)
              ?.abort(new DOMException("IPC request canceled.", "AbortError"));
          }

          return null;
        },
      );
    },

    removeHandler<Channel extends keyof Contract & string>(
      channel: Channel,
    ): void {
      const channelRequests = activeRequests.get(channel);

      if (channelRequests !== undefined) {
        for (const controller of channelRequests.values()) {
          controller.abort(new DOMException("IPC handler removed.", "AbortError"));
        }

        channelRequests.clear();
        activeRequests.delete(channel);
      }

      ipcMain.removeHandler(channel);
      ipcMain.removeHandler(getAbortChannel(channel));
    },
  };
}

/**
 * Wraps Electron IPC with client-side AbortSignal support. If the signal
 * aborts, the renderer resolves immediately with an abort tuple and notifies
 * the main process to abort the in-flight request.
 */
export function createAbortableIpcRenderer<Contract extends IpcContract>(
  ipcRenderer: IpcRendererLike,
): AbortableIpcClient<Contract> {
  const invokeRaw = ipcRenderer.invoke.bind(ipcRenderer) as (
    channel: string,
    ...args: unknown[]
  ) => Promise<unknown>;

  const invokeInternal = async <Channel extends keyof Contract & string>(
    channel: Channel,
    args: ProcedureArgs<Contract[Channel]>,
    signal?: AbortSignal,
  ): Promise<IpcResult<Contract[Channel]>> => {
    if (signal?.aborted) {
      return [createAbortReason(signal) as ProcedureError<Contract[Channel]>, null];
    }

    const requestId = createAbortableRequestId(channel);
    const request = invokeRaw(channel, {
      requestId,
      args: args as readonly unknown[],
    }).then((payload) =>
      deserializeIpcResult<
        ProcedureData<Contract[Channel]>,
        ProcedureError<Contract[Channel]>
      >(payload),
    );

    if (signal === undefined) {
      return await request;
    }

    void request.catch((): void => undefined);

    return await new Promise<IpcResult<Contract[Channel]>>((resolve, reject) => {
      const cleanup = (): void => {
        signal.removeEventListener("abort", onAbort);
      };

      const onAbort = (): void => {
        cleanup();
        void invokeRaw(getAbortChannel(channel), { requestId }).catch(
          (): void => undefined,
        );
        resolve([
          createAbortReason(signal) as ProcedureError<Contract[Channel]>,
          null,
        ]);
      };

      signal.addEventListener("abort", onAbort, { once: true });

      if (signal.aborted) {
        onAbort();
        return;
      }

      request.then(
        (result) => {
          cleanup();
          resolve(result);
        },
        (error: unknown) => {
          cleanup();
          reject(error);
        },
      );
    });
  };

  return {
    async invoke<Channel extends keyof Contract & string>(
      channel: Channel,
      ...args: ProcedureArgs<Contract[Channel]>
    ): Promise<IpcResult<Contract[Channel]>> {
      return await invokeInternal(channel, args);
    },

    async invokeWithSignal<Channel extends keyof Contract & string>(
      signal: AbortSignal,
      channel: Channel,
      ...args: ProcedureArgs<Contract[Channel]>
    ): Promise<IpcResult<Contract[Channel]>> {
      return await invokeInternal(channel, args, signal);
    },
  };
}

/**
 * Creates a preload-friendly object with one method per allowed channel.
 */
export function createIpcBridge<
  Contract extends IpcContract,
  Channels extends readonly (keyof Contract & string)[],
>(
  client: IpcClient<Contract>,
  channels: Channels,
): Pick<IpcBridge<Contract>, Channels[number]> {
  const bridge: Partial<IpcBridge<Contract>> = {};
  const invokeRaw = client.invoke as (
    channel: string,
    ...args: unknown[]
  ) => Promise<unknown>;

  for (const channel of channels) {
    const invoke = (
      ...args: readonly unknown[]
    ): Promise<IpcResult<Contract[typeof channel]>> =>
      invokeRaw(channel, ...args) as Promise<IpcResult<Contract[typeof channel]>>;

    bridge[channel] = invoke as IpcBridge<Contract>[typeof channel];
  }

  return bridge as Pick<IpcBridge<Contract>, Channels[number]>;
}

/**
 * Creates a preload-friendly bridge that supports both normal IPC calls and an
 * explicit `withSignal` path for cancelable requests.
 */
export function createAbortableIpcBridge<
  Contract extends IpcContract,
  Channels extends readonly (keyof Contract & string)[],
>(
  client: AbortableIpcClient<Contract>,
  channels: Channels,
): Pick<IpcBridge<Contract>, Channels[number]> & {
  readonly withSignal: Pick<AbortSignalIpcBridge<Contract>, Channels[number]>;
} {
  const bridge: Partial<IpcBridge<Contract>> = {};
  const withSignal: Partial<AbortSignalIpcBridge<Contract>> = {};
  const invokeRaw = client.invoke as (
    channel: string,
    ...args: unknown[]
  ) => Promise<unknown>;
  const invokeWithSignalRaw = client.invokeWithSignal as (
    signal: AbortSignal,
    channel: string,
    ...args: unknown[]
  ) => Promise<unknown>;

  for (const channel of channels) {
    bridge[channel] = ((...args: readonly unknown[]) =>
      invokeRaw(channel, ...args)) as IpcBridge<Contract>[typeof channel];
    withSignal[channel] = ((signal: AbortSignal, ...args: readonly unknown[]) =>
      invokeWithSignalRaw(signal, channel, ...args)) as AbortSignalIpcBridge<
      Contract
    >[typeof channel];
  }

  return {
    ...(bridge as Pick<IpcBridge<Contract>, Channels[number]>),
    withSignal:
      withSignal as Pick<AbortSignalIpcBridge<Contract>, Channels[number]>,
  };
}
