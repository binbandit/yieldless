import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/di",
  description: "Reader-lite dependency binding for plain functions.",
};

export default async function DiPage() {
  return (
    <DocLayout
      title="yieldless/di"
      description="Reader-lite dependency binding for plain functions."
    >
      <p>
        <code>yieldless/di</code> is intentionally small. It binds stable dependencies at the application
        edge and returns the executable version of the function.
      </p>

      <h2>
        Exports
      </h2>

      <Signature>
        {
          "type Injectable<Deps, Args extends unknown[], Return> = (deps: Deps, ...args: Args) => Return"
        }
      </Signature>
      <Signature>{"inject(core, deps): (...args) => Return"}</Signature>

      <h2>
        Example
      </h2>

      <CodeBlock
        code={`import { inject } from "yieldless/di";

const createHandler = (
  deps: {
    logger: { info(message: string): void };
    audit: { write(message: string): Promise<void> };
  },
  repoId: string,
) => {
  deps.logger.info(\`Loading \${repoId}\`);
  return deps.audit.write(\`repo:\${repoId}\`);
};

const handler = inject(createHandler, {
  logger: console,
  audit,
});`}
        lang="ts"
      />

      <h2>
        Why this stays readable
      </h2>

      <ul>
        <li>
          All required dependencies are still visible in the function signature
        </li>
        <li>There is no hidden container lookup</li>
        <li>
          TypeScript enforces that the injected object satisfies{" "}
          <code>Deps</code> before the returned function can be called
        </li>
      </ul>

      <h2>
        Use it for
      </h2>

      <ul>
        <li>
          Route handlers configured with repositories, loggers, and feature
          flags
        </li>
        <li>
          CLI commands configured with a filesystem or process adapter
        </li>
        <li>
          Background jobs configured with queues or telemetry sinks
        </li>
      </ul>
    </DocLayout>
  );
}
