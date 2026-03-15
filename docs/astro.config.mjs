// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  base: "/yieldless",
  site: "https://binbandit.github.io",
  integrations: [
    starlight({
      title: "Yieldless",
      description:
        "Native async/await primitives for tuple-based errors, structured concurrency, and Node/Electron workflows.",
      tagline: "Effect-style ergonomics without a custom runtime.",
      customCss: ["/src/styles/custom.css"],
      editLink: {
        baseUrl: "https://github.com/binbandit/yieldless/edit/main/docs/",
      },
      favicon: "/favicon.svg",
      lastUpdated: true,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/binbandit/yieldless",
        },
      ],
      head: [
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.googleapis.com",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossorigin: "anonymous",
          },
        },
        {
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href:
              "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,600;6..72,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap",
          },
        },
        {
          tag: "script",
          content:
            "if (typeof localStorage !== 'undefined' && !localStorage.getItem('starlight-theme')) localStorage.setItem('starlight-theme', 'light');",
        },
        {
          tag: "meta",
          attrs: {
            name: "theme-color",
            content: "#0f766e",
          },
        },
      ],
      sidebar: [
        {
          label: "Start Here",
          items: [
            { label: "Quickstart", slug: "guides/quickstart" },
            { label: "Design Rules", slug: "guides/design-rules" },
            { label: "Do and Don't", slug: "guides/do-and-dont" },
          ],
        },
        {
          label: "Reference",
          items: [
            { label: "yieldless/error", slug: "reference/error" },
            { label: "yieldless/task", slug: "reference/task" },
            { label: "yieldless/resource", slug: "reference/resource" },
            { label: "yieldless/di", slug: "reference/di" },
            { label: "yieldless/retry", slug: "reference/retry" },
            { label: "yieldless/context", slug: "reference/context" },
            { label: "yieldless/all", slug: "reference/all" },
            { label: "yieldless/schema", slug: "reference/schema" },
            { label: "yieldless/router", slug: "reference/router" },
            { label: "yieldless/ipc", slug: "reference/ipc" },
            { label: "yieldless/node", slug: "reference/node" },
          ],
        },
        {
          label: "Recipes",
          items: [
            { label: "Resilient Service Flow", slug: "recipes/resilient-service-flow" },
            { label: "Electron Git Client", slug: "recipes/electron-git-client" },
          ],
        },
      ],
    }),
  ],
});
