type Props = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function DocLayout({ title, description, children }: Props) {
  return (
    <article className="min-w-0 max-w-3xl flex-1 py-10 lg:py-16">
      <header className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <span className="h-[2px] w-6 bg-accent" />
          <span className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            Reference
          </span>
        </div>
        <h1 className="font-display text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-[-0.025em] leading-[1.15] text-ink">
          {title}
        </h1>
        <p className="mt-3 max-w-lg text-[0.9375rem] leading-[1.7] text-ink-tertiary">
          {description}
        </p>
      </header>
      <div className="prose-yl">{children}</div>
    </article>
  );
}
