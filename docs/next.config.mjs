import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const docsRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(docsRoot, '..');

/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ['@takumi-rs/image-response'],
  output: 'export',
  basePath: '/yieldless',
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: repoRoot,
  },
};

export default withMDX(config);
