import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

function resolveYieldlessSpecifier(source: string): string | null {
  if (source === "yieldless") {
    return fileURLToPath(new URL("./src/index.ts", import.meta.url));
  }

  const match = source.match(/^yieldless\/(.+)$/);

  if (match === null) {
    return null;
  }

  return fileURLToPath(new URL(`./src/${match[1]}.ts`, import.meta.url));
}

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      name: "yieldless-test-alias",
      resolveId(source) {
        return resolveYieldlessSpecifier(source);
      },
    },
  ],
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
