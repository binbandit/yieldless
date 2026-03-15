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

export type IpcClient<Contract extends IpcContract> = {
  invoke<Channel extends keyof Contract & string>(
    channel: Channel,
    ...args: ProcedureArgs<Contract[Channel]>
  ): Promise<IpcResult<Contract[Channel]>>;
};

export type IpcBridge<Contract extends IpcContract> = {
  [Channel in keyof Contract]: (
    ...args: ProcedureArgs<Contract[Channel]>
  ) => Promise<IpcResult<Contract[Channel]>>;
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
