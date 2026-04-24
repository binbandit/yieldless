import { describe, expect, it } from "vitest";

import {
  EnvVarError,
  parseEnvAsyncSafe,
  parseEnvSafe,
  pickEnv,
  readEnv,
  readOptionalEnv,
} from "yieldless/env";

describe("yieldless/env", () => {
  it("reads required and optional environment variables", () => {
    const source = {
      API_URL: "https://example.com",
      EMPTY: "",
    };

    expect(readEnv(source, "API_URL")).toEqual([
      null,
      "https://example.com",
    ]);
    expect(readOptionalEnv(source, "MISSING")).toEqual([null, undefined]);

    const [missing] = readEnv(source, "MISSING");
    const [empty] = readEnv(source, "EMPTY");

    expect(missing).toBeInstanceOf(EnvVarError);
    expect(missing).toMatchObject({
      code: "ERR_ENV_MISSING",
      key: "MISSING",
    });
    expect(empty).toMatchObject({
      code: "ERR_ENV_EMPTY",
      key: "EMPTY",
    });
    expect(readEnv(source, "EMPTY", { allowEmpty: true })).toEqual([null, ""]);
  });

  it("picks a typed subset before schema parsing", () => {
    const picked = pickEnv(
      {
        DATABASE_URL: "postgres://localhost",
        SECRET: "hidden",
      },
      ["DATABASE_URL", "PORT"] as const,
    );

    expect(picked).toEqual({
      DATABASE_URL: "postgres://localhost",
      PORT: undefined,
    });
  });

  it("parses environment objects with safeParse-style schemas", () => {
    const schema = {
      safeParse(input: unknown) {
        const env = input as Record<string, string | undefined>;

        if (env.DATABASE_URL === undefined) {
          return {
            success: false as const,
            error: new Error("DATABASE_URL is required"),
          };
        }

        return {
          success: true as const,
          data: {
            databaseUrl: env.DATABASE_URL,
            port: Number(env.PORT ?? 3_000),
          },
        };
      },
    };

    expect(
      parseEnvSafe(schema, {
        DATABASE_URL: "postgres://localhost",
        PORT: "5432",
      }),
    ).toEqual([
      null,
      {
        databaseUrl: "postgres://localhost",
        port: 5_432,
      },
    ]);

    expect(parseEnvSafe(schema, {})[0]?.message).toBe("DATABASE_URL is required");
  });

  it("supports async environment schemas", async () => {
    const schema = {
      async parseAsync(input: unknown) {
        const env = input as Record<string, string | undefined>;

        if (env.TOKEN === undefined) {
          throw new Error("TOKEN is required");
        }

        return {
          token: env.TOKEN,
        };
      },
    };

    await expect(parseEnvAsyncSafe(schema, { TOKEN: "secret" })).resolves.toEqual([
      null,
      { token: "secret" },
    ]);
    await expect(parseEnvAsyncSafe(schema, {})).resolves.toEqual([
      expect.any(Error),
      null,
    ]);
  });
});
