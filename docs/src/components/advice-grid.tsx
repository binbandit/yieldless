type Props = {
  children: React.ReactNode;
};

export function AdviceGrid({ children }: Props) {
  return (
    <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {children}
    </div>
  );
}
