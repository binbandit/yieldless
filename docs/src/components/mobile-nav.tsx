"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import { navigation } from "@/lib/navigation";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const basePath = "/yieldless";

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center p-2 text-ink-secondary hover:text-ink"
        aria-label="Toggle navigation"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div className="fixed inset-0 top-16 z-50 bg-ground">
          <nav className="overflow-y-auto p-6">
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
                            onClick={() => setOpen(false)}
                            className={clsx(
                              "block px-3 py-2 font-display text-sm font-medium transition-colors",
                              isActive
                                ? "text-accent font-semibold"
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
        </div>
      )}
    </div>
  );
}
