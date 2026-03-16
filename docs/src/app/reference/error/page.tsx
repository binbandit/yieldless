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
      <p>
        <code>yieldless/error</code> is the smallest useful piece of the
        library. It gives you a single tuple shape and a few helpers for
        converting thrown code into that shape.
      </p>

      <h2>Exports</h2>

      <Signature>
        {"type SafeResult<T, E = Error> = [E, null] | [null, T]"}
      </Signature>
      <Signature>{"safeTry(promise): Promise<SafeResult<T>>"}</Signature>
      <Signature>{"safeTrySync(fn): SafeResult<T>"}</Signature>
      <Signature>{"unwrap(result): T"}</Signature>

      <h2>Typical use</h2>

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

      <h2>When to use it</h2>

      <ul>
        <li>Wrapping filesystem, HTTP, database, or subprocess calls</li>
        <li>
          Converting parse and validation failures into explicit branches
        </li>
        <li>
          Leaving framework boundaries as tuples until the last possible moment
        </li>
      </ul>

      <h2>Rules of thumb</h2>

      <ul>
        <li>
          Prefer <code>safeTry()</code> at the boundary, not around every
          individual expression.
        </li>
        <li>
          Keep the tuple local. Once you have the success value, use the value.
        </li>
        <li>
          Use <code>unwrap()</code> only where a thrown exception is genuinely
          required.
        </li>
      </ul>

      <h2>Caveat</h2>

      <Note>
        <code>SafeResult</code> uses null sentinels. If your success value is
        literally <code>null</code>, the runtime tuple is still correct, but the
        type system cannot fully discriminate that case.
      </Note>
    </DocLayout>
  );
}
