import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/task",
  description:
    "Structured concurrency with a shared AbortSignal and sibling cancellation.",
};

export default async function TaskPage() {
  return (
    <DocLayout
      title="yieldless/task"
      description="Structured concurrency with a shared AbortSignal and sibling cancellation."
    >
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          yieldless/task
        </code>{" "}
        gives you a small structured-concurrency primitive for normal async
        functions.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Exports
      </h2>

      <Signature>
        {"type TaskFactory<T> = (signal: AbortSignal) => PromiseLike<T> | T"}
      </Signature>
      <Signature>
        {
          "interface TaskGroup { readonly signal: AbortSignal; spawn(task): Promise<T> }"
        }
      </Signature>
      <Signature>{"runTaskGroup(operation): Promise<T>"}</Signature>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        What runTaskGroup() guarantees
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>All spawned tasks share one AbortSignal</li>
        <li>The first task failure aborts the group immediately</li>
        <li>
          The group waits for every child task to settle before returning
        </li>
        <li>The original failure is rethrown after cleanup</li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Example
      </h2>

      <CodeBlock
        code={`import { runTaskGroup } from "yieldless/task";

const repository = await runTaskGroup(async (group) => {
  const refs = group.spawn((signal) => loadRefs(signal));
  const branches = group.spawn((signal) => loadBranches(signal));

  return {
    refs: await refs,
    branches: await branches,
  };
});`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        What it does not guarantee
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        Task cancellation is cooperative. Your spawned function must check or
        forward the signal for cancellation to take effect.
      </p>

      <CodeBlock
        code={`group.spawn((signal) => runCommand("git", ["fetch"], { signal }));`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Good fits
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          Parallel repository reads that should rise and fall together
        </li>
        <li>Request-scoped fan-out in HTTP handlers</li>
        <li>
          Background jobs that launch multiple abortable I/O operations
        </li>
      </ul>
    </DocLayout>
  );
}
