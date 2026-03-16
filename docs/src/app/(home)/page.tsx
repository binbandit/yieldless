import Link from 'next/link';
import {
  ArrowRight,
  Box,
  GitBranch,
  Layers,
  RefreshCw,
  Route,
  Shield,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';

const heroCode = `import { safeTry } from "yieldless/error";
import { runTaskGroup } from "yieldless/task";

const [err, repo] = await safeTry(loadRepository(id));

if (err) {
  return [err, null] as const;
}

return await runTaskGroup(async (group) => {
  const refs   = group.spawn((s) => loadRefs(repo.path, s));
  const status = group.spawn((s) => loadStatus(repo.path, s));

  return { repo, refs: await refs, status: await status };
});`;

const modules = [
  {
    name: 'error',
    desc: 'Tuple-based error handling',
    icon: Shield,
    href: '/docs/reference/error',
  },
  {
    name: 'task',
    desc: 'Structured concurrency',
    icon: Layers,
    href: '/docs/reference/task',
  },
  {
    name: 'resource',
    desc: 'Async disposal lifecycle',
    icon: Box,
    href: '/docs/reference/resource',
  },
  {
    name: 'retry',
    desc: 'Backoff with abort awareness',
    icon: RefreshCw,
    href: '/docs/reference/retry',
  },
  {
    name: 'router',
    desc: 'Tuple HTTP route handlers',
    icon: Route,
    href: '/docs/reference/router',
  },
  {
    name: 'ipc',
    desc: 'Typed Electron IPC bridge',
    icon: GitBranch,
    href: '/docs/reference/ipc',
  },
];

const principles = [
  {
    title: 'Native control flow',
    desc: 'Built on Promise, AbortController, AsyncLocalStorage, and Symbol.asyncDispose. No scheduler, no runtime, no magic.',
    icon: Zap,
  },
  {
    title: 'Visible failure paths',
    desc: 'If something can fail, the tuple is right there. No hidden exception channel unless you choose to rethrow.',
    icon: Sparkles,
  },
  {
    title: 'Incremental adoption',
    desc: 'Use one module at a time. No framework wrapper, no global runtime, no all-or-nothing commitment.',
    icon: Terminal,
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* ─── Hero ───────────────────────────────────── */}
      <section className="grain relative overflow-hidden">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(212,69,39,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(239,110,78,0.06),transparent)]" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-24 md:pb-28 md:pt-36">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card/60 px-3 py-1 text-[13px] text-fd-muted-foreground backdrop-blur-sm">
              <span className="inline-block size-1.5 rounded-full bg-flame" />
              Zero dependencies &middot; TypeScript 5.5+
            </div>

            <h1 className="max-w-3xl font-display text-[clamp(2.75rem,6.5vw,5.5rem)] leading-[0.95] tracking-[-0.03em] text-fd-foreground">
              Fewer moving parts.{' '}
              <span className="text-fd-muted-foreground italic">
                Better async code.
              </span>
            </h1>

            <p
              className="animate-fade-up mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-fd-muted-foreground"
              style={{ animationDelay: '80ms' }}
            >
              Tuple-based errors, structured concurrency, and resource
              management for TypeScript — built on the primitives you already
              have.
            </p>
          </div>

          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '140ms' }}
          >
            <Link
              href="/docs/guides/quickstart"
              className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 text-[13px] font-semibold text-fd-primary-foreground shadow-sm transition-all hover:opacity-90"
            >
              Get started
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/docs/reference/error"
              className="inline-flex items-center rounded-lg border border-fd-border bg-fd-card px-5 py-2.5 text-[13px] font-semibold text-fd-foreground shadow-sm transition-all hover:bg-fd-accent"
            >
              API reference
            </Link>
            <code className="ml-1 hidden rounded-md border border-fd-border bg-fd-muted px-3 py-2 font-mono text-xs text-fd-muted-foreground sm:block">
              pnpm add yieldless
            </code>
          </div>

          {/* ─── Code showcase ─────────────────────── */}
          <div
            className="animate-fade-up mt-16"
            style={{ animationDelay: '220ms' }}
          >
            <div className="code-window max-w-3xl">
              <div className="code-window-bar">
                <div className="code-window-dot" />
                <div className="code-window-dot" />
                <div className="code-window-dot" />
                <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-white/20">
                  typescript
                </span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-[1.8] text-[#d4d4d8]">
                <code>{heroCode}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider-fade" />

      {/* ─── Principles ─────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-10">
          <p className="mb-2 text-[13px] font-medium uppercase tracking-[0.12em] text-flame">
            Design goals
          </p>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1] tracking-tight text-fd-foreground">
            What it optimizes for
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {principles.map((p) => (
            <div
              key={p.title}
              className="group rounded-xl border border-fd-border bg-fd-card p-6 transition-all hover:border-fd-ring hover:shadow-lg"
            >
              <div className="mb-4 inline-flex size-9 items-center justify-center rounded-lg bg-fd-muted text-fd-foreground">
                <p.icon className="size-4" />
              </div>
              <h3 className="mb-2 text-[15px] font-semibold text-fd-foreground">
                {p.title}
              </h3>
              <p className="text-[14px] leading-relaxed text-fd-muted-foreground">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider-fade" />

      {/* ─── Module map ─────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-10">
          <p className="mb-2 text-[13px] font-medium uppercase tracking-[0.12em] text-flame">
            Modules
          </p>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1] tracking-tight text-fd-foreground">
            Pick what you need
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-fd-muted-foreground">
            Every module works independently. Import one, or compose several —
            they all return the same{' '}
            <code className="rounded border border-fd-border bg-fd-muted px-1.5 py-0.5 text-[13px]">
              [error, value]
            </code>{' '}
            shape.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Link
              key={m.name}
              href={m.href}
              className="group flex items-start gap-4 rounded-xl border border-fd-border bg-fd-card p-5 transition-all hover:border-fd-ring hover:shadow-lg"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-fd-muted text-fd-foreground transition-colors group-hover:bg-flame group-hover:text-white">
                <m.icon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[13px] font-semibold text-fd-foreground">
                  yieldless/{m.name}
                </p>
                <p className="mt-0.5 text-[13px] text-fd-muted-foreground">
                  {m.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-[13px] text-fd-muted-foreground">
          Plus{' '}
          <Link
            href="/docs/reference/di"
            className="underline underline-offset-2 hover:text-fd-foreground"
          >
            di
          </Link>
          ,{' '}
          <Link
            href="/docs/reference/context"
            className="underline underline-offset-2 hover:text-fd-foreground"
          >
            context
          </Link>
          ,{' '}
          <Link
            href="/docs/reference/all"
            className="underline underline-offset-2 hover:text-fd-foreground"
          >
            all
          </Link>
          ,{' '}
          <Link
            href="/docs/reference/schema"
            className="underline underline-offset-2 hover:text-fd-foreground"
          >
            schema
          </Link>
          , and{' '}
          <Link
            href="/docs/reference/node"
            className="underline underline-offset-2 hover:text-fd-foreground"
          >
            node
          </Link>
          .
        </p>
      </section>

      <hr className="divider-fade" />

      {/* ─── Stats bar ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-3 divide-x divide-fd-border rounded-xl border border-fd-border bg-fd-card">
          {[
            { value: '11', label: 'Modules' },
            { value: '0', label: 'Dependencies' },
            { value: 'TS 5.5+', label: 'Baseline' },
          ].map((s) => (
            <div key={s.label} className="px-6 py-6 text-center">
              <div className="text-2xl font-bold tracking-tight text-fd-foreground md:text-3xl">
                {s.value}
              </div>
              <div className="mt-1 text-[12px] font-medium uppercase tracking-widest text-fd-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider-fade" />

      {/* ─── CTA ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-center">
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.1] tracking-tight text-fd-foreground">
            Ready to simplify?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-fd-muted-foreground">
            Start with one module. Adopt more when they earn their place.
            Nothing wraps your application unless you ask it to.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/docs/guides/quickstart"
              className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-6 py-3 text-[14px] font-semibold text-fd-primary-foreground shadow-sm transition-all hover:opacity-90"
            >
              Get started
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/docs/guides/design-rules"
              className="inline-flex items-center rounded-lg border border-fd-border bg-fd-card px-6 py-3 text-[14px] font-semibold text-fd-foreground shadow-sm transition-all hover:bg-fd-accent"
            >
              Read the design rules
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
