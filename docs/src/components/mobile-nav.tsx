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
        type="button"
        onClick={() => setOpen(!open)}
        className="flex size-8 items-center justify-center rounded-md text-ink-tertiary transition-colors hover:bg-ground-recessed hover:text-ink"
        aria-label="Toggle navigation"
      >
        {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
      </button>

      {open && (
        <div className="fixed inset-0 top-14 z-50 overflow-y-auto bg-ground/98 backdrop-blur-sm">
          <nav className="mx-auto max-w-lg p-6">
            <div className="flex flex-col gap-8">
              {navigation.map((group) => (
                <div key={group.label}>
                  <h4 className="mb-2.5 px-3 font-display text-[0.65rem] font-bold uppercase tracking-[0.1em] text-ink-faint">
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
                            onClick={() => setOpen(false)}
                            className={clsx(
                              "block rounded-md px-3 py-2.5 font-display text-[0.875rem] transition-all",
                              isActive
                                ? "bg-accent-wash font-semibold text-accent"
                                : "font-medium text-ink-secondary hover:bg-ground-recessed hover:text-ink",
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
