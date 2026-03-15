"use client";

import Link from "next/link";
import { Github, Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";
import { MobileNav } from "./mobile-nav";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-rule bg-ground/92 px-6 backdrop-blur-xl backdrop-saturate-[1.2]">
      <div className="flex items-center gap-4">
        <MobileNav />
        <Link
          href="/"
          className="font-display text-[0.95rem] font-extrabold tracking-tight text-ink hover:no-underline"
        >
          Yieldless
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center rounded-sm p-2 text-ink-secondary transition-colors hover:text-ink"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>
        <a
          href="https://github.com/binbandit/yieldless"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center rounded-sm p-2 text-ink-secondary transition-colors hover:text-ink"
          aria-label="GitHub"
        >
          <Github className="size-4" />
        </a>
      </div>
    </header>
  );
}
