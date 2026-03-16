import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/router",
  description: "Tuple-returning route handlers with HTTP error mapping.",
};

export default async function RouterPage() {
  return (
    <DocLayout
      title="yieldless/router"
      description="Tuple-returning route handlers with HTTP error mapping."
    >
      <p>
        <code>yieldless/router</code> turns tuple-native handlers into Hono-style JSON handlers.
      </p>

      <h2>
        Exports
      </h2>

      <Signature>{"honoHandler(handler, options)"}</Signature>

      <h3>
        Error classes
      </h3>

      <ul>
        <li><code>HttpError</code></li>
        <li><code>BadRequestError</code></li>
        <li><code>UnauthorizedError</code></li>
        <li><code>ForbiddenError</code></li>
        <li><code>NotFoundError</code></li>
        <li><code>ConflictError</code></li>
        <li><code>ValidationError</code></li>
      </ul>

      <h2>
        Handler shape
      </h2>

      <Signature>
        {"type TupleRouteHandler<Context, Data, ErrorType = Error> = (context: Context) => PromiseLike<SafeResult<Data, ErrorType>> | SafeResult<Data, ErrorType>"}
      </Signature>

      <h2>
        Example
      </h2>

      <CodeBlock
        code={`import { honoHandler, NotFoundError } from "yieldless/router";

export const getRepository = honoHandler(async (c) => {
  const repo = await findRepository(c.req.param("id"));

  if (repo === null) {
    return [new NotFoundError("Repository not found"), null];
  }

  return [null, repo];
});`}
        lang="ts"
      />

      <h2>
        What the adapter does
      </h2>

      <table className="mt-6 w-full font-display text-sm">
        <thead>
          <tr>
            <th className="border-b-2 border-ink px-4 py-2.5 text-left font-bold text-ink">
              Input
            </th>
            <th className="border-b-2 border-ink px-4 py-2.5 text-left font-bold text-ink">
              Output
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Success tuple
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>context.json(data, status)</code>
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>HttpError</code> instance
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Configured status code
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Unknown error
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Generic 500
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code>options.mapError()</code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Normalize custom domain errors into <code>HttpError</code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2>
        When this module is enough
      </h2>

      <p>
        If your framework only needs a <code>json()</code> method on the context, this adapter is usually enough.
      </p>
    </DocLayout>
  );
}
