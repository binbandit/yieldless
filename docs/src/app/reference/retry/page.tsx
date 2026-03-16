import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/retry",
  description: "Exponential backoff with jitter and abort-aware delays.",
};

export default async function RetryPage() {
  return (
    <DocLayout
      title="yieldless/retry"
      description="Exponential backoff with jitter and abort-aware delays."
    >
      <p>
        <code>yieldless/retry</code> wraps tuple-returning operations with exponential backoff and
        abort-aware sleep.
      </p>

      <h2>
        Exports
      </h2>

      <Signature>
        {"safeRetry(operation, options): Promise<SafeResult<T, E>>"}
      </Signature>

      <h3>
        Options
      </h3>

      <table className="mt-6 w-full font-display text-sm">
        <thead>
          <tr>
            <th className="border-b-2 border-ink px-4 py-2.5 text-left font-bold text-ink">
              Option
            </th>
            <th className="border-b-2 border-ink px-4 py-2.5 text-left font-bold text-ink">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>maxAttempts</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Total number of attempts including the first
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>baseDelayMs</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Initial delay before the first retry
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>maxDelayMs</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Upper bound on the computed delay
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>factor</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Multiplier applied to the delay after each attempt
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>jitter</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Jitter strategy applied to the delay
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>signal</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              AbortSignal that stops the retry loop immediately
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>shouldRetry(error, attempt)</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Predicate that decides whether to retry a given error
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>onRetry(state)</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Callback invoked before each retry attempt
            </td>
          </tr>
        </tbody>
      </table>

      <h2>
        Example
      </h2>

      <CodeBlock
        code={`import { safeTry } from "yieldless/error";
import { safeRetry } from "yieldless/retry";

const [error, response] = await safeRetry(
  async (_attempt, signal) => safeTry(fetchWithSignal(signal)),
  {
    maxAttempts: 5,
    baseDelayMs: 100,
    shouldRetry: (error) => error.name !== "ValidationError",
  },
);`}
        lang="ts"
      />

      <h2>
        Operational rules
      </h2>

      <ul>
        <li>Attempt counts start at 1</li>
        <li>
          <code>maxAttempts</code> includes the first attempt
        </li>
        <li>
          The retry loop stops immediately when the parent signal is aborted
        </li>
        <li>
          Jitter defaults to <code>"full"</code> to avoid herd behavior
        </li>
      </ul>

      <h2>
        Good retry targets
      </h2>

      <ul>
        <li>HTTP calls to other services</li>
        <li>Transient database connection failures</li>
        <li>Temporary subprocess startup issues</li>
      </ul>

      <h2>
        Bad retry targets
      </h2>

      <ul>
        <li>Validation failures</li>
        <li>Permission errors</li>
        <li>Business-rule violations that are deterministic</li>
      </ul>
    </DocLayout>
  );
}
