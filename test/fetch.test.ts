import { describe, expect, it, vi } from "vitest";

import {
  fetchJsonSafe,
  fetchSafe,
  FetchUnavailableError,
  HttpStatusError,
  JsonParseError,
  readJsonSafe,
} from "yieldless/fetch";
import { TimeoutError } from "yieldless/signal";

describe("yieldless/fetch", () => {
  it("returns successful responses without consuming the body", async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true }));

    const [error, response] = await fetchSafe("https://example.com/api", {
      fetch: fetcher,
    });

    expect(error).toBeNull();
    expect(response?.ok).toBe(true);
    await expect(response?.json()).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith(
      "https://example.com/api",
      expect.any(Object),
    );
  });

  it("turns non-ok responses into HttpStatusError", async () => {
    const response = new Response("missing", {
      status: 404,
      statusText: "Not Found",
    });

    const [error, value] = await fetchSafe("https://example.com/missing", {
      fetch: async () => response,
    });

    expect(value).toBeNull();
    expect(error).toBeInstanceOf(HttpStatusError);
    expect(error).toMatchObject({
      code: "ERR_HTTP_STATUS",
      status: 404,
      statusText: "Not Found",
    });
  });

  it("supports custom status policies", async () => {
    const [error, response] = await fetchSafe("https://example.com/cache", {
      fetch: async () => new Response(null, { status: 304 }),
      isOkStatus: (value) => value.status === 304,
    });

    expect(error).toBeNull();
    expect(response?.status).toBe(304);
  });

  it("parses JSON responses and reports parse failures", async () => {
    await expect(
      fetchJsonSafe<{ id: number }>("https://example.com/user", {
        fetch: async () => Response.json({ id: 7 }),
      }),
    ).resolves.toEqual([null, { id: 7 }]);

    const [error, value] = await readJsonSafe(new Response("{nope"));

    expect(value).toBeNull();
    expect(error).toBeInstanceOf(JsonParseError);
    expect(error?.code).toBe("ERR_JSON_PARSE");
  });

  it("returns an unavailable error when no fetch implementation exists", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", undefined);

    try {
      const [error, value] = await fetchSafe("https://example.com");

      expect(value).toBeNull();
      expect(error).toBeInstanceOf(FetchUnavailableError);
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("passes a timeout signal to fetch and cleans it up after abort", async () => {
    const [error, value] = await fetchSafe("https://example.com/slow", {
      fetch: async (_input, init) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              reject(init.signal?.reason);
            },
            { once: true },
          );
        }),
      timeoutMs: 5,
    });

    expect(value).toBeNull();
    expect(error).toBeInstanceOf(TimeoutError);
  });
});
