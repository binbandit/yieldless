import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Note } from "@/components/note";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/all",
  description: "Tuple-aware parallel combinators that share cancellation.",
};

export default async function AllPage() {
  return (
    <DocLayout
      title="yieldless/all"
      description="Tuple-aware parallel combinators that share cancellation."
    >
      <p>
        <code>yieldless/all</code> gives you two helpers for tuple-returning parallel work:{" "}
        <code>all(tasks)</code> waits for every task or aborts siblings on the first error.{" "}
        <code>race(tasks)</code> resolves with the first settled result and aborts the rest.
      </p>

      <h2>
        Exports
      </h2>

      <Signature>
        {"type SafeTask<T, E = Error> = (signal: AbortSignal) => PromiseLike<SafeResult<T, E>> | SafeResult<T, E>"}
      </Signature>
      <Signature>
        {"all(tasks, options): Promise<SafeResult<AllValues<Tasks>, ParallelError<Tasks>>>"}
      </Signature>
      <Signature>
        {"race(tasks, options): Promise<SafeResult<Value, Error>>"}
      </Signature>

      <h2>
        Example
      </h2>

      <CodeBlock
        code={`import { all } from "yieldless/all";
import { safeTry } from "yieldless/error";

const result = await all([
  (signal) => safeTry(readPrimary(signal)),
  (signal) => safeTry(readReplica(signal)),
]);`}
        lang="ts"
      />

      <h2>
        Behavior notes
      </h2>

      <ul>
        <li>
          <code>all([])</code> succeeds with an empty array.
        </li>
        <li>
          <code>race([])</code> throws a <code>RangeError</code>.
        </li>
        <li>
          If any task returns <code>[error, null]</code>, siblings are aborted before the final tuple is returned.
        </li>
        <li>
          Thrown task failures are normalized into tuple failures internally.
        </li>
      </ul>

      <h2>
        When to prefer runTaskGroup() instead
      </h2>

      <p>
        Use <code>all()</code> and <code>race()</code> when the tasks are already tuple-native. Use{" "}
        <code>runTaskGroup()</code> when you want imperative fan-out and regular promise values.
      </p>
    </DocLayout>
  );
}
