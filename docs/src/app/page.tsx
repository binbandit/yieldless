import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { AdviceCard } from "@/components/advice-card";
import { AdviceGrid } from "@/components/advice-grid";
import { Note } from "@/components/note";

export const metadata: Metadata = {
  title: "Yieldless — Fewer moving parts. Better async code.",
  description:
    "Native async/await primitives for tuple-based errors, structured concurrency, and Node/Electron workflows.",
};

const heroCode = `import { safeTry } from "yieldless/error";
import { runTaskGroup } from "yieldless/task";

const [repoError, repo] = await safeTry(loadRepository(repoId));

if (repoError) {
  return [repoError, null] as const;
}

return await runTaskGroup(async (group) => {
  const refs = group.spawn((signal) => loadRefs(repo.path, signal));
  const status = group.spawn((signal) => loadStatus(repo.path, signal));

  return {
    repo,
    refs: await refs,
    status: await status,
  };
});`;

const docSections = [
  {
    title: "Quickstart",
    href: "/guides/quickstart",
    desc: "Install and run your first tuple-based error flow.",
    accent: "accent",
  },
  {
    title: "Design Rules",
    href: "/guides/design-rules",
    desc: "The principles behind every API decision.",
    accent: "success",
  },
  {
    title: "Do and Don't",
    href: "/guides/do-and-dont",
    desc: "Patterns to adopt and anti-patterns to avoid.",
    accent: "rule-strong",
  },
  {
    title: "API Reference",
    href: "/reference/error",
    desc: "Signatures, types, and edge-case notes.",
    accent: "accent",
  },
  {
    title: "Recipes",
    href: "/recipes/resilient-service-flow",
    desc: "End-to-end real-world walkthroughs.",
    accent: "success",
  },
];

const moduleGroups = [
  {
    label: "Core",
    modules: [
      { name: "error", href: "/reference/error" },
      { name: "task", href: "/reference/task" },
      { name: "resource", href: "/reference/resource" },
      { name: "di", href: "/reference/di" },
    ],
  },
  {
    label: "Operational",
    modules: [
      { name: "retry", href: "/reference/retry" },
      { name: "context", href: "/reference/context" },
      { name: "all", href: "/reference/all" },
      { name: "schema", href: "/reference/schema" },
    ],
  },
  {
    label: "Boundaries",
    modules: [
      { name: "router", href: "/reference/router" },
      { name: "ipc", href: "/reference/ipc" },
      { name: "node", href: "/reference/node" },
    ],
  },
];

const stats = [
  { value: "11", label: "modules" },
  { value: "0", label: "dependencies" },
  { value: "34", label: "tests" },
];

export default function LandingPage() {
  return (
    <div className="max-w-none">
      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative pb-14 pt-14 lg:pb-20 lg:pt-24">
        <div className="animate-fade-up">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-8 bg-accent" />
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              TypeScript async primitives
            </span>
          </div>
          <h1 className="max-w-[13ch] font-display text-[clamp(2.2rem,5vw,3.75rem)] font-extrabold leading-[1.03] tracking-[-0.04em] text-ink">
            Fewer moving parts.
            <br />
            <span className="text-ink-tertiary">Better async code.</span>
          </h1>
          <p
            className="animate-fade-up mt-6 max-w-[42ch] text-[1rem] leading-[1.7] text-ink-secondary"
            style={{ animationDelay: "80ms" }}
          >
            Tuple-based errors, structured concurrency, and resource management
            — built on the primitives you already have.
          </p>
        </div>

        <div
          className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "140ms" }}
        >
          <Link
            href="/guides/quickstart"
            className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 font-display text-[13px] font-bold tracking-wide text-white shadow-sm transition-all hover:bg-accent-hover hover:shadow-md"
          >
            Get started
          </Link>
          <Link
            href="/reference/error"
            className="inline-flex items-center rounded-lg border border-rule-strong bg-ground-elevated px-5 py-2.5 font-display text-[13px] font-bold tracking-wide text-ink shadow-sm transition-all hover:bg-ground-recessed hover:shadow-md"
          >
            API reference
          </Link>
          <code className="ml-1 hidden rounded-md border border-rule bg-ground-recessed px-3 py-2 font-mono text-[12px] text-ink-tertiary sm:block">
            pnpm add yieldless
          </code>
        </div>
      </section>

      {/* ── Code showcase ────────────────────────────── */}
      <section
        className="animate-fade-up border-t border-rule py-12 lg:py-16"
        style={{ animationDelay: "200ms" }}
      >
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1fr_180px]">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-[2px] w-6 bg-accent" />
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
                How it looks
              </span>
            </div>
            <CodeBlock code={heroCode} lang="typescript" />
          </div>
          <div className="flex gap-px rounded-lg bg-rule shadow-sm lg:flex-col">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex-1 bg-ground-elevated px-5 py-4 text-center first:rounded-l-lg last:rounded-r-lg lg:text-left lg:first:rounded-l-none lg:first:rounded-tl-lg lg:last:rounded-r-none lg:last:rounded-br-lg"
              >
                <div className="font-display text-2xl font-extrabold tracking-tight text-ink">
                  {s.value}
                </div>
                <div className="mt-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What it optimizes for ────────────────────── */}
      <section className="border-t border-rule py-12 lg:py-16">
        <div className="mb-6 flex items-center gap-3">
          <span className="h-[2px] w-6 bg-success" />
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-success">
            Design goals
          </span>
        </div>
        <h2 className="mb-6 font-display text-xl font-bold tracking-tight text-ink">
          What it optimizes for
        </h2>
        <AdviceGrid>
          <AdviceCard variant="do" title="Native control flow">
            Composes around <code>Promise</code>,{" "}
            <code>AbortController</code>, <code>AsyncLocalStorage</code>, and{" "}
            <code>Symbol.asyncDispose</code> instead of a separate scheduler.
          </AdviceCard>
          <AdviceCard variant="do" title="Visible failure paths">
            If something can fail, the tuple is right there. No hidden exception
            channel unless you choose to rethrow.
          </AdviceCard>
          <AdviceCard variant="do" title="Incremental adoption">
            Use one module at a time. No requirement to wrap your application in
            a framework-specific runtime.
          </AdviceCard>
        </AdviceGrid>
      </section>

      {/* ── Navigation cards ────────────────────────── */}
      <section className="border-t border-rule py-12 lg:py-16">
        <h2 className="mb-6 font-display text-xl font-bold tracking-tight text-ink">
          Find what you need
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docSections.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group relative rounded-lg border border-rule bg-ground-elevated p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)]"
            >
              <div
                className="absolute inset-x-4 top-0 h-[2px] rounded-b-full"
                style={{
                  backgroundColor: `var(--color-${s.accent})`,
                }}
              />
              <h3 className="font-display text-sm font-bold text-ink transition-colors group-hover:text-accent">
                {s.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-tertiary">
                {s.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Module map ──────────────────────────────── */}
      <section className="border-t border-rule py-12 lg:py-16">
        <h2 className="mb-6 font-display text-xl font-bold tracking-tight text-ink">
          Module map
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {moduleGroups.map((g) => (
            <div
              key={g.label}
              className="rounded-lg border border-rule bg-ground-elevated p-5 shadow-[var(--shadow-card)]"
            >
              <h3 className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                {g.label}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {g.modules.map((m) => (
                  <li key={m.name}>
                    <Link
                      href={m.href}
                      className="group inline-flex items-center gap-2.5 font-mono text-[12.5px] text-ink-secondary transition-colors hover:text-accent"
                    >
                      <span className="inline-block h-px w-3 bg-rule-strong transition-all group-hover:w-4 group-hover:bg-accent" />
                      yieldless/{m.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── What it is not ──────────────────────────── */}
      <section className="border-t border-rule py-12 lg:py-16">
        <Note>
          Yieldless does not ship fibers, effect interpreters, global service
          containers, or a replacement promise implementation. It composes with
          the runtime you already use — and stays out of the way when you
          don&apos;t need it.
        </Note>
        <div className="mt-10 flex items-center gap-5">
          <Link
            href="/guides/quickstart"
            className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 font-display text-[13px] font-bold tracking-wide text-white shadow-sm transition-all hover:bg-accent-hover hover:shadow-md"
          >
            Get started
          </Link>
          <Link
            href="/guides/design-rules"
            className="font-display text-[13px] font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            Design rules &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
