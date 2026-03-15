export type NavItem = {
  title: string;
  href: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    label: "Start Here",
    items: [
      { title: "Quickstart", href: "/guides/quickstart" },
      { title: "Design Rules", href: "/guides/design-rules" },
      { title: "Do and Don't", href: "/guides/do-and-dont" },
    ],
  },
  {
    label: "Reference",
    items: [
      { title: "yieldless/error", href: "/reference/error" },
      { title: "yieldless/task", href: "/reference/task" },
      { title: "yieldless/resource", href: "/reference/resource" },
      { title: "yieldless/di", href: "/reference/di" },
      { title: "yieldless/retry", href: "/reference/retry" },
      { title: "yieldless/context", href: "/reference/context" },
      { title: "yieldless/all", href: "/reference/all" },
      { title: "yieldless/schema", href: "/reference/schema" },
      { title: "yieldless/router", href: "/reference/router" },
      { title: "yieldless/ipc", href: "/reference/ipc" },
      { title: "yieldless/node", href: "/reference/node" },
    ],
  },
  {
    label: "Recipes",
    items: [
      {
        title: "Resilient Service Flow",
        href: "/recipes/resilient-service-flow",
      },
      { title: "Electron Git Client", href: "/recipes/electron-git-client" },
    ],
  },
];
