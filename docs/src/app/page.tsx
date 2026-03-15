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
    description: "Install, import, and run your first tuple-based error flow in under two minutes.",
  },
  {
    title: "Design Rules",
    href: "/guides/design-rules",
    description: "The principles that shape every API decision — and when to break them.",
  },
  {
    title: "Do and Don't",
    href: "/guides/do-and-dont",
    description: "Concrete patterns to adopt and anti-patterns to avoid in production code.",
  },
  {
    title: "API Reference",
    href: "/reference/error",
    description: "Complete signatures, return types, and edge-case notes for every exported function.",
  },
  {
    title: "Recipes",
    href: "/recipes/resilient-service-flow",
    description: "End-to-end walkthroughs for real-world scenarios: service layers, Electron IPC, and more.",
  },
];

const moduleGroups = [
  {
    label: "Core primitives",
    modules: [
      { name: "error", href: "/reference/error" },
      { name: "task", href: "/reference/task" },
      { name: "resource", href: "/reference/resource" },
      { name: "di", href: "/reference/di" },
    ],
  },
  {
    label: "Operational tools",
    modules: [
      { name: "retry", href: "/reference/retry" },
      { name: "context", href: "/reference/context" },
      { name: "all", href: "/reference/all" },
      { name: "schema", href: "/reference/schema" },
    ],
  },
  {
    label: "Application boundaries",
    modules: [
      { name: "router", href: "/reference/router" },
      { name: "ipc", href: "/reference/ipc" },
      { name: "node", href: "/reference/node" },
    ],
  },
];

const tags = [
  "Tuple-based errors",
  "Abort-aware concurrency",
  "Node + Electron",
  "Zero dependencies",
];

export default function LandingPage() {
  return (
    <div className="-ml-0 lg:-ml-10 max-w-none">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative border-b border-rule pb-20 pt-16 lg:pb-28 lg:pt-24">
        <div className="mb-8 h-[3px] w-16 bg-accent" />

        <h1
          className="animate-fade-up font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "0ms" }}
        >
          Fewer moving parts.
          <br />
          Better async code.
        </h1>

        <p
          className="animate-fade-up mt-6 max-w-xl font-body text-lg leading-relaxed text-ink-secondary lg:text-xl"
          style={{ animationDelay: "80ms" }}
        >
          Tuple-based errors, structured concurrency, and resource management
          for TypeScript — built on the primitives you already have.
        </p>

        <div
          className="animate-fade-up mt-10 flex flex-wrap gap-3"
          style={{ animationDelay: "160ms" }}
        >
          <Link
            href="/guides/quickstart"
            className="inline-flex items-center bg-accent px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-accent-hover"
          >
            Get started
          </Link>
          <Link
            href="/reference/error"
            className="inline-flex items-center border border-rule-strong px-6 py-3 font-display text-sm font-bold text-ink transition-colors hover:bg-ground-recessed"
          >
            API reference
          </Link>
        </div>
      </section>

      {/* ── Intro + Stats ────────────────────────────────────── */}
      <section
        className="animate-fade-up border-b border-rule py-16 lg:py-20"
        style={{ animationDelay: "240ms" }}
      >
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_240px]">
          {/* Intro panel */}
          <div className="border-t-[3px] border-t-accent bg-ground-elevated p-8 lg:p-10">
            <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.1em] text-accent">
              Platform-native by design
            </span>
            <p className="mt-4 font-body text-lg leading-[1.72] text-ink-secondary lg:text-[1.15rem]">
              Yieldless gives you the pieces people actually reach for in large
              TypeScript codebases — but keeps them in ordinary JavaScript.
              Tuples instead of wrapper classes. <code className="font-mono text-[0.88em] text-ink">AbortSignal</code> instead
              of fibers. <code className="font-mono text-[0.88em] text-ink">await using</code> instead of a scope
              runtime.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-rule bg-ground px-3 py-1 font-display text-xs font-semibold text-ink-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Stats sidebar */}
          <div className="flex flex-row gap-px bg-rule lg:flex-col">
            {[
              { value: "11", label: "focused modules" },
              { value: "0", label: "runtime dependencies" },
              { value: "34", label: "tests ship with the package" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex-1 bg-ground-elevated p-5 text-center lg:p-6 lg:text-left"
              >
                <div className="font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 font-display text-xs font-medium text-ink-tertiary">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two layers, one idea ─────────────────────────────── */}
      <section
        className="animate-fade-up border-b border-rule py-16 lg:py-20"
        style={{ animationDelay: "320ms" }}
      >
        <div className="mb-2 h-[3px] w-10 bg-accent" />
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Two layers, one idea
        </h2>
        <p className="mt-4 max-w-2xl font-body text-base leading-[1.72] text-ink-secondary lg:text-lg">
          The <strong className="font-semibold text-ink">Core</strong> layer
          gives you error tuples, structured tasks, and resource disposal.
          The <strong className="font-semibold text-ink">Platform</strong> layer
          wires them into Node, Electron IPC, and schema validation.
          Both compose through plain <code className="font-mono text-[0.88em] text-ink">async/await</code>.
        </p>

        <div className="mt-8">
          <CodeBlock code={heroCode} lang="typescript" />
        </div>
      </section>

      {/* ── What it optimizes for ────────────────────────────── */}
      <section
        className="animate-fade-up border-b border-rule py-16 lg:py-20"
        style={{ animationDelay: "400ms" }}
      >
        <div className="mb-2 h-[3px] w-10 bg-accent" />
        <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          What it optimizes for
        </h2>

        <AdviceGrid>
          <AdviceCard variant="do" title="Native control flow">
            Composes around <code className="font-mono text-[0.88em]">Promise</code>,{" "}
            <code className="font-mono text-[0.88em]">AbortController</code>,{" "}
            <code className="font-mono text-[0.88em]">AsyncLocalStorage</code>, and{" "}
            <code className="font-mono text-[0.88em]">Symbol.asyncDispose</code> instead
            of a separate scheduler.
          </AdviceCard>
          <AdviceCard variant="do" title="Visible failure paths">
            If something can fail, the tuple is right there. No hidden
            exception channel unless you choose to rethrow.
          </AdviceCard>
          <AdviceCard variant="do" title="Incremental adoption">
            Use one module at a time. No requirement to wrap your application
            in a framework-specific runtime.
          </AdviceCard>
        </AdviceGrid>
      </section>

      {/* ── Find what you need ───────────────────────────────── */}
      <section
        className="animate-fade-up border-b border-rule py-16 lg:py-20"
        style={{ animationDelay: "480ms" }}
      >
        <div className="mb-2 h-[3px] w-10 bg-accent" />
        <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Find what you need
        </h2>

        <div className="grid grid-cols-1 gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {docSections.map((section, i) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative bg-ground-elevated p-6 transition-colors hover:bg-ground-recessed"
            >
              <div
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{
                  backgroundColor:
                    i % 3 === 0
                      ? "var(--color-accent)"
                      : i % 3 === 1
                        ? "var(--color-success)"
                        : "var(--color-rule-strong)",
                }}
              />
              <h3 className="font-display text-[0.95rem] font-bold text-ink group-hover:text-accent">
                {section.title}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink-tertiary">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Module map ───────────────────────────────────────── */}
      <section
        className="animate-fade-up border-b border-rule py-16 lg:py-20"
        style={{ animationDelay: "560ms" }}
      >
        <div className="mb-2 h-[3px] w-10 bg-accent" />
        <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Module map
        </h2>

        <div className="grid grid-cols-1 gap-px bg-rule sm:grid-cols-3">
          {moduleGroups.map((group) => (
            <div key={group.label} className="bg-ground-elevated p-6">
              <h3 className="mb-4 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em] text-ink-tertiary">
                {group.label}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.modules.map((mod) => (
                  <li key={mod.name}>
                    <Link
                      href={mod.href}
                      className="group inline-flex items-center gap-2 font-mono text-sm text-ink transition-colors hover:text-accent"
                    >
                      <span className="inline-block h-px w-3 bg-rule-strong transition-colors group-hover:bg-accent" />
                      yieldless/{mod.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── What it is not ───────────────────────────────────── */}
      <section
        className="animate-fade-up py-16 lg:py-20"
        style={{ animationDelay: "640ms" }}
      >
        <div className="mb-2 h-[3px] w-10 bg-accent" />
        <h2 className="mb-8 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          What it is not
        </h2>

        <Note>
          Yieldless does not ship fibers, effect interpreters, global service
          containers, or a replacement promise implementation. It is a focused
          set of utilities that compose with the runtime you already use — and
          stays out of the way when you don&apos;t need it.
        </Note>

        <div className="mt-12 flex items-center gap-6">
          <Link
            href="/guides/quickstart"
            className="inline-flex items-center bg-accent px-6 py-3 font-display text-sm font-bold text-white transition-colors hover:bg-accent-hover"
          >
            Get started
          </Link>
          <Link
            href="/guides/design-rules"
            className="font-display text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            Read the design rules &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
