type Props = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export function DocLayout({ title, description, children }: Props) {
  return (
    <article className="min-w-0 max-w-3xl flex-1 py-10 lg:py-14">
      <header className="mb-10">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-3 font-body text-lg leading-relaxed text-ink-secondary">
          {description}
        </p>
      </header>
      <div className="prose-yl">{children}</div>
    </article>
  );
}
