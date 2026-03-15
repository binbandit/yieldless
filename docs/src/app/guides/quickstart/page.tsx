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
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        The fastest way to understand Yieldless is to wire three modules
        together:
      </p>

      <ol className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-decimal marker:text-accent">
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/error
          </code>{" "}
          to keep failures in tuple form
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/task
          </code>{" "}
          to fan work out and cancel siblings cleanly
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/retry
          </code>{" "}
          to handle noisy infrastructure without leaking timers
        </li>
      </ol>

      {/* ── Install ───────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Install
      </h2>

      <CodeBlock
        code={`pnpm add yieldless`}
        lang="bash"
      />

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        TypeScript 5.5+ is the target baseline. The package is compiled with{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          isolatedDeclarations
        </code>{" "}
        enabled.
      </p>

      {/* ── Step 1 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Step 1: stop throwing for routine failures
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          safeTry()
        </code>{" "}
        and{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          safeTrySync()
        </code>{" "}
        let you treat common failures as data instead of exception control flow.
      </p>

      <CodeBlock
        code={`import { safeTry } from "yieldless/error";

const [repoError, repo] = await safeTry(loadRepository(repoId));

if (repoError) {
  return [repoError, null] as const;
}`}
      />

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        That pattern is the center of the library. Every module is designed to
        fit back into the same{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          [error, value]
        </code>{" "}
        shape.
      </p>

      {/* ── Step 2 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Step 2: group related work under one cancellation signal
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          runTaskGroup()
        </code>{" "}
        gives you a shared abort signal and sibling failure propagation.
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

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        If{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          readRefs()
        </code>{" "}
        throws, the group aborts the shared signal, waits for{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          readStatus()
        </code>{" "}
        to settle, and then rethrows the original failure.
      </p>

      {/* ── Step 3 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Step 3: add retries where the outside world is unreliable
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
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

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        The retry loop respects{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          AbortSignal
        </code>
        , so if a parent task group is canceled, the pending backoff timer is
        canceled too.
      </p>

      {/* ── Step 4 ────────────────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Step 4: keep the edges boring
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        The package ships adapters for common backend boundaries:
      </p>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/schema
          </code>{" "}
          keeps validators in tuple form
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/router
          </code>{" "}
          turns tuple handlers into HTTP responses
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/ipc
          </code>{" "}
          preserves tuple results across Electron IPC
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/node
          </code>{" "}
          wraps filesystem and child-process work
        </li>
      </ul>

      {/* ── Full request flow ─────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        A full request flow
      </h2>

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

      {/* ── Where to go next ──────────────────────────────── */}

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Where to go next
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          Read{" "}
          <Link
            href="/guides/design-rules"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Design Rules
          </Link>{" "}
          before you spread the tuple style across a large codebase.
        </li>
        <li>
          Read{" "}
          <Link
            href="/guides/do-and-dont"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Do and Don&apos;t
          </Link>{" "}
          if you are moving a team onto the library and want the conventions to
          stay sharp.
        </li>
        <li>
          Use the reference section when you already know what module you need.
        </li>
      </ul>
    </DocLayout>
  );
}
