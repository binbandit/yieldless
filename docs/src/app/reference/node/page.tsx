import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Note } from "@/components/note";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/node",
  description:
    "Tuple wrappers for Node filesystem work and child-process execution.",
};

export default async function NodePage() {
  return (
    <DocLayout
      title="yieldless/node"
      description="Tuple wrappers for Node filesystem work and child-process execution."
    >
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          yieldless/node
        </code>{" "}
        wraps the pieces of Node that backend tools and desktop apps touch
        constantly: filesystem calls and external commands.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Exports
      </h2>

      <h3 className="mt-10 font-display text-lg font-bold tracking-tight text-ink">
        Filesystem
      </h3>

      <Signature>{"accessSafe(path)"}</Signature>
      <Signature>{"readFileSafe(path, encoding?)"}</Signature>
      <Signature>{"writeFileSafe(path, contents, options?)"}</Signature>
      <Signature>{"readdirSafe(path)"}</Signature>
      <Signature>{"mkdirSafe(path, options?)"}</Signature>
      <Signature>{"rmSafe(path, options?)"}</Signature>
      <Signature>{"statSafe(path)"}</Signature>

      <h3 className="mt-10 font-display text-lg font-bold tracking-tight text-ink">
        Processes
      </h3>

      <Signature>{"runCommand(file, args?, options?)"}</Signature>
      <Signature>{"runCommandSafe(file, args?, options?)"}</Signature>
      <Signature>{"CommandError"}</Signature>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Filesystem example
      </h2>

      <CodeBlock
        code={`import { readFileSafe } from "yieldless/node";

const [error, contents] = await readFileSafe(".git/HEAD");`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Child-process example
      </h2>

      <CodeBlock
        code={`import { runCommandSafe } from "yieldless/node";

const [error, result] = await runCommandSafe(
  "git",
  ["status", "--short"],
  { cwd: repositoryPath },
);`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        runCommand() vs runCommandSafe()
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            runCommand()
          </code>{" "}
          throws on non-zero exit and returns{" "}
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            {"{ stdout, stderr, exitCode, signal }"}
          </code>
        </li>
        <li>
          <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
            runCommandSafe()
          </code>{" "}
          wraps that behavior into a tuple
        </li>
      </ul>

      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          CommandError
        </code>{" "}
        includes the command output, exit code, signal, and Node error code when
        one exists.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Cancellation
      </h2>

      <Note>
        If you pass an{" "}
        <code className="rounded-sm border border-rule bg-ground-recessed px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          AbortSignal
        </code>
        , Yieldless forwards it to Node's native child-process signal handling
        and waits for the subprocess to close before it settles the wrapper
        promise.
      </Note>
    </DocLayout>
  );
}
