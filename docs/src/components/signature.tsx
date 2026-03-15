type Props = {
  children: string;
};

export function Signature({ children }: Props) {
  return (
    <div className="mb-1 overflow-x-auto border border-rule-strong border-l-[3px] border-l-accent bg-ground-recessed px-4 py-3.5 font-mono text-sm text-ink dark:bg-[#0f0f0f]">
      <code>{children}</code>
    </div>
  );
}
