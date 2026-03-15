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
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          yieldless/router
        </code>{" "}
        turns tuple-native handlers into Hono-style JSON handlers.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Exports
      </h2>

      <Signature>{"honoHandler(handler, options)"}</Signature>

      <h3 className="mt-10 font-display text-lg font-bold tracking-tight text-ink">
        Error classes
      </h3>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            HttpError
          </code>
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            BadRequestError
          </code>
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            UnauthorizedError
          </code>
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            ForbiddenError
          </code>
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            NotFoundError
          </code>
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            ConflictError
          </code>
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            ValidationError
          </code>
        </li>
      </ul>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Handler shape
      </h2>

      <Signature>
        {"type TupleRouteHandler<Context, Data, ErrorType = Error> = (context: Context) => PromiseLike<SafeResult<Data, ErrorType>> | SafeResult<Data, ErrorType>"}
      </Signature>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
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

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
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
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                context.json(data, status)
              </code>
            </td>
          </tr>
          <tr>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                HttpError
              </code>{" "}
              instance
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
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                options.mapError()
              </code>
            </td>
            <td className="border-b border-rule px-4 py-2.5 text-ink-secondary">
              Normalize custom domain errors into{" "}
              <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
                HttpError
              </code>
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        When this module is enough
      </h2>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        If your framework only needs a{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          json()
        </code>{" "}
        method on the context, this adapter is usually enough.
      </p>
    </DocLayout>
  );
}
