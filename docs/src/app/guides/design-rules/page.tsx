import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";

export const metadata: Metadata = {
  title: "Design Rules",
  description:
    "The principles behind Yieldless and the tradeoffs those principles deliberately make.",
};

export default async function DesignRulesPage() {
  return (
    <DocLayout
      title="Design Rules"
      description="The principles behind Yieldless and the tradeoffs those principles deliberately make."
    >
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        Yieldless is small on purpose. The design rules are what keep it small.
      </p>

      {/* ── Rule 1 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        1. Prefer native language features over framework runtimes
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        If JavaScript or Node already has a solid primitive for the job,
        Yieldless uses it.
      </p>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            Promise
          </code>{" "}
          and{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            async/await
          </code>{" "}
          for sequencing
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            AbortController
          </code>{" "}
          and{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            AbortSignal
          </code>{" "}
          for cancellation
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            AsyncLocalStorage
          </code>{" "}
          for async context in Node
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            Symbol.asyncDispose
          </code>{" "}
          and{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            await using
          </code>{" "}
          for resource cleanup
        </li>
      </ul>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        This rule keeps the library easy to explain to engineers who did not
        build the original system.
      </p>

      {/* ── Rule 2 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        2. Keep failures visible
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        Thrown exceptions are still useful for process-level failures and
        framework boundaries, but routine operational failures should stay
        explicit.
      </p>

      <CodeBlock
        code={`const [error, value] = await safeTry(readConfig());

if (error) {
  return [error, null] as const;
}`}
      />

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        That shape is intentionally repetitive. It makes failure handling obvious
        during code review.
      </p>

      {/* ── Rule 3 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        3. Cancellation is cooperative
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          runTaskGroup()
        </code>
        ,{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          all()
        </code>
        ,{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          race()
        </code>
        , and{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          safeRetry()
        </code>{" "}
        all respect{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          AbortSignal
        </code>
        , but they cannot cancel code that ignores the signal.
      </p>

      <CodeBlock
        code={`group.spawn((signal) => runCommand("git", ["fetch"], { signal }));`}
      />

      {/* ── Rule 4 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        4. Keep adapters thin
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        The schema, router, IPC, and Node modules are adapters. They are not
        attempts to replace the libraries they sit beside.
      </p>

      {/* ── Rule 5 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        5. Avoid global magic
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        Use{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          inject()
        </code>{" "}
        for stable dependencies. Use{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          createContext()
        </code>{" "}
        for request-scoped data.
      </p>

      {/* ── Rule 6 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        6. Pick the smallest module that solves the problem
      </h2>

      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-3 pr-6 text-left font-display font-bold text-ink">
                Problem
              </th>
              <th className="py-3 text-left font-display font-bold text-ink">
                Start with
              </th>
            </tr>
          </thead>
          <tbody className="text-ink-secondary">
            <tr className="border-b border-rule">
              <td className="py-3 pr-6">You want cleaner async errors</td>
              <td className="py-3">
                <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                  yieldless/error
                </code>
              </td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-3 pr-6">You need sibling cancellation</td>
              <td className="py-3">
                <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                  yieldless/task
                </code>
              </td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-3 pr-6">You need abort-aware retries</td>
              <td className="py-3">
                <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                  yieldless/retry
                </code>
              </td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-3 pr-6">You want typed route handlers</td>
              <td className="py-3">
                <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                  yieldless/router
                </code>
              </td>
            </tr>
            <tr className="border-b border-rule">
              <td className="py-3 pr-6">
                You are building an Electron boundary
              </td>
              <td className="py-3">
                <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                  yieldless/ipc
                </code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Rule 7 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        7. Re-throw only at the boundary that needs it
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          unwrap()
        </code>{" "}
        exists for places that genuinely expect thrown exceptions.
      </p>

      <CodeBlock
        code={`import { safeTry, unwrap } from "yieldless/error";

await transaction(async () => {
  const result = await safeTry(writeModel());
  return unwrap(result);
});`}
      />
    </DocLayout>
  );
}
