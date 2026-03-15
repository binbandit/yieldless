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
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          yieldless/all
        </code>{" "}
        gives you two helpers for tuple-returning parallel work:{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          all(tasks)
        </code>{" "}
        waits for every task or aborts siblings on the first error.{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          race(tasks)
        </code>{" "}
        resolves with the first settled result and aborts the rest.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
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

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
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

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Behavior notes
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            all([])
          </code>{" "}
          succeeds with an empty array.
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            race([])
          </code>{" "}
          throws a{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            RangeError
          </code>
          .
        </li>
        <li>
          If any task returns{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            [error, null]
          </code>
          , siblings are aborted before the final tuple is returned.
        </li>
        <li>
          Thrown task failures are normalized into tuple failures internally.
        </li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        When to prefer runTaskGroup() instead
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        Use{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          all()
        </code>{" "}
        and{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          race()
        </code>{" "}
        when the tasks are already tuple-native. Use{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          runTaskGroup()
        </code>{" "}
        when you want imperative fan-out and regular promise values.
      </p>
    </DocLayout>
  );
}
