import { clsx } from "clsx";

type Props = {
  variant: "do" | "dont";
  title: string;
  children: React.ReactNode;
};

export function AdviceCard({ variant, title, children }: Props) {
  return (
    <div
      className={clsx(
        "animate-fade-up bg-ground-elevated p-5 transition-colors hover:bg-ground-recessed",
        variant === "do" ? "border-t-[3px] border-t-success" : "border-t-[3px] border-t-danger",
      )}
    >
      <strong className="mb-2 flex items-center gap-2 font-display text-[0.95rem] font-bold text-ink">
        <span
          className={clsx(
            "inline-block size-2 rounded-full",
            variant === "do" ? "bg-success" : "bg-danger",
          )}
        />
        {title}
      </strong>
      <div className="font-body leading-[1.72] text-ink-secondary">
        {children}
      </div>
    </div>
  );
}
