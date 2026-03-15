"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { navigation } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const basePath = "/yieldless";

  return (
    <nav className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-rule py-8 pr-6 lg:block">
      <div className="flex flex-col gap-8">
        {navigation.map((group) => (
          <div key={group.label}>
            <h4 className="mb-3 font-display text-[0.7rem] font-bold uppercase tracking-[0.08em] text-ink-tertiary">
              {group.label}
            </h4>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const fullHref = `${basePath}${item.href}`;
                const isActive =
                  pathname === fullHref || pathname === `${fullHref}/`;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        "block rounded-sm px-3 py-1.5 font-display text-sm font-medium transition-colors",
                        isActive
                          ? "bg-accent-wash text-accent font-semibold"
                          : "text-ink-secondary hover:text-ink",
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
