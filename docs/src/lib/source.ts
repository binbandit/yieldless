import { docs } from 'collections/server';
import { type InferPageType, loader } from 'fumadocs-core/source';

export const siteConfig = {
  name: 'Yieldless',
  description:
    'Native async/await primitives for tuple-based errors, structured concurrency, and Node/Electron workflows.',
  url: 'https://binbandit.github.io/yieldless',
};

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [],
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.webp'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}

function normalizeLLMMarkdown(markdown: string): string {
  return markdown
    .replace(
      /\]\((\/[^)\s]+)\)/g,
      (_match, pathname: string) => `](${getAbsoluteUrl(pathname)})`,
    )
    .replace(
      /href="(\/[^"]+)"/g,
      (_match, pathname: string) => `href="${getAbsoluteUrl(pathname)}"`,
    );
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = normalizeLLMMarkdown(
    await page.data.getText('processed'),
  );

  return `# ${page.data.title}

${processed}`;
}

const llmSections = [
  {
    slug: 'guides',
    title: 'Guides',
    description:
      'Conceptual documentation for adopting Yieldless and choosing the right module.',
    pages: ['quickstart', 'module-selection', 'design-rules', 'do-and-dont'],
  },
  {
    slug: 'reference',
    title: 'Reference',
    description:
      'Per-module API details, examples, behavior notes, and good/avoid usage guidance.',
    pages: [
      'error',
      'result',
      'task',
      'resource',
      'di',
      'env',
      'retry',
      'signal',
      'timer',
      'event',
      'fetch',
      'context',
      'all',
      'iterable',
      'singleflight',
      'schema',
      'router',
      'ipc',
      'node',
    ],
  },
  {
    slug: 'recipes',
    title: 'Recipes',
    description:
      'End-to-end examples for backend, batch, and Electron workflows.',
    pages: [
      'resilient-service-flow',
      'bounded-batch-work',
      'electron-git-client',
      'electron-pr-review-workbench',
    ],
  },
] as const;

export const llmTextHeaders = {
  'Content-Type': 'text/plain; charset=utf-8',
};

export const llmMarkdownHeaders = {
  'Content-Type': 'text/markdown; charset=utf-8',
};

function withTrailingSlash(pathname: string): string {
  const lastSegment = pathname.split('/').at(-1) ?? '';

  if (pathname.endsWith('/') || lastSegment.includes('.')) {
    return pathname;
  }

  return `${pathname}/`;
}

export function getAbsoluteUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return `${siteConfig.url}${withTrailingSlash(normalizedPath)}`;
}

function getDocsPath(page: InferPageType<typeof source>): string {
  return page.slugs.length === 0 ? '/docs' : `/docs/${page.slugs.join('/')}`;
}

export function getDocsUrl(page: InferPageType<typeof source>): string {
  return getAbsoluteUrl(getDocsPath(page));
}

export function getMarkdownUrl(page: InferPageType<typeof source>): string {
  return getAbsoluteUrl(
    `/llms.mdx/docs/${[...page.slugs, 'index.mdx'].join('/')}`,
  );
}

function getSectionPages(section: (typeof llmSections)[number]) {
  return source
    .getPages()
    .filter((page) => page.slugs[0] === section.slug)
    .sort((left, right) => {
      const pageOrder = section.pages as readonly string[];
      const leftIndex = pageOrder.indexOf(left.slugs[1] ?? '');
      const rightIndex = pageOrder.indexOf(right.slugs[1] ?? '');

      return (
        (leftIndex === -1 ? Number.POSITIVE_INFINITY : leftIndex) -
        (rightIndex === -1 ? Number.POSITIVE_INFINITY : rightIndex)
      );
    });
}

function formatPageLink(page: InferPageType<typeof source>): string {
  const description =
    page.data.description === undefined ? '' : `: ${page.data.description}`;

  return `- [${page.data.title}](${getDocsUrl(page)})${description}`;
}

export function getLLMSIndex(): string {
  const home = source.getPage([]);
  const lines = [
    `# ${siteConfig.name}`,
    '',
    `> ${siteConfig.description}`,
    '',
    'Yieldless is a zero-dependency TypeScript library for tuple-based errors, AbortSignal-driven cancellation, resource cleanup, and practical Node/Electron boundaries without a custom runtime.',
    '',
    '## Primary Resources',
    '',
    `- [Documentation](${getAbsoluteUrl('/docs')})`,
    `- [Full LLM context](${getAbsoluteUrl('/llms-full.txt')})`,
    `- [GitHub repository](https://github.com/binbandit/yieldless)`,
  ];

  if (home !== undefined) {
    lines.push(`- [Documentation home as Markdown](${getMarkdownUrl(home)})`);
  }

  for (const section of llmSections) {
    const pages = getSectionPages(section);

    if (pages.length === 0) {
      continue;
    }

    lines.push('', `## ${section.title}`, '', section.description, '');

    for (const page of pages) {
      lines.push(formatPageLink(page));
      lines.push(`  - Markdown: ${getMarkdownUrl(page)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export async function getLLMSFullText(): Promise<string> {
  const home = source.getPage([]);
  const pages = [
    ...(home === undefined ? [] : [home]),
    ...llmSections.flatMap((section) => getSectionPages(section)),
  ];
  const scanned = await Promise.all(pages.map(getLLMText));

  return `${scanned.join('\n\n')}\n`;
}
