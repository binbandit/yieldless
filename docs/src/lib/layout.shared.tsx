import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const gitConfig = {
  user: 'binbandit',
  repo: 'yieldless',
  branch: 'main',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Yieldless',
    },
    links: [
      {
        text: 'llms.txt',
        description: 'A compact map of guides, reference pages, and recipes.',
        url: '/llms.txt',
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
