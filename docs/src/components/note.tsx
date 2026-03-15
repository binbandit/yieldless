type Props = {
  children: React.ReactNode;
};

export function Note({ children }: Props) {
  return (
    <div className="my-6 border-l-[3px] border-l-accent bg-accent-wash px-6 py-5">
      <div className="font-body leading-[1.72] text-ink-secondary">
        {children}
      </div>
    </div>
  );
}
