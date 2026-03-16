import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { AdviceCard } from "@/components/advice-card";
import { AdviceGrid } from "@/components/advice-grid";
import { Note } from "@/components/note";

export const metadata: Metadata = {
  title: "Do and Don't",
  description:
    "Practical conventions that keep Yieldless code readable instead of ceremonial.",
};

export default async function DoAndDontPage() {
  return (
    <DocLayout
      title="Do and Don't"
      description="Practical conventions that keep Yieldless code readable instead of ceremonial."
    >
      <p>
        This page is the short list of habits that keep tuple-based code clean
        under real production pressure.
      </p>

      {/* ── Error handling ────────────────────────────────── */}

      <h2>
        Error handling
      </h2>

      <AdviceGrid>
        <AdviceCard variant="do" title="Keep the tuple close to the boundary.">
          <p>
            Wrap I/O once, then pass domain values through the rest of the
            function.
          </p>
        </AdviceCard>
        <AdviceCard variant="dont" title="Wrap every line in safeTry().">
          <p>
            If a function is already synchronous and pure, let it stay ordinary
            code.
          </p>
        </AdviceCard>
      </AdviceGrid>

      <CodeBlock
        code={`const [readError, configText] = await readFileSafe("config.json");
if (readError) return [readError, null];

const [parseError, config] = safeTrySync(() => JSON.parse(configText));
if (parseError) return [parseError, null];`}
      />

      {/* ── Cancellation ──────────────────────────────────── */}

      <h2>
        Cancellation
      </h2>

      <AdviceGrid>
        <AdviceCard
          variant="do"
          title="Pass the signal all the way into the I/O API."
        >
          <p>
            Cancellation only matters when the transport or subprocess actually
            sees the signal.
          </p>
        </AdviceCard>
        <AdviceCard
          variant="dont"
          title="Assume a task group can kill arbitrary CPU work."
        >
          <p>
            <code>AbortSignal</code> is cooperative. If your code ignores it, the work keeps running.
          </p>
        </AdviceCard>
      </AdviceGrid>

      {/* ── Retries ───────────────────────────────────────── */}

      <h2>
        Retries
      </h2>

      <AdviceGrid>
        <AdviceCard
          variant="do"
          title="Retry transport failures and transient infrastructure noise."
        >
          <p>
            Network timeouts, brief lock contentions, and flaky subprocess
            startup are reasonable candidates.
          </p>
        </AdviceCard>
        <AdviceCard
          variant="dont"
          title="Retry validation failures or deterministic domain errors."
        >
          <p>
            If the request shape is bad on attempt one, it will still be bad on
            attempt three.
          </p>
        </AdviceCard>
      </AdviceGrid>

      {/* ── Dependency injection ──────────────────────────── */}

      <h2>
        Dependency injection
      </h2>

      <AdviceGrid>
        <AdviceCard
          variant="do"
          title="Bind stable dependencies at the edge."
        >
          <p>
            Loggers, repositories, mailers, and feature flags are good
            candidates for <code>inject()</code>.
          </p>
        </AdviceCard>
        <AdviceCard
          variant="dont"
          title="Build a hidden service locator around it."
        >
          <p>
            If the dependencies are not obvious from the function signature, the
            code gets harder to review.
          </p>
        </AdviceCard>
      </AdviceGrid>

      {/* ── Context ───────────────────────────────────────── */}

      <h2>
        Context
      </h2>

      <AdviceGrid>
        <AdviceCard
          variant="do"
          title="Use async context for request-scoped metadata."
        >
          <p>
            Trace spans, request IDs, user sessions, or a transaction handle fit
            well.
          </p>
        </AdviceCard>
        <AdviceCard
          variant="dont"
          title="Use async context as your application container."
        >
          <p>
            Configuration and stable dependencies should still be explicit.
          </p>
        </AdviceCard>
      </AdviceGrid>

      {/* ── Boundaries ────────────────────────────────────── */}

      <h2>
        Boundaries
      </h2>

      <Note>
        <p>
          A good rule of thumb: tuples are for work you expect to fail
          sometimes, thrown exceptions are for code that truly cannot continue.
          If a boundary requires exceptions, convert at that one spot with{" "}
          <code>unwrap()</code> and move on.
        </p>
      </Note>
    </DocLayout>
  );
}
