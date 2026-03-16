import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Electron Git Client",
  description:
    "An end-to-end shape for a desktop Git app using IPC tuples, abortable subprocesses, and typed renderer calls.",
};

export default async function ElectronGitClientPage() {
  return (
    <DocLayout
      title="Electron Git Client"
      description="An end-to-end shape for a desktop Git app using IPC tuples, abortable subprocesses, and typed renderer calls."
    >
      <p>
        Yieldless fits Electron well because the important boundaries in an
        Electron app are all failure-heavy: the renderer asks for work through
        IPC, the main process touches the filesystem, the main process launches
        long-running child processes like <code>git clone</code>.
      </p>

      <h2>
        Main-process contract
      </h2>

      <CodeBlock
        code={`import type { IpcProcedure } from "yieldless/ipc";

type GitContract = {
  cloneRepository: IpcProcedure<
    [url: string, directory: string],
    { path: string },
    Error
  >;
  getStatus: IpcProcedure<[directory: string], { output: string }, Error>;
};`}
        lang="ts"
      />

      <h2>
        Main-process implementation
      </h2>

      <CodeBlock
        code={`import { createIpcMain } from "yieldless/ipc";
import { runTaskGroup } from "yieldless/task";
import { runCommandSafe } from "yieldless/node";

const ipc = createIpcMain<GitContract>(ipcMain);

ipc.handle("cloneRepository", async (_event, url, directory) => {
  return await runTaskGroup(async (_group, signal) => {
    const [cloneError] = await runCommandSafe(
      "git",
      ["clone", url, directory],
      { signal },
    );

    if (cloneError) {
      return [cloneError, null];
    }

    return [null, { path: directory }];
  });
});`}
        lang="ts"
      />

      <p>
        If the window is torn down or a parent task group is canceled, the
        subprocess is aborted through Node's native child-process signal
        handling.
      </p>

      <h2>
        Preload bridge
      </h2>

      <CodeBlock
        code={`import { createIpcBridge, createIpcRenderer } from "yieldless/ipc";

const client = createIpcRenderer<GitContract>(ipcRenderer);

export const gitBridge = createIpcBridge(client, [
  "cloneRepository",
  "getStatus",
] as const);`}
        lang="ts"
      />

      <h2>
        Renderer usage
      </h2>

      <CodeBlock
        code={`const [error, result] = await window.gitBridge.cloneRepository(
  "git@github.com:binbandit/yieldless.git",
  "/tmp/yieldless",
);

if (error) {
  showToast(error.message);
  return;
}

openRepository(result.path);`}
        lang="ts"
      />

      <h2>
        Why this boundary feels cleaner
      </h2>

      <ul>
        <li>
          The renderer never depends on Electron's lossy thrown-error
          conversion.
        </li>
        <li>
          The main process can use the same tuple style it uses everywhere else.
        </li>
        <li>
          Long-running Git subprocesses can be canceled as soon as the UI no
          longer cares about them.
        </li>
      </ul>
    </DocLayout>
  );
}
