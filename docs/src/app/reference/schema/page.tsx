import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/schema",
  description:
    "Tuple adapters for safeParse(), parse(), safeParseAsync(), and parseAsync() style validators.",
};

export default async function SchemaPage() {
  return (
    <DocLayout
      title="yieldless/schema"
      description="Tuple adapters for safeParse(), parse(), safeParseAsync(), and parseAsync() style validators."
    >
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          yieldless/schema
        </code>{" "}
        keeps validation inside the same error model as the rest of the library.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Exports
      </h2>

      <Signature>{"parseSafe(schema, input)"}</Signature>
      <Signature>{"parseAsyncSafe(schema, input)"}</Signature>

      <h3 className="mt-10 font-display text-lg font-bold tracking-tight text-ink">
        Supported schema shapes
      </h3>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          Objects with{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            safeParse()
          </code>
        </li>
        <li>
          Objects with{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            parse()
          </code>
        </li>
        <li>
          Objects with{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            safeParseAsync()
          </code>
        </li>
        <li>
          Objects with{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            parseAsync()
          </code>
        </li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Example with a safeParse() schema
      </h2>

      <CodeBlock
        code={`import { parseSafe } from "yieldless/schema";

const [error, user] = parseSafe(userSchema, input);
if (error) {
  return [error, null] as const;
}`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Example with an async parser
      </h2>

      <CodeBlock
        code={`const [error, user] = await parseAsyncSafe(userSchema, input);`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Why it exists
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        Most validation libraries are already good at describing schemas.
        Yieldless does not try to replace them.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Good fits
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>HTTP request validation</li>
        <li>Environment parsing</li>
        <li>Normalizing database payloads</li>
        <li>Decoding IPC input</li>
      </ul>
    </DocLayout>
  );
}
