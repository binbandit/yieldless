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
      <p>
        <code>yieldless/schema</code> keeps validation inside the same error model as the rest of the library.
      </p>

      <h2>
        Exports
      </h2>

      <Signature>{"parseSafe(schema, input)"}</Signature>
      <Signature>{"parseAsyncSafe(schema, input)"}</Signature>

      <h3>
        Supported schema shapes
      </h3>

      <ul>
        <li>
          Objects with <code>safeParse()</code>
        </li>
        <li>
          Objects with <code>parse()</code>
        </li>
        <li>
          Objects with <code>safeParseAsync()</code>
        </li>
        <li>
          Objects with <code>parseAsync()</code>
        </li>
      </ul>

      <h2>
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

      <h2>
        Example with an async parser
      </h2>

      <CodeBlock
        code={`const [error, user] = await parseAsyncSafe(userSchema, input);`}
        lang="ts"
      />

      <h2>
        Why it exists
      </h2>

      <p>
        Most validation libraries are already good at describing schemas.
        Yieldless does not try to replace them.
      </p>

      <h2>
        Good fits
      </h2>

      <ul>
        <li>HTTP request validation</li>
        <li>Environment parsing</li>
        <li>Normalizing database payloads</li>
        <li>Decoding IPC input</li>
      </ul>
    </DocLayout>
  );
}
