type Props = {
  children: React.ReactNode;
};

export function Note({ children }: Props) {
  return (
    <div className="my-6 rounded-r-lg border-l-[3px] border-l-accent bg-accent-wash px-6 py-5">
      <div className="text-[0.9375rem] leading-[1.75] text-ink-secondary">
        {children}
      </div>
    </div>
  );
}
