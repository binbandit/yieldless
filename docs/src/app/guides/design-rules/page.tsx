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
      <p>
        Yieldless is small on purpose. The design rules are what keep it small.
      </p>

      {/* ── Rule 1 ────────────────────────────────────────── */}

      <h2>
        1. Prefer native language features over framework runtimes
      </h2>

      <p>
        If JavaScript or Node already has a solid primitive for the job,
        Yieldless uses it.
      </p>

      <ul>
        <li>
          <code>Promise</code> and <code>async/await</code> for sequencing
        </li>
        <li>
          <code>AbortController</code> and <code>AbortSignal</code> for cancellation
        </li>
        <li>
          <code>AsyncLocalStorage</code> for async context in Node
        </li>
        <li>
          <code>Symbol.asyncDispose</code> and <code>await using</code> for resource cleanup
        </li>
      </ul>

      <p>
        This rule keeps the library easy to explain to engineers who did not
        build the original system.
      </p>

      {/* ── Rule 2 ────────────────────────────────────────── */}

      <h2>
        2. Keep failures visible
      </h2>

      <p>
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

      <p>
        That shape is intentionally repetitive. It makes failure handling obvious
        during code review.
      </p>

      {/* ── Rule 3 ────────────────────────────────────────── */}

      <h2>
        3. Cancellation is cooperative
      </h2>

      <p>
        <code>runTaskGroup()</code>,{" "}
        <code>all()</code>,{" "}
        <code>race()</code>, and{" "}
        <code>safeRetry()</code> all respect{" "}
        <code>AbortSignal</code>, but they cannot cancel code that ignores the signal.
      </p>

      <CodeBlock
        code={`group.spawn((signal) => runCommand("git", ["fetch"], { signal }));`}
      />

      {/* ── Rule 4 ────────────────────────────────────────── */}

      <h2>
        4. Keep adapters thin
      </h2>

      <p>
        The schema, router, IPC, and Node modules are adapters. They are not
        attempts to replace the libraries they sit beside.
      </p>

      {/* ── Rule 5 ────────────────────────────────────────── */}

      <h2>
        5. Avoid global magic
      </h2>

      <p>
        Use <code>inject()</code> for stable dependencies. Use{" "}
        <code>createContext()</code> for request-scoped data.
      </p>

      {/* ── Rule 6 ────────────────────────────────────────── */}

      <h2>
        6. Pick the smallest module that solves the problem
      </h2>

      <div className="my-6 overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Problem</th>
              <th>Start with</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>You want cleaner async errors</td>
              <td><code>yieldless/error</code></td>
            </tr>
            <tr>
              <td>You need sibling cancellation</td>
              <td><code>yieldless/task</code></td>
            </tr>
            <tr>
              <td>You need abort-aware retries</td>
              <td><code>yieldless/retry</code></td>
            </tr>
            <tr>
              <td>You want typed route handlers</td>
              <td><code>yieldless/router</code></td>
            </tr>
            <tr>
              <td>You are building an Electron boundary</td>
              <td><code>yieldless/ipc</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Rule 7 ────────────────────────────────────────── */}

      <h2>
        7. Re-throw only at the boundary that needs it
      </h2>

      <p>
        <code>unwrap()</code> exists for places that genuinely expect thrown exceptions.
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
