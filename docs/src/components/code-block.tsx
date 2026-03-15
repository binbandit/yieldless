import { highlight } from "@/lib/shiki";

type Props = {
  code: string;
  lang?: string;
};

export async function CodeBlock({ code, lang = "typescript" }: Props) {
  const html = await highlight(code.trim(), lang);

  return (
    <div className="group relative my-6 overflow-hidden border border-rule-strong">
      <div
        className="overflow-x-auto p-5 font-mono text-sm leading-relaxed [&_pre]:!m-0 [&_pre]:!border-0 [&_pre]:!p-0"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
