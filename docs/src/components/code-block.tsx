import { highlight } from "@/lib/shiki";

type Props = {
  code: string;
  lang?: string;
};

export async function CodeBlock({ code, lang = "typescript" }: Props) {
  const html = await highlight(code.trim(), lang);

  return (
    <div className="group relative my-6 overflow-hidden rounded-xl border border-code-border bg-code-bg shadow-[var(--shadow-code)]">
      {lang !== "bash" && (
        <div className="flex items-center gap-1.5 border-b border-white/[0.05] px-4 py-2.5">
          <span className="size-[7px] rounded-full bg-white/[0.08]" />
          <span className="size-[7px] rounded-full bg-white/[0.08]" />
          <span className="size-[7px] rounded-full bg-white/[0.08]" />
          <span className="ml-auto font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-white/20">
            {lang}
          </span>
        </div>
      )}
      <div
        className="overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-[1.75] [&_pre]:!m-0 [&_pre]:!border-0 [&_pre]:!bg-transparent [&_pre]:!p-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
