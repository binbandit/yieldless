"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { navigation } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const basePath = "/yieldless";

  return (
    <nav className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto pb-8 pt-8 pr-4 lg:block">
      <div className="flex flex-col gap-7">
        {navigation.map((group) => (
          <div key={group.label}>
            <h4 className="mb-2 px-3 font-display text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
              {group.label}
            </h4>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const fullHref = `${basePath}${item.href}`;
                const isActive =
                  pathname === fullHref || pathname === `${fullHref}/`;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        "relative block rounded-md px-3 py-1.5 font-display text-[0.8125rem] transition-all duration-150",
                        isActive
                          ? "bg-accent-wash font-semibold text-accent"
                          : "font-medium text-ink-tertiary hover:bg-ground-recessed hover:text-ink-secondary",
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                      )}
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
