import { cn } from '@/lib/cn';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const gitConfig = {
  user: 'binbandit',
  repo: 'yieldless',
  branch: 'main',
};

export const llmsTextHref = '/yieldless/llms.txt';

type BaseOptionsConfig = {
  llmsNavLink?: boolean;
};

export function LLMSPlainLink({ className }: { className?: string }) {
  return (
    <a
      className={cn(
        'inline-flex items-center rounded-md text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground',
        className,
      )}
      href={llmsTextHref}
    >
      llms.txt
    </a>
  );
}

export function LLMSFooterLink() {
  return (
    <LLMSPlainLink className="mt-2 px-2 py-1.5 hover:bg-fd-accent hover:text-fd-accent-foreground" />
  );
}

export function baseOptions({
  llmsNavLink = false,
}: BaseOptionsConfig = {}): BaseLayoutProps {
  return {
    nav: {
      title: 'Yieldless',
    },
    links: llmsNavLink
      ? [
          {
            active: 'none',
            description: 'A compact map of guides, reference pages, and recipes.',
            external: true,
            secondary: true,
            text: 'llms.txt',
            url: llmsTextHref,
          },
        ]
      : undefined,
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
