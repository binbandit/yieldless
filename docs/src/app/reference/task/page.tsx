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
      <p>
        <code>yieldless/task</code> gives you a small structured-concurrency primitive for normal async
        functions.
      </p>

      <h2>
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

      <h2>
        What runTaskGroup() guarantees
      </h2>

      <ul>
        <li>All spawned tasks share one AbortSignal</li>
        <li>The first task failure aborts the group immediately</li>
        <li>
          The group waits for every child task to settle before returning
        </li>
        <li>The original failure is rethrown after cleanup</li>
      </ul>

      <h2>
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

      <h2>
        What it does not guarantee
      </h2>

      <p>
        Task cancellation is cooperative. Your spawned function must check or
        forward the signal for cancellation to take effect.
      </p>

      <CodeBlock
        code={`group.spawn((signal) => runCommand("git", ["fetch"], { signal }));`}
        lang="ts"
      />

      <h2>
        Good fits
      </h2>

      <ul>
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
