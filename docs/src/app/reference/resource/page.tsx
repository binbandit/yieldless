import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Note } from "@/components/note";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/resource",
  description: "Native async disposal with acquire and release functions.",
};

export default async function ResourcePage() {
  return (
    <DocLayout
      title="yieldless/resource"
      description="Native async disposal with acquire and release functions."
    >
      <p>
        <code>yieldless/resource</code> turns a pair of acquire/release functions into an object that
        participates in native <code>await using</code> cleanup.
      </p>

      <h2>
        Exports
      </h2>

      <Signature>
        {"type ResourceAcquire<T> = () => PromiseLike<T> | T"}
      </Signature>
      <Signature>
        {"type ResourceRelease<T> = (resource: T) => PromiseLike<void> | void"}
      </Signature>
      <Signature>
        {"interface AsyncResource<T> extends AsyncDisposable { readonly value: T }"}
      </Signature>
      <Signature>
        {"acquireResource(acquire, release): Promise<AsyncResource<T>>"}
      </Signature>

      <h2>
        Example
      </h2>

      <CodeBlock
        code={`import { acquireResource } from "yieldless/resource";

{
  await using db = await acquireResource(connect, disconnect);
  await db.value.query("select 1");
}`}
        lang="ts"
      />

      <h2>
        Where it fits
      </h2>

      <ul>
        <li>Database or queue connections scoped to a request or job</li>
        <li>Temporary filesystem handles</li>
        <li>External clients that need explicit teardown</li>
      </ul>

      <h2>
        Important detail
      </h2>

      <Note>
        The resource wrapper exposes the underlying value as{" "}
        <code>.value</code>. That keeps the disposable handle explicit and avoids pretending that
        current <code>await using</code> syntax can destructure directly into a tuple.
      </Note>
    </DocLayout>
  );
}
