import assert from "node:assert/strict";
import test from "node:test";

import {
  createContext,
  createTraceContext,
  withSpan,
} from "yieldless/context";

test("createContext keeps values across async work created inside run", async () => {
  const requestContext = createContext();

  const value = await requestContext.run({ requestId: "req-1" }, async () => {
    await Promise.resolve();

    return await new Promise((resolve) => {
      setTimeout(() => {
        resolve(requestContext.expect().requestId);
      }, 0);
    });
  });

  assert.equal(value, "req-1");
  assert.equal(requestContext.get(), undefined);
});

test("bind captures the current store for later callbacks", () => {
  const requestContext = createContext();
  const bound = requestContext.run({ requestId: "req-2" }, () =>
    requestContext.bind(() => requestContext.expect().requestId),
  );

  assert.equal(bound(), "req-2");
});

test("withSpan publishes the active span and ends it on success", async () => {
  const traceContext = createTraceContext();
  const events = [];

  const tracer = {
    startActiveSpan(name, fn) {
      events.push(`start:${name}`);

      const span = {
        end() {
          events.push("end");
        },
        recordException(error) {
          events.push(`error:${String(error)}`);
        },
      };

      return fn(span);
    },
  };

  const result = await withSpan(tracer, traceContext, "work", async (span) => {
    await Promise.resolve();
    assert.equal(traceContext.expect(), span);
    return "ok";
  });

  assert.equal(result, "ok");
  assert.deepEqual(events, ["start:work", "end"]);
});

test("withSpan records exceptions before rethrowing", async () => {
  const traceContext = createTraceContext();
  const recorded = [];

  const tracer = {
    startActiveSpan(_name, fn) {
      const span = {
        end() {
          recorded.push("end");
        },
        recordException(error) {
          recorded.push(String(error));
        },
      };

      return fn(span);
    },
  };

  await assert.rejects(
    withSpan(tracer, traceContext, "broken", async () => {
      throw new Error("boom");
    }),
    /boom/,
  );

  assert.deepEqual(recorded, ["Error: boom", "end"]);
});
