"use client";

import Link from "next/link";
import { Github, Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { MobileNav } from "./mobile-nav";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-ground-overlay backdrop-blur-2xl backdrop-saturate-[1.3]">
      <div className="mx-auto flex h-14 max-w-[76rem] items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <MobileNav />
          <Link
            href="/"
            className="group flex items-center gap-2.5 hover:no-underline"
          >
            <span className="flex size-6 items-center justify-center rounded-[5px] bg-accent font-display text-[11px] font-extrabold text-white shadow-sm transition-shadow group-hover:shadow-md">
              Y
            </span>
            <span className="font-display text-[0.875rem] font-bold tracking-[-0.01em] text-ink">
              Yieldless
            </span>
          </Link>
          <span className="ml-1 hidden rounded-full border border-rule bg-ground-recessed px-2 py-0.5 font-mono text-[10px] font-medium text-ink-tertiary sm:inline-block">
            docs
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex size-8 items-center justify-center rounded-md text-ink-tertiary transition-all hover:bg-ground-recessed hover:text-ink"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="size-[15px]" />
            ) : (
              <Moon className="size-[15px]" />
            )}
          </button>
          <a
            href="https://github.com/binbandit/yieldless"
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-8 items-center justify-center rounded-md text-ink-tertiary transition-all hover:bg-ground-recessed hover:text-ink"
            aria-label="GitHub"
          >
            <Github className="size-[15px]" />
          </a>
        </div>
      </div>
    </header>
  );
}
