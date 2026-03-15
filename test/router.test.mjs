import assert from "node:assert/strict";
import test from "node:test";

import {
  BadRequestError,
  honoHandler,
  NotFoundError,
} from "yieldless/router";

function createContext() {
  return {
    json(body, status = 200) {
      return Response.json(body, { status });
    },
  };
}

test("honoHandler serializes successful tuple results", async () => {
  const handler = honoHandler(
    async () => [null, { ok: true }],
    { successStatus: 201 },
  );

  const response = await handler(createContext());
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(body, { ok: true });
});

test("honoHandler maps known HTTP errors to JSON responses", async () => {
  const handler = honoHandler(async () => [new NotFoundError("missing"), null]);

  const response = await handler(createContext());
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(body, {
    error: "not_found",
    message: "missing",
  });
});

test("honoHandler uses a generic 500 response for unknown errors", async () => {
  const handler = honoHandler(async () => [new Error("db down"), null]);

  const response = await handler(createContext());
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.deepEqual(body, {
    error: "internal_error",
    message: "Internal Server Error",
  });
});

test("honoHandler supports custom error mapping", async () => {
  const handler = honoHandler(
    async () => ["invalid", null],
    {
      mapError: (error) =>
        new BadRequestError(String(error), {
          details: { field: "email" },
        }),
    },
  );

  const response = await handler(createContext());
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    error: "bad_request",
    message: "invalid",
    details: { field: "email" },
  });
});
