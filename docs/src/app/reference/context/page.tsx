import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/context",
  description:
    "AsyncLocalStorage-based context and a small tracing helper for Node.js.",
};

export default async function ContextPage() {
  return (
    <DocLayout
      title="yieldless/context"
      description="AsyncLocalStorage-based context and a small tracing helper for Node.js."
    >
      <p>
        <code>yieldless/context</code> wraps Node&apos;s{" "}
        <code>AsyncLocalStorage</code> without turning it into a global application container.
      </p>

      <h2>
        Exports
      </h2>

      <Signature>{"createContext<T>(): YieldlessContext<T>"}</Signature>
      <Signature>
        {"createTraceContext<Span>(): YieldlessContext<Span>"}
      </Signature>
      <Signature>
        {"withSpan(tracer, context, name, fn): Promise<Return>"}
      </Signature>

      <h3>
        YieldlessContext&lt;T&gt;
      </h3>

      <table className="mt-6 w-full font-display text-sm">
        <thead>
          <tr>
            <th className="border-b-2 border-ink px-4 py-2.5 text-left font-bold text-ink">
              Method
            </th>
            <th className="border-b-2 border-ink px-4 py-2.5 text-left font-bold text-ink">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>run(value, fn)</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Execute a function with the given context value
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>get()</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Return the current value or undefined
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>expect(message?)</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Return the current value or throw with an optional message
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>bind(fn)</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Capture the current context and bind it to a function
            </td>
          </tr>
        </tbody>
      </table>

      <h2>
        Example
      </h2>

      <CodeBlock
        code={`import { createContext, withSpan } from "yieldless/context";

const requestContext = createContext<{ requestId: string }>();

await requestContext.run({ requestId: crypto.randomUUID() }, async () => {
  console.log(requestContext.expect().requestId);
});`}
        lang="ts"
      />

      <h2>
        Tracing shape
      </h2>

      <p>
        <code>withSpan()</code> expects a tracer with{" "}
        <code>startActiveSpan()</code> and a span with{" "}
        <code>end()</code>. That matches the OpenTelemetry style API closely without taking a
        hard runtime dependency on it.
      </p>

      <h2>
        Use it for
      </h2>

      <ul>
        <li>Request IDs</li>
        <li>Trace spans</li>
        <li>User session metadata</li>
        <li>Transaction handles</li>
      </ul>

      <h2>
        Do not use it for
      </h2>

      <ul>
        <li>Static application dependencies</li>
        <li>Feature flags that are known at startup</li>
        <li>
          Anything that would be clearer as a regular function argument
        </li>
      </ul>
    </DocLayout>
  );
}
