import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { DocLayout } from "@/components/doc-layout";
import { Note } from "@/components/note";
import { Signature } from "@/components/signature";

export const metadata: Metadata = {
  title: "yieldless/ipc",
  description:
    "Typed Electron IPC helpers that preserve tuple results across the process boundary.",
};

export default async function IpcPage() {
  return (
    <DocLayout
      title="yieldless/ipc"
      description="Typed Electron IPC helpers that preserve tuple results across the process boundary."
    >
      <p className="mt-4 font-body text-base leading-[1.78] text-ink-secondary">
        Electron IPC is a good place for Yieldless because the boundary is
        inherently failure-heavy and the transport only accepts
        structured-clone-safe data.
      </p>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Exports
      </h2>

      <Signature>{"createIpcMain(ipcMain)"}</Signature>
      <Signature>{"createIpcRenderer(ipcRenderer)"}</Signature>
      <Signature>{"createIpcBridge(client, channels)"}</Signature>
      <Signature>{"serializeIpcError(error)"}</Signature>
      <Signature>{"deserializeIpcResult(payload)"}</Signature>

      <h3 className="mt-10 font-display text-lg font-bold tracking-tight text-ink">
        Core types
      </h3>

      <Signature>{"IpcProcedure"}</Signature>
      <Signature>{"IpcContract"}</Signature>
      <Signature>{"IpcClient"}</Signature>
      <Signature>{"IpcBridge"}</Signature>
      <Signature>{"SerializedIpcError"}</Signature>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Contract example
      </h2>

      <CodeBlock
        code={`import type { IpcProcedure } from "yieldless/ipc";

type Contract = {
  getStatus: IpcProcedure<[directory: string], { output: string }, Error>;
};`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Main process
      </h2>

      <CodeBlock
        code={`const server = createIpcMain<Contract>(ipcMain);

server.handle("getStatus", async (_event, directory) => {
  return await runGitStatus(directory);
});`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Renderer process
      </h2>

      <CodeBlock
        code={`const client = createIpcRenderer<Contract>(ipcRenderer);
const [error, result] = await client.invoke("getStatus", "/tmp/repo");`}
        lang="ts"
      />

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Why the serialization layer matters
      </h2>

      <Note>
        Electron can flatten thrown errors when they cross IPC. Yieldless avoids
        that by serializing tuple errors into plain objects before they cross the
        boundary, then decoding them back into tuple form on the receiving side.
      </Note>

      <h2 className="mt-14 mb-4 pb-3 border-b-2 border-ink font-display text-2xl font-bold tracking-tight text-ink">
        Good fits
      </h2>

      <ul className="mt-4 space-y-1.5 pl-5 text-ink-secondary list-disc marker:text-accent">
        <li>
          React or Vue renderers calling main-process Git operations
        </li>
        <li>
          Preload bridges that expose only an allowlisted set of channels
        </li>
        <li>
          Desktop apps where you want one consistent error model from UI to
          subprocess
        </li>
      </ul>
    </DocLayout>
  );
}
