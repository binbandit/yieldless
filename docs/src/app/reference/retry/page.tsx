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
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          yieldless/retry
        </code>{" "}
        wraps tuple-returning operations with exponential backoff and
        abort-aware sleep.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Exports
      </h2>

      <Signature>
        {"safeRetry(operation, options): Promise<SafeResult<T, E>>"}
      </Signature>

      <h3 className="mt-10 font-display text-lg font-bold tracking-tight text-ink">
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
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                maxAttempts
              </code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Total number of attempts including the first
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                baseDelayMs
              </code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Initial delay before the first retry
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                maxDelayMs
              </code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Upper bound on the computed delay
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                factor
              </code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Multiplier applied to the delay after each attempt
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                jitter
              </code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Jitter strategy applied to the delay
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                signal
              </code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              AbortSignal that stops the retry loop immediately
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                shouldRetry(error, attempt)
              </code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Predicate that decides whether to retry a given error
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                onRetry(state)
              </code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Callback invoked before each retry attempt
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
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

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Operational rules
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>Attempt counts start at 1</li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            maxAttempts
          </code>{" "}
          includes the first attempt
        </li>
        <li>
          The retry loop stops immediately when the parent signal is aborted
        </li>
        <li>
          Jitter defaults to{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            "full"
          </code>{" "}
          to avoid herd behavior
        </li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Good retry targets
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>HTTP calls to other services</li>
        <li>Transient database connection failures</li>
        <li>Temporary subprocess startup issues</li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Bad retry targets
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>Validation failures</li>
        <li>Permission errors</li>
        <li>Business-rule violations that are deterministic</li>
      </ul>
    </DocLayout>
  );
}
