type Props = {
  children: string;
};

export function Signature({ children }: Props) {
  return (
    <div className="mb-2 overflow-x-auto rounded-lg border border-rule bg-ground-recessed px-4 py-3 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-block h-4 w-[2px] shrink-0 rounded-full bg-accent" />
        <code className="!border-0 !bg-transparent !p-0 font-mono text-[12.5px] leading-relaxed text-ink">
          {children}
        </code>
      </div>
    </div>
  );
}
