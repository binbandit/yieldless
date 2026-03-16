import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quickstart",
  description:
    "Get a Yieldless application flow working with tuple errors, cancellation, and one realistic boundary.",
};

export default async function QuickstartPage() {
  return (
    <DocLayout
      title="Quickstart"
      description="Get a Yieldless application flow working with tuple errors, cancellation, and one realistic boundary."
    >
      <p>
        The fastest way to understand Yieldless is to wire three modules
        together:
      </p>

      <ol>
        <li>
          <code>yieldless/error</code> to keep failures in tuple form
        </li>
        <li>
          <code>yieldless/task</code> to fan work out and cancel siblings
          cleanly
        </li>
        <li>
          <code>yieldless/retry</code> to handle noisy infrastructure without
          leaking timers
        </li>
      </ol>

      <h2>Install</h2>

      <CodeBlock code={`pnpm add yieldless`} lang="bash" />

      <p>
        TypeScript 5.5+ is the target baseline. The package is compiled with{" "}
        <code>isolatedDeclarations</code> enabled.
      </p>

      <h2>Step 1: stop throwing for routine failures</h2>

      <p>
        <code>safeTry()</code> and <code>safeTrySync()</code> let you treat
        common failures as data instead of exception control flow.
      </p>

      <CodeBlock
        code={`import { safeTry } from "yieldless/error";

const [repoError, repo] = await safeTry(loadRepository(repoId));

if (repoError) {
  return [repoError, null] as const;
}`}
      />

      <p>
        That pattern is the center of the library. Every module is designed to
        fit back into the same <code>[error, value]</code> shape.
      </p>

      <h2>Step 2: group related work under one cancellation signal</h2>

      <p>
        <code>runTaskGroup()</code> gives you a shared abort signal and sibling
        failure propagation.
      </p>

      <CodeBlock
        code={`import { runTaskGroup } from "yieldless/task";

const summary = await runTaskGroup(async (group) => {
  const refs = group.spawn((signal) => readRefs(repo.path, signal));
  const status = group.spawn((signal) => readStatus(repo.path, signal));

  return {
    refs: await refs,
    status: await status,
  };
});`}
      />

      <p>
        If <code>readRefs()</code> throws, the group aborts the shared signal,
        waits for <code>readStatus()</code> to settle, and then rethrows the
        original failure.
      </p>

      <h2>Step 3: add retries where the outside world is unreliable</h2>

      <p>
        Retries should stay close to transport boundaries: HTTP, queues,
        database connections, and subprocesses that can legitimately fail for
        transient reasons.
      </p>

      <CodeBlock
        code={`import { safeTry } from "yieldless/error";
import { safeRetry } from "yieldless/retry";

const [fetchError, payload] = await safeRetry(
  async (_attempt, signal) => safeTry(fetchRepository(repoId, signal)),
  {
    maxAttempts: 4,
    baseDelayMs: 150,
  },
);

if (fetchError) {
  return [fetchError, null] as const;
}`}
      />

      <p>
        The retry loop respects <code>AbortSignal</code>, so if a parent task
        group is canceled, the pending backoff timer is canceled too.
      </p>

      <h2>Step 4: keep the edges boring</h2>

      <p>The package ships adapters for common backend boundaries:</p>

      <ul>
        <li>
          <code>yieldless/schema</code> keeps validators in tuple form
        </li>
        <li>
          <code>yieldless/router</code> turns tuple handlers into HTTP responses
        </li>
        <li>
          <code>yieldless/ipc</code> preserves tuple results across Electron IPC
        </li>
        <li>
          <code>yieldless/node</code> wraps filesystem and child-process work
        </li>
      </ul>

      <h2>A full request flow</h2>

      <CodeBlock
        code={`import { safeRetry } from "yieldless/retry";
import { parseSafe } from "yieldless/schema";
import { NotFoundError, honoHandler } from "yieldless/router";

const getUser = honoHandler(async (c) => {
  const [inputError, input] = parseSafe(userParamsSchema, c.req.param());
  if (inputError) {
    return [inputError, null];
  }

  const [userError, user] = await safeRetry(
    async (_attempt, signal) => safeTry(loadUser(input.id, signal)),
    { maxAttempts: 3 },
  );

  if (userError) {
    return [userError, null];
  }

  if (user === null) {
    return [new NotFoundError("User not found"), null];
  }

  return [null, user];
});`}
      />

      <h2>Where to go next</h2>

      <ul>
        <li>
          Read{" "}
          <Link href="/guides/design-rules">Design Rules</Link> before you
          spread the tuple style across a large codebase.
        </li>
        <li>
          Read{" "}
          <Link href="/guides/do-and-dont">Do and Don&apos;t</Link> if you are
          moving a team onto the library and want the conventions to stay sharp.
        </li>
        <li>
          Use the reference section when you already know what module you need.
        </li>
      </ul>
    </DocLayout>
  );
}
