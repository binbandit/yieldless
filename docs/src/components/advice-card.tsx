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
        "rounded-lg border bg-ground-elevated p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)]",
        variant === "do"
          ? "border-success/20 border-t-[3px] border-t-success"
          : "border-danger/20 border-t-[3px] border-t-danger",
      )}
    >
      <strong className="mb-2.5 flex items-center gap-2.5 font-display text-[0.875rem] font-bold text-ink">
        <span
          className={clsx(
            "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
            variant === "do" ? "bg-success" : "bg-danger",
          )}
        >
          {variant === "do" ? "\u2713" : "\u2717"}
        </span>
        {title}
      </strong>
      <div className="text-[0.8125rem] leading-[1.72] text-ink-secondary">
        {children}
      </div>
    </div>
  );
}
