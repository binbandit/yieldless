import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Note } from "@/components/note";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/error",
  description: "Tuple-based error handling primitives.",
};

export default async function ErrorPage() {
  return (
    <DocLayout
      title="yieldless/error"
      description="Tuple-based error handling primitives."
    >
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          yieldless/error
        </code>{" "}
        is the smallest useful piece of the library. It gives you a single tuple
        shape and a few helpers for converting thrown code into that shape.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Exports
      </h2>

      <Signature>
        {"type SafeResult<T, E = Error> = [E, null] | [null, T]"}
      </Signature>
      <Signature>{"safeTry(promise): Promise<SafeResult<T>>"}</Signature>
      <Signature>{"safeTrySync(fn): SafeResult<T>"}</Signature>
      <Signature>{"unwrap(result): T"}</Signature>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Typical use
      </h2>

      <CodeBlock
        code={`import { safeTry, safeTrySync, unwrap } from "yieldless/error";

const [readError, body] = await safeTry(readFile("package.json", "utf8"));
if (readError) {
  return [readError, null] as const;
}

const parsed = safeTrySync(() => JSON.parse(body));
const value = unwrap(parsed);`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        When to use it
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          Wrapping filesystem, HTTP, database, or subprocess calls
        </li>
        <li>
          Converting parse and validation failures into explicit branches
        </li>
        <li>
          Leaving framework boundaries as tuples until the last possible moment
        </li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Rules of thumb
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          Prefer{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            safeTry()
          </code>{" "}
          at the boundary, not around every individual expression.
        </li>
        <li>
          Keep the tuple local. Once you have the success value, use the value.
        </li>
        <li>
          Use{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            unwrap()
          </code>{" "}
          only where a thrown exception is genuinely required.
        </li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Caveat
      </h2>

      <Note>
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          SafeResult
        </code>{" "}
        uses null sentinels. If your success value is literally{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          null
        </code>
        , the runtime tuple is still correct, but the type system cannot fully
        discriminate that case.
      </Note>
    </DocLayout>
  );
}
