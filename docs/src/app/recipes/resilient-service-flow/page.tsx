import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Note } from "@/components/note";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resilient Service Flow",
  description:
    "A practical backend flow that combines tuples, retries, validation, routing, and cancellation.",
};

export default async function ResilientServiceFlowPage() {
  return (
    <DocLayout
      title="Resilient Service Flow"
      description="A practical backend flow that combines tuples, retries, validation, routing, and cancellation."
    >
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        This recipe shows the shape Yieldless is best at: an HTTP request that
        validates input, performs a few pieces of I/O, retries the flaky part,
        and returns a normal JSON response.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        The moving parts
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/schema
          </code>{" "}
          validates input without throwing
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/retry
          </code>{" "}
          handles transient I/O noise
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/task
          </code>{" "}
          keeps sibling work under one cancellation signal
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            yieldless/router
          </code>{" "}
          turns tuple results into a plain response
        </li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Route handler
      </h2>

      <CodeBlock
        code={`import { safeTry } from "yieldless/error";
import { parseSafe } from "yieldless/schema";
import { safeRetry } from "yieldless/retry";
import { NotFoundError, honoHandler } from "yieldless/router";
import { runTaskGroup } from "yieldless/task";

export const getRepository = honoHandler(async (c) => {
  const [paramsError, params] = parseSafe(repositoryParamsSchema, c.req.param());
  if (paramsError) {
    return [paramsError, null];
  }

  const [repoError, repo] = await safeRetry(
    async (_attempt, signal) => safeTry(loadRepository(params.id, signal)),
    { maxAttempts: 3, baseDelayMs: 100 },
  );

  if (repoError) {
    return [repoError, null];
  }

  if (repo === null) {
    return [new NotFoundError("Repository not found"), null];
  }

  const payload = await runTaskGroup(async (group) => {
    const refs = group.spawn((signal) => loadRefs(repo.path, signal));
    const status = group.spawn((signal) => loadStatus(repo.path, signal));

    return {
      id: repo.id,
      refs: await refs,
      status: await status,
    };
  });

  return [null, payload];
});`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Why this holds up well in production
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>Validation failures never take the exception path.</li>
        <li>
          If{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            loadRefs()
          </code>{" "}
          fails,{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            loadStatus()
          </code>{" "}
          is aborted immediately.
        </li>
        <li>
          Retry timers are cancellable because they run through{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            AbortSignal
          </code>
          .
        </li>
        <li>
          The handler body stays linear. There is no framework-specific DSL to
          learn.
        </li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Rules worth keeping
      </h2>

      <Note>
        <ul className="space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
          <li>Validate early and return early.</li>
          <li>
            Retry only the noisy boundary, not the entire request.
          </li>
          <li>
            Spawn sibling work only when both tasks should die together.
          </li>
          <li>
            Map domain misses to explicit HTTP errors like{" "}
            <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
              NotFoundError
            </code>
            .
          </li>
        </ul>
      </Note>
    </DocLayout>
  );
}
