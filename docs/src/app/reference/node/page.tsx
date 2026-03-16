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
      <p>
        <code>yieldless/node</code> wraps the pieces of Node that backend tools and desktop apps touch
        constantly: filesystem calls and external commands.
      </p>

      <h2>
        Exports
      </h2>

      <h3>
        Filesystem
      </h3>

      <Signature>{"accessSafe(path)"}</Signature>
      <Signature>{"readFileSafe(path, encoding?)"}</Signature>
      <Signature>{"writeFileSafe(path, contents, options?)"}</Signature>
      <Signature>{"readdirSafe(path)"}</Signature>
      <Signature>{"mkdirSafe(path, options?)"}</Signature>
      <Signature>{"rmSafe(path, options?)"}</Signature>
      <Signature>{"statSafe(path)"}</Signature>

      <h3>
        Processes
      </h3>

      <Signature>{"runCommand(file, args?, options?)"}</Signature>
      <Signature>{"runCommandSafe(file, args?, options?)"}</Signature>
      <Signature>{"CommandError"}</Signature>

      <h2>
        Filesystem example
      </h2>

      <CodeBlock
        code={`import { readFileSafe } from "yieldless/node";

const [error, contents] = await readFileSafe(".git/HEAD");`}
        lang="ts"
      />

      <h2>
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

      <h2>
        runCommand() vs runCommandSafe()
      </h2>

      <ul>
        <li>
          <code>runCommand()</code> throws on non-zero exit and returns{" "}
          <code>{"{ stdout, stderr, exitCode, signal }"}</code>
        </li>
        <li>
          <code>runCommandSafe()</code> wraps that behavior into a tuple
        </li>
      </ul>

      <p>
        <code>CommandError</code> includes the command output, exit code, signal, and Node error code when
        one exists.
      </p>

      <h2>
        Cancellation
      </h2>

      <Note>
        If you pass an <code>AbortSignal</code>, Yieldless forwards it to Node's native child-process signal handling
        and waits for the subprocess to close before it settles the wrapper
        promise.
      </Note>
    </DocLayout>
  );
}
